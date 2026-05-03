import Link from 'next/link'
import { FC } from 'react'
import { Container, Logo, Tab, Tabs } from '@/pages/inspect/explorer/components'
import { classNames } from '@/pages/inspect/explorer/lib/utils'
import UmPriceContainer from '../umPriceContainer'
import MobileMenu from './mobileMenu'
import SearchButton from './searchButton'

interface Props {
    className?: string
}

const HeaderContainer: FC<Props> = props => (
    <Container
        as="header"
        className={classNames(
            'grid h-19 grid-cols-2 items-center min-[1440px]:grid-cols-3',
            props.className
        )}
    >
        <div className="relative z-40 flex items-center gap-2">
            <Link href="/">
                <Logo className="max-h-6 w-auto sm:max-h-7" />
            </Link>
        </div>
        <Tabs className="z-40 hidden justify-self-center min-[1440px]:flex">
            <Tab href="/">Home</Tab>
            <Tab href="/inspect/blocks" paths={['/inspect/block']}>
                Blocks
            </Tab>
            <Tab href="/inspect/txs" paths={['/inspect/tx']}>
                Transactions
            </Tab>
            <Tab href="/inspect/ibc" paths={['/inspect/ibc']}>
                IBC
            </Tab>
            <Tab href="/inspect/validators" paths={['/inspect/validator']}>
                Validators
            </Tab>
            <Tab href="/dex">DEX</Tab>
            <Tab href="/inspect/gov" paths={['/inspect/proposal']}>
                Governance
            </Tab>
        </Tabs>
        <div className="flex items-center gap-2 justify-self-end">
            <SearchButton />
            <UmPriceContainer className="hidden sm:flex" />
            <MobileMenu />
        </div>
    </Container>
)

export default HeaderContainer
