/**
 * Token Factory Types and Utilities
 *
 * This module provides types for the Penumbra Token Factory extension.
 * These types are compatible with the penumbra-token-factory fork.
 *
 * Token factory enables:
 * - Creating new tokens with custom metadata
 * - Optional minting capability for bridge tokens
 * - Fair launch (fixed supply) or mintable tokens
 */

// ============================================================================
// Token Factory ID (32-byte nonce)
// ============================================================================

export class TokenFactoryId {
  inner: Uint8Array;

  constructor(data?: { inner?: Uint8Array }) {
    this.inner = data?.inner ?? new Uint8Array(32);
  }

  /**
   * Generate a random token factory ID
   */
  static random(): TokenFactoryId {
    const inner = crypto.getRandomValues(new Uint8Array(32));
    return new TokenFactoryId({ inner });
  }

  /**
   * Get the denom string for this token ID
   * Format: factory/{hex_nonce}
   */
  denom(): string {
    return `factory/${this.toHex()}`;
  }

  /**
   * Convert to hex string
   */
  toHex(): string {
    return Array.from(this.inner)
      .map((b) => b.toString(16).padStart(2, '0'))
      .join('');
  }

  /**
   * Create from hex string
   */
  static fromHex(hex: string): TokenFactoryId {
    const bytes = new Uint8Array(hex.length / 2);
    for (let i = 0; i < hex.length; i += 2) {
      bytes[i / 2] = parseInt(hex.substring(i, i + 2), 16);
    }
    if (bytes.length !== 32) {
      throw new Error('Token factory ID must be 32 bytes');
    }
    return new TokenFactoryId({ inner: bytes });
  }
}

// ============================================================================
// Token Metadata (simplified for token factory)
// ============================================================================

export interface TokenMetadata {
  // Base denomination (auto-generated from nonce)
  base: string;
  // Display name
  name: string;
  // Symbol (e.g., "MYTOKEN")
  symbol: string;
  // Description
  description?: string;
  // Number of decimal places for display unit
  exponent?: number;
}

// ============================================================================
// Action: Create Token
// ============================================================================

export interface ActionTokenFactoryCreateParams {
  // Random nonce defining the token ID
  nonce: TokenFactoryId;
  // Token metadata
  metadata: TokenMetadata;
  // Initial supply (in base units)
  initialSupply: bigint;
  // If true, outputs MintCapability for future minting
  enableMint: boolean;
}

/**
 * Serialize ActionTokenFactoryCreate to protobuf bytes
 *
 * Wire format:
 * - Field 1 (TokenFactoryId): nonce
 * - Field 2 (Metadata): metadata
 * - Field 3 (Amount): initial_supply
 * - Field 4 (bool): enable_mint
 */
export function encodeActionTokenFactoryCreate(params: ActionTokenFactoryCreateParams): Uint8Array {
  const parts: Uint8Array[] = [];

  // Field 1: nonce (TokenFactoryId with nested bytes)
  // Tag: (1 << 3) | 2 = 10 (length-delimited)
  const nonceInner = encodeBytes(1, params.nonce.inner);
  parts.push(encodeBytes(1, nonceInner));

  // Field 2: metadata (Metadata message)
  const metadataBytes = encodeMetadata(params.metadata);
  parts.push(encodeBytes(2, metadataBytes));

  // Field 3: initial_supply (Amount = { lo, hi })
  const supplyBytes = encodeAmount(params.initialSupply);
  parts.push(encodeBytes(3, supplyBytes));

  // Field 4: enable_mint (bool)
  if (params.enableMint) {
    parts.push(new Uint8Array([32, 1])); // tag 4, varint 1
  }

  return concatBytes(parts);
}

/**
 * Encode Metadata message
 */
function encodeMetadata(metadata: TokenMetadata): Uint8Array {
  const parts: Uint8Array[] = [];

  // Field 2: description
  if (metadata.description) {
    parts.push(encodeString(2, metadata.description));
  }

  // Field 3: denom_units - we add two: base (exp=0) and display (exp=exponent)
  const exponent = metadata.exponent ?? 6;

  // Base unit (exponent 0)
  const baseUnit = concatBytes([
    encodeString(1, metadata.base), // denom
    // exponent defaults to 0, no need to encode
  ]);
  parts.push(encodeBytes(3, baseUnit));

  // Display unit (with exponent)
  const displayUnit = concatBytes([
    encodeString(1, metadata.symbol.toLowerCase()), // denom
    encodeVarint(2, exponent), // exponent
  ]);
  parts.push(encodeBytes(3, displayUnit));

  // Field 4: base
  parts.push(encodeString(4, metadata.base));

  // Field 5: display
  parts.push(encodeString(5, metadata.symbol.toLowerCase()));

  // Field 6: name
  parts.push(encodeString(6, metadata.name));

  // Field 7: symbol
  parts.push(encodeString(7, metadata.symbol));

  return concatBytes(parts);
}

/**
 * Encode Amount message (lo, hi uint64)
 */
function encodeAmount(value: bigint): Uint8Array {
  const lo = value & BigInt('0xFFFFFFFFFFFFFFFF');
  const hi = value >> 64n;

  const parts: Uint8Array[] = [];

  // Field 1: lo (uint64)
  if (lo > 0n) {
    parts.push(encodeVarint(1, Number(lo)));
  }

  // Field 2: hi (uint64)
  if (hi > 0n) {
    parts.push(encodeVarint(2, Number(hi)));
  }

  return concatBytes(parts);
}

// ============================================================================
// Action: Mint Tokens
// ============================================================================

export interface ActionTokenFactoryMintParams {
  // Token factory ID
  tokenId: TokenFactoryId;
  // Current sequence number of the capability
  currentSeq: bigint;
  // Amount to mint (in base units)
  amount: bigint;
}

/**
 * Serialize ActionTokenFactoryMint to protobuf bytes
 */
export function encodeActionTokenFactoryMint(params: ActionTokenFactoryMintParams): Uint8Array {
  const parts: Uint8Array[] = [];

  // Field 1: token_id (TokenFactoryId)
  const tokenIdInner = encodeBytes(1, params.tokenId.inner);
  parts.push(encodeBytes(1, tokenIdInner));

  // Field 2: current_seq (uint64)
  parts.push(encodeVarint(2, Number(params.currentSeq)));

  // Field 3: amount (Amount)
  const amountBytes = encodeAmount(params.amount);
  parts.push(encodeBytes(3, amountBytes));

  return concatBytes(parts);
}

// ============================================================================
// Protobuf Encoding Utilities
// ============================================================================

function encodeVarint(fieldNumber: number, value: number): Uint8Array {
  const tag = (fieldNumber << 3) | 0; // wire type 0 = varint
  const result: number[] = [tag];

  let v = value;
  while (v > 127) {
    result.push((v & 0x7F) | 0x80);
    v = v >>> 7;
  }
  result.push(v);

  return new Uint8Array(result);
}

function encodeBytes(fieldNumber: number, data: Uint8Array): Uint8Array {
  const tag = (fieldNumber << 3) | 2; // wire type 2 = length-delimited
  const length = encodeVarintRaw(data.length);

  const result = new Uint8Array(1 + length.length + data.length);
  result[0] = tag;
  result.set(length, 1);
  result.set(data, 1 + length.length);

  return result;
}

function encodeString(fieldNumber: number, value: string): Uint8Array {
  return encodeBytes(fieldNumber, new TextEncoder().encode(value));
}

function encodeVarintRaw(value: number): Uint8Array {
  const result: number[] = [];
  let v = value;
  while (v > 127) {
    result.push((v & 0x7F) | 0x80);
    v = v >>> 7;
  }
  result.push(v);
  return new Uint8Array(result);
}

function concatBytes(arrays: Uint8Array[]): Uint8Array {
  const totalLength = arrays.reduce((sum, arr) => sum + arr.length, 0);
  const result = new Uint8Array(totalLength);
  let offset = 0;
  for (const arr of arrays) {
    result.set(arr, offset);
    offset += arr.length;
  }
  return result;
}

// ============================================================================
// Token Creation Helper
// ============================================================================

export interface CreateTokenParams {
  // Token name
  name: string;
  // Token symbol (e.g., "MYTOKEN")
  symbol: string;
  // Description
  description?: string;
  // Initial supply (human-readable, e.g., "1000000")
  initialSupply: string;
  // Number of decimal places (default: 6)
  exponent?: number;
  // Enable minting capability for bridges
  enableMint?: boolean;
}

export interface CreateTokenResult {
  // The token factory ID (nonce)
  tokenId: TokenFactoryId;
  // The base denomination
  denom: string;
  // The encoded action bytes
  actionBytes: Uint8Array;
  // Initial supply in base units
  initialSupplyBase: bigint;
}

/**
 * Prepare token creation action
 */
export function prepareCreateToken(params: CreateTokenParams): CreateTokenResult {
  const tokenId = TokenFactoryId.random();
  const denom = tokenId.denom();
  const exponent = params.exponent ?? 6;

  // Convert supply to base units
  const supplyFloat = parseFloat(params.initialSupply);
  const initialSupplyBase = BigInt(Math.floor(supplyFloat * (10 ** exponent)));

  const metadata: TokenMetadata = {
    base: denom,
    name: params.name,
    symbol: params.symbol,
    description: params.description,
    exponent,
  };

  const actionBytes = encodeActionTokenFactoryCreate({
    nonce: tokenId,
    metadata,
    initialSupply: initialSupplyBase,
    enableMint: params.enableMint ?? false,
  });

  return {
    tokenId,
    denom,
    actionBytes,
    initialSupplyBase,
  };
}

// ============================================================================
// Constants
// ============================================================================

// Action field numbers in the Action oneof (from transaction.proto)
export const TOKEN_FACTORY_CREATE_FIELD_NUMBER = 61;
export const TOKEN_FACTORY_MINT_FIELD_NUMBER = 62;

// Maximum limits
export const MAX_NAME_LENGTH = 128;
export const MAX_SYMBOL_LENGTH = 32;
export const MAX_DESCRIPTION_LENGTH = 1024;
export const MAX_INITIAL_SUPPLY = BigInt('1000000000000000000000000000'); // 10^27
