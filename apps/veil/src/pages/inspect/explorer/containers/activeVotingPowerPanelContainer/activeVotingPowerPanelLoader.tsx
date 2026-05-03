// istanbul ignore file
import Image from 'next/image'
import { FC } from 'react'
import { NumberPanel } from '@/pages/inspect/explorer/components'
import { getActiveVotingPower } from '@/pages/inspect/explorer/lib/data'
import { penumbraImage } from '@/pages/inspect/explorer/lib/images'
import { Props } from './activeVotingPowerPanelContainer'

const ActiveVotingPowerPanelLoader: FC<Props> = async props => {
    const number = await getActiveVotingPower()

    return (
        <NumberPanel
            {...props}
            number={number ?? 0}
            numberClassName="gap-2"
            numberPrefix={
                <Image alt="UM" height={32} src={penumbraImage} width={32} />
            }
            numberSuffix="UM"
            title="Active voting power"
        />
    )
}

export default ActiveVotingPowerPanelLoader
