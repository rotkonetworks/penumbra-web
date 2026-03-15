import { Button } from '@penumbra-zone/ui/Button';
import { FallbackPage } from './fallback-page';

const WALLETS = [
  { name: 'Prax', url: 'https://praxwallet.com/' },
  { name: 'Zafu', url: 'https://zafu.rotko.net/' },
];

export const ExtensionNotInstalled = () => {
  return (
    <FallbackPage
      title='Get a Wallet'
      description='A Penumbra wallet extension is required to continue.'
    >
      {WALLETS.map(wallet => (
        <Button
          key={wallet.name}
          actionType='accent'
          priority='secondary'
          density='sparse'
          onClick={() => window.open(wallet.url, '_blank', 'noopener,noreferrer')}
        >
          Get {wallet.name}
        </Button>
      ))}
    </FallbackPage>
  );
};
