import { FC } from 'react'
import { ProposalState } from '@/pages/inspect/explorer/lib/graphql/generated/types'
import { ucFirst } from '@/pages/inspect/explorer/lib/utils'
import { Pill, PillProps } from '../pill'

interface Props {
    className?: string
    state?: ProposalState
}

const ProposalStatePill: FC<Props> = props => {
    let context: PillProps['context']

    switch (props.state) {
        case ProposalState.Claimed:
            context = 'success'
            break
        case ProposalState.Voting:
            context = 'caution'
            break
        case ProposalState.Withdrawn:
            context = 'destructive'
            break
        case ProposalState.Finished:
            context = 'default'
            break
        default:
            return null
    }

    return (
        <Pill
            className={props.className}
            context={context}
            priority="secondary"
            technical
        >
            {ucFirst(props.state)}
        </Pill>
    )
}

export default ProposalStatePill
