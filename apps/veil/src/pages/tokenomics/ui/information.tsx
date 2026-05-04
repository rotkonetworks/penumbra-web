import { Text } from '@penumbra-zone/ui/Text';

/**
 * Frames why Penumbra's privacy is not a privacy feature — it's a market-
 * structure feature. Sits above NoMev so the batch-clearing claims that
 * follow have a "why does this even matter?" anchor.
 */
export const Information = () => {
  return (
    <section className='flex flex-col gap-6'>
      <div className='flex flex-col gap-2'>
        <Text variant='h2' color='text.primary'>
          Markets are information markets
        </Text>
        <Text body color='text.secondary'>
          Trading is an information-asymmetry game. The participant with the freshest,
          most complete view of order flow extracts value from everyone else. Centralised
          exchanges concentrate that information at the matching engine; transparent
          DEXes broadcast it to the entire mempool.
        </Text>
      </div>

      <div className='grid grid-cols-1 gap-3 tablet:grid-cols-3'>
        <div className='flex flex-col gap-2 rounded-lg bg-other-tonal-fill5 p-4'>
          <Text variant='strong' color='text.primary'>
            CEXes
          </Text>
          <Text small color='text.secondary'>
            The house sees every order. Internal market-making desks, latency-priced
            colocation, and surveillance feeds priced into the spread.
          </Text>
        </div>
        <div className='flex flex-col gap-2 rounded-lg bg-other-tonal-fill5 p-4'>
          <Text variant='strong' color='text.primary'>
            Transparent DEXes
          </Text>
          <Text small color='text.secondary'>
            Every searcher sees every order. MEV did not eliminate information asymmetry
            — it democratised it for bots fast enough to act on it.
          </Text>
        </div>
        <div className='flex flex-col gap-2 rounded-lg bg-other-tonal-fill5 p-4'>
          <Text variant='strong' color='text.primary'>
            Penumbra
          </Text>
          <Text small color='text.secondary'>
            Order intents are encrypted until batch close. Validators see aggregates,
            not individual swaps. There is nothing to front-run because there is no
            information edge to extract.
          </Text>
        </div>
      </div>

      <Text small color='text.secondary'>
        Privacy on Penumbra is not a feature bolted onto a DEX. It is the mechanism
        by which the DEX produces fair prices. Removing it would not weaken privacy —
        it would re-introduce the asymmetry that lets searchers tax every trade.
      </Text>
    </section>
  );
};
