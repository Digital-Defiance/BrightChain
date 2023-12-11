/**
 * @fileoverview KeyPairLedgerSigner — bridges raw ECDSA key pairs to ILedgerSigner.
 *
 * Uses the ECDSANodeAuthenticator for signing, producing SignatureUint8Array
 * values compatible with the Ledger's verification.
 *
 * @see .kiro/specs/member-pool-security/design.md — Phase 6
 */

import type { ILedgerSigner } from '@brightchain/brightchain-lib';
import type { SignatureUint8Array } from '@digitaldefiance/ecies-lib';
import * as crypto from 'crypto';
import { ECDSANodeAuthenticator } from '../auth/ecdsaNodeAuthenticator';

/**
 * ILedgerSigner implementation backed by raw ECDSA key bytes.
 * Uses ECDSANodeAuthenticator for signing (Node.js crypto).
 */
export class KeyPairLedgerSigner implements ILedgerSigner {
  public readonly publicKey: Uint8Array;
  private readonly privateKey: Uint8Array;
  private readonly authenticator: ECDSANodeAuthenticator;

  constructor(publicKey: Uint8Array, privateKey: Uint8Array) {
    this.publicKey = publicKey;
    this.privateKey = privateKey;
    this.authenticator = new ECDSANodeAuthenticator();
  }

  sign(data: Uint8Array): SignatureUint8Array {
    // Node.js crypto.sign produces DER-encoded ECDSA signatures.
    // The Ledger expects raw 64-byte (r, s) format.
    // We must convert DER → raw r,s.
    const ecdh = crypto.createECDH('secp256k1');
    ecdh.setPrivateKey(Buffer.from(this.privateKey));
    const uncompressedPub = ecdh.getPublicKey();

    const keyObject = crypto.createPrivateKey({
      key: {
        kty: 'EC',
        crv: 'secp256k1',
        x: uncompressedPub.subarray(1, 33).toString('base64url'),
        y: uncompressedPub.subarray(33, 65).toString('base64url'),
        d: Buffer.from(this.privateKey).toString('base64url'),
      },
      format: 'jwk',
    });

    const derSignature = crypto.sign(null, Buffer.from(data), keyObject);

    // Convert DER to raw r,s (each 32 bytes, zero-padded)
    const raw = derToRawSignature(derSignature);
    return raw as SignatureUint8Array;
  }
}

/**
 * Convert a DER-encoded ECDSA signature to raw 64-byte (r, s) format.
 * DER format: 0x30 [total-len] 0x02 [r-len] [r] 0x02 [s-len] [s]
 */
function derToRawSignature(der: Buffer): Uint8Array {
  const raw = new Uint8Array(64);
  let offset = 0;

  // 0x30 SEQUENCE
  if (der[offset++] !== 0x30) throw new Error('Invalid DER: missing SEQUENCE');
  offset++; // skip total length

  // r INTEGER
  if (der[offset++] !== 0x02) throw new Error('Invalid DER: missing r INTEGER');
  let rLen = der[offset++];
  let rStart = offset;
  offset += rLen;

  // s INTEGER
  if (der[offset++] !== 0x02) throw new Error('Invalid DER: missing s INTEGER');
  let sLen = der[offset++];
  let sStart = offset;

  // Strip leading zero bytes (DER uses signed integers, so a leading 0x00
  // is added when the high bit is set)
  if (rLen === 33 && der[rStart] === 0x00) {
    rStart++;
    rLen = 32;
  }
  if (sLen === 33 && der[sStart] === 0x00) {
    sStart++;
    sLen = 32;
  }

  // Right-align into 32-byte fields
  raw.set(der.subarray(rStart, rStart + rLen), 32 - rLen);
  raw.set(der.subarray(sStart, sStart + sLen), 64 - sLen);

  return raw;
}
