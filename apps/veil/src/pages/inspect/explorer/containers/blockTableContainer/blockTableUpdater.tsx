// istanbul ignore file
'use client'

import { FC, useEffect, useRef, useState } from 'react'
import { useClient } from 'urql'
import { pipe, subscribe } from 'wonka'
import { BlockTable, Pagination, ResultCount } from '@/pages/inspect/explorer/components'
import { animationFrameMs } from '@/pages/inspect/explorer/lib/constants'
import dayjs from '@/pages/inspect/explorer/lib/dayjs'
import {
    BlockUpdateSubscription,
    BlockUpdateSubscriptionVariables,
    BlocksQuery,
    BlocksQueryVariables,
} from '@/pages/inspect/explorer/lib/graphql/generated/types'
import blockSubscription from '@/pages/inspect/explorer/lib/graphql/subscriptions/blockSubscription.graphql'
import blocksQuery from '@/pages/inspect/explorer/lib/graphql/queries/blocksQuery.graphql'
import { TransformedPartialBlockFragment } from '@/pages/inspect/explorer/lib/types'
import { Props as BlockTableContainerProps } from './blockTableContainer'

interface Props extends BlockTableContainerProps {
    blocks?: TransformedPartialBlockFragment[]
    total: number
}

const BlockTableUpdater: FC<Props> = ({
    filter,
    limit,
    pagination,
    subscription,
    total,
    ...props
}) => {
    const client = useClient()
    const queueRef = useRef<TransformedPartialBlockFragment[]>([])
    const animationFrameRef = useRef<number>(undefined)
    const updateTimestampRef = useRef(0)
    const [blocks, setBlocks] = useState(props.blocks ?? [])

    const blockHeightsRef = useRef(
        new Set(props.blocks?.map(block => block.height))
    )

    useEffect(() => {
        if (!subscription) {
            return
        }

        const source = client.subscription<
            BlockUpdateSubscription,
            BlockUpdateSubscriptionVariables
        >(blockSubscription, {})

        // The subscription only ever pushes the *current* head block. If the
        // socket misses any blocks (transient disconnect, browser tab idle,
        // server-side missed publish), the next event would land non-
        // contiguously and the panel would render a hole. Detect that and
        // fall back to a one-shot REST-style query to refill the visible
        // window so the table stays contiguous.
        const refillVisibleWindow = async () => {
            try {
                const result = await client
                    .query<BlocksQuery, BlocksQueryVariables>(
                        blocksQuery,
                        { limit: { length: 10, offset: 0 } },
                        { requestPolicy: 'network-only' },
                    )
                    .toPromise()
                const fresh = result.data?.blocks?.items ?? []
                if (!fresh.length) return
                const transformed = fresh.map(b => ({
                    height: b.height,
                    timestamp: dayjs(b.createdAt).valueOf(),
                    transactionsCount: b.transactionsCount,
                }))
                blockHeightsRef.current = new Set(transformed.map(b => b.height))
                queueRef.current = []
                setBlocks(transformed)
            } catch {
                // ignore — next sub event will retry
            }
        }

        const { unsubscribe } = pipe(
            source,
            subscribe(result => {
                const block = result.data?.latestBlocks

                if (!block || blockHeightsRef.current.has(block.height)) {
                    return
                }

                // Detect a gap: the incoming block height should be exactly 1
                // above whichever height we currently consider "top" (queued
                // or rendered). If it's farther, fetch the missing window in
                // one round-trip and reset.
                const knownTop = Math.max(
                    blocks[0]?.height ?? 0,
                    queueRef.current[queueRef.current.length - 1]?.height ?? 0,
                )
                if (knownTop > 0 && block.height - knownTop > 1) {
                    void refillVisibleWindow()
                    return
                }

                blockHeightsRef.current.add(block.height)

                queueRef.current.push({
                    height: block.height,
                    timestamp: dayjs(block.createdAt).valueOf(),
                    transactionsCount: block.transactionsCount,
                })
            })
        )

        // Also refill on visibility-change wake — closes the gap from the
        // common "tab was backgrounded for 30 minutes" failure mode.
        const onVisible = () => {
            if (document.visibilityState === 'visible') void refillVisibleWindow()
        }
        document.addEventListener('visibilitychange', onVisible)

        return () => {
            unsubscribe()
            document.removeEventListener('visibilitychange', onVisible)
        }
    }, [client, subscription, blocks])

    useEffect(() => {
        const animationLoop = () => {
            if (queueRef.current.length) {
                const now = performance.now()

                if (now - updateTimestampRef.current >= animationFrameMs) {
                    const block = queueRef.current.shift()

                    if (block) {
                        setBlocks(prev => [block, ...prev].slice(0, 10))
                        updateTimestampRef.current = now
                    }
                }
            }

            animationFrameRef.current = requestAnimationFrame(animationLoop)
        }

        animationFrameRef.current = requestAnimationFrame(animationLoop)

        return () => {
            if (animationFrameRef.current) {
                cancelAnimationFrame(animationFrameRef.current)
            }
        }
    }, [])

    const page = (limit.offset ?? 0) / limit.length + 1
    const totalPages = Math.ceil(total / limit.length)

    return (
        <BlockTable
            {...props}
            blocks={blocks}
            footer={
                pagination ? (
                    <div className="flex flex-col items-center gap-2">
                        <Pagination page={page} totalPages={totalPages} />
                        <ResultCount
                            length={blocks.length}
                            offset={limit.offset}
                            total={total}
                        />
                    </div>
                ) : undefined
            }
        />
    )
}

export default BlockTableUpdater
