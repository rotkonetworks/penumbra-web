import createGraphqlClient from '@/pages/inspect/explorer/lib/graphql/createGraphqlClient'
import {
    ValidatorVotingPowerHistoryQuery,
    ValidatorVotingPowerHistoryQueryVariables,
} from '@/pages/inspect/explorer/lib/graphql/generated/types'
import { validatorVotingPowerHistoryQuery } from '@/pages/inspect/explorer/lib/graphql/queries'

const getValidatorVotingPowerHistory = async (
    validatorId: string,
    startTime?: string,
    endTime?: string,
    limit?: number
): Promise<ValidatorVotingPowerHistoryQuery['validatorVotingPowerHistory']> => {
    const graphqlClient = createGraphqlClient()

    const result = await graphqlClient
        .query<
            ValidatorVotingPowerHistoryQuery,
            ValidatorVotingPowerHistoryQueryVariables
        >(validatorVotingPowerHistoryQuery, {
            endTime: endTime || null,
            limit: limit || null,
            startTime: startTime || null,
            validatorId,
        })
        .toPromise()

    if (result.error) {
        throw result.error
    }

    return result.data?.validatorVotingPowerHistory || []
}

export default getValidatorVotingPowerHistory
