import createGraphqlClient from '@/pages/inspect/explorer/lib/graphql/createGraphqlClient'
import {
    ValidatorVotingPowerQuery,
    ValidatorVotingPowerQueryVariables,
} from '@/pages/inspect/explorer/lib/graphql/generated/types'
import { validatorVotingPowerQuery } from '@/pages/inspect/explorer/lib/graphql/queries'

const getValidatorVotingPower = async (
    id: string
): Promise<undefined | ValidatorVotingPowerQuery['validatorDetails']> => {
    const graphqlClient = createGraphqlClient()

    const result = await graphqlClient
        .query<
            ValidatorVotingPowerQuery,
            ValidatorVotingPowerQueryVariables
        >(validatorVotingPowerQuery, { id })
        .toPromise()

    if (result.error) {
        throw result.error
    }

    return result.data?.validatorDetails
}

export default getValidatorVotingPower
