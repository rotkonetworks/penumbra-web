import createGraphqlClient from '@/pages/inspect/explorer/lib/graphql/createGraphqlClient'
import {
    ValidatorVotingPercentageQuery,
    ValidatorVotingPercentageQueryVariables,
} from '@/pages/inspect/explorer/lib/graphql/generated/types'
import { validatorVotingPercentageQuery } from '@/pages/inspect/explorer/lib/graphql/queries'

const getValidatorVotingPercentage = async (
    id: string
): Promise<number | undefined> => {
    const graphqlClient = createGraphqlClient()

    const result = await graphqlClient
        .query<
            ValidatorVotingPercentageQuery,
            ValidatorVotingPercentageQueryVariables
        >(validatorVotingPercentageQuery, { id })
        .toPromise()

    if (result.error) {
        throw result.error
    }

    return result.data?.validatorDetails?.votingPowerActivePercentage
}

export default getValidatorVotingPercentage
