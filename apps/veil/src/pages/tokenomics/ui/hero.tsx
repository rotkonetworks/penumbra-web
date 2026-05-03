import { Text } from '@penumbra-zone/ui/Text';
import { InfoCard } from '@/shared/ui/info-card';

/**
 * Top-of-page hero. Optional `stats` prop can be wired to live pindexer data
 * later; for now we render dashes to keep the page fully static / no-DB.
 */
export interface TokenomicsHeroStats {
  dexVolume24h?: string;
  umBurned24h?: string;
  trades24h?: string;
}

export const TokenomicsHero = ({ stats }: { stats?: TokenomicsHeroStats }) => {
  return (
    <div className='relative p-px'>
      <div className='absolute top-0 right-0 bottom-0 left-0 z-10 rounded-xl [background:linear-gradient(110deg,rgba(186,77,20,1),rgba(186,77,20,0),rgba(34,99,98,0),rgba(34,99,98,1))]' />
      <div className='absolute top-1 right-1 bottom-1 left-1 z-20 rounded-xl bg-base-black-alt' />
      <div className='relative z-30 flex flex-col gap-8 rounded-xl p-6 backdrop-blur-lg [background:linear-gradient(110deg,rgba(186,77,20,0.2)_0%,rgba(34,99,98,0.1)_75%)] desktop:p-12'>
        <div className='flex flex-col gap-4'>
          <Text variant='h1' color='text.primary'>
            <span className='bg-gradient-to-r from-orange-400 to-teal-400 bg-clip-text text-transparent'>
              How UM earns
            </span>
          </Text>
          <Text variant='large' color='text.secondary'>
            UM is Penumbra&apos;s native token. Its value is anchored by something most chains
            can&apos;t do: the protocol itself captures arbitrage on its own DEX, and burns the
            proceeds. No MEV bots, no privileged searchers. The chain takes the spread.
          </Text>
        </div>

        <div className='grid grid-cols-1 gap-2 tablet:grid-cols-3'>
          <InfoCard title='DEX volume (24h)'>
            <Text large color='success.light'>
              {stats?.dexVolume24h ?? '—'}
            </Text>
          </InfoCard>
          <InfoCard title='UM burned (24h)'>
            <Text large color='success.light'>
              {stats?.umBurned24h ?? '—'}
            </Text>
          </InfoCard>
          <InfoCard title='Trades (24h)'>
            <Text large color='text.primary'>
              {stats?.trades24h ?? '—'}
            </Text>
          </InfoCard>
        </div>
      </div>
    </div>
  );
};
