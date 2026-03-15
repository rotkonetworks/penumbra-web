import { useState, useEffect, useMemo } from 'react';
import { penumbra } from '@/shared/lib/penumbra';
import { PenumbraClient } from '@penumbra-zone/client';

export const useIsConnected = (): boolean => {
  const [connected, setConnected] = useState(false);

  useEffect(() => {
    // Check initial connection state
    setConnected(Boolean(penumbra.connected));

    // Listen for connection state changes
    const unsubscribe = penumbra.onConnectionStateChange(() => {
      setConnected(Boolean(penumbra.connected));
    });

    return unsubscribe;
  }, []);

  return connected;
};

export const useAvailableProviders = () => {
  return useMemo(() => Object.keys(PenumbraClient.getProviders()), []);
};

export const useConnectWallet = () => {
  const providers = useAvailableProviders();

  const connectWallet = async (providerOrigin?: string) => {
    if (providers.length === 0) {
      window.open('https://praxwallet.com/', '_blank', 'noopener,noreferrer');
      return;
    }

    const origin = providerOrigin ?? (providers.length === 1 ? providers[0] : undefined);
    if (!origin) {
      // Multiple providers but none specified — caller should show a picker
      return;
    }

    try {
      await penumbra.connect(origin);
    } catch {
      // Connection error handled by error boundary
    }
  };

  return { connectWallet, providers };
};
