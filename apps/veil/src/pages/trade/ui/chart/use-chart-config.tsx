import { RefObject, useCallback, useRef } from 'react';
import {
  createChart,
  IChartApi,
  IPriceLine,
  LineStyle,
  type CreatePriceLineOptions,
} from 'lightweight-charts';
import { theme } from '@penumbra-zone/ui/theme';
import { CandleWithVolume } from '@/shared/api/server/candles/utils';

export interface OwnPositionLine {
  id: string;
  price: number;
  direction: 'buy' | 'sell' | '';
  label?: string;
}

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
  const ownLinesRef = useRef<Map<string, IPriceLine>>(new Map());

  const setOwnPositionLines = useCallback((lines: OwnPositionLine[]) => {
    const series = seriesRef.current;
    if (!series) return;

    const seen = new Set<string>();
    for (const line of lines) {
      if (!Number.isFinite(line.price) || line.price <= 0) continue;
      seen.add(line.id);
      const color =
        line.direction === 'buy'
          ? theme.color.success.light
          : line.direction === 'sell'
            ? theme.color.destructive.light
            : theme.color.text.secondary;
      const opts: CreatePriceLineOptions = {
        price: line.price,
        color,
        lineStyle: LineStyle.Dashed,
        lineWidth: 1,
        axisLabelVisible: true,
        title: line.label ?? line.id.slice(0, 6),
      };
      const existing = ownLinesRef.current.get(line.id);
      if (existing) {
        existing.applyOptions(opts);
      } else {
        ownLinesRef.current.set(line.id, series.createPriceLine(opts));
      }
    }

    // Remove lines that no longer exist
    for (const [id, lineRef] of ownLinesRef.current.entries()) {
      if (!seen.has(id)) {
        try {
          series.removePriceLine(lineRef);
        } catch {
          // chart may already be torn down
        }
        ownLinesRef.current.delete(id);
      }
    }
  }, []);

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

  // Time → x pixel; used by drawings anchored to a (time, price) pair.
  const xAtTime = useCallback((time: number): number | undefined => {
    const chart = chartRef.current;
    if (!chart) return undefined;
    const coord = chart.timeScale().timeToCoordinate(time as never);
    return typeof coord === 'number' && Number.isFinite(coord) ? coord : undefined;
  }, []);

  // Reverse: x pixel → time. Useful for placing time-anchored drawings.
  const timeAtX = useCallback((x: number): number | undefined => {
    const chart = chartRef.current;
    if (!chart) return undefined;
    const t = chart.timeScale().coordinateToTime(x);
    return typeof t === 'number' && Number.isFinite(t) ? t : undefined;
  }, []);

  /**
   * Subscribe to native chart clicks. lightweight-charts captures pointer
   * events on its canvas and exposes them via subscribeClick — using DOM
   * onClick on the container does not fire reliably. Caller receives
   * pixel point, price at the click, and the chart time at the click.
   */
  const subscribeChartClick = useCallback(
    (
      cb: (point: { x: number; y: number }, price: number, time: number | undefined) => void,
    ): (() => void) => {
      const chart = chartRef.current;
      const series = seriesRef.current;
      if (!chart || !series) return () => undefined;

      const handler = (param: { point?: { x: number; y: number }; time?: unknown }) => {
        if (!param.point) return;
        const price = series.coordinateToPrice(param.point.y);
        if (typeof price !== 'number' || !Number.isFinite(price) || price <= 0) return;
        const time = typeof param.time === 'number' ? param.time : undefined;
        cb(param.point, price, time);
      };
      chart.subscribeClick(handler);
      return () => chart.unsubscribeClick(handler);
    },
    [],
  );

  /**
   * Subscribe to crosshair-hover changes. Caller receives the candle
   * (OHLC) and volume at the hovered time, plus pixel position. `null`
   * when crosshair leaves the chart.
   */
  const subscribeHover = useCallback(
    (
      cb: (
        info: {
          time: number;
          candle: { open: number; high: number; low: number; close: number };
          volume: number | undefined;
          point: { x: number; y: number };
        } | null,
      ) => void,
    ): (() => void) => {
      const chart = chartRef.current;
      const series = seriesRef.current;
      const volumeSeries = volumeSeriesRef.current;
      if (!chart || !series) return () => undefined;

      const handler = (param: {
        time?: unknown;
        seriesData: Map<unknown, unknown>;
        point?: { x: number; y: number };
      }) => {
        if (!param.time || !param.point) {
          cb(null);
          return;
        }
        const candleData = param.seriesData.get(series) as
          | { open: number; high: number; low: number; close: number }
          | undefined;
        if (!candleData) {
          cb(null);
          return;
        }
        const volData = volumeSeries
          ? (param.seriesData.get(volumeSeries) as { value: number } | undefined)
          : undefined;
        cb({
          time: Number(param.time),
          candle: candleData,
          volume: volData?.value,
          point: param.point,
        });
      };

      chart.subscribeCrosshairMove(handler);
      return () => chart.unsubscribeCrosshairMove(handler);
    },
    [],
  );

  /**
   * Subscribe to "the price→y mapping might have changed" events. Used by
   * overlay components (depth bars, position lines) so they redraw only
   * when something visible changes, not every animation frame. Coalesces
   * multiple events per frame via requestAnimationFrame.
   *
   * Returns an unsubscribe function.
   */
  const subscribeRedraw = useCallback((cb: () => void): (() => void) => {
    const chart = chartRef.current;
    const node = chartElRef.current;
    if (!chart || !node) return () => undefined;

    let raf = 0;
    const handler = () => {
      if (raf) return;
      raf = requestAnimationFrame(() => {
        raf = 0;
        cb();
      });
    };

    chart.subscribeCrosshairMove(handler);
    chart.timeScale().subscribeVisibleLogicalRangeChange(handler);
    const ro = new ResizeObserver(handler);
    ro.observe(node);

    // Fire once so the overlay paints on mount.
    handler();

    return () => {
      cancelAnimationFrame(raf);
      chart.unsubscribeCrosshairMove(handler);
      chart.timeScale().unsubscribeVisibleLogicalRangeChange(handler);
      ro.disconnect();
    };
  }, []);

  return {
    chartRef: setChartRef,
    setVolumeData,
    setCandlesData,
    setVolumeRatio,
    priceAtY,
    yAtPrice,
    xAtTime,
    timeAtX,
    setOwnPositionLines,
    subscribeRedraw,
    subscribeHover,
    subscribeChartClick,
  };
};
