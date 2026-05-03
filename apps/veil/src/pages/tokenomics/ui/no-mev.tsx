import { Text } from '@penumbra-zone/ui/Text';

/**
 * Visual: a row of four orders, all clearing at the same uniform price.
 * Pure CSS / SVG, no charting deps.
 */
const BatchClearingDiagram = () => {
  const orders = [
    { label: 'Order A', side: 'buy', size: 80 },
    { label: 'Order B', side: 'sell', size: 60 },
    { label: 'Order C', side: 'buy', size: 100 },
    { label: 'Order D', side: 'sell', size: 70 },
  ] as const;

  return (
    <div className='flex flex-col gap-4 rounded-lg border border-other-tonal-stroke bg-base-black-alt p-4'>
      <div className='flex items-center justify-between'>
        <Text detail color='text.secondary'>
          One block, many orders
        </Text>
        <Text detail color='text.secondary'>
          Single uniform clearing price
        </Text>
      </div>

      <div className='relative flex flex-col gap-3'>
        {/* the uniform clearing price line */}
        <div className='pointer-events-none absolute top-0 right-0 bottom-0 left-1/2 z-10 w-px bg-gradient-to-b from-orange-400/0 via-orange-400 to-teal-400/0' />
        <div className='pointer-events-none absolute top-1/2 left-1/2 z-20 -translate-x-1/2 -translate-y-1/2 rounded-full border border-orange-400 bg-base-black-alt px-2 py-0.5'>
          <Text detailTechnical color='text.primary'>
            P*
          </Text>
        </div>

        {orders.map(order => (
          <div key={order.label} className='flex items-center gap-3'>
            <div className='w-16'>
              <Text detail color='text.secondary'>
                {order.label}
              </Text>
            </div>
            <div className='relative flex flex-1 items-center'>
              {order.side === 'buy' ? (
                <div className='ml-auto flex items-center justify-end' style={{ width: '50%' }}>
                  <div
                    className='h-3 rounded-l-sm bg-teal-400/60'
                    style={{ width: `${order.size}%` }}
                  />
                </div>
              ) : (
                <div className='mr-auto flex items-center justify-start' style={{ width: '50%' }}>
                  <div
                    className='ml-[50%] h-3 rounded-r-sm bg-orange-400/60'
                    style={{ width: `${order.size}%` }}
                  />
                </div>
              )}
            </div>
            <div className='w-12 text-right'>
              <Text detailTechnical color='text.secondary'>
                {order.side === 'buy' ? 'BUY' : 'SELL'}
              </Text>
            </div>
          </div>
        ))}
      </div>

      <div className='flex items-center justify-between border-t border-other-tonal-stroke pt-3'>
        <Text detail color='text.secondary'>
          Order arrival, ordering, and inclusion position are irrelevant.
        </Text>
      </div>
    </div>
  );
};

export const NoMev = () => {
  return (
    <section className='flex flex-col gap-6'>
      <div className='flex flex-col gap-2'>
        <Text variant='h2' color='text.primary'>
          Batched orders, no MEV
        </Text>
        <Text body color='text.secondary'>
          Penumbra&apos;s DEX runs as a sealed-bid batch auction. Every swap intent in a block is
          collected, then settled together at one uniform clearing price per directed pair. The
          order in which transactions land doesn&apos;t matter, and intent contents are encrypted
          until the batch closes.
        </Text>
      </div>

      <BatchClearingDiagram />

      <div className='grid grid-cols-1 gap-3 tablet:grid-cols-3'>
        <div className='flex flex-col gap-2 rounded-lg bg-other-tonal-fill5 p-4'>
          <Text variant='strong' color='text.primary'>
            No front-running
          </Text>
          <Text small color='text.secondary'>
            You can&apos;t pay to be sequenced earlier in the batch. There is no &quot;earlier&quot;
            inside a batch.
          </Text>
        </div>
        <div className='flex flex-col gap-2 rounded-lg bg-other-tonal-fill5 p-4'>
          <Text variant='strong' color='text.primary'>
            No sandwiching
          </Text>
          <Text small color='text.secondary'>
            Buys and sells in the same block clear at the same price. There is no per-trade
            slippage to bracket.
          </Text>
        </div>
        <div className='flex flex-col gap-2 rounded-lg bg-other-tonal-fill5 p-4'>
          <Text variant='strong' color='text.primary'>
            No back-running
          </Text>
          <Text small color='text.secondary'>
            Mempool intents are shielded. Searchers can&apos;t observe your trade and chase
            it.
          </Text>
        </div>
      </div>

      <Text small color='text.secondary'>
        This is a structural property of the design. It is not a heuristic, not a private mempool
        bolt-on, and not a fairness gadget that can be turned off later.
      </Text>
    </section>
  );
};
