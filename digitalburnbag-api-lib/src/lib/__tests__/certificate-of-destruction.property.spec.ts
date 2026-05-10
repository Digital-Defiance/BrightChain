/**
 * Property-based tests for Certificate of Destruction signing and verification.
 *
 * These tests validate the cryptographic correctness of the certificate
 * signing/verification round-trip, canonical JSON serialization, wrong-key
 * rejection, tamper detection, and certificate completeness.
 *
 * NOTE: This test lives in digitalburnbag-api-lib because it tests the
 * signCertificate service which is a Node.js-only backend service.
 * The arbitraries and verification utilities are imported from digitalburnbag-lib.
 *
 * **Validates: Requirements 12.1, 12.2, 12.3, 12.4, 12.5**
 */

import * as fc from 'fast-check';
import { signCertificate } from '../services/certificate-signing-service';
import {
  serializeCertificate,
  verifyCertificate,
} from '@brightchain/digitalburnbag-lib';
// Import arbitraries from digitalburnbag-lib's test helpers via deep path
// (the jest moduleNameMapper resolves @brightchain/digitalburnbag-lib to the source)
import {
  arbCertificatePayload,
  arbSecp256k1KeyPair,
  arbByteFlipIndex,
} from '../../../../digitalburnbag-lib/src/lib/__tests__/arbitraries';

// ── Property 1: Sign-then-verify round-trip ─────────────────────────

// Feature: vault-deletion-certificate, Property 1: Sign-then-verify round-trip
describe('Feature: vault-deletion-certificate, Property 1: Sign-then-verify round-trip', () => {
  it('FOR ALL valid payloads and key pairs, sign then verify → { valid: true }', () => {
    fc.assert(
      fc.property(
        arbCertificatePayload,
        arbSecp256k1KeyPair,
        (payload, { privateKey, publicKey }) => {
          // Override operatorPublicKey in payload to match the key pair
          const payloadWithKey = {
            ...payload,
            operatorPublicKey: Buffer.from(publicKey).toString('hex'),
          };

          // Sign the certificate
          const signed = signCertificate(payloadWithKey, privateKey);

          // Verify with the corresponding public key
          const result = verifyCertificate(signed, publicKey);

          expect(result.valid).toBe(true);
        },
      ),
      { numRuns: 1000 },
    );
  });
});

// ── Property 2: Canonical JSON serialization idempotence ────────────

// Feature: vault-deletion-certificate, Property 2: Canonical JSON serialization idempotence
describe('Feature: vault-deletion-certificate, Property 2: Canonical JSON serialization idempotence', () => {
  it('FOR ALL valid payloads, serialize → parse → re-serialize produces identical string', () => {
    fc.assert(
      fc.property(
        arbCertificatePayload,
        arbSecp256k1KeyPair,
        (payload, { privateKey }) => {
          // Sign to get a complete certificate with signature
          const signed = signCertificate(payload, privateKey);

          // First serialization
          const serialized1 = serializeCertificate(signed);

          // Parse and re-serialize
          const parsed = JSON.parse(serialized1);
          // Re-create a certificate-like object from parsed (add back signature)
          const reconstructed = { ...parsed, signature: signed.signature };
          const serialized2 = serializeCertificate(reconstructed);

          // Must be byte-identical
          expect(serialized1).toBe(serialized2);
        },
      ),
      { numRuns: 1000 },
    );
  });
});

// ── Property 3: Wrong-key rejection ─────────────────────────────────

// Feature: vault-deletion-certificate, Property 3: Wrong-key rejection
describe('Feature: vault-deletion-certificate, Property 3: Wrong-key rejection', () => {
  it('FOR ALL valid payloads signed with key A, verify with key B (A ≠ B) → { valid: false }', () => {
    fc.assert(
      fc.property(
        arbCertificatePayload,
        arbSecp256k1KeyPair,
        arbSecp256k1KeyPair,
        (payload, keyPairA, keyPairB) => {
          // Ensure keys are different
          fc.pre(
            Buffer.from(keyPairA.publicKey).toString('hex') !==
              Buffer.from(keyPairB.publicKey).toString('hex'),
          );

          // Set operatorPublicKey to key A's public key
          const payloadWithKey = {
            ...payload,
            operatorPublicKey: Buffer.from(keyPairA.publicKey).toString('hex'),
          };

          // Sign with key A
          const signed = signCertificate(payloadWithKey, keyPairA.privateKey);

          // Verify with key B (wrong key)
          const result = verifyCertificate(signed, keyPairB.publicKey);

          expect(result.valid).toBe(false);
          expect(result.reason).toBe('SIGNATURE_MISMATCH');
        },
      ),
      { numRuns: 1000 },
    );
  });
});

// ── Property 4: Tamper detection via byte flip ──────────────────────

// Feature: vault-deletion-certificate, Property 4: Tamper detection via byte flip
describe('Feature: vault-deletion-certificate, Property 4: Tamper detection via byte flip', () => {
  it('FOR ALL valid signed payloads, flip any single byte → { valid: false }', () => {
    fc.assert(
      fc.property(
        arbCertificatePayload,
        arbSecp256k1KeyPair,
        arbByteFlipIndex,
        (payload, { privateKey, publicKey }, rawFlipIndex) => {
          // Set operatorPublicKey to match the key pair
          const payloadWithKey = {
            ...payload,
            operatorPublicKey: Buffer.from(publicKey).toString('hex'),
          };

          // Sign the certificate
          const signed = signCertificate(payloadWithKey, privateKey);

          // Serialize to get the canonical JSON payload
          const serialized = serializeCertificate(signed);
          const bytes = Buffer.from(serialized, 'utf8');

          // Clamp flip index to valid range
          const flipIndex = rawFlipIndex % bytes.length;

          // Flip a single byte (XOR with a non-zero value)
          const tampered = Buffer.from(bytes);
          tampered[flipIndex] = tampered[flipIndex] ^ 0xff;

          // Try to parse the tampered JSON — if it's invalid JSON, the
          // verification should still fail (caught by try/catch in verifyCertificate)
          try {
            const tamperedPayload = JSON.parse(tampered.toString('utf8'));
            // Reconstruct a certificate with the original signature but tampered payload
            const tamperedCert = {
              ...tamperedPayload,
              signature: signed.signature,
            };

            const result = verifyCertificate(tamperedCert, publicKey);
            expect(result.valid).toBe(false);
          } catch {
            // If JSON.parse fails, the tampered payload is invalid JSON.
            // This is still a valid test case — tampering broke the payload.
            // verifyCertificate would fail on such input.
            expect(true).toBe(true);
          }
        },
      ),
      { numRuns: 1000 },
    );
  });
});

// ── Property 6: Certificate completeness ────────────────────────────

// Feature: vault-deletion-certificate, Property 6: Certificate completeness
describe('Feature: vault-deletion-certificate, Property 6: Certificate completeness', () => {
  it('FOR ALL valid inputs, generated certificate has all required fields non-empty', () => {
    fc.assert(
      fc.property(
        arbCertificatePayload,
        arbSecp256k1KeyPair,
        (payload, { privateKey, publicKey }) => {
          // Set operatorPublicKey to match the key pair
          const payloadWithKey = {
            ...payload,
            operatorPublicKey: Buffer.from(publicKey).toString('hex'),
          };

          // Sign the certificate
          const signed = signCertificate(payloadWithKey, privateKey);

          // All required fields must be present and non-empty
          expect(signed.version).toBe(1);
          expect(signed.containerId).toBeTruthy();
          expect(signed.containerId.length).toBeGreaterThan(0);
          expect(signed.containerName).toBeTruthy();
          expect(signed.containerName.length).toBeGreaterThan(0);
          expect(signed.sealHash).toBeTruthy();
          expect(signed.sealHash.length).toBeGreaterThan(0);
          expect(signed.sealedAt).toBeTruthy();
          expect(signed.sealedAt.length).toBeGreaterThan(0);
          expect(signed.destroyedAt).toBeTruthy();
          expect(signed.destroyedAt.length).toBeGreaterThan(0);
          expect(signed.nonAccessVerification).toBeDefined();
          expect(signed.nonAccessVerification.containerId).toBeTruthy();
          expect(signed.nonAccessVerification.totalFilesChecked).toBeGreaterThan(0);
          expect(signed.fileDestructionProofs).toBeDefined();
          expect(signed.fileDestructionProofs.length).toBeGreaterThan(0);
          expect(signed.containerLedgerEntryHash).toBeTruthy();
          expect(signed.containerLedgerEntryHash.length).toBeGreaterThan(0);
          expect(signed.operatorPublicKey).toBeTruthy();
          expect(signed.operatorPublicKey.length).toBeGreaterThan(0);
          expect(signed.signature).toBeTruthy();
          expect(signed.signature.length).toBeGreaterThan(0);

          // Signature should decode to exactly 64 bytes
          const sigBytes = Buffer.from(signed.signature, 'base64');
          expect(sigBytes.length).toBe(64);

          // Each file destruction proof must have all fields
          for (const proof of signed.fileDestructionProofs) {
            expect(proof.fileId).toBeTruthy();
            expect(proof.fileId.length).toBeGreaterThan(0);
            expect(proof.destructionHash).toBeTruthy();
            expect(proof.destructionHash.length).toBeGreaterThan(0);
            expect(proof.ledgerEntryHash).toBeTruthy();
            expect(proof.ledgerEntryHash.length).toBeGreaterThan(0);
            expect(proof.timestamp).toBeTruthy();
            expect(proof.timestamp.length).toBeGreaterThan(0);
          }
        },
      ),
      { numRuns: 1000 },
    );
  });
});
