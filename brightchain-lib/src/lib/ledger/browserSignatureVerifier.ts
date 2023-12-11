/**
 * @fileoverview BrowserSignatureVerifier — lightweight ILedgerSignatureVerifier.
 *
 * Calls @noble/curves secp256k1 directly to verify compact ECDSA signatures
 * without requiring an ECIESService instance. Useful in browser contexts
 * (e.g. the showcase demo) where you want minimal dependencies.
 *
 * EciesSignatureVerifier is the full-featured alternative that wraps
 * ECIESService.verifyMessage().
 *
 * @see eciesSignatureVerifier.ts for the ECIESService-backed version
 */

import type { SignatureUint8Array } from '@digitaldefiance/ecies-lib';
import { secp256k1 } from '@noble/curves/secp256k1';
import { sha256 } from '@noble/hashes/sha2';
import type { ILedgerSignatureVerifier } from '../interfaces/ledger/ledgerSignatureVerifier';

export class BrowserSignatureVerifier implements ILedgerSignatureVerifier {
  verify(
    publicKey: Uint8Array,
    data: Uint8Array,
    signature: SignatureUint8Array,
  ): boolean {
    try {
      if (!signature || signature.length !== 64) return false;
      const hash = sha256(data);
      return secp256k1.verify(signature, hash, publicKey, {
        prehash: false,
        format: 'compact',
      });
    } catch {
      return false;
    }
  }
}
