import { useEffect, useMemo, useRef } from 'react';
import { observer } from 'mobx-react-lite';
import { pnum } from '@penumbra-zone/types/pnum';
import { theme } from '@penumbra-zone/ui/theme';
import { useBook } from '../../api/book';
import { tradeFormStore } from '../order-form/store/OrderFormStore';

interface DepthOverlayProps {
  yAtPrice: (price: number) => number | undefined;
  // Width of the overlay column in pixels. Leaves room for the price axis.
  width?: number;
}

interface Level {
  price: number;
  total: number;
}

const buildLevels = (
  buys: { price: string; total: string }[],
  sells: { price: string; total: string }[],
): { bids: Level[]; asks: Level[]; max: number } => {
  const toLevel = (t: { price: string; total: string }): Level => ({
    price: pnum(t.price).toNumber(),
    total: pnum(t.total).toNumber(),
  });
  const filt = (l: Level) =>
    Number.isFinite(l.price) && l.price > 0 && Number.isFinite(l.total) && l.total > 0;

  const bids = buys.map(toLevel).filter(filt);
  const asks = sells.map(toLevel).filter(filt);
  let max = 0;
  for (const l of bids) if (l.total > max) max = l.total;
  for (const l of asks) if (l.total > max) max = l.total;
  return { bids, asks, max };
};

const prefill = (price: number, side: 'bid' | 'ask') => {
  const formatted =
    price >= 1 ? price.toFixed(4) : price >= 0.01 ? price.toFixed(5) : price.toPrecision(4);
  tradeFormStore.setWhichForm('Limit');
  tradeFormStore.limitForm.setDirection(side === 'bid' ? 'sell' : 'buy');
  tradeFormStore.limitForm.setPriceInput(formatted);
};

export const DepthOverlay = observer(({ yAtPrice, width = 64 }: DepthOverlayProps) => {
  const { data } = useBook();
  const containerRef = useRef<HTMLDivElement>(null);
  const rafRef = useRef<number>(0);

  const levels = useMemo(() => {
    if (!data?.multiHops) return undefined;
    return buildLevels(data.multiHops.buy, data.multiHops.sell);
  }, [data]);

  // Recompute coordinates each animation frame; cheap and avoids needing
  // to wire into lightweight-charts internal events for every pan/zoom.
  useEffect(() => {
    if (!levels) return;
    const container = containerRef.current;
    if (!container) return;

    let mounted = true;
    const draw = () => {
      if (!mounted) return;
      const h = container.clientHeight;
      const renderLevels = (
        side: 'bid' | 'ask',
        rows: Level[],
        color: string,
      ): string => {
        const max = levels.max || 1;
        // Use sqrt scaling so deep books still show smaller levels visibly.
        const scale = (v: number) => (Math.sqrt(v / max) * width * 0.95) | 0;
        const out: string[] = [];
        for (const lvl of rows) {
          const y = yAtPrice(lvl.price);
          if (y === undefined || y < 0 || y > h) continue;
          const w = Math.max(1, scale(lvl.total));
          out.push(
            `<div data-side="${side}" data-price="${lvl.price}" ` +
              `style="position:absolute;right:0;top:${y - 1}px;height:2px;width:${w}px;` +
              `background:${color};opacity:0.7;pointer-events:auto;cursor:pointer;"` +
              `></div>`,
          );
        }
        return out.join('');
      };

      container.innerHTML =
        renderLevels('bid', levels.bids, theme.color.success.light) +
        renderLevels('ask', levels.asks, theme.color.destructive.light);

      rafRef.current = requestAnimationFrame(draw);
    };
    rafRef.current = requestAnimationFrame(draw);

    const onClick = (e: MouseEvent) => {
      const target = e.target as HTMLElement | null;
      const priceAttr = target?.dataset['price'];
      if (!priceAttr) return;
      const price = Number(priceAttr);
      const side = target?.dataset['side'] === 'bid' ? 'bid' : 'ask';
      if (Number.isFinite(price)) prefill(price, side);
    };
    container.addEventListener('click', onClick);

    return () => {
      mounted = false;
      cancelAnimationFrame(rafRef.current);
      container.removeEventListener('click', onClick);
    };
  }, [levels, yAtPrice, width]);

  if (!levels) return null;

  return (
    <div
      ref={containerRef}
      aria-label='Order book depth overlay'
      className='pointer-events-none absolute top-0 bottom-0 z-[5] [&>div]:pointer-events-auto'
      style={{ right: 56, width }}
      title='Click a depth bar to set the limit price'
    />
  );
});
