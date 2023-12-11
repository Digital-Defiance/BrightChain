/**
 * Unit tests for EmailEncryptionService GPG and S/MIME methods.
 *
 * Tests GPG encrypt/decrypt, sign/verify, S/MIME (real CMS) encrypt/decrypt,
 * sign/verify, sign-then-encrypt flows, error cases, and scheme metadata.
 *
 * @see Requirements 3.1, 3.3, 4.1, 4.2, 5.1, 5.3, 7.1, 8.1, 8.2, 9.1, 9.3
 */
import 'reflect-metadata';
import * as x509 from '@peculiar/x509';
import { EmailErrorType } from '../../enumerations/messaging/emailErrorType';
import { MessageEncryptionScheme } from '../../enumerations/messaging/messageEncryptionScheme';
import { EmailError } from '../../errors/messaging/emailError';
import { EmailEncryptionService } from './emailEncryptionService';
import { GpgKeyManager } from './gpgKeyManager';

// ─── Helpers ────────────────────────────────────────────────────────────────

/**
 * Generate a self-signed RSA certificate and private key for S/MIME tests.
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

// ─── GPG Tests ──────────────────────────────────────────────────────────────

describe('EmailEncryptionService — GPG methods', () => {
  let service: EmailEncryptionService;
  let gpgPublicKey: string;
  let gpgPrivateKey: string;
  const passphrase = 'test-passphrase-123';

  beforeAll(async () => {
    service = new EmailEncryptionService();

    const gpgKeyManager = new GpgKeyManager();
    const keyPair = await gpgKeyManager.generateKeyPair(
      'Test User',
      'test@example.com',
      passphrase,
    );
    gpgPublicKey = keyPair.publicKeyArmored;
    gpgPrivateKey = keyPair.privateKeyArmored;
  }, 30000);

  // ─── encryptGpg / decryptGpg round-trip (Requirements 3.1, 5.1) ─────

  describe('encryptGpg / decryptGpg round-trip', () => {
    it('should encrypt and decrypt content via GPG', async () => {
      const content = new TextEncoder().encode('Hello GPG world!');
      const recipientKeys = new Map<string, string>();
      recipientKeys.set('test@example.com', gpgPublicKey);

      const result = await service.encryptGpg(content, recipientKeys);

      expect(result.encryptedContent).toBeInstanceOf(Uint8Array);
      expect(result.encryptedContent.length).toBeGreaterThan(0);

      const decrypted = await service.decryptGpg(
        result.encryptedContent,
        gpgPrivateKey,
        passphrase,
      );

      expect(new TextDecoder().decode(decrypted)).toBe('Hello GPG world!');
    }, 30000);
  });

  // ─── signGpg / verifyGpg round-trip (Requirements 4.1, 5.3) ─────────

  describe('signGpg / verifyGpg round-trip', () => {
    it('should sign and verify content via GPG', async () => {
      const content = new TextEncoder().encode('Sign me with GPG');

      const signResult = await service.signGpg(
        content,
        gpgPrivateKey,
        passphrase,
      );

      expect(signResult.signature).toBeInstanceOf(Uint8Array);
      expect(signResult.signature.length).toBeGreaterThan(0);

      const isValid = await service.verifyGpg(
        content,
        signResult.signature,
        gpgPublicKey,
      );

      expect(isValid).toBe(true);
    }, 30000);
  });

  // ─── Sign-then-encrypt flow for GPG (Requirement 4.2) ────────────────

  describe('GPG sign-then-encrypt flow', () => {
    it('should sign before encrypting when sender key is provided', async () => {
      const content = new TextEncoder().encode('Signed and encrypted GPG');
      const recipientKeys = new Map<string, string>();
      recipientKeys.set('test@example.com', gpgPublicKey);

      const result = await service.encryptGpg(
        content,
        recipientKeys,
        gpgPrivateKey,
        passphrase,
      );

      // Metadata should indicate signed
      expect(result.encryptionMetadata.isSigned).toBe(true);
      expect(result.encryptionMetadata.gpgSignature).toBeDefined();
      expect(result.encryptionMetadata.gpgSignerKeyId).toBeDefined();

      // Should still be decryptable
      const decrypted = await service.decryptGpg(
        result.encryptedContent,
        gpgPrivateKey,
        passphrase,
      );
      expect(new TextDecoder().decode(decrypted)).toBe(
        'Signed and encrypted GPG',
      );
    }, 30000);
  });

  // ─── GPG error cases ─────────────────────────────────────────────────

  describe('GPG error cases', () => {
    it('should throw PRIVATE_KEY_MISSING when decrypting without private key', async () => {
      const content = new Uint8Array([1, 2, 3]);

      await expect(service.decryptGpg(content, '', passphrase)).rejects.toThrow(
        EmailError,
      );

      await expect(
        service.decryptGpg(content, '', passphrase),
      ).rejects.toMatchObject({
        errorType: EmailErrorType.PRIVATE_KEY_MISSING,
      });
    });

    it('should throw PRIVATE_KEY_MISSING when signing without private key', async () => {
      const content = new TextEncoder().encode('test');

      await expect(service.signGpg(content, '', passphrase)).rejects.toThrow(
        EmailError,
      );

      await expect(
        service.signGpg(content, '', passphrase),
      ).rejects.toMatchObject({
        errorType: EmailErrorType.PRIVATE_KEY_MISSING,
      });
    });
  });

  // ─── GPG scheme metadata (Requirement 3.3) ───────────────────────────

  describe('GPG scheme metadata', () => {
    it('should set scheme to GPG in encryption metadata', async () => {
      const content = new TextEncoder().encode('Metadata test');
      const recipientKeys = new Map<string, string>();
      recipientKeys.set('test@example.com', gpgPublicKey);

      const result = await service.encryptGpg(content, recipientKeys);

      expect(result.encryptionMetadata.scheme).toBe(
        MessageEncryptionScheme.GPG,
      );
      expect(result.encryptionMetadata.gpgEncryptedMessage).toBeDefined();
    }, 30000);
  });
});

// ─── S/MIME Tests ───────────────────────────────────────────────────────────

describe('EmailEncryptionService — S/MIME methods', () => {
  let service: EmailEncryptionService;
  let certPem: string;
  let privateKeyPem: string;

  beforeAll(async () => {
    service = new EmailEncryptionService();

    const result = await generateTestCertAndKey(
      'SMIME Test User',
      '42',
      'smime@example.com',
    );
    certPem = result.certPem;
    privateKeyPem = result.privateKeyPem;
  }, 30000);

  // ─── encryptSmimeReal / decryptSmimeReal round-trip (Requirements 7.1, 9.1) ─

  describe('encryptSmimeReal / decryptSmimeReal round-trip', () => {
    it('should encrypt and decrypt content via real CMS S/MIME', async () => {
      const content = new TextEncoder().encode('Hello S/MIME world!');
      const recipientCerts = new Map<string, string>();
      recipientCerts.set('smime@example.com', certPem);

      const result = await service.encryptSmimeReal(content, recipientCerts);

      expect(result.encryptedContent).toBeInstanceOf(Uint8Array);
      expect(result.encryptedContent.length).toBeGreaterThan(0);

      const decrypted = await service.decryptSmimeReal(
        result.encryptedContent,
        certPem,
        privateKeyPem,
      );

      expect(new TextDecoder().decode(decrypted)).toBe('Hello S/MIME world!');
    }, 30000);
  });

  // ─── signSmime / verifySmime round-trip (Requirements 8.1, 9.3) ─────

  describe('signSmime / verifySmime round-trip', () => {
    it('should sign and verify content via S/MIME CMS', async () => {
      const content = new TextEncoder().encode('Sign me with S/MIME');

      const signResult = await service.signSmime(
        content,
        certPem,
        privateKeyPem,
      );

      expect(signResult.signature).toBeInstanceOf(Uint8Array);
      expect(signResult.signature.length).toBeGreaterThan(0);

      const isValid = await service.verifySmime(
        content,
        signResult.signature,
        certPem,
      );

      expect(isValid).toBe(true);
    }, 30000);
  });

  // ─── Sign-then-encrypt flow for S/MIME (Requirement 8.2) ─────────────

  describe('S/MIME sign-then-encrypt flow', () => {
    it('should sign before encrypting when sender cert and key are provided', async () => {
      const content = new TextEncoder().encode('Signed and encrypted S/MIME');
      const recipientCerts = new Map<string, string>();
      recipientCerts.set('smime@example.com', certPem);

      const result = await service.encryptSmimeReal(
        content,
        recipientCerts,
        certPem,
        privateKeyPem,
      );

      // Metadata should indicate signed
      expect(result.encryptionMetadata.isSigned).toBe(true);
      expect(result.encryptionMetadata.cmsSignature).toBeDefined();
      expect(result.encryptionMetadata.cmsSignature).toBeInstanceOf(Uint8Array);
      expect(result.encryptionMetadata.smimeSignerSubject).toBeDefined();

      // Should still be decryptable
      const decrypted = await service.decryptSmimeReal(
        result.encryptedContent,
        certPem,
        privateKeyPem,
      );
      expect(new TextDecoder().decode(decrypted)).toBe(
        'Signed and encrypted S/MIME',
      );
    }, 30000);
  });

  // ─── S/MIME error cases ───────────────────────────────────────────────

  describe('S/MIME error cases', () => {
    it('should throw PRIVATE_KEY_MISSING when decrypting without private key', async () => {
      const content = new Uint8Array([1, 2, 3]);

      await expect(
        service.decryptSmimeReal(content, certPem, ''),
      ).rejects.toThrow(EmailError);

      await expect(
        service.decryptSmimeReal(content, certPem, ''),
      ).rejects.toMatchObject({
        errorType: EmailErrorType.PRIVATE_KEY_MISSING,
      });
    });

    it('should throw PRIVATE_KEY_MISSING when signing without private key', async () => {
      const content = new TextEncoder().encode('test');

      await expect(service.signSmime(content, certPem, '')).rejects.toThrow(
        EmailError,
      );

      await expect(
        service.signSmime(content, certPem, ''),
      ).rejects.toMatchObject({
        errorType: EmailErrorType.PRIVATE_KEY_MISSING,
      });
    });
  });

  // ─── S/MIME scheme metadata ───────────────────────────────────────────

  describe('S/MIME scheme metadata', () => {
    it('should set scheme to S_MIME in encryption metadata', async () => {
      const content = new TextEncoder().encode('Metadata test');
      const recipientCerts = new Map<string, string>();
      recipientCerts.set('smime@example.com', certPem);

      const result = await service.encryptSmimeReal(content, recipientCerts);

      expect(result.encryptionMetadata.scheme).toBe(
        MessageEncryptionScheme.S_MIME,
      );
      expect(result.encryptionMetadata.cmsEncryptedContent).toBeDefined();
    }, 30000);
  });
});
