import * as openpgp from 'openpgp';
import { EmailErrorType } from '../../enumerations/messaging/emailErrorType';
import { EmailError } from '../../errors/messaging/emailError';
import { GpgKeyManager } from './gpgKeyManager';

/**
 * Unit tests for GpgKeyManager — key generation, import, export, and validation.
 *
 * @see Requirements 1.1, 1.4, 2.1, 2.2, 2.4, 2.6
 */
describe('GpgKeyManager', () => {
  let manager: GpgKeyManager;

  beforeAll(() => {
    manager = new GpgKeyManager();
  });

  // ─── Key Generation (Requirement 1.1, 1.4) ───────────────────────────

  describe('generateKeyPair', () => {
    it('should generate a valid OpenPGP keypair with correct userId', async () => {
      const result = await manager.generateKeyPair(
        'Test User',
        'test@example.com',
        'test-passphrase',
      );

      expect(result.publicKeyArmored).toContain(
        '-----BEGIN PGP PUBLIC KEY BLOCK-----',
      );
      expect(result.privateKeyArmored).toContain(
        '-----BEGIN PGP PRIVATE KEY BLOCK-----',
      );
      expect(result.metadata.userId).toContain('Test User');
      expect(result.metadata.userId).toContain('test@example.com');
      expect(result.metadata.keyId).toBeTruthy();
      expect(result.metadata.fingerprint).toBeTruthy();
      expect(result.metadata.createdAt).toBeInstanceOf(Date);
      expect(result.metadata.algorithm).toBeTruthy();
    }, 30000);

    it('should produce a key that can be read back by openpgp', async () => {
      const result = await manager.generateKeyPair(
        'Roundtrip User',
        'roundtrip@example.com',
        'passphrase123',
      );

      const publicKey = await openpgp.readKey({
        armoredKey: result.publicKeyArmored,
      });
      expect(publicKey.getFingerprint()).toBe(result.metadata.fingerprint);
      expect(publicKey.getKeyID().toHex()).toBe(result.metadata.keyId);
    }, 30000);
  });

  // ─── Import Public Key (Requirement 2.2) ──────────────────────────────

  describe('importPublicKey', () => {
    let validArmoredKey: string;

    beforeAll(async () => {
      const { publicKey } = await openpgp.generateKey({
        type: 'curve25519',
        userIDs: [{ name: 'Import Test', email: 'import@example.com' }],
        passphrase: 'import-pass',
        format: 'armored',
      });
      validArmoredKey = publicKey;
    }, 30000);

    it('should import a valid ASCII-armored public key and return metadata', async () => {
      const metadata = await manager.importPublicKey(validArmoredKey);

      expect(metadata.keyId).toBeTruthy();
      expect(metadata.fingerprint).toBeTruthy();
      expect(metadata.userId).toContain('Import Test');
      expect(metadata.userId).toContain('import@example.com');
      expect(metadata.createdAt).toBeInstanceOf(Date);
      expect(metadata.algorithm).toBeTruthy();
    });

    it('should throw GPG_INVALID_KEY for malformed input', async () => {
      await expect(manager.importPublicKey('not a valid key')).rejects.toThrow(
        EmailError,
      );

      try {
        await manager.importPublicKey('not a valid key');
      } catch (error) {
        expect(error).toBeInstanceOf(EmailError);
        expect((error as EmailError).errorType).toBe(
          EmailErrorType.GPG_INVALID_KEY,
        );
      }
    });

    it('should throw GPG_INVALID_KEY for empty string', async () => {
      await expect(manager.importPublicKey('')).rejects.toThrow(EmailError);

      try {
        await manager.importPublicKey('');
      } catch (error) {
        expect(error).toBeInstanceOf(EmailError);
        expect((error as EmailError).errorType).toBe(
          EmailErrorType.GPG_INVALID_KEY,
        );
      }
    });
  });

  // ─── Export Public Key (Requirement 2.6) ──────────────────────────────

  describe('exportPublicKey', () => {
    let validArmoredKey: string;

    beforeAll(async () => {
      const { publicKey } = await openpgp.generateKey({
        type: 'curve25519',
        userIDs: [{ name: 'Export Test', email: 'export@example.com' }],
        passphrase: 'export-pass',
        format: 'armored',
      });
      validArmoredKey = publicKey;
    }, 30000);

    it('should export a valid public key as ASCII armor', async () => {
      const exported = await manager.exportPublicKey(validArmoredKey);

      expect(exported).toContain('-----BEGIN PGP PUBLIC KEY BLOCK-----');
      expect(exported).toContain('-----END PGP PUBLIC KEY BLOCK-----');
    });

    it('should produce a key with the same fingerprint after export', async () => {
      const exported = await manager.exportPublicKey(validArmoredKey);
      const originalKey = await openpgp.readKey({
        armoredKey: validArmoredKey,
      });
      const exportedKey = await openpgp.readKey({ armoredKey: exported });

      expect(exportedKey.getFingerprint()).toBe(originalKey.getFingerprint());
    });

    it('should throw GPG_INVALID_KEY for malformed input', async () => {
      await expect(manager.exportPublicKey('not a valid key')).rejects.toThrow(
        EmailError,
      );

      try {
        await manager.exportPublicKey('not a valid key');
      } catch (error) {
        expect(error).toBeInstanceOf(EmailError);
        expect((error as EmailError).errorType).toBe(
          EmailErrorType.GPG_INVALID_KEY,
        );
      }
    });
  });

  // ─── Validate Public Key (Requirement 2.4) ────────────────────────────

  describe('validatePublicKey', () => {
    let validArmoredKey: string;

    beforeAll(async () => {
      const { publicKey } = await openpgp.generateKey({
        type: 'curve25519',
        userIDs: [{ name: 'Validate Test', email: 'validate@example.com' }],
        passphrase: 'validate-pass',
        format: 'armored',
      });
      validArmoredKey = publicKey;
    }, 30000);

    it('should return true for a valid ASCII-armored public key', () => {
      expect(manager.validatePublicKey(validArmoredKey)).toBe(true);
    });

    it('should return false for malformed input', () => {
      expect(manager.validatePublicKey('not a valid key')).toBe(false);
    });

    it('should return false for empty string', () => {
      expect(manager.validatePublicKey('')).toBe(false);
    });

    it('should return false for null/undefined-like input', () => {
      expect(manager.validatePublicKey(null as unknown as string)).toBe(false);
      expect(manager.validatePublicKey(undefined as unknown as string)).toBe(
        false,
      );
    });

    it('should return false for a private key block', () => {
      const fakePrivateKey =
        '-----BEGIN PGP PRIVATE KEY BLOCK-----\ndata\n-----END PGP PRIVATE KEY BLOCK-----';
      expect(manager.validatePublicKey(fakePrivateKey)).toBe(false);
    });
  });

  // ─── Encrypt/Decrypt Round-Trip (Requirements 3.1, 5.1) ──────────────

  describe('encrypt and decrypt', () => {
    const passphrase = 'encrypt-test-pass';
    let publicKeyArmored: string;
    let privateKeyArmored: string;

    beforeAll(async () => {
      const keyPair = await manager.generateKeyPair(
        'Encrypt User',
        'encrypt@example.com',
        passphrase,
      );
      publicKeyArmored = keyPair.publicKeyArmored;
      privateKeyArmored = keyPair.privateKeyArmored;
    }, 30000);

    it('should encrypt and decrypt content for a single recipient', async () => {
      const plaintext = new TextEncoder().encode('Hello, GPG world!');

      const { encryptedMessage } = await manager.encrypt(plaintext, [
        publicKeyArmored,
      ]);

      expect(encryptedMessage).toContain('-----BEGIN PGP MESSAGE-----');

      const decrypted = await manager.decrypt(
        encryptedMessage,
        privateKeyArmored,
        passphrase,
      );

      expect(new TextDecoder().decode(decrypted)).toBe('Hello, GPG world!');
    }, 30000);

    it('should encrypt and decrypt content for multiple recipients', async () => {
      const secondPair = await manager.generateKeyPair(
        'Second Recipient',
        'second@example.com',
        'second-pass',
      );

      const plaintext = new TextEncoder().encode('Multi-recipient message');

      const { encryptedMessage } = await manager.encrypt(plaintext, [
        publicKeyArmored,
        secondPair.publicKeyArmored,
      ]);

      // First recipient can decrypt
      const decrypted1 = await manager.decrypt(
        encryptedMessage,
        privateKeyArmored,
        passphrase,
      );
      expect(new TextDecoder().decode(decrypted1)).toBe(
        'Multi-recipient message',
      );

      // Second recipient can decrypt
      const decrypted2 = await manager.decrypt(
        encryptedMessage,
        secondPair.privateKeyArmored,
        'second-pass',
      );
      expect(new TextDecoder().decode(decrypted2)).toBe(
        'Multi-recipient message',
      );
    }, 30000);
  });

  // ─── Sign/Verify Round-Trip (Requirements 4.1, 5.2, 5.3, 5.4) ───────

  describe('sign and verify', () => {
    const passphrase = 'sign-test-pass';
    let publicKeyArmored: string;
    let privateKeyArmored: string;

    beforeAll(async () => {
      const keyPair = await manager.generateKeyPair(
        'Signer User',
        'signer@example.com',
        passphrase,
      );
      publicKeyArmored = keyPair.publicKeyArmored;
      privateKeyArmored = keyPair.privateKeyArmored;
    }, 30000);

    it('should sign content and verify the signature', async () => {
      const content = new TextEncoder().encode('Signed message content');

      const { signature, signerKeyId } = await manager.sign(
        content,
        privateKeyArmored,
        passphrase,
      );

      expect(signature).toContain('-----BEGIN PGP SIGNATURE-----');
      expect(signerKeyId).toBeTruthy();

      const result = await manager.verify(content, signature, publicKeyArmored);

      expect(result.valid).toBe(true);
      expect(result.signerKeyId).toBeTruthy();
    }, 30000);

    it('should return valid=false when content has been tampered with', async () => {
      const original = new TextEncoder().encode('Original content');

      const { signature } = await manager.sign(
        original,
        privateKeyArmored,
        passphrase,
      );

      const tampered = new TextEncoder().encode('Tampered content');

      const result = await manager.verify(
        tampered,
        signature,
        publicKeyArmored,
      );

      expect(result.valid).toBe(false);
      expect(result.reason).toBeTruthy();
    }, 30000);
  });

  // ─── Error Cases (Requirements 1.4, 3.5, 5.4, 5.5) ──────────────────

  describe('error cases', () => {
    const passphrase = 'error-test-pass';
    let publicKeyArmored: string;
    let privateKeyArmored: string;

    beforeAll(async () => {
      const keyPair = await manager.generateKeyPair(
        'Error Test User',
        'error@example.com',
        passphrase,
      );
      publicKeyArmored = keyPair.publicKeyArmored;
      privateKeyArmored = keyPair.privateKeyArmored;
    }, 30000);

    it('should throw GPG_DECRYPT_FAILED when using wrong passphrase', async () => {
      const plaintext = new TextEncoder().encode('Secret data');
      const { encryptedMessage } = await manager.encrypt(plaintext, [
        publicKeyArmored,
      ]);

      try {
        await manager.decrypt(
          encryptedMessage,
          privateKeyArmored,
          'wrong-passphrase',
        );
        fail('Expected decrypt to throw');
      } catch (error) {
        expect(error).toBeInstanceOf(EmailError);
        expect((error as EmailError).errorType).toBe(
          EmailErrorType.GPG_DECRYPT_FAILED,
        );
      }
    }, 30000);

    it('should throw GPG_ENCRYPT_FAILED for invalid recipient key', async () => {
      const plaintext = new TextEncoder().encode('Some data');

      try {
        await manager.encrypt(plaintext, ['not-a-valid-key']);
        fail('Expected encrypt to throw');
      } catch (error) {
        expect(error).toBeInstanceOf(EmailError);
        expect((error as EmailError).errorType).toBe(
          EmailErrorType.GPG_ENCRYPT_FAILED,
        );
      }
    });
  });
});
