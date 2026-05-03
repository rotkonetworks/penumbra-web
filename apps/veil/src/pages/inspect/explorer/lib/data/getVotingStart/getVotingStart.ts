import dayjs from '@/pages/inspect/explorer/lib/dayjs'
import createGraphqlClient from '@/pages/inspect/explorer/lib/graphql/createGraphqlClient'
import {
    VotingStartQuery,
    VotingStartQueryVariables,
} from '@/pages/inspect/explorer/lib/graphql/generated/types'
import { votingStartQuery } from '@/pages/inspect/explorer/lib/graphql/queries'
import { VotingStart } from '@/pages/inspect/explorer/lib/types'

const getVotingStart = async (
    proposalId: number
): Promise<undefined | VotingStart> => {
    const graphqlClient = createGraphqlClient()

    const result = await graphqlClient
        .query<
            VotingStartQuery,
            VotingStartQueryVariables
        >(votingStartQuery, { proposalId })
        .toPromise()

    if (result.error) {
        throw result.error
    } else if (!result.data?.proposalDetail) {
        return
    }

    return {
        blockHeight: result.data.proposalDetail.votingStartedBlockHeight,
        timestamp: dayjs(
            result.data.proposalDetail.votingStartedTimestamp
        ).valueOf(),
    }
}

export default getVotingStart
