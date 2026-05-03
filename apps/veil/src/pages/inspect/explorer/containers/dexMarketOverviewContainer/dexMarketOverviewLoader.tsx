// istanbul ignore file
import { FC } from 'react'
import { Surface } from '@/pages/inspect/explorer/components'
import getTradingPairLiquidity from '@/pages/inspect/explorer/lib/data/getTradingPairLiquidity'
import getTradingVolume24h from '@/pages/inspect/explorer/lib/data/getTradingVolume24h'
import { classNames } from '@/pages/inspect/explorer/lib/utils'
import { Props } from './dexMarketOverviewContainer'

function truncateAssetId(id: string): string {
    if (id.length > 16) return `${id.slice(0, 8)}...${id.slice(-6)}`
    return id
}

function formatLargeNumber(raw: string): string {
    const num = Number(raw)
    if (Number.isNaN(num) || num === 0) return '0'
    if (num >= 1e18) return `${(num / 1e18).toFixed(2)}E`
    if (num >= 1e15) return `${(num / 1e15).toFixed(2)}P`
    if (num >= 1e12) return `${(num / 1e12).toFixed(2)}T`
    if (num >= 1e9) return `${(num / 1e9).toFixed(2)}B`
    if (num >= 1e6) return `${(num / 1e6).toFixed(2)}M`
    if (num >= 1e3) return `${(num / 1e3).toFixed(1)}K`
    return num.toLocaleString()
}

const DexMarketOverviewLoader: FC<Props> = async props => {
    const [pairs, volumes] = await Promise.all([
        getTradingPairLiquidity(10),
        getTradingVolume24h(10),
    ])

    const hasPairs = pairs.length > 0
    const hasVolumes = volumes.length > 0

    if (!hasPairs && !hasVolumes) {
        return (
            <Surface
                as="section"
                className={classNames(
                    'flex flex-col gap-6 p-6',
                    props.className
                )}
            >
                <header>
                    <h2 className="text-2xl font-medium">Market overview</h2>
                </header>
                <p className="text-text-secondary">
                    No market data available yet.
                </p>
            </Surface>
        )
    }

    return (
        <Surface
            as="section"
            className={classNames('flex flex-col gap-6 p-6', props.className)}
        >
            <header>
                <h2 className="text-2xl font-medium">Market overview</h2>
            </header>

            {hasVolumes && (
                <div>
                    <h3 className="text-text-secondary mb-3 text-sm font-medium">
                        24h trading volume
                    </h3>
                    <div className="overflow-x-auto">
                        <table className="w-full text-sm">
                            <thead>
                                <tr className="border-border-secondary border-b">
                                    <th className="pr-4 pb-2 text-left font-medium">
                                        Asset
                                    </th>
                                    <th className="pr-4 pb-2 text-right font-medium">
                                        Volume
                                    </th>
                                    <th className="pb-2 text-right font-medium">
                                        Swaps
                                    </th>
                                </tr>
                            </thead>
                            <tbody>
                                {volumes.map(v => (
                                    <tr
                                        key={v.assetId}
                                        className="border-border-secondary border-b"
                                    >
                                        <td className="py-2 pr-4 font-mono text-xs">
                                            {truncateAssetId(v.assetId)}
                                        </td>
                                        <td className="py-2 pr-4 text-right font-mono">
                                            {formatLargeNumber(v.volume24h)}
                                        </td>
                                        <td className="py-2 text-right">
                                            {v.swapCount24h.toLocaleString()}
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </div>
            )}

            {hasPairs && (
                <div>
                    <h3 className="text-text-secondary mb-3 text-sm font-medium">
                        Top trading pairs by liquidity
                    </h3>
                    <div className="overflow-x-auto">
                        <table className="w-full text-sm">
                            <thead>
                                <tr className="border-border-secondary border-b">
                                    <th className="pr-4 pb-2 text-left font-medium">
                                        Pair
                                    </th>
                                    <th className="pr-4 pb-2 text-right font-medium">
                                        Positions
                                    </th>
                                    <th className="pr-4 pb-2 text-right font-medium">
                                        Reserves 1
                                    </th>
                                    <th className="pr-4 pb-2 text-right font-medium">
                                        Reserves 2
                                    </th>
                                    <th className="pb-2 text-right font-medium">
                                        Avg fee
                                    </th>
                                </tr>
                            </thead>
                            <tbody>
                                {pairs.map((p, i) => (
                                    <tr
                                        key={i}
                                        className="border-border-secondary border-b"
                                    >
                                        <td className="py-2 pr-4 font-mono text-xs">
                                            {truncateAssetId(
                                                p.tradingPairAsset1
                                            )}{' '}
                                            /{' '}
                                            {truncateAssetId(
                                                p.tradingPairAsset2
                                            )}
                                        </td>
                                        <td className="py-2 pr-4 text-right">
                                            {p.activePositions.toLocaleString()}
                                        </td>
                                        <td className="py-2 pr-4 text-right font-mono">
                                            {formatLargeNumber(
                                                p.totalReserves1
                                            )}
                                        </td>
                                        <td className="py-2 pr-4 text-right font-mono">
                                            {formatLargeNumber(
                                                p.totalReserves2
                                            )}
                                        </td>
                                        <td className="py-2 text-right">
                                            {p.avgFeePercentage.toFixed(2)}%
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </div>
            )}
        </Surface>
    )
}

export default DexMarketOverviewLoader
