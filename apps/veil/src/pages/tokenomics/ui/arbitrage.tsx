import { Text } from '@penumbra-zone/ui/Text';
import { ArrowRight, Flame } from 'lucide-react';

const Step = ({ index, title, body }: { index: string; title: string; body: string }) => (
  <div className='flex flex-col gap-2 rounded-lg bg-other-tonal-fill5 p-4'>
    <div className='flex items-center gap-2'>
      <span className='flex h-6 w-6 items-center justify-center rounded-full bg-orange-400/20'>
        <Text detailTechnical color='text.primary'>
          {index}
        </Text>
      </span>
      <Text variant='strong' color='text.primary'>
        {title}
      </Text>
    </div>
    <Text small color='text.secondary'>
      {body}
    </Text>
  </div>
);

const ArbFlowDiagram = () => (
  <div className='flex flex-col gap-3 rounded-lg border border-other-tonal-stroke bg-base-black-alt p-4'>
    <div className='grid grid-cols-1 items-stretch gap-3 tablet:grid-cols-7'>
      <div className='flex flex-col items-center gap-1 rounded-lg bg-other-tonal-fill5 p-3 tablet:col-span-2'>
        <Text detail color='text.secondary'>
          Pool A
        </Text>
        <Text variant='strong' color='text.primary'>
          1 UM = 1.00 USDC
        </Text>
      </div>
      <div className='flex items-center justify-center tablet:col-span-1'>
        <ArrowRight className='h-5 w-5 text-other-tonal-stroke' />
      </div>
      <div className='flex flex-col items-center gap-1 rounded-lg bg-other-tonal-fill5 p-3 tablet:col-span-2'>
        <Text detail color='text.secondary'>
          Pool B
        </Text>
        <Text variant='strong' color='text.primary'>
          1 UM = 1.05 USDC
        </Text>
      </div>
      <div className='flex items-center justify-center tablet:col-span-1'>
        <ArrowRight className='h-5 w-5 text-other-tonal-stroke' />
      </div>
      <div className='flex flex-col items-center gap-1 rounded-lg border border-orange-400/40 bg-orange-400/10 p-3 tablet:col-span-1'>
        <Flame className='h-5 w-5 text-orange-400' />
        <Text detail color='text.secondary'>
          Burned
        </Text>
      </div>
    </div>
    <Text detail color='text.secondary' align='center'>
      The protocol routes the spread across pools and burns the captured UM.
    </Text>
  </div>
);

export const Arbitrage = () => {
  return (
    <section className='flex flex-col gap-6'>
      <div className='flex flex-col gap-2'>
        <Text variant='h2' color='text.primary'>
          Arbitrage as protocol revenue
        </Text>
        <Text body color='text.secondary'>
          On every other DEX, mispricings between liquidity positions are harvested by external
          searchers — bots that capture the spread before regular users can. Penumbra closes those
          gaps itself, as part of clearing each batch.
        </Text>
      </div>

      <ArbFlowDiagram />

      <div className='grid grid-cols-1 gap-3 tablet:grid-cols-3'>
        <Step
          index='1'
          title='Detect the gap'
          body='When clearing a batch, the matching engine looks across all liquidity positions for cycles that close at a profit.'
        />
        <Step
          index='2'
          title='Execute the cycle'
          body='The protocol synthesizes the trades that capture the spread, routing through the same shielded pool everyone else uses.'
        />
        <Step
          index='3'
          title='Burn the proceeds'
          body='The captured UM is burned. It does not accrue to a treasury, a foundation, or a privileged actor.'
        />
      </div>

      <div className='rounded-lg border border-orange-400/30 bg-orange-400/5 p-4'>
        <Text small color='text.secondary'>
          The economic effect: the more the DEX is used, the more arbitrage opportunities arise,
          the more UM the protocol burns. UM holders are paid in scarcity rather than yield, and
          that scarcity is paid for by traders who would otherwise have been picked off by
          searchers.
        </Text>
      </div>
    </section>
  );
};
