// istanbul ignore file
import { FC, Suspense } from 'react'
import {
    Skeleton,
    Table,
    TableCell,
    TableRow,
    ValidatorTableProps,
} from '@/pages/inspect/explorer/components'
import ValidatorTableLoader from './validatorTableLoader'

export type Props = Omit<ValidatorTableProps, 'validators'>

const ValidatorTableContainer: FC<Props> = ({
    inactive,
    sort,
    sortDir,
    ...props
}) => (
    <Suspense
        key={`${String(inactive)}-${sort}-${sortDir}-${String(props.limit)}`}
        fallback={
            <Table {...props}>
                <thead>
                    <TableRow>
                        <TableCell header>
                            <Skeleton className="h-6" />
                        </TableCell>
                    </TableRow>
                </thead>
                <tbody>
                    {Array.from({ length: 56 }).map((_, i) => (
                        <TableRow key={i}>
                            <TableCell className="h-15">
                                <Skeleton className="h-9" />
                            </TableCell>
                        </TableRow>
                    ))}
                </tbody>
            </Table>
        }
    >
        <ValidatorTableLoader
            {...props}
            inactive={inactive}
            sort={sort}
            sortDir={sortDir}
        />
    </Suspense>
)

export default ValidatorTableContainer
