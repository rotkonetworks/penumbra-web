import React, { memo, useCallback } from 'react';
import cn from 'clsx';

// Pure props (primitive direction + bound MobX action). Wrapping in memo()
// lets the parent observer re-render on every block-tick without dragging
// this control's two buttons through reconciliation each time.
export const SegmentedControl: React.FC<{
  direction: 'buy' | 'sell';
  setDirection: (direction: 'buy' | 'sell') => void;
}> = memo(({ direction, setDirection }) => {
  // Stable click handlers so each button's onClick prop stays referentially
  // equal across renders — keeps React from touching the underlying DOM
  // event listener on every tick.
  const onBuy = useCallback(() => setDirection('buy'), [setDirection]);
  const onSell = useCallback(() => setDirection('sell'), [setDirection]);

  return (
    <div className='mb-4 flex h-8 w-full'>
      <button
        className={cn(
          'flex-1 rounded-l-2xl border transition-colors duration-300 focus:outline-hidden',
          'border-r-0 border-other-tonal-stroke',
          direction === 'buy'
            ? 'border-success-main bg-success-main text-text-primary'
            : 'bg-transparent text-text-secondary',
        )}
        onClick={onBuy}
      >
        Buy
      </button>
      <button
        className={cn(
          'flex-1 rounded-r-2xl border transition-colors duration-300 focus:outline-hidden',
          'border-l-0 border-other-tonal-stroke',
          direction === 'sell'
            ? 'border-destructive-main bg-destructive-main text-text-primary'
            : 'bg-transparent text-text-secondary',
        )}
        onClick={onSell}
      >
        Sell
      </button>
    </div>
  );
});

SegmentedControl.displayName = 'SegmentedControl';
