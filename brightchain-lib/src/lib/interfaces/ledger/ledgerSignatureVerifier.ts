/**
 * @fileoverview ILedgerSignatureVerifier interface.
 *
 * Verification interface decoupled from signing for separation of concerns.
 *
 * @see Design: Block Chain Ledger — ILedgerSignatureVerifier
 * @see Requirements 3.2
 */

import { SignatureUint8Array } from '@digitaldefiance/ecies-lib';

/**
 * Verifies SECP256k1 signatures for ledger entries.
 */
export interface ILedgerSignatureVerifier {
  /** Verify that the signature was produced by the holder of the given public key over the given data. */
  verify(
    publicKey: Uint8Array,
    data: Uint8Array,
    signature: SignatureUint8Array,
  ): boolean;
}
