import dayjs from '@/pages/inspect/explorer/lib/dayjs'
import createGraphqlClient from '@/pages/inspect/explorer/lib/graphql/createGraphqlClient'
import {
    CollectionLimit,
    PastProposalsQuery,
    PastProposalsQueryVariables,
} from '@/pages/inspect/explorer/lib/graphql/generated/types'
import { pastProposalsQuery } from '@/pages/inspect/explorer/lib/graphql/queries'
import { TransformedPastProposal } from '@/pages/inspect/explorer/lib/types'
import { transformProposalKind } from '@/pages/inspect/explorer/lib/utils'

const getPastProposals = async (
    limit: CollectionLimit
): Promise<{ proposals: TransformedPastProposal[]; total: number }> => {
    const graphqlClient = createGraphqlClient()

    const result = await graphqlClient
        .query<
            PastProposalsQuery,
            PastProposalsQueryVariables
        >(pastProposalsQuery, { limit })
        .toPromise()

    if (result.error) {
        throw result.error
    } else if (!result.data) {
        return { proposals: [], total: 0 }
    }

    const proposals = result.data.pastProposals.items.map(proposal => ({
        ...proposal,
        endTimestamp: dayjs(proposal.endTimestamp).valueOf(),
        kind: transformProposalKind(proposal.kind),
    }))

    return { proposals, total: result.data.pastProposals.total }
}

export default getPastProposals
