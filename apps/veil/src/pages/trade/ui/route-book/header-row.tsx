import { Text } from '@penumbra-zone/ui/Text';

export interface OrderBookHeaderProps {
  base: string;
  quote: string;
  cumulative?: boolean;
  onToggleCumulative?: () => void;
}

export const RouteBookHeader = ({
  base,
  quote,
  cumulative,
  onToggleCumulative,
}: OrderBookHeaderProps) => {
  return (
    <div className='col-span-4 grid grid-cols-subgrid border-b border-b-other-tonal-stroke px-4 text-xs text-text-secondary'>
      <div className='py-2 text-left'>
        <Text tableItemSmall>Price({quote})</Text>
      </div>
      <div className='py-2 text-right'>
        <Text tableItemSmall>Amount({base})</Text>
      </div>
      <button
        type='button'
        onClick={onToggleCumulative}
        title={
          cumulative
            ? 'Showing cumulative total — click for per-level total'
            : 'Showing per-level total — click for cumulative'
        }
        className='cursor-pointer py-2 text-right transition-colors hover:text-text-primary'
      >
        <Text tableItemSmall>{cumulative ? 'Σ Total' : 'Total'}</Text>
      </button>
      <div className='py-2 text-right'>
        <Text tableItemSmall>Route</Text>
      </div>
    </div>
  );
};
