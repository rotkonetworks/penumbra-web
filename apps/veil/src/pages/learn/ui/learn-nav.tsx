'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import type { FC } from 'react';

interface NavItem {
  label: string;
  href: string;
}

const ITEMS: NavItem[] = [
  { label: 'Overview', href: '/learn' },
  { label: 'FAQ', href: '/learn/faq' },
  { label: 'Tokenomics', href: '/learn/tokenomics' },
];

export const LearnNav: FC = () => {
  const pathname = usePathname() ?? '';
  return (
    <nav className='flex justify-center border-b border-other-tonal-fill5'>
      <ul className='flex flex-wrap gap-1 px-4 py-2'>
        {ITEMS.map(item => {
          const active =
            pathname === item.href ||
            (item.href !== '/learn' && pathname.startsWith(item.href));
          return (
            <li key={item.href}>
              <Link
                href={item.href}
                className={[
                  'inline-block rounded-full px-3 py-1 text-sm transition-colors',
                  active
                    ? 'bg-other-tonal-fill5 text-text-primary'
                    : 'text-text-secondary hover:text-text-primary',
                ].join(' ')}
              >
                {item.label}
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
};
