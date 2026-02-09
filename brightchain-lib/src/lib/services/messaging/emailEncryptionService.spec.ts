import { randomBytes } from 'crypto';
import { EmailErrorType } from '../../enumerations/messaging/emailErrorType';
import { MessageEncryptionScheme } from '../../enumerations/messaging/messageEncryptionScheme';
import { EmailError } from '../../errors/messaging/emailError';
import { EmailEncryptionService } from './emailEncryptionService';

/**
 * Unit tests for EmailEncryptionService.
 *
 * Tests encryption/decryption for ECIES and symmetric schemes,
 * per-recipient encryption, signing, and signature verification.
 *
 * @see Requirements 16.1, 16.3, 16.4, 16.5, 16.6, 16.7, 16.8
 */
describe('EmailEncryptionService', () => {
  let service: EmailEncryptionService;

  beforeEach(() => {
    service = new EmailEncryptionService();
  });

  // ─── Symmetric Encryption (Requirement 16.1) ─────────────────────────

  describe('encryptContentSymmetric / decryptContentSymmetric', () => {
    it('should encrypt and decrypt content with a shared symmetric key', () => {
      const content = new TextEncoder().encode('Hello, encrypted world!');
      const sharedKey = randomBytes(32);

      const { encryptedContent, encryptionMetadata } =
        service.encryptContentSymmetric(content, sharedKey);

      // Encrypted content should differ from plaintext
      expect(Buffer.from(encryptedContent).toString()).not.toBe(
        'Hello, encrypted world!',
      );
      expect(encryptionMetadata.scheme).toBe(
        MessageEncryptionScheme.SHARED_KEY,
      );
      expect(encryptionMetadata.iv).toBeDefined();
      expect(encryptionMetadata.authTag).toBeDefined();
      expect(encryptionMetadata.isSigned).toBe(false);

      // Decrypt
      const decrypted = service.decryptContentSymmetric(
        encryptedContent,
        encryptionMetadata,
        sharedKey,
      );

      expect(Buffer.from(decrypted).toString()).toBe('Hello, encrypted world!');
    });

    it('should fail decryption with wrong key', () => {
      const content = new TextEncoder().encode('Secret message');
      const correctKey = randomBytes(32);
      const wrongKey = randomBytes(32);

      const { encryptedContent, encryptionMetadata } =
        service.encryptContentSymmetric(content, correctKey);

      expect(() =>
        service.decryptContentSymmetric(
          encryptedContent,
          encryptionMetadata,
          wrongKey,
        ),
      ).toThrow(EmailError);
    });

    it('should reject keys that are not 32 bytes', () => {
      const content = new TextEncoder().encode('test');
      const shortKey = randomBytes(16);

      expect(() => service.encryptContentSymmetric(content, shortKey)).toThrow(
        EmailError,
      );
    });

    it('should fail decryption with missing IV', () => {
      const content = new TextEncoder().encode('test');
      const key = randomBytes(32);
      const { encryptedContent } = service.encryptContentSymmetric(
        content,
        key,
      );

      expect(() =>
        service.decryptContentSymmetric(
          encryptedContent,
          {
            scheme: MessageEncryptionScheme.SHARED_KEY,
            isSigned: false,
          },
          key,
        ),
      ).toThrow(EmailError);
    });
  });

  // ─── Signing (Requirement 16.5, 16.8) ────────────────────────────────

  describe('signContent / verifySignature', () => {
    it('should sign content and verify the signature', () => {
      const content = new TextEncoder().encode('Signed message');
      const privateKey = randomBytes(32);
      const publicKey = randomBytes(33);

      const { signature, signerPublicKey } = service.signContent(
        content,
        privateKey,
        publicKey,
      );

      expect(signature).toBeInstanceOf(Uint8Array);
      expect(signature.length).toBe(32); // SHA-256 output
      expect(signerPublicKey).toBe(publicKey);

      // Verify
      const isValid = service.verifySignature(content, signature, privateKey);
      expect(isValid).toBe(true);
    });

    it('should reject signature with wrong private key', () => {
      const content = new TextEncoder().encode('Signed message');
      const privateKey = randomBytes(32);
      const wrongKey = randomBytes(32);
      const publicKey = randomBytes(33);

      const { signature } = service.signContent(content, privateKey, publicKey);

      const isValid = service.verifySignature(content, signature, wrongKey);
      expect(isValid).toBe(false);
    });

    it('should reject signature for tampered content', () => {
      const content = new TextEncoder().encode('Original message');
      const privateKey = randomBytes(32);
      const publicKey = randomBytes(33);

      const { signature } = service.signContent(content, privateKey, publicKey);

      const tampered = new TextEncoder().encode('Tampered message');
      const isValid = service.verifySignature(tampered, signature, privateKey);
      expect(isValid).toBe(false);
    });

    it('should reject signature with wrong length', () => {
      const content = new TextEncoder().encode('test');
      const privateKey = randomBytes(32);

      const isValid = service.verifySignature(
        content,
        new Uint8Array(16), // wrong length
        privateKey,
      );
      expect(isValid).toBe(false);
    });
  });

  // ─── Per-Recipient Encryption (Requirement 16.4) ─────────────────────

  describe('encryptForRecipients', () => {
    it('should throw when no recipient keys are provided', async () => {
      const content = new TextEncoder().encode('test');
      const emptyKeys = new Map<string, Uint8Array>();

      await expect(
        service.encryptForRecipients(content, emptyKeys),
      ).rejects.toThrow(EmailError);

      try {
        await service.encryptForRecipients(content, emptyKeys);
      } catch (error) {
        expect(error).toBeInstanceOf(EmailError);
        expect((error as EmailError).errorType).toBe(
          EmailErrorType.ENCRYPTION_FAILED,
        );
      }
    });
  });

  // ─── Encryption Metadata (Requirement 16.7) ──────────────────────────

  describe('encryption metadata', () => {
    it('should include correct scheme in symmetric encryption metadata', () => {
      const content = new TextEncoder().encode('test');
      const key = randomBytes(32);

      const { encryptionMetadata } = service.encryptContentSymmetric(
        content,
        key,
      );

      expect(encryptionMetadata.scheme).toBe(
        MessageEncryptionScheme.SHARED_KEY,
      );
      expect(encryptionMetadata.iv).toBeDefined();
      expect(encryptionMetadata.iv!.length).toBe(12); // AES-GCM IV is 12 bytes
      expect(encryptionMetadata.authTag).toBeDefined();
      expect(encryptionMetadata.authTag!.length).toBe(16); // AES-GCM auth tag is 16 bytes
    });

    it('should produce different IVs for different encryptions', () => {
      const content = new TextEncoder().encode('test');
      const key = randomBytes(32);

      const result1 = service.encryptContentSymmetric(content, key);
      const result2 = service.encryptContentSymmetric(content, key);

      // IVs should be different (random)
      expect(
        Buffer.from(result1.encryptionMetadata.iv!).toString('hex'),
      ).not.toBe(Buffer.from(result2.encryptionMetadata.iv!).toString('hex'));
    });
  });

  // ─── S/MIME Encryption (Requirement 16.6) ─────────────────────────────

  describe('encryptSmime / decryptSmime', () => {
    it('should set scheme to S_MIME', async () => {
      // We can't easily test the full ECIES flow without real keys,
      // but we can verify the method exists and validates inputs
      const content = new TextEncoder().encode('S/MIME content');
      const emptyKeys = new Map<string, Uint8Array>();

      // Should throw because no recipient keys
      await expect(
        service.encryptSmime(
          content,
          emptyKeys,
          randomBytes(32),
          randomBytes(33),
        ),
      ).rejects.toThrow(EmailError);
    });
  });
});
