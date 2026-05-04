'use client'

import {
    AlignHorizontalDistributeCenterIcon,
    BlocksIcon,
    BoxIcon,
    CheckCheckIcon,
    HandshakeIcon,
    HomeIcon,
    SatelliteDishIcon,
} from 'lucide-react'
import { FC, ReactNode, useCallback, useState } from 'react'
import { Menu, MenuItem } from '@/pages/inspect/explorer/components'
import { classNames } from '@/pages/inspect/explorer/lib/utils'

interface Props {
    children?: ReactNode
}

const MobileMenu: FC<Props> = props => {
    const [menuOpen, setMenuOpen] = useState(false)

    const openMenu = useCallback(() => setMenuOpen(true), [])

    const closeMenu = useCallback(() => setMenuOpen(false), [])

    return (
        <Menu
            className={classNames(
                'relative z-40 rounded-full backdrop-blur-lg',
                'min-[1440px]:hidden'
            )}
            onClose={closeMenu}
            onOpen={openMenu}
            open={menuOpen}
        >
            {props.children}
            <MenuItem href="/">
                <HomeIcon className="stroke-primary-light" size={16} />
                Home
            </MenuItem>
            <MenuItem href="/explore/blocks" paths={['/explore/block']}>
                <BoxIcon className="stroke-primary-light" size={16} />
                Blocks
            </MenuItem>
            <MenuItem href="/explore/txs" paths={['/explore/tx']}>
                <CheckCheckIcon className="stroke-primary-light" size={16} />
                Transactions
            </MenuItem>
            <MenuItem href="/explore/ibc" paths={['/explore/ibc']}>
                <SatelliteDishIcon className="stroke-primary-light" size={16} />
                IBC
            </MenuItem>
            <MenuItem href="/explore/validators" paths={['/explore/validator']}>
                <BlocksIcon className="stroke-primary-light" size={16} />
                Validators
            </MenuItem>
            <MenuItem href="/dex">
                <AlignHorizontalDistributeCenterIcon
                    className="stroke-primary-light"
                    size={16}
                />
                DEX
            </MenuItem>
            <MenuItem href="/explore/gov" paths={['/explore/proposal']}>
                <HandshakeIcon className="stroke-primary-light" size={16} />
                Governance
            </MenuItem>
        </Menu>
    )
}

export default MobileMenu
