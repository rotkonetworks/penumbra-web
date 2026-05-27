export const dynamic = 'force-dynamic';
import { FC } from 'react';
import {
  Breadcrumb,
  Breadcrumbs,
  Button,
  Container,
  FilterSelector,
  ValidatorSortToggle,
} from '@/pages/inspect/explorer/components';
import {
  ActiveValidatorsPanelContainer,
  ActiveVotingPowerPanelContainer,
  ChainParametersContainer,
  MinValidatorStakePanelContainer,
  ValidatorParametersContainer,
  ValidatorTableContainer,
} from '@/pages/inspect/explorer/containers';
import { classNames } from '@/pages/inspect/explorer/lib/utils';
import { ValidatorStateFilter } from '@/pages/inspect/explorer/lib/graphql/generated/types';
import { ActiveStakeChart } from '@/pages/inspect/explorer/ui/active-stake-chart';
import { fetchActiveStakeHistory } from '@/pages/inspect/explorer/server/active-stake-history';
import { parseStakeRange, stakeRangeDays } from '@/pages/inspect/explorer/ui/stake-range';

interface Props {
  searchParams: Promise<{
    all?: string;
    dir?: string;
    filter?: string;
    sort?: string;
    range?: string;
  }>;
}

const ValidatorsPage: FC<Props> = async props => {
  const searchParams = await props.searchParams;
  // Cap SSR rendering at 50 rows by default — well past top-of-fold,
  // and the active validator set is ~250 rows. Unbounded rendering
  // inflates the response by ~4x for content nobody reads before
  // scrolling. `?all=1` opts back into the full list.
  const validatorLimit = searchParams.all === '1' ? undefined : 50;
  const stateFilter =
    searchParams.filter === 'inactive'
      ? ValidatorStateFilter.Inactive
      : ValidatorStateFilter.Active;

  // Active-stake + delegation/undelegation flow timeseries for the
  // user-selected window. Server-fetched here so the chart hydrates
  // immediately on first paint alongside the rest of the panel data.
  const stakeRange = parseStakeRange(searchParams.range);
  const stakeHistory = await fetchActiveStakeHistory(stakeRangeDays(stakeRange));

  return (
    <Container>
      <Breadcrumbs>
        <Breadcrumb href='/explore'>Explore</Breadcrumb>
        <Breadcrumb>Validators</Breadcrumb>
      </Breadcrumbs>

      <ActiveStakeChart data={stakeHistory} currentRange={stakeRange} />
      <div className='grid grid-cols-12 gap-4 lg:items-start'>
        <ActiveVotingPowerPanelContainer
          className='col-span-full md:col-span-4'
          state={stateFilter}
        />
        <ActiveValidatorsPanelContainer
          className={classNames('col-span-full sm:col-span-6 md:col-span-4')}
        />
        <MinValidatorStakePanelContainer
          className={classNames('col-span-full sm:col-span-6 md:col-span-4')}
        />
        <ChainParametersContainer
          className={classNames(
            'col-span-full md:col-span-6 lg:col-span-3!',
            'lg:col-start-10! lg:row-start-2!',
          )}
        />
        <ValidatorParametersContainer
          className={classNames(
            'col-span-full md:col-span-6 lg:col-span-3!',
            'lg:col-start-10! lg:row-start-3!',
          )}
        />
        <ValidatorTableContainer
          className={classNames(
            'col-span-full lg:col-span-9 lg:col-start-1',
            'lg:row-span-3 lg:row-start-2',
          )}
          header={
            <div className='flex flex-col gap-6'>
              <div
                className={classNames(
                  'flex flex-col gap-2 md:flex-row',
                  'md:items-center md:justify-between',
                )}
              >
                <h1 className='text-2xl font-medium'>Validator performance</h1>
                <div className='flex flex-wrap gap-2'>
                  <Button density='compact' href='/portfolio/staking'>
                    Delegate to a validator
                  </Button>
                  <Button
                    density='compact'
                    href='https://guide.penumbra.zone/node/pd/validator'
                    priority='secondary'
                  >
                    Become a validator
                  </Button>
                </div>
              </div>
              <div className='flex flex-col gap-2 md:flex-row md:items-center md:justify-between'>
                <FilterSelector
                  filters={['active', 'inactive']}
                  selectedFilter={searchParams.filter}
                />
                <ValidatorSortToggle />
              </div>
            </div>
          }
          inactive={searchParams.filter === 'inactive'}
          limit={validatorLimit}
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          sort={searchParams.sort as any}
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          sortDir={searchParams.dir as any}
        />
      </div>
    </Container>
  );
};

export default ValidatorsPage;
