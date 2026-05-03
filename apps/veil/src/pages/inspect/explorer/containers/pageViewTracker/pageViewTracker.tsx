'use client';

import { FC } from 'react';

interface Props {
  fathomId?: string;
}

/**
 * No-op stub: the original explorer used `fathom-client` for page-view
 * analytics, which is not a dependency of veil. The barrel export has been
 * commented out; this file is preserved only so the directory is non-empty.
 */
const PageViewTracker: FC<Props> = () => null;

export default PageViewTracker;
