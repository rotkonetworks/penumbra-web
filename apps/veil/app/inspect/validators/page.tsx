import { FC } from 'react';
import {
  Breadcrumb,
  Breadcrumbs,
  Button,
  Container,
  FilterSelector,
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

interface Props {
  searchParams: Promise<{ dir?: string; filter?: string; sort?: string }>;
}

const ValidatorsPage: FC<Props> = async props => {
  const searchParams = await props.searchParams;

  return (
    <Container>
      <Breadcrumbs>
        <Breadcrumb href='/inspect'>Explore</Breadcrumb>
        <Breadcrumb>Validators</Breadcrumb>
      </Breadcrumbs>
      <div className='grid grid-cols-12 gap-4 lg:items-start'>
        <ActiveVotingPowerPanelContainer className='col-span-full md:col-span-4' />
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
                  <Button density='compact' href='https://app.penumbra.zone/#/staking'>
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
              <FilterSelector
                filters={['active', 'inactive']}
                selectedFilter={searchParams.filter}
              />
            </div>
          }
          inactive={searchParams.filter === 'inactive'}
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
