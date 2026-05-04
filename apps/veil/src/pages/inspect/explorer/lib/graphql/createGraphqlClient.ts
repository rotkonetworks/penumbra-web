// istanbul ignore file
import { createClient as createWsClient } from 'graphql-ws'
import {
    cacheExchange,
    Client,
    fetchExchange,
    subscriptionExchange,
} from 'urql'

// Singleton client. The original implementation built a fresh urql Client
// (and a fresh GraphQL-WS client) on every call, with `requestPolicy:
// 'network-only'` so the cache exchange did nothing — every container
// re-fetched the same data on every render. With this module-level cache
// keyed by host, identical queries within a request share results, the
// fetch connection is reused, and the WebSocket is opened lazily by urql
// only when something actually subscribes.
let cached: { host: string; client: Client } | null = null

const createGraphqlClient = (): Client => {
    const host = process.env.NEXT_PUBLIC_GRAPHQL_HOST
    if (!host) {
        throw Error('Missing NEXT_PUBLIC_GRAPHQL_HOST')
    }
    if (cached && cached.host === host) {
        return cached.client
    }

    // graphql-ws's createClient lazily connects on first subscribe, so it's
    // OK to instantiate here even for purely-query callers.
    const wsClient = createWsClient({
        url: `wss://${host}/graphql/ws`,
        lazy: true,
    })

    const client = new Client({
        exchanges: [
            cacheExchange,
            fetchExchange,
            subscriptionExchange({
                forwardSubscription: request => {
                    const input = { ...request, query: request.query ?? '' }

                    return {
                        subscribe(sink) {
                            const unsubscribe = wsClient.subscribe(input, sink)
                            return { unsubscribe }
                        },
                    }
                },
            }),
        ],
        fetchOptions: {
            credentials: 'omit',
            signal: AbortSignal.timeout(10000),
        },
        preferGetMethod: false,
        // 'cache-first' lets identical queries within a render dedupe.
        // For data we expect to be live, individual loaders override with
        // 'network-only' explicitly.
        requestPolicy: 'cache-first',
        url: `https://${host}/graphql`,
    })

    cached = { host, client }
    return client
}

export default createGraphqlClient
