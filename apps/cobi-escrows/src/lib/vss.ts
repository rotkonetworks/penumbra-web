// VSS (Verifiable Secret Sharing) utilities
// Client-side share generation for 2-of-3 Shamir

import { keccak256, toHex, toBytes } from 'viem';

// Binary field GF(2^32) with irreducible polynomial x^32 + x^7 + x^3 + x^2 + 1
const POLY: number = 0x8D; // x^7 + x^3 + x^2 + 1 for reduction

export class BF32 {
  constructor(public value: number) {
    this.value = value >>> 0; // Ensure unsigned 32-bit
  }

  static zero(): BF32 {
    return new BF32(0);
  }

  static one(): BF32 {
    return new BF32(1);
  }

  add(other: BF32): BF32 {
    return new BF32(this.value ^ other.value);
  }

  mul(other: BF32): BF32 {
    let a = this.value;
    let b = other.value;
    let result = 0;

    for (let i = 0; i < 32; i++) {
      if (b & 1) {
        result ^= a;
      }
      const highBit = a & 0x80000000;
      a = (a << 1) >>> 0;
      if (highBit) {
        a ^= POLY;
      }
      b >>>= 1;
    }

    return new BF32(result >>> 0);
  }

  inverse(): BF32 {
    // Extended Euclidean algorithm for GF(2^32)
    if (this.value === 0) throw new Error('Cannot invert zero');

    let r0 = 0x100000000; // x^32 (virtual)
    let r1 = this.value;
    let s0 = 0;
    let s1 = 1;

    while (r1 !== 0) {
      const q = this.divMod(r0, r1);
      [r0, r1] = [r1, r0 ^ this.mulPoly(q, r1)];
      [s0, s1] = [s1, s0 ^ this.mulPoly(q, s1)];
    }

    return new BF32(s0 >>> 0);
  }

  private divMod(a: number, b: number): number {
    let q = 0;
    const bDeg = this.degree(b);
    let aDeg = this.degree(a);

    while (aDeg >= bDeg && a !== 0) {
      const shift = aDeg - bDeg;
      q ^= 1 << shift;
      a ^= b << shift;
      aDeg = this.degree(a);
    }

    return q >>> 0;
  }

  private mulPoly(a: number, b: number): number {
    let result = 0;
    while (a !== 0) {
      if (a & 1) result ^= b;
      a >>>= 1;
      b <<= 1;
    }
    return result >>> 0;
  }

  private degree(n: number): number {
    if (n === 0) return -1;
    let d = 0;
    while (n >>> (d + 1)) d++;
    return d;
  }
}

// Generate random 32-byte secret
export function generateSecret(): Uint8Array {
  const secret = new Uint8Array(32);
  crypto.getRandomValues(secret);
  return secret;
}

// Split secret into field elements
export function secretToFieldElements(secret: Uint8Array): BF32[] {
  const elements: BF32[] = [];
  const view = new DataView(secret.buffer, secret.byteOffset, secret.byteLength);
  for (let i = 0; i < 8; i++) {
    elements.push(new BF32(view.getUint32(i * 4, true)));
  }
  return elements;
}

// Evaluate polynomial at point x using Horner's method
function evaluatePolynomial(coeffs: BF32[], x: BF32): BF32 {
  let result = BF32.zero();
  for (let i = coeffs.length - 1; i >= 0; i--) {
    result = result.mul(x).add(coeffs[i]);
  }
  return result;
}

// Encode share values as bytes32 for on-chain storage
export function shareToBytes32(values: number[]): `0x${string}` {
  const data = new Uint8Array(32);
  const view = new DataView(data.buffer);
  values.forEach((v, i) => view.setUint32(i * 4, v, true));
  return ('0x' + Array.from(data).map(b => b.toString(16).padStart(2, '0')).join('')) as `0x${string}`;
}

// Generate 2-of-3 Shamir shares
export function generateShares(secret: Uint8Array): {
  shares: Array<{ index: number; values: number[] }>;
  commitment: `0x${string}`;
  escrowPubkey: `0x${string}`;
  shareC: `0x${string}`; // Share for chain (index 2)
} {
  const secretElements = secretToFieldElements(secret);

  // Generate random coefficients for degree-1 polynomials (2-of-3)
  const randomCoeffs: BF32[][] = secretElements.map(() => {
    const coeff = new Uint8Array(4);
    crypto.getRandomValues(coeff);
    const view = new DataView(coeff.buffer);
    return [new BF32(view.getUint32(0, true))];
  });

  // Evaluation points (1, 2, 3)
  const evalPoints = [new BF32(1), new BF32(2), new BF32(3)];

  // Generate shares
  const shares = evalPoints.map((x, idx) => {
    const values = secretElements.map((secret, i) => {
      const coeffs = [secret, ...randomCoeffs[i]];
      return evaluatePolynomial(coeffs, x).value;
    });
    return { index: idx, values };
  });

  // Compute leaf hashes for Merkle tree
  const leafHashes = shares.map((share) => {
    const data = new Uint8Array(32);
    const view = new DataView(data.buffer);
    share.values.forEach((v, i) => view.setUint32(i * 4, v, true));
    return keccak256(data);
  });

  // Pad to power of 2 (4 leaves)
  while (leafHashes.length < 4) {
    leafHashes.push('0x0000000000000000000000000000000000000000000000000000000000000000');
  }

  // Build Merkle tree
  const tree: `0x${string}`[][] = [leafHashes as `0x${string}`[]];
  let level = leafHashes as `0x${string}`[];
  while (level.length > 1) {
    const nextLevel: `0x${string}`[] = [];
    for (let i = 0; i < level.length; i += 2) {
      const left = level[i];
      const right = level[i + 1] || left;
      // Sort to ensure consistent ordering
      const [a, b] = left < right ? [left, right] : [right, left];
      const combined = (a + b.slice(2)) as `0x${string}`;
      nextLevel.push(keccak256(toBytes(combined)));
    }
    tree.push(nextLevel);
    level = nextLevel;
  }

  const commitment = level[0];

  // Escrow pubkey is keccak256 of secret
  const escrowPubkey = keccak256(secret);

  // ShareC (index 2) encoded as bytes32 for on-chain storage
  const shareC = shareToBytes32(shares[2].values);

  return {
    shares: shares.map((s, idx) => ({
      ...s,
      merkleProof: getMerkleProof(tree, idx),
    })),
    commitment,
    escrowPubkey,
    shareC,
  };
}

// Get Merkle proof for leaf at index
function getMerkleProof(tree: `0x${string}`[][], index: number): `0x${string}`[] {
  const proof: `0x${string}`[] = [];
  let idx = index;

  for (let level = 0; level < tree.length - 1; level++) {
    const siblingIdx = idx % 2 === 0 ? idx + 1 : idx - 1;
    const sibling = tree[level][siblingIdx] || tree[level][idx];
    proof.push(sibling);
    idx = Math.floor(idx / 2);
  }

  return proof;
}

// Format share for display/export
export interface ShareExport {
  index: number;
  values: number[];
  merkleProof: `0x${string}`[];
}

export function exportShareSet(
  shares: ShareExport[],
  commitment: `0x${string}`,
  escrowPubkey: `0x${string}`
): string {
  return JSON.stringify({
    commitment: commitment.slice(2),
    escrow_pubkey: escrowPubkey.slice(2),
    shares: shares.map((s) => ({
      index: s.index,
      values: s.values,
      merkle_proof: s.merkleProof.map((p) => p.slice(2)),
    })),
  }, null, 2);
}
