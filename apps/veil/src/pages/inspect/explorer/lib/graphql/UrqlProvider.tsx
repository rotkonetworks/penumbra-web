'use client';

import { FC, ReactNode, useMemo } from 'react';
import { Provider } from 'urql';
import createGraphqlClient from './createGraphqlClient';

interface Props {
  children?: ReactNode;
}

/**
 * Wraps the children in a urql Provider scoped to the explorer subtree.
 * The client is memoized so it survives re-renders of the layout.
 */
export const UrqlProvider: FC<Props> = ({ children }) => {
  const client = useMemo(() => createGraphqlClient(), []);
  return <Provider value={client}>{children}</Provider>;
};

export default UrqlProvider;
