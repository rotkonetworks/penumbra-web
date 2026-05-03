import dayjs from '@/pages/inspect/explorer/lib/dayjs'
import createGraphqlClient from '@/pages/inspect/explorer/lib/graphql/createGraphqlClient'
import {
    ValidatorActiveSinceQuery,
    ValidatorActiveSinceQueryVariables,
} from '@/pages/inspect/explorer/lib/graphql/generated/types'
import { validatorActiveSinceQuery } from '@/pages/inspect/explorer/lib/graphql/queries'

const getValidatorActiveSince = async (
    id: string
): Promise<string | undefined> => {
    const graphqlClient = createGraphqlClient()

    const result = await graphqlClient
        .query<
            ValidatorActiveSinceQuery,
            ValidatorActiveSinceQueryVariables
        >(validatorActiveSinceQuery, { id })
        .toPromise()

    if (result.error) {
        throw result.error
    } else if (!result.data?.validatorDetails?.activeSince) {
        return
    }

    return dayjs().to(result.data.validatorDetails.activeSince)
}

export default getValidatorActiveSince
