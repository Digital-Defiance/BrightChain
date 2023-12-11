/**
 * Unit tests for SmimeCertificateManager.
 *
 * Tests certificate import/export/validation, CMS encrypt/decrypt,
 * and CMS sign/verify using self-signed RSA certificates via @peculiar/x509.
 *
 * @see Requirements 6.1, 6.2, 6.4, 6.5, 7.1, 7.3, 7.4, 8.1, 9.1, 9.4, 9.5, 15.2
 */
import 'reflect-metadata';
import * as x509 from '@peculiar/x509';
import { EmailErrorType } from '../../enumerations/messaging/emailErrorType';
import { EmailError } from '../../errors/messaging/emailError';
import { SmimeCertificateManager } from './smimeCertificateManager';

/**
 * Helper to generate a self-signed RSA certificate and private key for testing.
 */
async function generateTestCertAndKey(
  cn: string,
  serial: string,
  email?: string,
): Promise<{ certPem: string; privateKeyPem: string }> {
  const alg: RsaHashedKeyGenParams = {
    name: 'RSASSA-PKCS1-v1_5',
    hash: 'SHA-256',
    publicExponent: new Uint8Array([1, 0, 1]),
    modulusLength: 2048,
  };
  const keys = await globalThis.crypto.subtle.generateKey(alg, true, [
    'sign',
    'verify',
  ]);

  const extensions: x509.Extension[] = [];
  if (email) {
    extensions.push(
      new x509.SubjectAlternativeNameExtension([
        { type: 'email', value: email },
      ]),
    );
  }

  const cert = await x509.X509CertificateGenerator.createSelfSigned({
    serialNumber: serial,
    name: `CN=${cn}, O=Test Org`,
    notBefore: new Date(),
    notAfter: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000),
    keys,
    signingAlgorithm: alg,
    extensions,
  });

  const certPem = cert.toString('pem');

  // Export private key as PEM
  const pkcs8 = await globalThis.crypto.subtle.exportKey(
    'pkcs8',
    keys.privateKey,
  );
  const b64 = Buffer.from(pkcs8).toString('base64');
  const lines: string[] = [];
  for (let i = 0; i < b64.length; i += 64) {
    lines.push(b64.substring(i, i + 64));
  }
  const privateKeyPem = `-----BEGIN PRIVATE KEY-----\n${lines.join('\n')}\n-----END PRIVATE KEY-----`;

  return { certPem, privateKeyPem };
}

/**
 * Helper to generate an expired self-signed RSA certificate for testing.
 */
async function generateExpiredCertAndKey(
  cn: string,
  serial: string,
  email?: string,
): Promise<{ certPem: string; privateKeyPem: string }> {
  const alg: RsaHashedKeyGenParams = {
    name: 'RSASSA-PKCS1-v1_5',
    hash: 'SHA-256',
    publicExponent: new Uint8Array([1, 0, 1]),
    modulusLength: 2048,
  };
  const keys = await globalThis.crypto.subtle.generateKey(alg, true, [
    'sign',
    'verify',
  ]);

  const extensions: x509.Extension[] = [];
  if (email) {
    extensions.push(
      new x509.SubjectAlternativeNameExtension([
        { type: 'email', value: email },
      ]),
    );
  }

  // Create a certificate that expired yesterday
  const cert = await x509.X509CertificateGenerator.createSelfSigned({
    serialNumber: serial,
    name: `CN=${cn}, O=Test Org`,
    notBefore: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000),
    notAfter: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000),
    keys,
    signingAlgorithm: alg,
    extensions,
  });

  const certPem = cert.toString('pem');

  const pkcs8 = await globalThis.crypto.subtle.exportKey(
    'pkcs8',
    keys.privateKey,
  );
  const b64 = Buffer.from(pkcs8).toString('base64');
  const lines: string[] = [];
  for (let i = 0; i < b64.length; i += 64) {
    lines.push(b64.substring(i, i + 64));
  }
  const privateKeyPem = `-----BEGIN PRIVATE KEY-----\n${lines.join('\n')}\n-----END PRIVATE KEY-----`;

  return { certPem, privateKeyPem };
}

// ═══════════════════════════════════════════════════════════════════════
// Certificate import, validation, and export tests (Task 4.4)
// ═══════════════════════════════════════════════════════════════════════

describe('SmimeCertificateManager — certificate import/export/validation', () => {
  let manager: SmimeCertificateManager;
  let certPem: string;

  beforeAll(async () => {
    manager = new SmimeCertificateManager();

    const result = await generateTestCertAndKey(
      'Import Test User',
      '10',
      'import@example.com',
    );
    certPem = result.certPem;
  }, 30000);

  // ─── importCertificate PEM (Requirement 6.1) ─────────────────────────

  describe('importCertificate — PEM format', () => {
    it('should import a valid PEM certificate and return metadata', async () => {
      const metadata = await manager.importCertificate(certPem, 'pem');

      expect(metadata.subject).toContain('CN=Import Test User');
      expect(metadata.issuer).toBeDefined();
      expect(metadata.serialNumber).toBeDefined();
      expect(metadata.validFrom).toBeInstanceOf(Date);
      expect(metadata.validTo).toBeInstanceOf(Date);
      expect(metadata.fingerprint).toBeDefined();
      expect(metadata.fingerprint.length).toBeGreaterThan(0);
      expect(metadata.isExpired).toBe(false);
    }, 30000);

    it('should extract email addresses from SAN extension', async () => {
      const metadata = await manager.importCertificate(certPem, 'pem');

      expect(metadata.emailAddresses).toContain('import@example.com');
    }, 30000);

    it('should throw SMIME_INVALID_CERT for malformed PEM string', async () => {
      await expect(
        manager.importCertificate('not-a-certificate', 'pem'),
      ).rejects.toThrow(EmailError);
      await expect(
        manager.importCertificate('not-a-certificate', 'pem'),
      ).rejects.toMatchObject({
        errorType: EmailErrorType.SMIME_INVALID_CERT,
      });
    }, 30000);

    it('should throw SMIME_INVALID_CERT when Uint8Array is passed for PEM format', async () => {
      await expect(
        manager.importCertificate(
          new Uint8Array([1, 2, 3]) as unknown as string,
          'pem',
        ),
      ).rejects.toThrow(EmailError);
    }, 30000);
  });

  // ─── importCertificate DER (Requirement 6.1) ─────────────────────────

  describe('importCertificate — DER format', () => {
    it('should import a valid DER certificate and return metadata', async () => {
      // Convert PEM to DER for testing
      const b64 = certPem
        .replace(/-----BEGIN CERTIFICATE-----/g, '')
        .replace(/-----END CERTIFICATE-----/g, '')
        .replace(/\s/g, '');
      const derBuffer = Buffer.from(b64, 'base64');
      const derArray = new Uint8Array(derBuffer);

      const metadata = await manager.importCertificate(derArray, 'der');

      expect(metadata.subject).toContain('CN=Import Test User');
      expect(metadata.serialNumber).toBeDefined();
      expect(metadata.validFrom).toBeInstanceOf(Date);
      expect(metadata.validTo).toBeInstanceOf(Date);
      expect(metadata.isExpired).toBe(false);
    }, 30000);

    it('should throw SMIME_INVALID_CERT for malformed DER data', async () => {
      const garbage = new Uint8Array([0x00, 0x01, 0x02, 0x03]);

      await expect(manager.importCertificate(garbage, 'der')).rejects.toThrow(
        EmailError,
      );
      await expect(
        manager.importCertificate(garbage, 'der'),
      ).rejects.toMatchObject({
        errorType: EmailErrorType.SMIME_INVALID_CERT,
      });
    }, 30000);

    it('should throw SMIME_INVALID_CERT when string is passed for DER format', async () => {
      await expect(
        manager.importCertificate(
          'some-string' as unknown as Uint8Array,
          'der',
        ),
      ).rejects.toThrow(EmailError);
    }, 30000);
  });

  // ─── validateCertificate (Requirement 6.5) ────────────────────────────

  describe('validateCertificate', () => {
    it('should return true for a valid PEM certificate', async () => {
      expect(await manager.validateCertificate(certPem, 'pem')).toBe(true);
    });

    it('should return true for a valid DER certificate', async () => {
      const b64 = certPem
        .replace(/-----BEGIN CERTIFICATE-----/g, '')
        .replace(/-----END CERTIFICATE-----/g, '')
        .replace(/\s/g, '');
      const derArray = new Uint8Array(Buffer.from(b64, 'base64'));

      expect(await manager.validateCertificate(derArray, 'der')).toBe(true);
    });

    it('should return false for malformed PEM string', async () => {
      expect(await manager.validateCertificate('not-a-cert', 'pem')).toBe(
        false,
      );
    });

    it('should return false for PEM missing BEGIN/END markers', async () => {
      const b64Only = certPem
        .replace(/-----BEGIN CERTIFICATE-----/g, '')
        .replace(/-----END CERTIFICATE-----/g, '');
      expect(await manager.validateCertificate(b64Only, 'pem')).toBe(false);
    });

    it('should return false for malformed DER data', async () => {
      const garbage = new Uint8Array([0x00, 0x01, 0x02, 0x03]);
      expect(await manager.validateCertificate(garbage, 'der')).toBe(false);
    });

    it('should return false for empty DER data', async () => {
      const empty = new Uint8Array(0);
      expect(await manager.validateCertificate(empty, 'der')).toBe(false);
    });

    it('should return false when wrong type is passed for PEM format', async () => {
      expect(
        await manager.validateCertificate(
          new Uint8Array([1]) as unknown as string,
          'pem',
        ),
      ).toBe(false);
    });

    it('should return false when wrong type is passed for DER format', async () => {
      expect(
        await manager.validateCertificate(
          'string' as unknown as Uint8Array,
          'der',
        ),
      ).toBe(false);
    });
  });

  // ─── Expired certificate import (Requirement 6.4) ────────────────────

  describe('expired certificate import', () => {
    it('should import an expired certificate and set isExpired to true', async () => {
      const { certPem: expiredPem } = await generateExpiredCertAndKey(
        'Expired User',
        '99',
        'expired@example.com',
      );

      const metadata = await manager.importCertificate(expiredPem, 'pem');

      expect(metadata.isExpired).toBe(true);
      expect(metadata.subject).toContain('CN=Expired User');
      expect(metadata.validTo.getTime()).toBeLessThan(Date.now());
    }, 30000);
  });

  // ─── exportCertificatePem round-trip (Requirement 15.2) ───────────────

  describe('exportCertificatePem', () => {
    it('should round-trip a PEM certificate through export', async () => {
      const exported = await manager.exportCertificatePem(certPem);

      // Both should parse to the same certificate
      const original = new x509.X509Certificate(certPem);
      const roundTripped = new x509.X509Certificate(exported);

      expect(roundTripped.serialNumber).toBe(original.serialNumber);
      expect(roundTripped.subject).toBe(original.subject);
      expect(roundTripped.issuer).toBe(original.issuer);
    }, 30000);

    it('should throw SMIME_INVALID_CERT for invalid PEM input', async () => {
      await expect(manager.exportCertificatePem('not-a-cert')).rejects.toThrow(
        EmailError,
      );
      await expect(
        manager.exportCertificatePem('not-a-cert'),
      ).rejects.toMatchObject({
        errorType: EmailErrorType.SMIME_INVALID_CERT,
      });
    }, 30000);
  });
});

// ═══════════════════════════════════════════════════════════════════════
// CMS encrypt/decrypt and sign/verify tests
// ═══════════════════════════════════════════════════════════════════════

describe('SmimeCertificateManager — CMS encrypt/decrypt', () => {
  let manager: SmimeCertificateManager;
  let certPem: string;
  let privateKeyPem: string;

  beforeAll(async () => {
    manager = new SmimeCertificateManager();

    const result = await generateTestCertAndKey(
      'Test User',
      '01',
      'test@example.com',
    );
    certPem = result.certPem;
    privateKeyPem = result.privateKeyPem;
  }, 30000);

  // ─── Encrypt (Requirement 7.1, 7.3) ──────────────────────────────────

  describe('encrypt', () => {
    it('should encrypt content and return CMS enveloped-data with correct content type', async () => {
      const plaintext = new TextEncoder().encode('Hello, S/MIME world!');

      const result = await manager.encrypt(plaintext, [certPem]);

      expect(result.encryptedContent).toBeInstanceOf(Uint8Array);
      expect(result.encryptedContent.length).toBeGreaterThan(0);
      expect(result.contentType).toBe(
        'application/pkcs7-mime; smime-type=enveloped-data',
      );
    }, 30000);

    it('should throw SMIME_ENCRYPT_FAILED when no recipient certificates provided', async () => {
      const plaintext = new TextEncoder().encode('test');

      await expect(manager.encrypt(plaintext, [])).rejects.toThrow(EmailError);
      await expect(manager.encrypt(plaintext, [])).rejects.toMatchObject({
        errorType: EmailErrorType.SMIME_ENCRYPT_FAILED,
      });
    }, 30000);

    it('should throw SMIME_ENCRYPT_FAILED for invalid certificate PEM', async () => {
      const plaintext = new TextEncoder().encode('test');

      await expect(
        manager.encrypt(plaintext, ['not-a-valid-cert']),
      ).rejects.toThrow(EmailError);
      await expect(
        manager.encrypt(plaintext, ['not-a-valid-cert']),
      ).rejects.toMatchObject({
        errorType: EmailErrorType.SMIME_ENCRYPT_FAILED,
      });
    }, 30000);
  });

  // ─── Decrypt (Requirement 9.1, 9.5) ──────────────────────────────────

  describe('decrypt', () => {
    it('should decrypt CMS enveloped-data back to original plaintext', async () => {
      const plaintext = new TextEncoder().encode('Round-trip test content');

      const { encryptedContent } = await manager.encrypt(plaintext, [certPem]);
      const decrypted = await manager.decrypt(
        encryptedContent,
        certPem,
        privateKeyPem,
      );

      expect(new TextDecoder().decode(decrypted)).toBe(
        'Round-trip test content',
      );
    }, 30000);

    it('should throw SMIME_DECRYPT_FAILED for invalid encrypted content', async () => {
      const garbage = new Uint8Array([0x00, 0x01, 0x02, 0x03]);

      await expect(
        manager.decrypt(garbage, certPem, privateKeyPem),
      ).rejects.toThrow(EmailError);
      await expect(
        manager.decrypt(garbage, certPem, privateKeyPem),
      ).rejects.toMatchObject({
        errorType: EmailErrorType.SMIME_DECRYPT_FAILED,
      });
    }, 30000);

    it('should throw SMIME_DECRYPT_FAILED for invalid private key', async () => {
      const plaintext = new TextEncoder().encode('test');
      const { encryptedContent } = await manager.encrypt(plaintext, [certPem]);

      await expect(
        manager.decrypt(encryptedContent, certPem, 'not-a-valid-key'),
      ).rejects.toThrow(EmailError);
      await expect(
        manager.decrypt(encryptedContent, certPem, 'not-a-valid-key'),
      ).rejects.toMatchObject({
        errorType: EmailErrorType.SMIME_DECRYPT_FAILED,
      });
    }, 30000);
  });

  // ─── Multi-recipient round-trip ───────────────────────────────────────

  describe('encrypt/decrypt round-trip', () => {
    it('should encrypt for multiple recipients and each can decrypt', async () => {
      const { certPem: cert2Pem, privateKeyPem: privateKey2Pem } =
        await generateTestCertAndKey('Second User', '02');

      const plaintext = new TextEncoder().encode('Multi-recipient S/MIME');

      const { encryptedContent } = await manager.encrypt(plaintext, [
        certPem,
        cert2Pem,
      ]);

      // First recipient can decrypt
      const decrypted1 = await manager.decrypt(
        encryptedContent,
        certPem,
        privateKeyPem,
      );
      expect(new TextDecoder().decode(decrypted1)).toBe(
        'Multi-recipient S/MIME',
      );

      // Second recipient can decrypt
      const decrypted2 = await manager.decrypt(
        encryptedContent,
        cert2Pem,
        privateKey2Pem,
      );
      expect(new TextDecoder().decode(decrypted2)).toBe(
        'Multi-recipient S/MIME',
      );
    }, 60000);
  });

  // ─── Sign (Requirement 8.1, 8.2) ─────────────────────────────────────

  describe('sign', () => {
    it('should produce a CMS detached signature with signer subject', async () => {
      const content = new TextEncoder().encode('Sign me please');

      const result = await manager.sign(content, certPem, privateKeyPem);

      expect(result.signature).toBeInstanceOf(Uint8Array);
      expect(result.signature.length).toBeGreaterThan(0);
      expect(result.signerCertSubject).toContain('CN=Test User');
    }, 30000);

    it('should throw SMIME_VERIFY_FAILED for invalid private key', async () => {
      const content = new TextEncoder().encode('test');

      await expect(
        manager.sign(content, certPem, 'not-a-valid-key'),
      ).rejects.toThrow(EmailError);
      await expect(
        manager.sign(content, certPem, 'not-a-valid-key'),
      ).rejects.toMatchObject({
        errorType: EmailErrorType.SMIME_VERIFY_FAILED,
      });
    }, 30000);
  });

  // ─── Verify (Requirement 9.2, 9.3, 9.4) ──────────────────────────────

  describe('verify', () => {
    it('should verify a valid CMS detached signature', async () => {
      const content = new TextEncoder().encode('Verify me');

      const { signature } = await manager.sign(content, certPem, privateKeyPem);
      const result = await manager.verify(content, signature, certPem);

      expect(result.valid).toBe(true);
      expect(result.signerSubject).toContain('CN=Test User');
      expect(result.reason).toBeUndefined();
    }, 30000);

    it('should return invalid for tampered content', async () => {
      const content = new TextEncoder().encode('Original content');
      const tampered = new TextEncoder().encode('Tampered content');

      const { signature } = await manager.sign(content, certPem, privateKeyPem);
      const result = await manager.verify(tampered, signature, certPem);

      expect(result.valid).toBe(false);
      expect(result.reason).toBeDefined();
    }, 30000);

    it('should return invalid for garbage signature data', async () => {
      const content = new TextEncoder().encode('test');
      const garbage = new Uint8Array([0x00, 0x01, 0x02, 0x03]);

      const result = await manager.verify(content, garbage, certPem);

      expect(result.valid).toBe(false);
      expect(result.reason).toBeDefined();
    }, 30000);
  });

  // ─── Sign/Verify round-trip ───────────────────────────────────────────

  describe('sign/verify round-trip', () => {
    it('should sign and verify content successfully', async () => {
      const content = new TextEncoder().encode('Round-trip sign/verify test');

      const signResult = await manager.sign(content, certPem, privateKeyPem);
      const verifyResult = await manager.verify(
        content,
        signResult.signature,
        certPem,
      );

      expect(verifyResult.valid).toBe(true);
      expect(verifyResult.signerSubject).toBe(signResult.signerCertSubject);
    }, 30000);
  });
});
