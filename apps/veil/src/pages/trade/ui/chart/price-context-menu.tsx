import { useEffect, useRef } from 'react';
import { Text } from '@penumbra-zone/ui/Text';

export interface PriceMenuItem {
  label: string;
  hint?: string;
  tone?: 'buy' | 'sell' | 'neutral';
  onSelect: () => void;
}

interface PriceContextMenuProps {
  x: number;
  y: number;
  price: string;
  items: PriceMenuItem[];
  onClose: () => void;
}

const toneClass: Record<NonNullable<PriceMenuItem['tone']>, string> = {
  buy: 'text-success-light',
  sell: 'text-destructive-light',
  neutral: 'text-text-primary',
};

export const PriceContextMenu = ({ x, y, price, items, onClose }: PriceContextMenuProps) => {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const onDocClick = (e: MouseEvent) => {
      if (!ref.current?.contains(e.target as Node)) onClose();
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    document.addEventListener('mousedown', onDocClick);
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('mousedown', onDocClick);
      document.removeEventListener('keydown', onKey);
    };
  }, [onClose]);

  return (
    <div
      ref={ref}
      role='menu'
      className='absolute z-20 min-w-[200px] overflow-hidden rounded-sm border border-other-tonalStroke bg-base-black shadow-lg'
      style={{ left: x, top: y }}
    >
      <div className='border-b border-b-other-tonalStroke px-3 py-2'>
        <Text detail color='text.secondary'>
          at price
        </Text>
        <div className='font-mono text-sm text-text-primary'>{price}</div>
      </div>
      {items.map((item, idx) => (
        <button
          key={idx}
          type='button'
          role='menuitem'
          onClick={() => {
            item.onSelect();
            onClose();
          }}
          className='flex w-full items-center justify-between px-3 py-2 text-left transition-colors hover:bg-action-hover-overlay'
        >
          <span className={toneClass[item.tone ?? 'neutral']}>
            <Text detail>{item.label}</Text>
          </span>
          {item.hint && (
            <Text detail color='text.secondary'>
              {item.hint}
            </Text>
          )}
        </button>
      ))}
    </div>
  );
};
