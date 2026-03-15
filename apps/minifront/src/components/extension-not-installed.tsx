import { Button } from '@penumbra-zone/ui-deprecated/components/ui/button';
import { SplashPage } from '@penumbra-zone/ui-deprecated/components/ui/splash-page';
import { HeadTag } from './metadata/head-tag';

const WALLETS = [
  { name: 'Prax', url: 'https://praxwallet.com/' },
  { name: 'Zafu', url: 'https://zafu.rotko.net/' },
];

export const ExtensionNotInstalled = () => {
  return (
    <>
      <HeadTag />
      <SplashPage title='Get a Wallet'>
        <div className='flex flex-col gap-4 text-lg'>
          <span>A Penumbra wallet extension is required to continue.</span>
          <div className='flex items-center gap-2'>
            {WALLETS.map(wallet => (
              <Button key={wallet.name} asChild variant='gradient'>
                <a href={wallet.url} target='_blank' rel='noopener noreferrer'>
                  Get {wallet.name}
                </a>
              </Button>
            ))}
          </div>
        </div>
      </SplashPage>
    </>
  );
};
