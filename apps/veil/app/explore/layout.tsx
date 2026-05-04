import { ReactNode } from 'react';
import { UrqlProvider } from '@/pages/inspect/explorer/lib/graphql/UrqlProvider';
import { InspectNav } from '@/pages/inspect/explorer/ui/inspect-nav';

/**
 * Layout for /inspect/* routes. Wraps the explorer subtree in a urql GraphQL
 * provider so the rest of the veil app doesn't pay the cost.
 */
export default function InspectLayout({ children }: { children: ReactNode }) {
  return (
    <UrqlProvider>
      <InspectNav />
      {children}
    </UrqlProvider>
  );
}
