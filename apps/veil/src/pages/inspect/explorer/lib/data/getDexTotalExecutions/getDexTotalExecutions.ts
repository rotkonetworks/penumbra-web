import createGraphqlClient from '@/pages/inspect/explorer/lib/graphql/createGraphqlClient'
import {
    DexTotalExecutionsQuery,
    DexTotalExecutionsQueryVariables,
} from '@/pages/inspect/explorer/lib/graphql/generated/types'
import { dexTotalExecutionsQuery } from '@/pages/inspect/explorer/lib/graphql/queries'

const getDexTotalExecutions = async (): Promise<number | undefined> => {
    const graphqlClient = createGraphqlClient()

    const result = await graphqlClient
        .query<
            DexTotalExecutionsQuery,
            DexTotalExecutionsQueryVariables
        >(dexTotalExecutionsQuery, {})
        .toPromise()

    if (result.error) {
        throw result.error
    }

    return result.data?.dexStats.totalExecutions
}

export default getDexTotalExecutions
