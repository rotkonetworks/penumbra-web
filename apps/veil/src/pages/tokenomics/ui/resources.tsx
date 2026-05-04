import { Text } from '@penumbra-zone/ui/Text';
import { ExternalLink, BookOpen, Compass, MessageSquare } from 'lucide-react';
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
        Specifications, walkthroughs, and conversations from the people building Penumbra.
      </Text>
    </div>
    <div className='grid grid-cols-1 gap-3 tablet:grid-cols-2'>
      <ResourceLink
        href='https://guide.penumbra.zone/'
        icon={Compass}
        label='Penumbra guide'
        description='Hands-on walkthroughs: running a node, building wallets, staking, governance, and using the DEX.'
      />
      <ResourceLink
        href='https://forum.penumbra.zone/'
        icon={MessageSquare}
        label='Community forum'
        description='Open discussion on protocol upgrades, validator operations, governance proposals, and ecosystem ideas.'
      />
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
    </div>
  </section>
);
