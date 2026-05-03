// istanbul ignore file
import Image from 'next/image'
import { FC, Suspense } from 'react'
import { NumberPanel } from '@/pages/inspect/explorer/components'
import { penumbraImage } from '@/pages/inspect/explorer/lib/images'
import ValidatorVotingPowerPanelLoader from './validatorVotingPowerPanelLoader'

export interface Props {
    className?: string
    validatorId: string
}

const ValidatorVotingPowerPanelContainer: FC<Props> = props => (
    <Suspense
        fallback={
            <NumberPanel
                className={props.className}
                number={0}
                numberClassName="gap-2"
                numberPrefix={
                    <Image
                        alt="UM"
                        height={32}
                        src={penumbraImage}
                        width={32}
                    />
                }
                numberSuffix="UM"
                title="Voting power UM"
            />
        }
    >
        <ValidatorVotingPowerPanelLoader {...props} />
    </Suspense>
)

export default ValidatorVotingPowerPanelContainer
