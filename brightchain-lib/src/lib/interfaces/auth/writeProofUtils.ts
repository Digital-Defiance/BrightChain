/**
 * @fileoverview Write Proof utility functions for BrightDB
 *
 * Provides the payload computation for write proof signing and verification.
 * The write proof payload is SHA-256(dbName + ":" + collectionName + ":" + blockId),
 * which gets signed with the signer's secp256k1 private key via ECDSA.
 *
 * Uses @noble/hashes for cross-platform SHA-256 (works in both Node.js and browser).
 *
 * @see BrightDB Write ACLs design, Write Proof Format section
 * @see Requirements 3.2
 */

import { sha256 } from '@noble/hashes/sha256';

/**
 * Computes the write proof payload: SHA-256(dbName + ":" + collectionName + ":" + blockId).
 *
 * This is the data that gets signed by the writer's secp256k1 private key
 * to produce a Write_Proof, and verified against the writer's public key
 * during head registry authorization checks.
 *
 * @param dbName - The database name
 * @param collectionName - The collection name
 * @param blockId - The new head block ID
 * @returns SHA-256 hash as Uint8Array (32 bytes)
 *
 * @example
 * ```typescript
 * const payload = createWriteProofPayload('mydb', 'users', 'abc123');
 * // payload is SHA-256("mydb:users:abc123") as Uint8Array
 * ```
 *
 * @see Requirements 3.2
 */
export function createWriteProofPayload(
  dbName: string,
  collectionName: string,
  blockId: string,
  nonce: number,
): Uint8Array {
  const message = `${dbName}:${collectionName}:${blockId}:${nonce}`;
  const encoded = new TextEncoder().encode(message);
  return sha256(encoded);
}
