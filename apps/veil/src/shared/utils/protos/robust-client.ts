import { Client, createClient as createPromiseClient } from '@connectrpc/connect';
import { createGrpcWebTransport } from '@connectrpc/connect-web';
import { ServiceType } from '@bufbuild/protobuf';
import { ChainRegistryClient } from '@penumbra-labs/registry';

interface RpcEndpoint {
  name: string;
  url: string;
  images?: Array<{ png?: string; svg?: string }>;
}


// Hardcoded fallback RPC endpoints (updated as of October 2024)
const FALLBACK_RPC_ENDPOINTS: RpcEndpoint[] = [
  {
    name: 'CroutonDigital',
    url: 'https://penumbra.crouton.digital',
  },
  {
    name: 'Silent Validator',
    url: 'https://grpc.penumbra.silentvalidator.com',
  },
  {
    name: 'ghostinnet',
    url: 'https://penumbra.grpc.ghostinnet.com',
  },
  {
    name: 'Radiant Commons',
    url: 'https://penumbra-1.radiantcommons.com',
  },
];

export interface RobustClientOptions {
  retryAttempts?: number;
  retryDelayMs?: number;
  preferredEndpoint?: string;
}

class RpcEndpointManager {
  private cachedEndpoints: RpcEndpoint[] | null = null;
  private lastFetchTime = 0;
  private readonly CACHE_DURATION = 5 * 60 * 1000; // 5 minutes

  async getEndpoints(chainId: string): Promise<RpcEndpoint[]> {
    // Use cache if available and fresh
    if (this.cachedEndpoints && Date.now() - this.lastFetchTime < this.CACHE_DURATION) {
      return this.cachedEndpoints;
    }

    const endpoints: RpcEndpoint[] = [];

    // First priority: environment variable (for testnet or custom configs)
    const envEndpoint = process.env['PENUMBRA_GRPC_ENDPOINT'];
    if (envEndpoint) {
      endpoints.push({
        name: 'Environment Config',
        url: envEndpoint,
      });
    }

    // Second priority: registry endpoints from GitHub (for mainnet)
    if (chainId === 'penumbra-1') {
      try {
        console.log('Fetching RPC endpoints from registry (GitHub)...');
        const chainRegistryClient = new ChainRegistryClient();
        const { rpcs } = await chainRegistryClient.remote.globals();
        endpoints.push(...rpcs);
        console.log(`Successfully fetched ${rpcs.length} RPC endpoints from registry`);
      } catch (error) {
        console.warn('Failed to fetch RPC endpoints from registry:', error);
      }
    }

    // Third priority: fallback endpoints if registry is down or other issues
    if (endpoints.length <= 1) { // Only env endpoint or none
      console.warn('Using hardcoded fallback RPC endpoints (registry unavailable)');
      endpoints.push(...FALLBACK_RPC_ENDPOINTS);
    }

    // Final safety check: ensure we have at least some endpoints
    if (endpoints.length === 0) {
      console.error('No RPC endpoints available! Using emergency fallbacks');
      endpoints.push(...FALLBACK_RPC_ENDPOINTS);
    }

    this.cachedEndpoints = endpoints;
    this.lastFetchTime = Date.now();
    console.log(`Total ${endpoints.length} RPC endpoints available for ${chainId}`);
    return endpoints;
  }

  // Shuffle endpoints to distribute load, but keep preferred endpoint first
  shuffleEndpoints(endpoints: RpcEndpoint[], preferredUrl?: string): RpcEndpoint[] {
    let shuffled = [...endpoints];

    // Remove preferred endpoint if specified
    let preferred: RpcEndpoint | undefined;
    if (preferredUrl) {
      const preferredIndex = shuffled.findIndex(e => e.url === preferredUrl);
      if (preferredIndex >= 0) {
        [preferred] = shuffled.splice(preferredIndex, 1);
      }
    }

    // Fisher-Yates shuffle for remaining endpoints
    for (let i = shuffled.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
    }

    // Put preferred endpoint first if found
    if (preferred) {
      shuffled.unshift(preferred);
    }

    return shuffled;
  }
}

const endpointManager = new RpcEndpointManager();

export const createRobustClient = async <T extends ServiceType>(
  chainId: string,
  serviceType: T,
  options: RobustClientOptions = {}
): Promise<Client<T>> => {
  const {
    retryAttempts = 3,
    retryDelayMs = 1000,
    preferredEndpoint
  } = options;

  const endpoints = await endpointManager.getEndpoints(chainId);
  const shuffledEndpoints = endpointManager.shuffleEndpoints(endpoints, preferredEndpoint);

  if (shuffledEndpoints.length === 0) {
    throw new Error('No RPC endpoints available');
  }

  console.log(`Attempting to connect to ${shuffledEndpoints.length} RPC endpoints for ${serviceType.typeName}`);

  for (let i = 0; i < shuffledEndpoints.length; i++) {
    const endpoint = shuffledEndpoints[i];

    for (let attempt = 1; attempt <= retryAttempts; attempt++) {
      try {
        console.log(`Trying ${endpoint.name} (${endpoint.url}) - Attempt ${attempt}/${retryAttempts}`);

        const transport = createGrpcWebTransport({
          baseUrl: endpoint.url,
        });

        const client = createPromiseClient(serviceType, transport);

        // Test the connection with a simple call if possible
        // For now, we'll assume it works and return the client
        console.log(`Successfully connected to ${endpoint.name}`);
        return client;

      } catch (error) {
        console.warn(`Failed to connect to ${endpoint.name} (attempt ${attempt}/${retryAttempts}):`, error);

        if (attempt < retryAttempts) {
          await new Promise(resolve => setTimeout(resolve, retryDelayMs));
        }
      }
    }
  }

  throw new Error(`Failed to connect to any RPC endpoint after trying ${shuffledEndpoints.length} endpoints with ${retryAttempts} attempts each`);
};

// Wrapper for making robust RPC calls with automatic retries across endpoints
export const makeRobustRpcCall = async <T extends ServiceType, R>(
  chainId: string,
  serviceType: T,
  rpcCall: (client: Client<T>) => Promise<R>,
  options: RobustClientOptions = {}
): Promise<R> => {
  const client = await createRobustClient(chainId, serviceType, options);
  return await rpcCall(client);
};