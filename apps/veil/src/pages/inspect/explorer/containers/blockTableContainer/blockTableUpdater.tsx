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
} from '@/pages/inspect/explorer/lib/graphql/generated/types'
import blockSubscription from '@/pages/inspect/explorer/lib/graphql/subscriptions/blockSubscription.graphql'
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

        const { unsubscribe } = pipe(
            source,
            subscribe(result => {
                const block = result.data?.latestBlocks

                if (!block || blockHeightsRef.current.has(block.height)) {
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

        return () => unsubscribe()
    }, [client, subscription])

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
