// istanbul ignore file
import { FC, Suspense } from 'react'
import { TransactionPanel } from '@/pages/inspect/explorer/components'
import TransactionPanelLoader from './transactionPanelLoader'

export interface Props {
    className?: string
}

const TransactionPanelContainer: FC<Props> = props => (
    <Suspense fallback={<TransactionPanel number={0} {...props} />}>
        <TransactionPanelLoader {...props} />
    </Suspense>
)

export default TransactionPanelContainer
