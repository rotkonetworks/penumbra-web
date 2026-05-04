'use client';

import Link from 'next/link';
import { observer } from 'mobx-react-lite';
import { Text } from '@penumbra-zone/ui/Text';
import { ValueViewComponent } from '@penumbra-zone/ui/ValueView';
import { Coins, ArrowDownCircle, Hourglass, CheckCircle2 } from 'lucide-react';
import { connectionStore } from '@/shared/model/connection';
import { useBalances } from '@/shared/api/balances';
import { useStakingTokenBalance } from '@/pages/portfolio/staking/api/use-staking-token-balance';
import { useDelegations } from '@/pages/portfolio/staking/api/use-delegations';
import { useUnbondingTokens } from '@/pages/portfolio/staking/api/use-unbonding-tokens';
import { getAmount } from '@penumbra-zone/getters/value-view';
import { joinLoHiAmount } from '@penumbra-zone/types/amount';
import type { LucideIcon } from 'lucide-react';

interface CardProps {
  href?: string;
  icon: LucideIcon;
  label: string;
  primary: React.ReactNode;
  secondary?: React.ReactNode;
}

const Card = ({ href, icon: Icon, label, primary, secondary }: CardProps) => {
  const body = (
    <div className='group flex h-full flex-col gap-2 rounded-lg bg-other-tonal-fill5 p-4 transition-colors hover:bg-other-tonal-fill10'>
      <div className='flex items-center gap-2'>
        <div className='flex h-7 w-7 items-center justify-center rounded-md bg-other-tonal-fill10'>
          <Icon className='h-4 w-4 text-base-white' />
        </div>
        <Text detail color='text.secondary'>
          {label}
        </Text>
      </div>
      <div className='font-mono text-lg font-medium text-text-primary'>{primary}</div>
      {secondary && (
        <Text small color='text.secondary'>
          {secondary}
        </Text>
      )}
    </div>
  );
  return href ? <Link href={href}>{body}</Link> : body;
};

/**
 * Compact summary card shown above the assets table on /portfolio.
 *
 * Surfaces the four buckets the assets table doesn't show today:
 *   - Available (free shielded UM) — quick "ready to trade or delegate"
 *   - Staked — number of validators delegated to (delegation tokens are
 *     per-validator denoms; summing them in UM would require applying
 *     each validator's rate, so we count delegations and link out)
 *   - Unbonding — sum of UM still in the unbonding window
 *   - Claimable — sum of UM whose unbonding period elapsed; click to
 *     jump to the staking page where the Claim button lives
 *
 * Hidden when the user has nothing in any bucket — keeps the page
 * clean for users who haven't shielded UM yet.
 */
export const BalanceSummary = observer(() => {
  const { connected, subaccount } = connectionStore;
  const { data: balances } = useBalances(subaccount);
  const { valueView: stakingTokens } = useStakingTokenBalance();
  const { data: delegations = [] } = useDelegations(balances);
  const { data: unbonding } = useUnbondingTokens();

  if (!connected) return null;

  // Threshold guards so an empty wallet doesn't render a card stack of zeros.
  const hasFree = !!stakingTokens && joinLoHiAmount(getAmount(stakingTokens)) > 0n;
  const hasStaked = delegations.length > 0;
  const hasUnbonding =
    !!unbonding?.notYetClaimable.total &&
    joinLoHiAmount(getAmount(unbonding.notYetClaimable.total)) > 0n;
  const hasClaimable =
    !!unbonding?.claimable.total &&
    joinLoHiAmount(getAmount(unbonding.claimable.total)) > 0n;

  if (!hasFree && !hasStaked && !hasUnbonding && !hasClaimable) {
    return null;
  }

  return (
    <div className='grid grid-cols-2 gap-3 desktop:grid-cols-4'>
      <Card
        icon={Coins}
        label='Available'
        primary={
          stakingTokens ? (
            <ValueViewComponent valueView={stakingTokens} priority='primary' />
          ) : (
            '—'
          )
        }
        secondary='Free shielded UM, ready to trade or stake'
      />
      <Card
        href='/portfolio/staking'
        icon={ArrowDownCircle}
        label='Staked'
        primary={
          delegations.length > 0
            ? `${delegations.length} validator${delegations.length === 1 ? '' : 's'}`
            : '—'
        }
        secondary='Tap to view delegations + earn rewards'
      />
      <Card
        href='/portfolio/staking'
        icon={Hourglass}
        label='Unbonding'
        primary={
          unbonding?.notYetClaimable.total ? (
            <ValueViewComponent
              valueView={unbonding.notYetClaimable.total}
              priority='secondary'
            />
          ) : (
            '—'
          )
        }
        secondary='Becomes UM after the unbonding period'
      />
      <Card
        href='/portfolio/staking'
        icon={CheckCircle2}
        label='Claimable'
        primary={
          unbonding?.claimable.total ? (
            <ValueViewComponent
              valueView={unbonding.claimable.total}
              priority='primary'
            />
          ) : (
            '—'
          )
        }
        secondary={hasClaimable ? 'Tap to claim now' : 'No claimable balance yet'}
      />
    </div>
  );
});
