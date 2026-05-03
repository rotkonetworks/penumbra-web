import dayjs from '@/pages/inspect/explorer/lib/dayjs'
import createGraphqlClient from '@/pages/inspect/explorer/lib/graphql/createGraphqlClient'
import {
    ProposalState,
    VotingEndQuery,
    VotingEndQueryVariables,
} from '@/pages/inspect/explorer/lib/graphql/generated/types'
import { votingEndQuery } from '@/pages/inspect/explorer/lib/graphql/queries'
import { VotingEnd } from '@/pages/inspect/explorer/lib/types'

const getVotingEnd = async (
    proposalId: number
): Promise<undefined | VotingEnd> => {
    const graphqlClient = createGraphqlClient()

    const result = await graphqlClient
        .query<
            VotingEndQuery,
            VotingEndQueryVariables
        >(votingEndQuery, { proposalId })
        .toPromise()

    if (result.error) {
        throw result.error
    } else if (!result.data?.proposalDetail) {
        return
    }

    return {
        endBlockHeight: result.data.proposalDetail.votingEndedBlockHeight,
        timestamp: dayjs(
            result.data.proposalDetail.votingEndedTimestamp
        ).valueOf(),
        votingInProgress:
            result.data.proposalDetail.state === ProposalState.Voting,
    }
}

export default getVotingEnd
