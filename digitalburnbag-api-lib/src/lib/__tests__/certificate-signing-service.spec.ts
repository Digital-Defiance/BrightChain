/**
 * Unit tests for the certificate signing service.
 *
 * Validates: Requirements 2.3, 3.3, 3.7
 */

import type { ICertificateOfDestruction } from '@brightchain/digitalburnbag-lib';
import { verifyCertificate } from '@brightchain/digitalburnbag-lib';
import { EciesCryptoCore } from '@digitaldefiance/ecies-lib';
import { signCertificate } from '../services/certificate-signing-service';

// ── Shared crypto ───────────────────────────────────────────────────

const cryptoCore = new EciesCryptoCore();

// ── Helpers ─────────────────────────────────────────────────────────

/**
 * Create a sample certificate payload (without signature).
 */
function createSamplePayload(): Omit<ICertificateOfDestruction, 'signature'> {
  return {
    version: 1,
    containerId: 'container-abc-123',
    containerName: 'My Sealed Vault',
    sealHash:
      'a1b2c3d4e5f6a1b2c3d4e5f6a1b2c3d4e5f6a1b2c3d4e5f6a1b2c3d4e5f6a1b2',
    sealedAt: '2025-01-15T10:30:00.000Z',
    destroyedAt: '2025-06-20T14:45:00.000Z',
    nonAccessVerification: {
      containerId: 'container-abc-123',
      nonAccessConfirmed: true,
      accessedFileIds: [],
      inconsistentFileIds: [],
      totalFilesChecked: 3,
    },
    fileDestructionProofs: [
      {
        fileId: 'file-001',
        destructionHash:
          'deadbeef01234567deadbeef01234567deadbeef01234567deadbeef01234567',
        ledgerEntryHash:
          'cafebabe01234567cafebabe01234567cafebabe01234567cafebabe01234567',
        timestamp: '2025-06-20T14:44:58.000Z',
      },
      {
        fileId: 'file-002',
        destructionHash:
          '1111111122222222333333334444444455555555666666667777777788888888',
        ledgerEntryHash:
          'aaaaaaaa11111111bbbbbbbb22222222cccccccc33333333dddddddd44444444',
        timestamp: '2025-06-20T14:44:59.000Z',
      },
    ],
    containerLedgerEntryHash:
      'abcdef0123456789abcdef0123456789abcdef0123456789abcdef0123456789',
    operatorPublicKey:
      '02abcdef0123456789abcdef0123456789abcdef0123456789abcdef0123456789',
  };
}

// ── Tests ───────────────────────────────────────────────────────────

describe('signCertificate', () => {
  const privateKey = cryptoCore.generatePrivateKey();
  const publicKey = cryptoCore.getPublicKey(privateKey);

  it('produces a certificate with the signature field populated', () => {
    const payload = createSamplePayload();
    const signed = signCertificate(payload, privateKey);

    expect(signed.signature).toBeDefined();
    expect(typeof signed.signature).toBe('string');
    expect(signed.signature.length).toBeGreaterThan(0);
  });

  it('produces a signature that can be verified with verifyCertificate', () => {
    const payload = createSamplePayload();
    const signed = signCertificate(payload, privateKey);

    const result = verifyCertificate(signed, publicKey);
    expect(result).toEqual({ valid: true });
  });

  it('produces a base64-encoded signature that decodes to 64 bytes', () => {
    const payload = createSamplePayload();
    const signed = signCertificate(payload, privateKey);

    const sigBytes = Buffer.from(signed.signature, 'base64');
    expect(sigBytes.length).toBe(64);
  });

  it('different private keys produce different signatures', () => {
    const payload = createSamplePayload();

    const privateKeyA = cryptoCore.generatePrivateKey();
    const privateKeyB = cryptoCore.generatePrivateKey();

    const signedA = signCertificate(payload, privateKeyA);
    const signedB = signCertificate(payload, privateKeyB);

    expect(signedA.signature).not.toBe(signedB.signature);
  });

  it('preserves all payload fields in the signed certificate', () => {
    const payload = createSamplePayload();
    const signed = signCertificate(payload, privateKey);

    expect(signed.version).toBe(payload.version);
    expect(signed.containerId).toBe(payload.containerId);
    expect(signed.containerName).toBe(payload.containerName);
    expect(signed.sealHash).toBe(payload.sealHash);
    expect(signed.sealedAt).toBe(payload.sealedAt);
    expect(signed.destroyedAt).toBe(payload.destroyedAt);
    expect(signed.nonAccessVerification).toEqual(
      payload.nonAccessVerification,
    );
    expect(signed.fileDestructionProofs).toEqual(
      payload.fileDestructionProofs,
    );
    expect(signed.containerLedgerEntryHash).toBe(
      payload.containerLedgerEntryHash,
    );
    expect(signed.operatorPublicKey).toBe(payload.operatorPublicKey);
  });

  it('signature from key A fails verification with key B', () => {
    const payload = createSamplePayload();

    const privateKeyA = cryptoCore.generatePrivateKey();
    const privateKeyB = cryptoCore.generatePrivateKey();
    const publicKeyB = cryptoCore.getPublicKey(privateKeyB);

    const signed = signCertificate(payload, privateKeyA);

    const result = verifyCertificate(signed, publicKeyB);
    expect(result).toEqual({ valid: false, reason: 'SIGNATURE_MISMATCH' });
  });
});
