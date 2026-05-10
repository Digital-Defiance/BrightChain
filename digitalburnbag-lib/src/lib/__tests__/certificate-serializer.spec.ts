/**
 * Unit tests for certificate serialization and verification functions.
 *
 * Validates: Requirements 3.1, 3.2, 3.3, 3.4, 3.5
 */

import { EciesCryptoCore, EciesSignature } from '@digitaldefiance/ecies-lib';
import { sha256 } from '@noble/hashes/sha256';
import type {
  ICertificateOfDestruction,
} from '../interfaces/bases/certificate-of-destruction';
import {
  serializeCertificate,
  verifyCertificate,
} from '../serialization/certificate-serializer';

// ── Shared crypto instances ─────────────────────────────────────────

const cryptoCore = new EciesCryptoCore();
const eciesSignature = new EciesSignature(cryptoCore);

// ── Helpers ─────────────────────────────────────────────────────────

/**
 * Create a sample certificate payload (without signature).
 */
function createSamplePayload(): Omit<ICertificateOfDestruction, 'signature'> {
  return {
    version: 1,
    containerId: 'container-abc-123',
    containerName: 'My Sealed Vault',
    sealHash: 'a1b2c3d4e5f6a1b2c3d4e5f6a1b2c3d4e5f6a1b2c3d4e5f6a1b2c3d4e5f6a1b2',
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
        destructionHash: 'deadbeef01234567deadbeef01234567deadbeef01234567deadbeef01234567',
        ledgerEntryHash: 'cafebabe01234567cafebabe01234567cafebabe01234567cafebabe01234567',
        timestamp: '2025-06-20T14:44:58.000Z',
      },
      {
        fileId: 'file-002',
        destructionHash: '1111111122222222333333334444444455555555666666667777777788888888',
        ledgerEntryHash: 'aaaaaaaa11111111bbbbbbbb22222222cccccccc33333333dddddddd44444444',
        timestamp: '2025-06-20T14:44:59.000Z',
      },
    ],
    containerLedgerEntryHash: 'abcdef0123456789abcdef0123456789abcdef0123456789abcdef0123456789',
    operatorPublicKey: '02abcdef0123456789abcdef0123456789abcdef0123456789abcdef0123456789',
  };
}

/**
 * Sign a certificate payload using EciesSignature (matching the server-side
 * signing flow from the design doc).
 */
function signPayload(
  payload: Omit<ICertificateOfDestruction, 'signature'>,
  privateKey: Uint8Array,
): ICertificateOfDestruction {
  // Produce canonical JSON
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const { ...rest } = payload;
  const sorted = JSON.stringify(sortKeysDeep(rest));
  const encoder = new TextEncoder();
  const jsonBytes = encoder.encode(sorted);

  // Compute SHA-256 of canonical JSON
  const payloadHash = sha256(jsonBytes);

  // Sign with EciesSignature.signMessage (which internally hashes again)
  const signature = eciesSignature.signMessage(privateKey, payloadHash);
  const signatureBase64 = Buffer.from(signature).toString('base64');

  return {
    ...payload,
    signature: signatureBase64,
  };
}

/** Deep-sort keys helper (mirrors the implementation) */
function sortKeysDeep(value: unknown): unknown {
  if (value === null || value === undefined) return value;
  if (Array.isArray(value)) return value.map(sortKeysDeep);
  if (typeof value === 'object') {
    const sorted: Record<string, unknown> = {};
    for (const key of Object.keys(value as Record<string, unknown>).sort()) {
      sorted[key] = sortKeysDeep((value as Record<string, unknown>)[key]);
    }
    return sorted;
  }
  return value;
}

// ── Tests ───────────────────────────────────────────────────────────

describe('serializeCertificate', () => {
  it('produces JSON with keys sorted alphabetically', () => {
    const payload = createSamplePayload();
    const cert: ICertificateOfDestruction = {
      ...payload,
      signature: 'dummy-sig',
    };

    const serialized = serializeCertificate(cert);
    const parsed = JSON.parse(serialized);
    const keys = Object.keys(parsed);

    // Keys must be in alphabetical order
    const sortedKeys = [...keys].sort();
    expect(keys).toEqual(sortedKeys);
  });

  it('produces JSON with no whitespace', () => {
    const payload = createSamplePayload();
    const cert: ICertificateOfDestruction = {
      ...payload,
      signature: 'dummy-sig',
    };

    const serialized = serializeCertificate(cert);

    // No spaces after colons or commas (canonical JSON)
    expect(serialized).not.toMatch(/: /);
    expect(serialized).not.toMatch(/, /);
    // No newlines or tabs
    expect(serialized).not.toMatch(/\n/);
    expect(serialized).not.toMatch(/\t/);
  });

  it('excludes the signature field from serialized output', () => {
    const payload = createSamplePayload();
    const cert: ICertificateOfDestruction = {
      ...payload,
      signature: 'this-should-not-appear',
    };

    const serialized = serializeCertificate(cert);
    const parsed = JSON.parse(serialized);

    expect(parsed).not.toHaveProperty('signature');
    expect(serialized).not.toContain('this-should-not-appear');
  });

  it('preserves specific field values in round-trip', () => {
    const payload = createSamplePayload();
    const cert: ICertificateOfDestruction = {
      ...payload,
      signature: 'sig',
    };

    const serialized = serializeCertificate(cert);
    const parsed = JSON.parse(serialized);

    expect(parsed.version).toBe(1);
    expect(parsed.containerId).toBe('container-abc-123');
    expect(parsed.containerName).toBe('My Sealed Vault');
    expect(parsed.sealHash).toBe(payload.sealHash);
    expect(parsed.sealedAt).toBe('2025-01-15T10:30:00.000Z');
    expect(parsed.destroyedAt).toBe('2025-06-20T14:45:00.000Z');
    expect(parsed.nonAccessVerification.nonAccessConfirmed).toBe(true);
    expect(parsed.nonAccessVerification.totalFilesChecked).toBe(3);
    expect(parsed.fileDestructionProofs).toHaveLength(2);
    expect(parsed.fileDestructionProofs[0].fileId).toBe('file-001');
    expect(parsed.fileDestructionProofs[1].fileId).toBe('file-002');
  });

  it('sorts nested object keys alphabetically', () => {
    const payload = createSamplePayload();
    const cert: ICertificateOfDestruction = {
      ...payload,
      signature: 'sig',
    };

    const serialized = serializeCertificate(cert);
    const parsed = JSON.parse(serialized);

    // Check nested nonAccessVerification keys are sorted
    const navKeys = Object.keys(parsed.nonAccessVerification);
    expect(navKeys).toEqual([...navKeys].sort());

    // Check nested fileDestructionProofs[0] keys are sorted
    const fdpKeys = Object.keys(parsed.fileDestructionProofs[0]);
    expect(fdpKeys).toEqual([...fdpKeys].sort());
  });

  it('is idempotent — serializing, parsing, and re-serializing produces identical output', () => {
    const payload = createSamplePayload();
    const cert: ICertificateOfDestruction = {
      ...payload,
      signature: 'sig',
    };

    const first = serializeCertificate(cert);
    const reparsed = JSON.parse(first);
    // Re-wrap as a certificate with a dummy signature for re-serialization
    const rewrapped: ICertificateOfDestruction = {
      ...reparsed,
      signature: 'different-sig',
    };
    const second = serializeCertificate(rewrapped);

    expect(first).toBe(second);
  });
});

describe('verifyCertificate', () => {
  const privateKey = cryptoCore.generatePrivateKey();
  const publicKey = cryptoCore.getPublicKey(privateKey);

  it('returns { valid: true } for a correctly signed certificate', () => {
    const payload = createSamplePayload();
    const cert = signPayload(payload, privateKey);

    const result = verifyCertificate(cert, publicKey);
    expect(result).toEqual({ valid: true });
  });

  it('returns { valid: false, reason: "SIGNATURE_MISMATCH" } for a tampered certificate', () => {
    const payload = createSamplePayload();
    const cert = signPayload(payload, privateKey);

    // Tamper with the container name
    const tampered: ICertificateOfDestruction = {
      ...cert,
      containerName: 'Tampered Name',
    };

    const result = verifyCertificate(tampered, publicKey);
    expect(result).toEqual({ valid: false, reason: 'SIGNATURE_MISMATCH' });
  });

  it('returns { valid: false, reason: "SIGNATURE_MISMATCH" } for wrong public key', () => {
    const payload = createSamplePayload();
    const cert = signPayload(payload, privateKey);

    // Use a different key pair
    const wrongPrivateKey = cryptoCore.generatePrivateKey();
    const wrongPublicKey = cryptoCore.getPublicKey(wrongPrivateKey);

    const result = verifyCertificate(cert, wrongPublicKey);
    expect(result).toEqual({ valid: false, reason: 'SIGNATURE_MISMATCH' });
  });

  it('returns { valid: false, reason: "SIGNATURE_MISMATCH" } for invalid signature bytes', () => {
    const payload = createSamplePayload();
    const cert: ICertificateOfDestruction = {
      ...payload,
      signature: Buffer.from(new Uint8Array(64).fill(0xff)).toString('base64'),
    };

    const result = verifyCertificate(cert, publicKey);
    expect(result).toEqual({ valid: false, reason: 'SIGNATURE_MISMATCH' });
  });

  it('returns { valid: false, reason: "SIGNATURE_MISMATCH" } for wrong-length signature', () => {
    const payload = createSamplePayload();
    const cert: ICertificateOfDestruction = {
      ...payload,
      signature: Buffer.from(new Uint8Array(32).fill(0xab)).toString('base64'),
    };

    const result = verifyCertificate(cert, publicKey);
    expect(result).toEqual({ valid: false, reason: 'SIGNATURE_MISMATCH' });
  });

  it('returns { valid: false } when a numeric field is tampered', () => {
    const payload = createSamplePayload();
    const cert = signPayload(payload, privateKey);

    const tampered: ICertificateOfDestruction = {
      ...cert,
      version: 2,
    };

    const result = verifyCertificate(tampered, publicKey);
    expect(result).toEqual({ valid: false, reason: 'SIGNATURE_MISMATCH' });
  });

  it('returns { valid: false } when a nested field is tampered', () => {
    const payload = createSamplePayload();
    const cert = signPayload(payload, privateKey);

    const tampered: ICertificateOfDestruction = {
      ...cert,
      nonAccessVerification: {
        ...cert.nonAccessVerification,
        nonAccessConfirmed: false,
      },
    };

    const result = verifyCertificate(tampered, publicKey);
    expect(result).toEqual({ valid: false, reason: 'SIGNATURE_MISMATCH' });
  });
});
