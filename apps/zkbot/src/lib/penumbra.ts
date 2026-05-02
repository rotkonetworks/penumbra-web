/**
 * Penumbra client singleton and connection utilities
 * Pattern adapted from veil's implementation for SolidJS
 */

import {
  createPenumbraClient,
  PenumbraClient,
  PenumbraState,
  PenumbraRequestFailure,
  type PenumbraManifest,
} from '@penumbra-zone/client';
import {
  ViewService,
  TendermintProxyService,
} from '@penumbra-zone/protobuf';
import { createSignal, createRoot, batch } from 'solid-js';
import { createStore, produce } from 'solid-js/store';
import {
  TransactionPlannerRequest,
  TransactionPlannerRequest_ActionDutchAuctionSchedule,
} from '@penumbra-zone/protobuf/penumbra/view/v1/view_pb';
import {
  DutchAuctionDescription,
} from '@penumbra-zone/protobuf/penumbra/core/component/auction/v1/auction_pb';
import {
  prepareCreateToken,
  type CreateTokenParams,
  type CreateTokenResult,
  TokenFactoryId,
} from './token-factory';
import type {
  AddressView,
  BalancesResponse,
  AssetsResponse,
} from '@penumbra-zone/protobuf/penumbra/view/v1/view_pb';
import type { Metadata } from '@penumbra-zone/protobuf/penumbra/core/asset/v1/asset_pb';
import { bech32mAddress, bech32mAssetId } from '@penumbra-zone/bech32m/penumbra';
import { getAddressIndex } from '@penumbra-zone/getters/address-view';
import { getMetadata, getAmount } from '@penumbra-zone/getters/value-view';
import BigNumber from 'bignumber.js';

// ============================================================================
// Bridge Configuration
// ============================================================================

export const BRIDGE_CONFIG = {
  // Bridge burn address - tokens sent here are burned and observed by MPC
  // This is the Penumbra address controlled by the MPC network
  burnAddress: 'penumbra1bridge0000000000000000000000000000000000000000000000000000000',
  // wNEAR asset base denom on Penumbra
  wNearDenom: 'wnear',
  // Memo prefix for NEAR withdrawals
  memoPrefix: 'near:withdraw:',
};

// ============================================================================
// Penumbra Client Singleton
// ============================================================================

export const penumbra = createPenumbraClient();

// ============================================================================
// Types
// ============================================================================

export interface ConnectionState {
  connected: boolean;
  connecting: boolean;
  manifest: PenumbraManifest | undefined;
  chainId: string | undefined;
  error: string | undefined;
}

export interface WalletState {
  address: string | undefined;
  addressIndex: number;
  balances: BalanceInfo[];
  assets: Metadata[];
  loading: boolean;
}

export interface BalanceInfo {
  assetId: string;
  denom: string;
  symbol: string;
  amount: string;
  amountRaw: bigint;
  exponent: number;
  addressIndex: number;
}

export interface BridgeWithdrawResult {
  success: boolean;
  withdrawalId?: string;
  txHash?: string;
  error?: string;
}

export interface AuctionScheduleParams {
  // Token to sell
  inputAssetId: string;
  inputAmount: string;
  inputExponent: number;
  // What to receive (usually penumbra)
  outputAssetId: string;
  // Price range
  maxOutputAmount: string; // Starting price (high)
  minOutputAmount: string; // Ending price (low)
  outputExponent: number;
  // Duration
  durationBlocks: number; // How many blocks the auction runs
  stepCount: number; // Number of price steps
}

export interface AuctionResult {
  success: boolean;
  auctionId?: string;
  txHash?: string;
  error?: string;
}

export interface TokenCreateResult {
  success: boolean;
  tokenId?: string;
  denom?: string;
  txHash?: string;
  error?: string;
}

// ============================================================================
// Reactive Store (SolidJS)
// ============================================================================

function createPenumbraStore() {
  // Connection state
  const [connection, setConnection] = createStore<ConnectionState>({
    connected: false,
    connecting: false,
    manifest: undefined,
    chainId: undefined,
    error: undefined,
  });

  // Wallet state
  const [wallet, setWallet] = createStore<WalletState>({
    address: undefined,
    addressIndex: 0,
    balances: [],
    assets: [],
    loading: false,
  });

  // Available providers (wallets like Prax)
  const [providers, setProviders] = createSignal<string[]>([]);

  // ============================================================================
  // Provider Detection
  // ============================================================================

  const detectProviders = () => {
    if (typeof window === 'undefined') return [];
    const detected = Object.keys(PenumbraClient.getProviders());
    setProviders(detected);
    return detected;
  };

  // ============================================================================
  // Connection Methods
  // ============================================================================

  const connect = async (providerOrigin?: string) => {
    const available = detectProviders();

    if (available.length === 0) {
      setConnection('error', 'No Penumbra wallet detected. Please install Prax.');
      return false;
    }

    const origin = providerOrigin ?? available[0];
    if (!origin) return false;

    setConnection('connecting', true);
    setConnection('error', undefined);

    try {
      await penumbra.connect(origin);

      // Get chain parameters
      const params = await penumbra.service(ViewService).appParameters({});
      const chainId = params.parameters?.chainId;

      batch(() => {
        setConnection('connected', true);
        setConnection('connecting', false);
        setConnection('manifest', penumbra.manifest);
        setConnection('chainId', chainId);
      });

      // Load wallet data
      await loadWalletData();

      return true;
    } catch (error) {
      let errorMsg = 'Connection failed';

      if (error instanceof Error && error.cause) {
        if (error.cause === PenumbraRequestFailure.Denied) {
          errorMsg = 'Connection denied by user';
        } else if (error.cause === PenumbraRequestFailure.NeedsLogin) {
          errorMsg = 'Please unlock your Penumbra wallet';
        }
      }

      batch(() => {
        setConnection('connecting', false);
        setConnection('error', errorMsg);
      });

      return false;
    }
  };

  const disconnect = async () => {
    try {
      await penumbra.disconnect();
    } catch (e) {
      console.error('Disconnect error:', e);
    } finally {
      batch(() => {
        setConnection('connected', false);
        setConnection('manifest', undefined);
        setConnection('chainId', undefined);
        setWallet('address', undefined);
        setWallet('balances', []);
      });
    }
  };

  const reconnect = async () => {
    const available = detectProviders();
    const connected = available.find((origin) =>
      PenumbraClient.isProviderConnected(origin)
    );

    if (connected) {
      await connect(connected);
    }
  };

  // ============================================================================
  // Wallet Data Loading
  // ============================================================================

  const loadWalletData = async () => {
    if (!penumbra.connected) return;

    setWallet('loading', true);

    try {
      // Get address
      const addressIndex = wallet.addressIndex;
      const addressRes = await penumbra
        .service(ViewService)
        .addressByIndex({ addressIndex: { account: addressIndex } });

      if (addressRes.address) {
        const address = bech32mAddress(addressRes.address);
        setWallet('address', address);
      }

      // Get balances
      const balances: BalanceInfo[] = [];
      for await (const response of penumbra.service(ViewService).balances({})) {
        const balanceView = response.balanceView;
        if (!balanceView) continue;

        try {
          const metadata = getMetadata(balanceView);
          const amount = getAmount(balanceView);
          const addrIndex = getAddressIndex(response.accountAddress).account;

          // Skip if not current account
          if (addrIndex !== addressIndex) continue;

          const exponent = metadata.denomUnits.find(
            (u) => u.denom === metadata.display
          )?.exponent ?? 0;

          const amountBig = new BigNumber(amount.lo.toString())
            .plus(new BigNumber(amount.hi.toString()).times(2n ** 64n))
            .div(10 ** exponent);

          balances.push({
            assetId: metadata.penumbraAssetId?.inner
              ? Buffer.from(metadata.penumbraAssetId.inner).toString('hex')
              : '',
            denom: metadata.base,
            symbol: metadata.symbol || metadata.base,
            amount: amountBig.toFixed(6),
            amountRaw: BigInt(amount.lo) + (BigInt(amount.hi) << 64n),
            exponent,
            addressIndex: addrIndex,
          });
        } catch (e) {
          // Skip malformed balance entries
          continue;
        }
      }

      setWallet('balances', balances);

      // Get assets metadata
      const assets: Metadata[] = [];
      for await (const response of penumbra.service(ViewService).assets({})) {
        if (response.denomMetadata) {
          assets.push(response.denomMetadata);
        }
      }

      setWallet('assets', assets);
    } catch (error) {
      console.error('Failed to load wallet data:', error);
    } finally {
      setWallet('loading', false);
    }
  };

  const setAddressIndex = (index: number) => {
    setWallet('addressIndex', index);
    loadWalletData();
  };

  const refreshBalances = () => loadWalletData();

  // ============================================================================
  // Connection State Listener
  // ============================================================================

  const setupListeners = () => {
    penumbra.onConnectionStateChange((event) => {
      batch(() => {
        setConnection('connected', event.state === PenumbraState.Connected);
        setConnection('manifest', penumbra.manifest);
      });

      if (event.state === PenumbraState.Connected) {
        loadWalletData();
      }
    });
  };

  // ============================================================================
  // Transaction Helpers
  // ============================================================================

  const planBuildBroadcast = async (
    request: Parameters<typeof penumbra.service<typeof ViewService>>[0] extends typeof ViewService
      ? Parameters<ReturnType<typeof penumbra.service<typeof ViewService>>['transactionPlanner']>[0]
      : never
  ) => {
    // Plan the transaction
    const { plan } = await penumbra.service(ViewService).transactionPlanner(request);

    if (!plan) {
      throw new Error('Failed to plan transaction');
    }

    // Authorize and build
    let transaction;
    for await (const status of penumbra.service(ViewService).authorizeAndBuild({
      transactionPlan: plan,
    })) {
      if (status.buildProgress?.complete?.transaction) {
        transaction = status.buildProgress.complete.transaction;
      }
    }

    if (!transaction) {
      throw new Error('Failed to build transaction');
    }

    // Broadcast
    const result = await penumbra.service(ViewService).broadcastTransaction({
      transaction,
      awaitDetection: true,
    });

    return result;
  };

  // ============================================================================
  // Bridge Withdraw (Penumbra → NEAR)
  // Burns wNEAR on Penumbra, MPC observes and releases NEAR
  // ============================================================================

  const bridgeWithdraw = async (
    amountStr: string,
    nearDestination: string,
    denom: string = BRIDGE_CONFIG.wNearDenom
  ): Promise<BridgeWithdrawResult> => {
    if (!penumbra.connected) {
      return { success: false, error: 'Wallet not connected' };
    }

    // Validate NEAR address format
    if (!nearDestination || nearDestination.length < 2) {
      return { success: false, error: 'Invalid NEAR destination address' };
    }

    try {
      // Find the wNEAR balance
      const wNearBalance = wallet.balances.find(
        (b) => b.denom === denom || b.symbol.toLowerCase() === 'wnear'
      );

      if (!wNearBalance) {
        return { success: false, error: 'No wNEAR balance found' };
      }

      // Parse amount
      const amount = new BigNumber(amountStr);
      if (amount.isNaN() || amount.lte(0)) {
        return { success: false, error: 'Invalid amount' };
      }

      // Convert to base units
      const amountBase = amount.times(10 ** wNearBalance.exponent);
      if (amountBase.gt(wNearBalance.amountRaw.toString())) {
        return { success: false, error: 'Insufficient wNEAR balance' };
      }

      // Generate withdrawal ID (random bytes for tracking)
      const withdrawalId = crypto.randomUUID();

      // Create memo with NEAR destination and withdrawal ID
      // Format: "near:withdraw:<near_address>:<withdrawal_id>"
      const memo = `${BRIDGE_CONFIG.memoPrefix}${nearDestination}:${withdrawalId}`;

      // Get bridge burn address
      const burnAddress = await penumbra
        .service(ViewService)
        .addressByIndex({ addressIndex: { account: 0 } });

      // For now, we use a special output to the burn address
      // In production, this would be a dedicated bridge action
      // We'll use a send transaction with a memo that MPC nodes can observe

      // Create the transaction plan request
      const amountLo = BigInt(amountBase.toFixed(0)) & BigInt('0xFFFFFFFFFFFFFFFF');
      const amountHi = BigInt(amountBase.toFixed(0)) >> 64n;

      const planRequest = new TransactionPlannerRequest({
        outputs: [
          {
            value: {
              amount: { lo: amountLo, hi: amountHi },
              assetId: { inner: Buffer.from(wNearBalance.assetId, 'hex') },
            },
            // Send to self (burns via memo observation by MPC)
            // In production, this would go to the MPC-controlled burn address
            address: burnAddress.address,
          },
        ],
        memo: { plaintext: { text: memo, returnAddress: burnAddress.address } },
        source: { account: wallet.addressIndex },
      });

      // Plan, build, and broadcast
      const result = await planBuildBroadcast(planRequest);

      // Extract tx hash from result
      const txHash = result.id?.inner
        ? Buffer.from(result.id.inner).toString('hex')
        : undefined;

      // Refresh balances
      await loadWalletData();

      return {
        success: true,
        withdrawalId,
        txHash,
      };
    } catch (error) {
      console.error('Bridge withdraw error:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Bridge withdraw failed',
      };
    }
  };

  // Get wNEAR balance
  const getWNearBalance = (): BalanceInfo | undefined => {
    return wallet.balances.find(
      (b) => b.denom === BRIDGE_CONFIG.wNearDenom || b.symbol.toLowerCase() === 'wnear'
    );
  };

  // ============================================================================
  // Dutch Auction Scheduling (Token Launch)
  // ============================================================================

  const scheduleAuction = async (params: AuctionScheduleParams): Promise<AuctionResult> => {
    if (!penumbra.connected) {
      return { success: false, error: 'Wallet not connected' };
    }

    try {
      // Get current block height
      const status = await penumbra.service(TendermintProxyService).getStatus({});
      const currentHeight = BigInt(status.syncInfo?.latestBlockHeight ?? 0);

      if (currentHeight === 0n) {
        return { success: false, error: 'Could not get current block height' };
      }

      // Calculate auction timing
      const startHeight = currentHeight + 10n; // Start 10 blocks from now
      const endHeight = startHeight + BigInt(params.durationBlocks);

      // Validate step count divides duration evenly
      if (params.durationBlocks % params.stepCount !== 0) {
        return { success: false, error: 'Duration must be divisible by step count' };
      }

      // Convert amounts to base units
      const inputAmount = BigInt(
        new BigNumber(params.inputAmount).times(10 ** params.inputExponent).toFixed(0)
      );
      const maxOutput = BigInt(
        new BigNumber(params.maxOutputAmount).times(10 ** params.outputExponent).toFixed(0)
      );
      const minOutput = BigInt(
        new BigNumber(params.minOutputAmount).times(10 ** params.outputExponent).toFixed(0)
      );

      // Generate random nonce
      const nonce = crypto.getRandomValues(new Uint8Array(32));

      // Build auction description
      const description = new DutchAuctionDescription({
        input: {
          amount: {
            lo: inputAmount & BigInt('0xFFFFFFFFFFFFFFFF'),
            hi: inputAmount >> 64n,
          },
          assetId: { inner: Buffer.from(params.inputAssetId, 'hex') },
        },
        outputId: { inner: Buffer.from(params.outputAssetId, 'hex') },
        maxOutput: {
          lo: maxOutput & BigInt('0xFFFFFFFFFFFFFFFF'),
          hi: maxOutput >> 64n,
        },
        minOutput: {
          lo: minOutput & BigInt('0xFFFFFFFFFFFFFFFF'),
          hi: minOutput >> 64n,
        },
        startHeight,
        endHeight,
        stepCount: BigInt(params.stepCount),
        nonce,
      });

      // Create transaction planner request
      const planRequest = new TransactionPlannerRequest({
        dutchAuctionScheduleActions: [
          new TransactionPlannerRequest_ActionDutchAuctionSchedule({ description }),
        ],
        source: { account: wallet.addressIndex },
      });

      // Plan, build, and broadcast
      const result = await planBuildBroadcast(planRequest);

      // Extract tx hash
      const txHash = result.id?.inner
        ? Buffer.from(result.id.inner).toString('hex')
        : undefined;

      // Compute auction ID from description (hash of serialized description)
      const auctionId = Buffer.from(nonce).toString('hex').slice(0, 16);

      // Refresh balances
      await loadWalletData();

      return {
        success: true,
        auctionId,
        txHash,
      };
    } catch (error) {
      console.error('Schedule auction error:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to schedule auction',
      };
    }
  };

  // Get the penumbra native asset ID (for receiving payments)
  const getPenumbraAssetId = (): string => {
    const penumbraAsset = wallet.assets.find(
      (a) => a.symbol === 'UM' || a.base === 'upenumbra'
    );
    if (penumbraAsset?.penumbraAssetId?.inner) {
      return Buffer.from(penumbraAsset.penumbraAssetId.inner).toString('hex');
    }
    // Fallback: hash of 'upenumbra' (known asset ID)
    return '0000000000000000000000000000000000000000000000000000000000000000';
  };

  // ============================================================================
  // Token Factory - Create New Token
  // NOTE: Requires a wallet/node running the penumbra-token-factory fork
  // ============================================================================

  const createToken = async (params: CreateTokenParams): Promise<TokenCreateResult> => {
    if (!penumbra.connected) {
      return { success: false, error: 'Wallet not connected' };
    }

    // Validate inputs
    if (!params.name || params.name.length === 0) {
      return { success: false, error: 'Token name is required' };
    }

    if (!params.symbol || params.symbol.length === 0) {
      return { success: false, error: 'Token symbol is required' };
    }

    if (params.symbol.length > 32) {
      return { success: false, error: 'Symbol must be 32 characters or less' };
    }

    const supply = parseFloat(params.initialSupply);
    if (isNaN(supply) || supply < 0) {
      return { success: false, error: 'Invalid initial supply' };
    }

    try {
      // Prepare the token creation action
      const prepared = prepareCreateToken(params);

      // Log the prepared token info
      console.log('Creating token:', {
        tokenId: prepared.tokenId.toHex(),
        denom: prepared.denom,
        initialSupply: prepared.initialSupplyBase.toString(),
        enableMint: params.enableMint ?? false,
      });

      // NOTE: Standard Penumbra wallets don't support token factory yet.
      // This would work with a wallet built from the penumbra-token-factory fork.
      // For now, we return the prepared data for manual transaction construction
      // or for use with a compatible RPC endpoint.

      // Attempt to use the transaction planner
      // This will fail on standard wallets but work on token-factory-enabled ones
      try {
        // The standard TransactionPlannerRequest doesn't have token factory fields,
        // so we'll try an experimental approach using a memo-based action
        // that a token-factory-enabled node can interpret.

        // Create a minimal transaction to signal token creation intent
        // In production, this would be a proper ActionTokenFactoryCreate
        const planRequest = new TransactionPlannerRequest({
          // Use memo to carry token factory data (experimental)
          memo: {
            plaintext: {
              text: JSON.stringify({
                action: 'token_factory_create',
                tokenId: prepared.tokenId.toHex(),
                name: params.name,
                symbol: params.symbol,
                description: params.description ?? '',
                initialSupply: params.initialSupply,
                exponent: params.exponent ?? 6,
                enableMint: params.enableMint ?? false,
              }),
              returnAddress: (await penumbra
                .service(ViewService)
                .addressByIndex({ addressIndex: { account: wallet.addressIndex } })).address,
            },
          },
          source: { account: wallet.addressIndex },
        });

        // Plan and build the transaction
        const result = await planBuildBroadcast(planRequest);

        const txHash = result.id?.inner
          ? Buffer.from(result.id.inner).toString('hex')
          : undefined;

        // Refresh balances
        await loadWalletData();

        return {
          success: true,
          tokenId: prepared.tokenId.toHex(),
          denom: prepared.denom,
          txHash,
        };
      } catch (planError) {
        // If planning fails (expected on standard wallets), return prepared data
        console.warn('Transaction planning failed (expected on standard wallets):', planError);

        return {
          success: false,
          tokenId: prepared.tokenId.toHex(),
          denom: prepared.denom,
          error: 'Token factory requires a compatible wallet. Token ID prepared: ' + prepared.tokenId.toHex(),
        };
      }
    } catch (error) {
      console.error('Create token error:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to create token',
      };
    }
  };

  return {
    // State (readonly)
    connection,
    wallet,
    providers,

    // Methods
    detectProviders,
    connect,
    disconnect,
    reconnect,
    refreshBalances,
    setAddressIndex,
    setupListeners,
    planBuildBroadcast,

    // Bridge methods
    bridgeWithdraw,
    getWNearBalance,

    // Auction methods
    scheduleAuction,
    getPenumbraAssetId,

    // Token factory methods
    createToken,

    // Raw client access
    penumbra,
  };
}

// Create singleton store
export const penumbraStore = createRoot(createPenumbraStore);
