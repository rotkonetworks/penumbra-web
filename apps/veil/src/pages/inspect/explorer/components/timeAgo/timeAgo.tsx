'use client'

import { FC } from 'react'
import { useTicker } from '@/pages/inspect/explorer/lib/hooks'

interface Props {
    className?: string
    timestamp: number
}

// Pure derivation from props + ticker — no state, no effect, just compute
// the formatted string each render. The previous form held timeAgo in
// useState and recomputed via useEffect on every tick (every second), which
// for a 10-row block table meant 10 setStates per second and 10 effect
// re-runs even though the rendered string usually doesn't change.
const TimeAgo: FC<Props> = ({ timestamp }) => {
    const lastTick = useTicker()
    return lastTick.to(timestamp)
}

export default TimeAgo
