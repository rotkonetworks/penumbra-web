import { FC } from 'react'
import { ProposalOutcome } from '@/pages/inspect/explorer/lib/graphql/generated/types'
import { ucFirst } from '@/pages/inspect/explorer/lib/utils'
import { Pill, PillProps } from '../pill'

interface Props {
    className?: string
    outcome?: null | ProposalOutcome
}

const ProposalOutcomePill: FC<Props> = props => {
    let context: PillProps['context']

    switch (props.outcome) {
        case ProposalOutcome.Passed:
            context = 'success'
            break
        case ProposalOutcome.Failed:
        case ProposalOutcome.Slashed:
            context = 'destructive'
            break
        default:
            return null
    }

    return (
        <Pill className={props.className} context={context} technical>
            {ucFirst(props.outcome)}
        </Pill>
    )
}

export default ProposalOutcomePill
