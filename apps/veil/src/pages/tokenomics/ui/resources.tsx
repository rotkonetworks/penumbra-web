import { Text } from '@penumbra-zone/ui/Text';
import { ExternalLink, BookOpen, Github, BarChart3 } from 'lucide-react';
import type { LucideIcon } from 'lucide-react';

interface ResourceLinkProps {
  href: string;
  icon: LucideIcon;
  label: string;
  description: string;
}

const ResourceLink = ({ href, icon: Icon, label, description }: ResourceLinkProps) => (
  // eslint-disable-next-line react/jsx-no-target-blank -- want analytics referrers
  <a
    href={href}
    target='_blank'
    className='group flex items-start gap-3 rounded-lg bg-other-tonal-fill5 p-4 transition-colors hover:bg-other-tonal-fill10'
  >
    <div className='mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-md bg-other-tonal-fill10'>
      <Icon className='h-4 w-4 text-base-white' />
    </div>
    <div className='flex flex-1 flex-col gap-1'>
      <div className='flex items-center gap-1'>
        <Text variant='strong' color='text.primary'>
          {label}
        </Text>
        <ExternalLink className='h-3 w-3 text-text-secondary opacity-0 transition-opacity group-hover:opacity-100' />
      </div>
      <Text small color='text.secondary'>
        {description}
      </Text>
    </div>
  </a>
);

export const Resources = () => (
  <section className='flex flex-col gap-6'>
    <div className='flex flex-col gap-2'>
      <Text variant='h2' color='text.primary'>
        Go deeper
      </Text>
      <Text body color='text.secondary'>
        Specifications, source code, and live data on UM mechanics.
      </Text>
    </div>
    <div className='grid grid-cols-1 gap-3 tablet:grid-cols-2'>
      <ResourceLink
        href='https://protocol.penumbra.zone/'
        icon={BookOpen}
        label='Penumbra protocol spec'
        description='The reference for ZSwap, batch auctions, the shielded pool, and arbitrage execution.'
      />
      <ResourceLink
        href='https://penumbra.zone/'
        icon={ExternalLink}
        label='penumbra.zone'
        description='Project site with whitepapers, blog posts, and ecosystem updates.'
      />
      <ResourceLink
        href='https://github.com/penumbra-zone/penumbra'
        icon={Github}
        label='penumbra-zone/penumbra'
        description='The reference implementation. The DEX, batch swap, and burn logic live here.'
      />
      <ResourceLink
        href='https://github.com/hitchho/tokenomic'
        icon={BarChart3}
        label='hitchho/tokenomic'
        description='Community-built tokenomics dashboard with charts for issuance, burns, and supply allocation.'
      />
    </div>
  </section>
);
