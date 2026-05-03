import { FC } from 'react';
import { Breadcrumb, Breadcrumbs, Container } from '@/pages/inspect/explorer/components';
import {
  TransactionTableContainer,
  ValidatorActiveSincePanelContainer,
  ValidatorContainer,
  ValidatorDelegationFlowContainer,
  ValidatorStatusContainer,
  ValidatorVotingPercentagePanelContainer,
  ValidatorVotingPowerHistoryContainer,
  ValidatorVotingPowerPanelContainer,
} from '@/pages/inspect/explorer/containers';
import { classNames } from '@/pages/inspect/explorer/lib/utils';

interface Props {
  params: Promise<{ id: string }>;
}

const ValidatorPage: FC<Props> = async props => {
  const { id } = await props.params;

  return (
    <Container>
      <Breadcrumbs>
        <Breadcrumb href='/inspect'>Explore</Breadcrumb>
        <Breadcrumb href='/inspect/validators'>Validators</Breadcrumb>
      </Breadcrumbs>
      <div className='grid grid-cols-12 items-start gap-4'>
        <ValidatorContainer
          className={classNames(
            'col-span-12 md:col-span-5 md:row-span-4',
            'lg:col-span-4! lg:row-span-3',
          )}
          validatorId={id}
        />
        <ValidatorVotingPowerPanelContainer
          className={classNames(
            'col-span-12 md:col-span-7 md:col-start-6',
            'md:row-start-1 lg:col-span-3! lg:col-start-5!',
          )}
          validatorId={id}
        />
        <ValidatorVotingPercentagePanelContainer
          className={classNames(
            'col-span-12 md:col-span-3 md:col-start-6',
            'md:row-start-2 lg:col-span-2! lg:col-start-8!',
            'lg:row-start-1!',
          )}
          validatorId={id}
        />
        <ValidatorActiveSincePanelContainer
          className={classNames(
            'col-span-12 md:col-span-4 md:col-start-9',
            'md:row-start-2 lg:col-span-3! lg:col-start-10!',
            'lg:row-start-1!',
          )}
          validatorId={id}
        />
        <ValidatorStatusContainer
          className={classNames(
            'col-span-12 md:col-span-7 md:col-start-6',
            'lg:col-span-8! lg:col-start-5!',
          )}
          validatorId={id}
        />
        <ValidatorVotingPowerHistoryContainer
          className={classNames(
            'col-span-12 md:col-span-7 md:col-start-6',
            'lg:col-span-8! lg:col-start-5!',
          )}
          validatorId={id}
        />
        <ValidatorDelegationFlowContainer
          className={classNames(
            'col-span-12 md:col-span-7 md:col-start-6',
            'lg:col-span-8! lg:col-start-5!',
          )}
          validatorId={id}
        />
        <TransactionTableContainer
          className={classNames(
            'col-span-12 md:col-span-7 md:col-start-6',
            'lg:col-span-8! lg:col-start-5!',
          )}
          filter={{ validator: id }}
          header={<h2 className='text-2xl font-medium'>Latest transactions</h2>}
          limit={{ length: 10 }}
          blockHeight
          time
        />
      </div>
    </Container>
  );
};

export default ValidatorPage;
