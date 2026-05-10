/**
 * @fileoverview Certificate of Destruction signing service (Node.js only).
 *
 * Signs a certificate payload with the operator's secp256k1 private key
 * using the same EciesSignature infrastructure as the WCAP signing middleware.
 *
 * Validates: Requirements 2.3, 3.7
 */

import type { ICertificateOfDestruction } from '@brightchain/digitalburnbag-lib';
import { serializeCertificate } from '@brightchain/digitalburnbag-lib';
import { EciesCryptoCore, EciesSignature } from '@digitaldefiance/ecies-lib';
import { createHash } from 'crypto';

// Singleton — stateless aside from its EciesCryptoCore dependency.
const eciesSignature = new EciesSignature(new EciesCryptoCore());

/**
 * Sign a certificate payload with the operator's private key.
 *
 * Computes SHA-256 of the canonical JSON, signs with
 * `EciesSignature.signMessage()` (which internally hashes again with SHA-256
 * before signing), and returns the certificate with the `signature` field
 * populated as a base64-encoded 64-byte compact ECDSA signature.
 *
 * @param certificate - Certificate payload (signature field will be overwritten)
 * @param operatorPrivateKey - 32-byte secp256k1 private key
 * @returns The certificate with the `signature` field populated
 */
export function signCertificate(
  certificate: Omit<ICertificateOfDestruction, 'signature'>,
  operatorPrivateKey: Uint8Array,
): ICertificateOfDestruction {
  // Step 1: Produce canonical JSON of the payload (excluding signature)
  const canonicalJson = serializeCertificate(
    certificate as ICertificateOfDestruction,
  );

  // Step 2: Compute SHA-256 of the canonical JSON bytes
  const payloadHash = createHash('sha256')
    .update(Buffer.from(canonicalJson, 'utf8'))
    .digest();

  // Step 3: Sign with EciesSignature.signMessage (which internally hashes
  // the input with SHA-256 before signing — so the actual signed value is
  // sha256(sha256(canonicalJson)))
  const signature = eciesSignature.signMessage(
    operatorPrivateKey,
    new Uint8Array(payloadHash),
  );

  // Step 4: Encode the 64-byte compact ECDSA signature as base64
  const signatureBase64 = Buffer.from(signature).toString('base64');

  return {
    ...certificate,
    signature: signatureBase64,
  };
}
