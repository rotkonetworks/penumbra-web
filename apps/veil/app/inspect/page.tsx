import { FC } from 'react';
import {
  ActiveProposalPanelContainer,
  BlockPanelContainer,
  BlockTableContainer,
  SearchContainer,
  TransactionPanelContainer,
  TransactionTableContainer,
} from '@/pages/inspect/explorer/containers';
import { Button, Container } from '@/pages/inspect/explorer/components';

const InspectHomePage: FC = () => (
  <>
    <Container>
      <h1 className='font-heading mb-2 text-4xl font-medium'>Penumbra Chain Explorer</h1>
      <SearchContainer />
    </Container>
    <Container className='flex flex-col gap-4'>
      <div>
        <ActiveProposalPanelContainer />
        <div className='flex flex-col gap-4 md:flex-row'>
          <BlockPanelContainer className='flex-1' />
          <TransactionPanelContainer className='flex-1' />
        </div>
      </div>
      <div className='flex flex-col gap-4 lg:flex-row'>
        <BlockTableContainer
          className='flex-1'
          header={
            <div className='flex items-center justify-between'>
              <h2 className='text-2xl font-medium'>Latest blocks</h2>
              <Button density='compact' href='/inspect/blocks'>
                View all
              </Button>
            </div>
          }
          limit={{ length: 10 }}
          subscription
        />
        <TransactionTableContainer
          className='flex-1'
          header={
            <div className='flex items-center justify-between'>
              <h2 className='text-2xl font-medium'>Latest transactions</h2>
              <Button density='compact' href='/inspect/txs'>
                View all
              </Button>
            </div>
          }
          limit={{ length: 10 }}
          blockHeight
          subscription
        />
      </div>
    </Container>
  </>
);

export default InspectHomePage;
