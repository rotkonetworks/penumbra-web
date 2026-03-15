import { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  PenumbraClient,
  PenumbraNotInstalledError,
  PenumbraRequestFailure,
  type PenumbraManifest,
} from '@penumbra-zone/client';
import { Button } from '@penumbra-zone/ui/Button';
import { penumbra } from '../lib/penumbra';
import { FallbackPage } from './fallback-page';

const handleErr = (e: unknown) => {
  if (e instanceof Error && e.cause) {
    switch (e.cause) {
      case PenumbraRequestFailure.Denied:
        alert('Connection denied. You may need to un-ignore this site in your extension settings.');
        break;
      case PenumbraRequestFailure.NeedsLogin:
        alert('Not logged in. Please login into the extension and reload the page.');
        break;
      default:
        alert(`Connection error: ${e.message}`);
    }
  } else {
    console.warn('Unknown connection failure', e);
    alert(`Unknown connection failure: ${String(e)}`);
  }
};

export const ExtensionNotConnected = () => {
  const [result, setResult] = useState<boolean>();
  const [manifests, setManifests] = useState<Record<string, PenumbraManifest>>({});
  const navigate = useNavigate();

  const providerOrigins = useMemo(() => Object.keys(PenumbraClient.getProviders()), []);

  useEffect(() => {
    if (providerOrigins.length === 0) {
      return;
    }
    const promises = PenumbraClient.getProviderManifests();
    void Promise.all(
      Object.entries(promises).map(async ([key, promise]) => {
        try {
          return [key, await promise] as const;
        } catch {
          return null;
        }
      }),
    ).then(entries =>
      setManifests(Object.fromEntries(entries.filter(Boolean) as [string, PenumbraManifest][])),
    );
  }, [providerOrigins.length]);

  const connect = async (provider: string) => {
    try {
      await penumbra.connect(provider);
      navigate(0);
    } catch (e) {
      handleErr(e);
    } finally {
      setResult(true);
    }
  };

  const handleSingleConnect = () => {
    if (result) {
      location.reload();
      return;
    }
    if (providerOrigins.length === 0) {
      throw new PenumbraNotInstalledError();
    }
    if (providerOrigins.length === 1 && providerOrigins[0]) {
      void connect(providerOrigins[0]);
    }
  };

  // Multiple providers: show picker
  if (providerOrigins.length > 1) {
    return (
      <FallbackPage
        title='Select Wallet'
        description='Select the wallet you would like to connect.'
      >
        {providerOrigins.map(origin => (
          <Button
            key={origin}
            actionType='default'
            priority='secondary'
            density='sparse'
            onClick={() => void connect(origin)}
          >
            {manifests[origin]?.name ?? origin}
          </Button>
        ))}
      </FallbackPage>
    );
  }

  // Single or no provider
  return (
    <FallbackPage
      title='Connect Wallet'
      description='Connect your wallet to view balances, transfer funds, and stake.'
      buttonText={!result ? 'Connect' : 'Reload'}
      onButtonClick={handleSingleConnect}
    />
  );
};
