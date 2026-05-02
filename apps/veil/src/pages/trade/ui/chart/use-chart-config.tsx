import { RefObject, useCallback, useRef } from 'react';
import { createChart, IChartApi } from 'lightweight-charts';
import { theme } from '@penumbra-zone/ui/theme';
import { CandleWithVolume } from '@/shared/api/server/candles/utils';

// if `high` / `open` ratio is greater than this value, the chart will limit `high` to `open * RATIO`
const SUPER_CANDLE_RATIO = 3;

// Compute price-axis precision so at least 2 significant digits are visible.
// Examples:
//   price = 1234   → precision 2  ("1234.00")
//   price = 12.3   → precision 2  ("12.30")
//   price = 1.23   → precision 3  ("1.234")
//   price = 0.123  → precision 4  ("0.1234")
//   price = 0.005  → precision 5  ("0.00500")
//   price = 0.0001 → precision 6  ("0.000100")
const priceFormatFor = (price: number): { precision: number; minMove: number } => {
  if (!Number.isFinite(price) || price <= 0) {
    return { precision: 2, minMove: 0.01 };
  }
  const order = Math.floor(Math.log10(price));
  const precision = Math.min(8, Math.max(2, 2 - order));
  const minMove = Math.pow(10, -precision);
  return { precision, minMove };
};

export const useChartConfig = (
  loadMore: () => Promise<void>,
  loadingDisabled: RefObject<boolean>,
) => {
  const chartElRef = useRef<HTMLDivElement>(null);
  const chartRef = useRef<IChartApi>(undefined);
  const seriesRef = useRef<ReturnType<IChartApi['addCandlestickSeries']>>(undefined);
  const volumeSeriesRef = useRef<ReturnType<IChartApi['addHistogramSeries']>>(undefined);
  const volumeRatioRef = useRef<number>(0.2);

  const setVolumeRatio = useCallback((ratio: number) => {
    const clamped = Math.min(0.6, Math.max(0.05, ratio));
    volumeRatioRef.current = clamped;
    seriesRef.current?.priceScale().applyOptions({
      scaleMargins: { top: 0.05, bottom: clamped },
    });
    volumeSeriesRef.current?.priceScale().applyOptions({
      scaleMargins: { top: 1 - clamped, bottom: 0 },
    });
  }, []);

  const setCandlesData = (candles: CandleWithVolume[] = []) => {
    seriesRef.current?.setData(
      candles.map(candle => ({
        ...candle.ohlc,
        // prevent extreme candle values from breaking the chart
        high:
          candle.ohlc.high / candle.ohlc.open > SUPER_CANDLE_RATIO
            ? candle.ohlc.open * SUPER_CANDLE_RATIO
            : candle.ohlc.high,
      })),
    );

    // Derive a representative price (median close) so axis labels and the
    // crosshair show 2+ significant digits even for sub-cent prices.
    if (candles.length > 0 && seriesRef.current) {
      const closes = candles
        .map(c => c.ohlc.close)
        .filter(c => Number.isFinite(c) && c > 0)
        .sort((a, b) => a - b);
      const median = closes.length > 0 ? closes[Math.floor(closes.length / 2)] : undefined;
      if (median !== undefined) {
        const { precision, minMove } = priceFormatFor(median);
        seriesRef.current.applyOptions({
          priceFormat: { type: 'price', precision, minMove },
        });
      }
    }
  };

  const setVolumeData = (candles: CandleWithVolume[] = []) => {
    volumeSeriesRef.current?.setData(
      candles.map(candle => ({
        time: candle.ohlc.time,
        value: candle.volume,
        color:
          candle.ohlc.close >= candle.ohlc.open
            ? theme.color.success.light + '80'
            : theme.color.destructive.light + '80',
      })),
    );
  };

  const setChartRef = useCallback((node: HTMLDivElement | null) => {
    // unmount when node is null
    if (!node) {
      chartRef.current?.remove();
      chartRef.current = undefined;
      chartElRef.current = null;
      return;
    }

    // if the element is assigned, create the chart
    if (!chartElRef.current) {
      chartElRef.current = node;

      chartRef.current = createChart(node, {
        autoSize: true,
        layout: {
          textColor: theme.color.text.primary,
          background: {
            color: 'transparent',
          },
          // Hide the lightweight-charts TradingView attribution badge —
          // it links offsite and adds visual noise on a trade page.
          attributionLogo: false,
        },
        grid: {
          vertLines: {
            color: theme.color.other.tonalStroke,
          },
          horzLines: {
            color: theme.color.other.tonalStroke,
          },
        },
        timeScale: {
          timeVisible: true,
          secondsVisible: false,
          uniformDistribution: true,
        },
      });

      // Initialize the candlestick series
      seriesRef.current = chartRef.current.addCandlestickSeries({
        upColor: theme.color.success.light,
        downColor: theme.color.destructive.light,
        borderVisible: false,
        wickUpColor: theme.color.success.light,
        wickDownColor: theme.color.destructive.light,
      });

      // Set the price scale margins for the candlestick series.
      // bottom margin reserves space for the volume pane below.
      seriesRef.current.priceScale().applyOptions({
        autoScale: true,
        scaleMargins: { top: 0.05, bottom: volumeRatioRef.current },
      });

      // Initialize the volume series
      volumeSeriesRef.current = chartRef.current.addHistogramSeries({
        color: theme.color.success.light + '80',
        priceFormat: {
          type: 'volume',
        },
        priceScaleId: '',
        lastValueVisible: false,
        priceLineVisible: false,
      });

      // Volume occupies the bottom `volumeRatio` of the pane.
      volumeSeriesRef.current.priceScale().applyOptions({
        scaleMargins: {
          top: 1 - volumeRatioRef.current,
          bottom: 0,
        },
      });

      // subscribe to users scrolling left and right the price chart
      chartRef.current.timeScale().subscribeVisibleLogicalRangeChange(logicalRange => {
        // `from=-10` parameter means there needs to be at least 10 empty candles in the left of the chart
        if (!loadingDisabled.current && logicalRange?.from && logicalRange.from < -10) {
          void loadMore();
        }
      });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps -- dependent data is called from the function using current data
  }, []);

  // Convert a vertical pixel offset (relative to chart container) to a price
  // on the candle series. Returns undefined if the chart isn't ready or the
  // y is outside the price scale range.
  const priceAtY = useCallback((y: number): number | undefined => {
    const series = seriesRef.current;
    if (!series) return undefined;
    const price = series.coordinateToPrice(y);
    return typeof price === 'number' && Number.isFinite(price) ? price : undefined;
  }, []);

  // Inverse: a price → its current Y coordinate on the candle series.
  // Returns undefined if the chart isn't ready or the price is off-scale.
  const yAtPrice = useCallback((price: number): number | undefined => {
    const series = seriesRef.current;
    if (!series) return undefined;
    const coord = series.priceToCoordinate(price);
    return typeof coord === 'number' && Number.isFinite(coord) ? coord : undefined;
  }, []);

  return {
    chartRef: setChartRef,
    setVolumeData,
    setCandlesData,
    setVolumeRatio,
    chartElRef,
    priceAtY,
    yAtPrice,
  };
};
