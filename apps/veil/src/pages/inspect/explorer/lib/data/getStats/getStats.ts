import createGraphqlClient from '@/pages/inspect/explorer/lib/graphql/createGraphqlClient'
import { StatsQuery, StatsQueryVariables } from '@/pages/inspect/explorer/lib/graphql/generated/types'
import { statsQuery } from '@/pages/inspect/explorer/lib/graphql/queries'

const getStats = async (): Promise<StatsQuery['stats'] | undefined> => {
    const graphqlClient = createGraphqlClient()

    const result = await graphqlClient
        .query<StatsQuery, StatsQueryVariables>(statsQuery, {})
        .toPromise()

    if (result.error) {
        throw result.error
    }

    return result.data?.stats
}

export default getStats
