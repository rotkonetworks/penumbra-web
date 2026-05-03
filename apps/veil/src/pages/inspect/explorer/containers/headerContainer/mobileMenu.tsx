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
            <MenuItem href="/inspect/blocks" paths={['/inspect/block']}>
                <BoxIcon className="stroke-primary-light" size={16} />
                Blocks
            </MenuItem>
            <MenuItem href="/inspect/txs" paths={['/inspect/tx']}>
                <CheckCheckIcon className="stroke-primary-light" size={16} />
                Transactions
            </MenuItem>
            <MenuItem href="/inspect/ibc" paths={['/inspect/ibc']}>
                <SatelliteDishIcon className="stroke-primary-light" size={16} />
                IBC
            </MenuItem>
            <MenuItem href="/inspect/validators" paths={['/inspect/validator']}>
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
            <MenuItem href="/inspect/gov" paths={['/inspect/proposal']}>
                <HandshakeIcon className="stroke-primary-light" size={16} />
                Governance
            </MenuItem>
        </Menu>
    )
}

export default MobileMenu
