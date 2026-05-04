import { ReactNode } from 'react';
import { App } from './app';
import { getClientSideEnv } from '@/shared/api/env/getClientSideEnv';

import '@penumbra-zone/ui/style.css';
import '@penumbra-zone/ui/theme.css';
import './v2.css';

// Layout used to fetch the chain registry server-side and pass it down
// as a prop into <App>. That embedded ~250KB of JSON into the RSC
// payload of every page response. The registry is now fetched
// client-side in <RegistryProvider> via /api/registry, with
// localStorage caching, so the layout has no per-request data deps.

const RootLayout = ({ children }: { children: ReactNode }) => {
  const clientEnv = getClientSideEnv();
  return (
    <html lang='en'>
      <body className='scroll-area-page'>
        <App clientEnv={clientEnv}>{children}</App>
      </body>
    </html>
  );
};

export default RootLayout;
