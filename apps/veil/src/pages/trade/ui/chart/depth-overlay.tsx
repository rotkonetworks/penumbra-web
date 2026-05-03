import { useEffect, useMemo, useState } from 'react';
import { observer } from 'mobx-react-lite';
import { pnum } from '@penumbra-zone/types/pnum';
import { theme } from '@penumbra-zone/ui/theme';
import { useBook } from '../../api/book';
import { tradeFormStore } from '../order-form/store/OrderFormStore';

interface Level {
  price: number;
  total: number;
}

interface BarPos {
  id: string;
  side: 'bid' | 'ask';
  price: number;
  y: number;
  width: number;
  color: string;
}

interface DepthOverlayProps {
  yAtPrice: (price: number) => number | undefined;
  /** Subscribe to chart events. Returns an unsubscribe. */
  subscribeRedraw: (cb: () => void) => () => void;
  /** Width of the overlay column in pixels. Leaves room for the price axis. */
  width?: number;
}

const buildLevels = (
  buys: { price: string; total: string }[],
  sells: { price: string; total: string }[],
): { bids: Level[]; asks: Level[]; max: number } | undefined => {
  const toLevel = (t: { price: string; total: string }): Level => ({
    price: pnum(t.price).toNumber(),
    total: pnum(t.total).toNumber(),
  });
  const filt = (l: Level) =>
    Number.isFinite(l.price) && l.price > 0 && Number.isFinite(l.total) && l.total > 0;

  const bids = buys.map(toLevel).filter(filt);
  const asks = sells.map(toLevel).filter(filt);
  if (!bids.length && !asks.length) return undefined;
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

export const DepthOverlay = observer(
  ({ yAtPrice, subscribeRedraw, width = 64 }: DepthOverlayProps) => {
    const { data } = useBook();

    const levels = useMemo(() => {
      if (!data?.multiHops) return undefined;
      return buildLevels(data.multiHops.buy, data.multiHops.sell);
    }, [data]);

    const [bars, setBars] = useState<BarPos[]>([]);

    useEffect(() => {
      if (!levels) {
        setBars([]);
        return;
      }
      const recompute = () => {
        const max = levels.max || 1;
        // sqrt scaling so deep books still show smaller levels visibly
        const scale = (v: number) => (Math.sqrt(v / max) * width * 0.95) | 0;
        const next: BarPos[] = [];
        const push = (side: 'bid' | 'ask', rows: Level[], color: string) => {
          for (const lvl of rows) {
            const y = yAtPrice(lvl.price);
            if (y === undefined) continue;
            next.push({
              id: `${side}-${lvl.price}`,
              side,
              price: lvl.price,
              y,
              width: Math.max(1, scale(lvl.total)),
              color,
            });
          }
        };
        push('bid', levels.bids, theme.color.success.light);
        push('ask', levels.asks, theme.color.destructive.light);
        setBars(next);
      };
      // subscribeRedraw fires once immediately and on relevant chart events.
      return subscribeRedraw(recompute);
    }, [levels, yAtPrice, subscribeRedraw, width]);

    if (!levels) return null;

    return (
      <div
        aria-label='Order book depth overlay'
        className='pointer-events-none absolute top-0 bottom-0 z-[5]'
        style={{ right: 56, width }}
        title='Click a depth bar to set the limit price'
      >
        {bars.map(b => (
          <div
            key={b.id}
            className='pointer-events-auto absolute right-0 cursor-pointer'
            style={{
              top: b.y - 1,
              height: 2,
              width: b.width,
              background: b.color,
              opacity: 0.7,
            }}
            onClick={() => prefill(b.price, b.side)}
          />
        ))}
      </div>
    );
  },
);
