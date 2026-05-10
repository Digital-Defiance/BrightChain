/**
 * @fileoverview Certificate of Destruction serialization and verification.
 *
 * Browser-safe functions for producing canonical JSON of a certificate
 * payload and verifying the operator's ECDSA signature offline.
 *
 * Validates: Requirements 3.1, 3.2, 3.3, 3.4, 3.5, 3.6
 */

import { secp256k1 } from '@noble/curves/secp256k1';
import { sha256 } from '@noble/hashes/sha256';
import type {
  ICertificateOfDestruction,
  ICertificateVerifyResult,
} from '../interfaces/bases/certificate-of-destruction';

/**
 * Recursively sort all object keys alphabetically and produce a
 * deep-sorted clone. Arrays preserve element order; only object keys
 * are sorted.
 */
function sortKeysDeep(value: unknown): unknown {
  if (value === null || value === undefined) {
    return value;
  }
  if (Array.isArray(value)) {
    return value.map(sortKeysDeep);
  }
  if (typeof value === 'object') {
    const sorted: Record<string, unknown> = {};
    for (const key of Object.keys(value as Record<string, unknown>).sort()) {
      sorted[key] = sortKeysDeep(
        (value as Record<string, unknown>)[key],
      );
    }
    return sorted;
  }
  return value;
}

/**
 * Produce a canonical JSON string of the certificate payload
 * (all fields except `signature`), with keys sorted alphabetically
 * and no optional whitespace.
 *
 * @param certificate - The full certificate (signature field is stripped)
 * @returns Canonical JSON string suitable for hashing
 */
export function serializeCertificate(
  certificate: ICertificateOfDestruction,
): string {
  // Strip the signature field — only the payload is serialized
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const { signature, ...payload } = certificate;
  return JSON.stringify(sortKeysDeep(payload));
}

/**
 * Verify a Certificate of Destruction against an operator public key.
 *
 * Recomputes the SHA-256 hash of the canonical JSON payload and verifies
 * the ECDSA signature. This mirrors the signing flow where
 * `EciesSignature.signMessage(privateKey, sha256(canonicalJson))` is used —
 * `signMessage` internally hashes its input with SHA-256 before signing,
 * so the actual signed value is `sha256(sha256(canonicalJson))`.
 *
 * @param certificate - The full certificate including signature
 * @param operatorPublicKey - 33-byte compressed secp256k1 public key (as Uint8Array)
 * @returns `{ valid: true }` or `{ valid: false, reason: 'SIGNATURE_MISMATCH' }`
 */
export function verifyCertificate(
  certificate: ICertificateOfDestruction,
  operatorPublicKey: Uint8Array,
): ICertificateVerifyResult {
  try {
    // Step 1: Produce canonical JSON of the payload (excluding signature)
    const canonicalJson = serializeCertificate(certificate);

    // Step 2: Compute SHA-256 of the canonical JSON bytes
    const encoder = new TextEncoder();
    const jsonBytes = encoder.encode(canonicalJson);
    const payloadHash = sha256(jsonBytes);

    // Step 3: Compute SHA-256 of the payload hash to match
    // EciesSignature.signMessage() behavior, which internally hashes
    // its input data with sha256 before signing.
    const messageHash = sha256(payloadHash);

    // Step 4: Decode the base64 signature to raw 64-byte compact ECDSA
    const signatureBytes = base64ToUint8Array(certificate.signature);
    if (signatureBytes.length !== 64) {
      return { valid: false, reason: 'SIGNATURE_MISMATCH' };
    }

    // Step 5: Verify the ECDSA signature using @noble/curves/secp256k1
    const sig = secp256k1.Signature.fromCompact(signatureBytes);
    const valid = secp256k1.verify(
      sig.toCompactRawBytes(),
      messageHash,
      operatorPublicKey,
      { prehash: false },
    );

    if (valid) {
      return { valid: true };
    }
    return { valid: false, reason: 'SIGNATURE_MISMATCH' };
  } catch {
    return { valid: false, reason: 'SIGNATURE_MISMATCH' };
  }
}

/**
 * Decode a base64 string to a Uint8Array.
 * Browser-safe: uses atob() when available, falls back to Buffer for Node.js.
 */
function base64ToUint8Array(base64: string): Uint8Array {
  if (typeof atob === 'function') {
    const binaryString = atob(base64);
    const bytes = new Uint8Array(binaryString.length);
    for (let i = 0; i < binaryString.length; i++) {
      bytes[i] = binaryString.charCodeAt(i);
    }
    return bytes;
  }
  // Node.js fallback
  return new Uint8Array(Buffer.from(base64, 'base64'));
}
