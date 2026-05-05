import React, { memo } from 'react';
import { Text } from '@penumbra-zone/ui/Text';
import cn from 'clsx';

// Generic + memo'd. Generic so callers can pass typed enum arrays
// (`Object.values(UpperBoundOptions)` etc) and bound MobX setters
// without a string cast at the JSX site — the cast was the only thing
// forcing each parent to wrap onChange in a fresh inline arrow, which
// in turn defeated any memo here. With this shape:
//
//   <SelectGroup options={UPPER_BOUND_OPTIONS} value={...}
//                onChange={store.setUpperPriceInputOption} />
//
// the onChange identity is stable across renders and memo skips the
// per-render reconciliation of three-to-five button DOM nodes per form
// re-render (which fires every block-tick via marketPrice).
const SelectGroupImpl = <T extends string>({
  value,
  options,
  onChange,
}: {
  value?: T;
  options: readonly T[];
  onChange: (option: T) => void;
}) => {
  return (
    <div className='mb-4 flex gap-1'>
      {options.map(option => (
        <button
          key={option}
          onClick={() => onChange(option)}
          className={cn(
            'rounded-lg border border-other-tonal-stroke px-2',
            value === option ? 'text-text-primary' : 'text-text-secondary',
            value === option && 'bg-neutral-main text-text-primary',
          )}
        >
          <Text small>{option}</Text>
        </button>
      ))}
    </div>
  );
};

// memo() loses the generic by default. Re-cast through the original
// generic signature so callers retain typed onChange/value pairing.
export const SelectGroup = memo(SelectGroupImpl) as typeof SelectGroupImpl;
