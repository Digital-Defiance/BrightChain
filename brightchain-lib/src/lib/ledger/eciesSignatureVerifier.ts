/**
 * @fileoverview EciesSignatureVerifier — default ILedgerSignatureVerifier implementation.
 *
 * Wraps ECIESService.verifyMessage() to verify SECP256k1 signatures
 * for ledger entries.
 *
 * @see Design: Block Chain Ledger — EciesSignatureVerifier
 * @see Requirements 3.2, 9.4
 */

import { ECIESService, SignatureUint8Array } from '@digitaldefiance/ecies-lib';
import { ILedgerSignatureVerifier } from '../interfaces/ledger/ledgerSignatureVerifier';

export class EciesSignatureVerifier implements ILedgerSignatureVerifier {
  constructor(private readonly eciesService: ECIESService) {}

  verify(
    publicKey: Uint8Array,
    data: Uint8Array,
    signature: SignatureUint8Array,
  ): boolean {
    return this.eciesService.verifyMessage(publicKey, data, signature);
  }
}
