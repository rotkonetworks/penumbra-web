import createGraphqlClient from '@/pages/inspect/explorer/lib/graphql/createGraphqlClient'
import {
    ActiveVotingPowerQuery,
    ActiveVotingPowerQueryVariables,
    ValidatorStateFilter,
} from '@/pages/inspect/explorer/lib/graphql/generated/types'
import { activeVotingPowerQuery } from '@/pages/inspect/explorer/lib/graphql/queries'

const getActiveVotingPower = async (
    state?: ValidatorStateFilter,
): Promise<number | undefined> => {
    const graphqlClient = createGraphqlClient()

    const result = await graphqlClient
        .query<ActiveVotingPowerQuery, ActiveVotingPowerQueryVariables>(
            activeVotingPowerQuery,
            state ? { filter: { state } } : {},
        )
        .toPromise()

    if (result.error) {
        throw result.error
    }

    return result.data?.validatorsHomepage.stakingParameters.totalStaked
}

export default getActiveVotingPower
