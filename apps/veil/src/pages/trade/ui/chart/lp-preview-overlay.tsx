'use client';

import { useEffect, useState } from 'react';
import { observer } from 'mobx-react-lite';
import {
  getPositionWeights,
  LiquidityDistributionShape,
} from '@/shared/math/position';
import { tradeFormStore } from '../order-form/store/OrderFormStore';

// Match the dotted-orange treatment of the mid-price line so the LP preview
// reads as part of the same chart layer.
const FILL_COLOR = 'rgba(186, 77, 20, 0.10)';
const EDGE_COLOR = '#f49c43';
const RUNG_COLOR = '#f49c43';

interface LpPreviewOverlayProps {
  yAtPrice: (price: number) => number | undefined;
  subscribeRedraw: (cb: () => void) => () => void;
}

interface PreviewState {
  yLower: number;
  yUpper: number;
  rungs: { y: number; weight: number }[];
}

/**
 * Reads the active LP form (SimpleLP or RangeLP) and draws what the
 * trader is about to broadcast directly on the candle canvas:
 *
 *   - a translucent rectangle spanning the [lower, upper] price band
 *   - one horizontal "rung" per planned position, sized by the
 *     LiquidityDistributionShape's weight (FLAT → equal, PYRAMID →
 *     thicker in the middle, INVERTED → thicker at the edges)
 *
 * Pure DOM overlay built on the same yAtPrice / subscribeRedraw plumbing
 * as DepthOverlay and MidPriceOverlay so it can't crash the chart if the
 * form's draft state goes off-scale.
 */
export const LpPreviewOverlay = observer(
  ({ yAtPrice, subscribeRedraw }: LpPreviewOverlayProps) => {
    // MobX reads — observer() picks these up so the overlay re-renders
    // on every form-store mutation (slider drag, shape toggle, count
    // change, etc).
    const { whichForm, simpleLPForm, rangeForm } = tradeFormStore;
    const isLp = whichForm === 'SimpleLP' || whichForm === 'RangeLP';

    let lower: number | undefined;
    let upper: number | undefined;
    let count = 0;
    let shape: LiquidityDistributionShape = LiquidityDistributionShape.FLAT;
    if (isLp) {
      if (whichForm === 'SimpleLP') {
        lower = simpleLPForm.lowerPriceInput ?? undefined;
        upper = simpleLPForm.upperPriceInput ?? undefined;
        count = simpleLPForm.positions;
        shape = simpleLPForm.liquidityShape;
      } else {
        lower = rangeForm.lowerPrice;
        upper = rangeForm.upperPrice;
        count = rangeForm.positionCount ?? 0;
        shape = rangeForm._liquidityShape;
      }
    }

    const valid =
      isLp &&
      lower !== undefined &&
      upper !== undefined &&
      Number.isFinite(lower) &&
      Number.isFinite(upper) &&
      lower > 0 &&
      upper > lower &&
      count > 0;

    const [pos, setPos] = useState<PreviewState | null>(null);

    useEffect(() => {
      if (!valid) {
        setPos(null);
        return;
      }
      const lo = lower as number;
      const hi = upper as number;
      const n = count;
      const weights = getPositionWeights(n, shape);
      const recompute = () => {
        const yLo = yAtPrice(lo);
        const yHi = yAtPrice(hi);
        if (yLo === undefined || yHi === undefined) {
          setPos(null);
          return;
        }
        // The plan code itself walks lo + i*((hi-lo)/n), so mirror that
        // exact step so the preview rungs land on the price points the
        // chain will actually open positions at.
        const step = (hi - lo) / n;
        const rungs: { y: number; weight: number }[] = [];
        for (let i = 0; i < n; i++) {
          const price = lo + i * step;
          const y = yAtPrice(price);
          if (y === undefined) continue;
          rungs.push({ y, weight: weights[i] ?? 0 });
        }
        setPos({
          yLower: Math.max(yLo, yHi),
          yUpper: Math.min(yLo, yHi),
          rungs,
        });
      };
      return subscribeRedraw(recompute);
    }, [valid, lower, upper, count, shape, yAtPrice, subscribeRedraw]);

    if (!pos) return null;

    const maxWeight = pos.rungs.reduce((m, r) => Math.max(m, r.weight), 0) || 1;

    return (
      <div
        aria-label='LP position preview'
        // pointer-events-none — overlay is purely informational, the
        // user still interacts with the chart canvas underneath.
        className='pointer-events-none absolute inset-0 z-[5]'
      >
        {/* Range band */}
        <div
          className='absolute left-0'
          style={{
            right: 56,
            top: pos.yUpper,
            height: Math.max(1, pos.yLower - pos.yUpper),
            background: FILL_COLOR,
            borderTop: `1px dashed ${EDGE_COLOR}`,
            borderBottom: `1px dashed ${EDGE_COLOR}`,
          }}
        />
        {/* Per-position rungs, width proportional to distribution weight */}
        {pos.rungs.map((r, i) => {
          const widthPct = (r.weight / maxWeight) * 100;
          return (
            <div
              key={i}
              className='absolute'
              style={{
                left: 0,
                top: r.y - 1,
                width: `calc((100% - 56px) * ${widthPct / 100})`,
                height: 2,
                background: RUNG_COLOR,
                opacity: 0.5,
              }}
            />
          );
        })}
      </div>
    );
  },
);
