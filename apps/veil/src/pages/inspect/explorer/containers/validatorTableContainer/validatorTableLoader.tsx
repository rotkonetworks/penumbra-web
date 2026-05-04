// istanbul ignore file
import { notFound } from 'next/navigation'
import Link from 'next/link'
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

    const total = validators.length
    const truncated = props.limit !== undefined && total > props.limit

    return (
        <ValidatorTable
            {...props}
            footer={
                <span className="text-text-secondary flex items-center gap-2 text-sm">
                    <span>
                        {truncated ? (
                            <>
                                Showing top {props.limit} of {total}{' '}
                                {props.inactive ? 'inactive' : 'active'} validators
                            </>
                        ) : (
                            <>
                                {total}{' '}
                                {props.inactive ? 'inactive' : 'active'} validators
                            </>
                        )}
                    </span>
                    {truncated && (
                        <Link
                            className="text-text-primary hover:underline"
                            href={
                                props.inactive
                                    ? '/explore/validators?filter=inactive&all=1'
                                    : '/explore/validators?all=1'
                            }
                        >
                            Show all
                        </Link>
                    )}
                </span>
            }
            validators={validators}
        />
    )
}

export default ValidatorTableLoader
