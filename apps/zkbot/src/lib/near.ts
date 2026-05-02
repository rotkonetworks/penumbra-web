/**
 * NEAR wallet connection and bridge interaction
 * Uses @near-wallet-selector for wallet connection
 */

import { createSignal, createRoot, batch } from 'solid-js';
import { createStore } from 'solid-js/store';
import { setupWalletSelector, type WalletSelector, type AccountState } from '@near-wallet-selector/core';
import { setupMyNearWallet } from '@near-wallet-selector/my-near-wallet';
import { setupMeteorWallet } from '@near-wallet-selector/meteor-wallet';
import { setupHereWallet } from '@near-wallet-selector/here-wallet';
import { setupModal, type WalletSelectorModal } from '@near-wallet-selector/modal-ui';
import { providers, utils } from 'near-api-js';
import BigNumber from 'bignumber.js';

// ============================================================================
// Configuration
// ============================================================================

export interface NearConfig {
  networkId: 'mainnet' | 'testnet' | 'localnet';
  nodeUrl: string;
  bridgeContract: string;
  explorerUrl: string;
}

const CONFIGS: Record<string, NearConfig> = {
  mainnet: {
    networkId: 'mainnet',
    nodeUrl: 'https://rpc.mainnet.near.org',
    bridgeContract: 'bridge.near', // TODO: Deploy mainnet contract
    explorerUrl: 'https://explorer.near.org',
  },
  testnet: {
    networkId: 'testnet',
    nodeUrl: 'https://rpc.testnet.near.org',
    bridgeContract: 'bridge.testnet.near', // TODO: Deploy testnet contract
    explorerUrl: 'https://explorer.testnet.near.org',
  },
  localnet: {
    networkId: 'testnet', // Wallet selector doesn't support localnet directly
    nodeUrl: 'http://localhost:3030',
    bridgeContract: 'bridge.test.near',
    explorerUrl: '',
  },
};

// ============================================================================
// Types
// ============================================================================

export interface BridgeAsset {
  nearToken: string;
  penumbraDenom: string;
  name: string;
  symbol: string;
  decimals: number;
  depositsEnabled: boolean;
  withdrawalsEnabled: boolean;
  minDeposit: string;
}

export interface BridgeDeposit {
  depositId: string;
  depositor: string;
  amount: string;
  penumbraDestination: string;
  timestamp: number;
  status: 'pending' | 'completed' | 'failed';
}

export interface NearConnectionState {
  connected: boolean;
  connecting: boolean;
  accountId: string | undefined;
  balance: string | undefined;
  error: string | undefined;
}

export interface BridgeState {
  tvl: Record<string, string>;
  assets: BridgeAsset[];
  pendingDeposits: BridgeDeposit[];
  paused: boolean;
  loading: boolean;
}

// ============================================================================
// NEAR Store
// ============================================================================

function createNearStore() {
  // Configuration
  const [config, setConfig] = createSignal<NearConfig>(CONFIGS.localnet!);

  // Connection state
  const [connection, setConnection] = createStore<NearConnectionState>({
    connected: false,
    connecting: false,
    accountId: undefined,
    balance: undefined,
    error: undefined,
  });

  // Bridge state
  const [bridge, setBridge] = createStore<BridgeState>({
    tvl: {},
    assets: [],
    pendingDeposits: [],
    paused: false,
    loading: false,
  });

  // Wallet selector instance
  let selector: WalletSelector | null = null;
  let modal: WalletSelectorModal | null = null;

  // ============================================================================
  // Wallet Selector Setup
  // ============================================================================

  const initWalletSelector = async (network: 'mainnet' | 'testnet' | 'localnet' = 'localnet') => {
    const cfg = CONFIGS[network];
    if (!cfg) throw new Error(`Invalid network: ${network}`);

    setConfig(cfg);

    try {
      selector = await setupWalletSelector({
        network: cfg.networkId,
        modules: [
          setupMyNearWallet(),
          setupMeteorWallet(),
          setupHereWallet(),
        ],
      });

      modal = setupModal(selector, {
        contractId: cfg.bridgeContract,
      });

      // Subscribe to account changes
      selector.store.observable.subscribe((state) => {
        const accounts = state.accounts;
        if (accounts.length > 0 && accounts[0]) {
          batch(() => {
            setConnection('connected', true);
            setConnection('accountId', accounts[0].accountId);
          });
          loadAccountBalance();
          loadBridgeState();
        } else {
          batch(() => {
            setConnection('connected', false);
            setConnection('accountId', undefined);
            setConnection('balance', undefined);
          });
        }
      });

      // Check if already signed in
      const state = selector.store.getState();
      if (state.accounts.length > 0 && state.accounts[0]) {
        batch(() => {
          setConnection('connected', true);
          setConnection('accountId', state.accounts[0].accountId);
        });
        await loadAccountBalance();
        await loadBridgeState();
      }

      return true;
    } catch (error) {
      console.error('Failed to init wallet selector:', error);
      setConnection('error', `Failed to initialize: ${error}`);
      return false;
    }
  };

  // ============================================================================
  // Connection Methods
  // ============================================================================

  const connect = async () => {
    if (!modal) {
      // Try direct RPC connection for localnet
      return connectDirectRpc();
    }

    setConnection('connecting', true);
    setConnection('error', undefined);

    try {
      modal.show();
      // Modal handles the rest via subscription
    } catch (error) {
      setConnection('error', `Connection failed: ${error}`);
    } finally {
      setConnection('connecting', false);
    }
  };

  const connectDirectRpc = async () => {
    // Direct RPC connection without wallet (read-only)
    setConnection('connecting', true);

    try {
      const cfg = config();
      const provider = new providers.JsonRpcProvider({ url: cfg.nodeUrl });

      // Test connection
      const status = await provider.status();
      console.log('NEAR RPC connected:', status.chain_id);

      batch(() => {
        setConnection('connected', true);
        setConnection('accountId', 'viewer (read-only)');
        setConnection('connecting', false);
      });

      await loadBridgeState();
      return true;
    } catch (error) {
      batch(() => {
        setConnection('connecting', false);
        setConnection('error', `RPC connection failed: ${error}`);
      });
      return false;
    }
  };

  const disconnect = async () => {
    if (selector) {
      const wallet = await selector.wallet();
      await wallet.signOut();
    }

    batch(() => {
      setConnection('connected', false);
      setConnection('accountId', undefined);
      setConnection('balance', undefined);
    });
  };

  // ============================================================================
  // Account Methods
  // ============================================================================

  const loadAccountBalance = async () => {
    const accountId = connection.accountId;
    if (!accountId || accountId.includes('read-only')) return;

    try {
      const cfg = config();
      const provider = new providers.JsonRpcProvider({ url: cfg.nodeUrl });
      const account = await provider.query({
        request_type: 'view_account',
        finality: 'final',
        account_id: accountId,
      });

      // @ts-ignore - account has amount property
      const balanceYocto = account.amount;
      const balanceNear = utils.format.formatNearAmount(balanceYocto, 4);
      setConnection('balance', balanceNear);
    } catch (error) {
      console.error('Failed to load balance:', error);
    }
  };

  // ============================================================================
  // Bridge Methods
  // ============================================================================

  const loadBridgeState = async () => {
    setBridge('loading', true);

    try {
      const cfg = config();
      const provider = new providers.JsonRpcProvider({ url: cfg.nodeUrl });

      // View function helper
      const viewFunction = async (methodName: string, args: object = {}) => {
        const result = await provider.query({
          request_type: 'call_function',
          finality: 'final',
          account_id: cfg.bridgeContract,
          method_name: methodName,
          args_base64: Buffer.from(JSON.stringify(args)).toString('base64'),
        });
        // @ts-ignore
        return JSON.parse(Buffer.from(result.result).toString());
      };

      // Load bridge data in parallel
      const [tvlResult, assetsResult, pausedResult] = await Promise.allSettled([
        viewFunction('get_all_tvl'),
        viewFunction('get_all_assets'),
        viewFunction('is_paused'),
      ]);

      batch(() => {
        if (tvlResult.status === 'fulfilled') {
          const tvl: Record<string, string> = {};
          for (const [asset, amount] of tvlResult.value) {
            tvl[asset] = amount;
          }
          setBridge('tvl', tvl);
        }

        if (assetsResult.status === 'fulfilled') {
          const assets: BridgeAsset[] = assetsResult.value.map((a: any) => ({
            nearToken: a.near_token,
            penumbraDenom: a.penumbra_denom,
            name: a.name,
            symbol: a.name,
            decimals: a.decimals,
            depositsEnabled: a.deposits_enabled,
            withdrawalsEnabled: a.withdrawals_enabled ?? true,
            minDeposit: a.min_deposit,
          }));
          setBridge('assets', assets);
        }

        if (pausedResult.status === 'fulfilled') {
          setBridge('paused', pausedResult.value);
        }

        setBridge('loading', false);
      });
    } catch (error) {
      console.error('Failed to load bridge state:', error);
      setBridge('loading', false);
    }
  };

  // ============================================================================
  // Bridge Deposit (NEAR → Penumbra)
  // ============================================================================

  const deposit = async (
    amount: string,
    penumbraDestination: string,
    asset: string = 'NEAR'
  ): Promise<{ success: boolean; txHash?: string; error?: string }> => {
    if (!selector || !connection.accountId) {
      return { success: false, error: 'Wallet not connected' };
    }

    try {
      const cfg = config();
      const wallet = await selector.wallet();

      // Convert amount to yoctoNEAR (10^24)
      const amountYocto = utils.format.parseNearAmount(amount);
      if (!amountYocto) {
        return { success: false, error: 'Invalid amount' };
      }

      // Call deposit function on bridge contract
      const result = await wallet.signAndSendTransaction({
        receiverId: cfg.bridgeContract,
        actions: [
          {
            type: 'FunctionCall',
            params: {
              methodName: 'deposit',
              args: {
                penumbra_destination: penumbraDestination,
              },
              gas: '100000000000000', // 100 TGas
              deposit: amountYocto,
            },
          },
        ],
      });

      // Refresh state
      await loadAccountBalance();
      await loadBridgeState();

      return {
        success: true,
        txHash: result?.transaction?.hash,
      };
    } catch (error) {
      console.error('Deposit failed:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Deposit failed',
      };
    }
  };

  // ============================================================================
  // Bridge Withdraw (Penumbra → NEAR) - Claim
  // ============================================================================

  const claimWithdrawal = async (
    withdrawalId: string,
    signature: string
  ): Promise<{ success: boolean; txHash?: string; error?: string }> => {
    if (!selector || !connection.accountId) {
      return { success: false, error: 'Wallet not connected' };
    }

    try {
      const cfg = config();
      const wallet = await selector.wallet();

      const result = await wallet.signAndSendTransaction({
        receiverId: cfg.bridgeContract,
        actions: [
          {
            type: 'FunctionCall',
            params: {
              methodName: 'claim_withdrawal',
              args: {
                withdrawal_id: withdrawalId,
                mpc_signature: signature,
              },
              gas: '100000000000000',
              deposit: '0',
            },
          },
        ],
      });

      await loadAccountBalance();
      await loadBridgeState();

      return {
        success: true,
        txHash: result?.transaction?.hash,
      };
    } catch (error) {
      console.error('Claim failed:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Claim failed',
      };
    }
  };

  // ============================================================================
  // Helpers
  // ============================================================================

  const formatNear = (yoctoAmount: string): string => {
    return utils.format.formatNearAmount(yoctoAmount, 4);
  };

  const parseNear = (nearAmount: string): string | null => {
    return utils.format.parseNearAmount(nearAmount);
  };

  const switchNetwork = async (network: 'mainnet' | 'testnet' | 'localnet') => {
    await disconnect();
    await initWalletSelector(network);
  };

  return {
    // State (readonly)
    config,
    connection,
    bridge,

    // Methods
    initWalletSelector,
    connect,
    connectDirectRpc,
    disconnect,
    switchNetwork,
    loadBridgeState,
    deposit,
    claimWithdrawal,

    // Helpers
    formatNear,
    parseNear,

    // Raw selector access
    getSelector: () => selector,
    getModal: () => modal,
  };
}

// Create singleton store
export const nearStore = createRoot(createNearStore);
