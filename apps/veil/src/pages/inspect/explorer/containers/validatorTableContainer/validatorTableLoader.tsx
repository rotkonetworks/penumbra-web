// istanbul ignore file
import { notFound } from 'next/navigation'
import { FC } from 'react'
import { ValidatorTable } from '@/pages/inspect/explorer/components'
import { getValidators } from '@/pages/inspect/explorer/lib/data'
import { ValidatorStateFilter } from '@/pages/inspect/explorer/lib/graphql/generated/types'
import { Props } from './validatorTableContainer'

const ValidatorTableLoader: FC<Props> = async props => {
    const validators = await getValidators({
        state: props.inactive
            ? ValidatorStateFilter.Inactive
            : ValidatorStateFilter.Active,
    })

    if (!validators) {
        notFound()
    }

    return (
        <ValidatorTable
            {...props}
            footer={
                <span className="text-text-secondary text-sm">
                    {validators.length} {props.inactive ? 'inactive' : 'active'}{' '}
                    validators
                </span>
            }
            validators={validators}
        />
    )
}

export default ValidatorTableLoader
