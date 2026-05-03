import { notFound } from 'next/navigation';
import { FC } from 'react';
import {
  Breadcrumb,
  Breadcrumbs,
  Container,
  FilterSelector,
} from '@/pages/inspect/explorer/components';
import { TransactionTableContainer } from '@/pages/inspect/explorer/containers';
import { IbcStatusFilter } from '@/pages/inspect/explorer/lib/graphql/generated/types';

interface Props {
  searchParams: Promise<{ filter?: string; page?: string }>;
}

const TransactionsPage: FC<Props> = async props => {
  const searchParams = await props.searchParams;
  const page = searchParams.page ? Number(searchParams.page) - 1 : 0;

  if (Number.isNaN(page) || page < 0) {
    notFound();
  }

  const length = 20;
  const offset = page * length;

  const ibcStatusMap: Record<string, IbcStatusFilter> = {
    completed: IbcStatusFilter.Completed,
    error: IbcStatusFilter.Error,
    expired: IbcStatusFilter.Expired,
    pending: IbcStatusFilter.Pending,
  };
  const ibcStatusFilter = ibcStatusMap[searchParams.filter ?? ''];

  return (
    <Container>
      <Breadcrumbs>
        <Breadcrumb href='/inspect'>Explore</Breadcrumb>
        <Breadcrumb>Transactions</Breadcrumb>
      </Breadcrumbs>
      <TransactionTableContainer
        filter={ibcStatusFilter ? { ibcStatus: ibcStatusFilter } : undefined}
        header={
          <div className='flex flex-col gap-6'>
            <h1 className='text-2xl font-medium'>Transactions</h1>
            <FilterSelector
              filters={['all', 'pending', 'completed', 'expired', 'error']}
              selectedFilter={searchParams.filter || 'all'}
            />
          </div>
        }
        limit={{ length, offset }}
        blockHeight
        pagination
        time
      />
    </Container>
  );
};

export default TransactionsPage;
