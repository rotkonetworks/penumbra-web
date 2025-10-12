import { ChainRegistryClient } from '@penumbra-labs/registry';
import { sample } from 'lodash';
import { useQuery } from '@tanstack/react-query';
import { createGrpcWebTransport } from '@connectrpc/connect-web';
import { penumbra } from '@/shared/const/penumbra.ts';
import { connectionStore } from '@/shared/model/connection';
import { queryClient } from '@/shared/const/queryClient';
import { useClientEnv } from './env';
import { ClientEnv } from './env/types';

const registryRpcChoices = async (env: ClientEnv) => {
  // Environment variable takes highest priority
  if (env.PENUMBRA_GRPC_ENDPOINT) {
    return [env.PENUMBRA_GRPC_ENDPOINT];
  }

  // For mainnet, use GitHub registry with fallbacks
  if (env.PENUMBRA_CHAIN_ID === 'penumbra-1') {
    try {
      const chainRegistryClient = new ChainRegistryClient();
      const { rpcs } = await chainRegistryClient.remote.globals();
      return rpcs.map(r => r.url);
    } catch (error) {
      console.warn('Failed to fetch RPC endpoints from registry, using fallbacks:', error);
      // Hardcoded fallback endpoints
      return [
        'https://penumbra.crouton.digital',
        'https://grpc.penumbra.silentvalidator.com',
        'https://penumbra.grpc.ghostinnet.com',
        'https://penumbra-1.radiantcommons.com',
      ];
    }
  } else {
    throw new Error(`No rpcs for chain id: ${env.PENUMBRA_CHAIN_ID}`);
  }
};

enum TransportType {
  PRAX,
  GRPC_WEB,
}

const grpcTransportQueryFn = async (env: ClientEnv) => {
  if (connectionStore.connected && penumbra.transport) {
    return { transport: penumbra.transport, type: TransportType.PRAX };
  }

  const rpcChoices = await registryRpcChoices(env);
  const randomRpc = sample(rpcChoices);
  if (!randomRpc) {
    throw new Error('No rpcs in remote globals');
  }

  return {
    transport: createGrpcWebTransport({
      baseUrl: randomRpc,
    }),
    type: TransportType.GRPC_WEB,
  };
};

const getGrpcQueryOptions = (env: ClientEnv) => ({
  queryKey: ['grpcTransport', connectionStore.connected],
  queryFn: () => grpcTransportQueryFn(env),
  staleTime: Infinity,
});

export const getGrpcTransport = (env: ClientEnv) => {
  return queryClient.fetchQuery(getGrpcQueryOptions(env));
};

export const useGrpcTransport = () => {
  const env = useClientEnv();
  return useQuery(getGrpcQueryOptions(env));
};

/**
 * Refresh gRPC transport to try a different RPC endpoint.
 * Useful when the current RPC is failing.
 */
export const refreshGrpcTransport = (env: ClientEnv) => {
  return queryClient.invalidateQueries({ queryKey: ['grpcTransport'] }).then(() => {
    return queryClient.fetchQuery(getGrpcQueryOptions(env));
  });
};
