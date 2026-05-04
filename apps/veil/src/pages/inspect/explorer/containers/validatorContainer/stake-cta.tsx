'use client';

import Link from 'next/link';
import { Coins } from 'lucide-react';
import type { FC } from 'react';

interface Props {
  validatorId: string;
}

/**
 * "Stake to this validator" call-to-action shown above the validator
 * read-only view in /explore/validator/[id]. Links to the staking page
 * with a `?delegate=<id>` query param that pre-opens the delegate
 * dialog for the same validator. Click-through means the user only
 * sees one validator-info layout (the detailed one in /explore) and
 * the staking-flow validator picker stays out of their way.
 *
 * Anonymous on /explore (no wallet connection check); the staking
 * page handles connect-or-stake prompting itself.
 */
export const StakeCta: FC<Props> = ({ validatorId }) => (
  <Link
    href={`/portfolio/staking?delegate=${encodeURIComponent(validatorId)}`}
    className='inline-flex items-center justify-center gap-2 rounded-sm bg-primary-main px-4 py-2 text-sm font-medium text-base-black transition-colors hover:bg-primary-light'
  >
    <Coins className='h-4 w-4' />
    Stake to this validator
  </Link>
);
