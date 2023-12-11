/**
 * @fileoverview ILedgerSigner interface.
 *
 * Minimal signing interface that accepts Uint8Array for browser compatibility.
 * Decoupled from IMemberOperational but compatible with it via MemberSignerAdapter.
 *
 * @see Design: Block Chain Ledger — ILedgerSigner
 * @see Requirements 3.4
 */

import { SignatureUint8Array } from '@digitaldefiance/ecies-lib';

/**
 * A minimal signing interface for ledger entries.
 *
 * Any entity possessing a SECP256k1 key pair that can produce SignatureUint8Array
 * values satisfies this interface.
 */
export interface ILedgerSigner {
  /** The signer's public key as raw bytes. */
  readonly publicKey: Uint8Array;
  /** Sign the given data and return a SECP256k1 signature. */
  sign(data: Uint8Array): SignatureUint8Array;
}
