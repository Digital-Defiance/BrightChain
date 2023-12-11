/**
 * @fileoverview ILedgerEntry interface.
 *
 * Defines the core data structure for a single entry in the blockchain ledger.
 * Each entry carries a payload, hash-chain link, digital signature, and metadata
 * needed for chain integrity and signature verification.
 *
 * @see Design: Block Chain Ledger — ILedgerEntry
 * @see Requirements 1.1–1.8, 11.1
 */

import { PlatformID, SignatureUint8Array } from '@digitaldefiance/ecies-lib';
import { Checksum } from '../../types/checksum';

/**
 * A single entry in the blockchain ledger.
 *
 * All fields are readonly to enforce immutability after construction (Req 1.8).
 *
 * @template TID - Platform ID type for frontend/backend DTO compatibility,
 *   consistent with the existing PlatformID generic pattern (Req 11.1).
 */
export interface ILedgerEntry<TID extends PlatformID = Uint8Array> {
  /** Application data payload (Req 1.1). */
  readonly payload: Uint8Array;
  /** EntryHash of the preceding entry, or null for the GenesisEntry (Req 1.2). */
  readonly previousEntryHash: Checksum | null;
  /** SHA3-512 checksum computed over the canonical serialized content (Req 1.3). */
  readonly entryHash: Checksum;
  /** SECP256k1 signature produced by the Signer over the entryHash (Req 1.4). */
  readonly signature: SignatureUint8Array;
  /** Public key identifying the Signer (Req 1.5). */
  readonly signerPublicKey: Uint8Array;
  /** Timestamp recording when the entry was created (Req 1.6). */
  readonly timestamp: Date;
  /** Zero-based position in the chain (Req 1.7). */
  readonly sequenceNumber: number;
  /** Generic marker for DTO compatibility. */
  readonly _platformId?: TID;
}
