// openpgp is loaded dynamically in each method to avoid pulling in
// the CJS bundle at import time, which fails in jsdom test environments.
import { EmailErrorType } from '../../enumerations/messaging/emailErrorType';
import { EmailError } from '../../errors/messaging/emailError';
import type {
  IGpgEncryptionResult,
  IGpgKeyMetadata,
  IGpgKeyPair,
  IGpgSignatureResult,
  IGpgVerificationResult,
} from '../../interfaces/messaging/gpgKey';

/**
 * Manages GPG (OpenPGP) key lifecycle: generation, import, export, and validation.
 *
 * Wraps OpenPGP.js v6 to provide a simplified interface for key operations
 * used by the BrightMail messaging system.
 *
 * @see Requirements 1.1, 1.4, 2.1, 2.2, 2.4, 2.6
 */
export class GpgKeyManager {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  private _openpgp: any;

  private async openpgp() {
    if (!this._openpgp) {
      this._openpgp = await import('openpgp');
    }
    return this._openpgp;
  }
  /**
   * Generate a new OpenPGP keypair.
   *
   * @param name - Display name for the key's user ID
   * @param email - Email address for the key's user ID
   * @param passphrase - Passphrase to protect the private key
   * @returns The generated keypair with metadata
   * @throws EmailError with GPG_KEYGEN_FAILED on generation failure
   *
   * @see Requirement 1.1 — GPG keypair generation
   */
  async generateKeyPair(
    name: string,
    email: string,
    passphrase: string,
  ): Promise<IGpgKeyPair> {
    try {
      const { privateKey, publicKey } = await (
        await this.openpgp()
      ).generateKey({
        type: 'curve25519',
        userIDs: [{ name, email }],
        passphrase,
        format: 'armored',
      });

      const publicKeyObj = await (
        await this.openpgp()
      ).readKey({ armoredKey: publicKey });
      const metadata = await this.extractMetadata(publicKeyObj);

      return {
        publicKeyArmored: publicKey,
        privateKeyArmored: privateKey,
        metadata,
      };
    } catch (error) {
      if (error instanceof EmailError) {
        throw error;
      }
      throw new EmailError(
        EmailErrorType.GPG_KEYGEN_FAILED,
        `GPG key generation failed: ${error instanceof Error ? error.message : String(error)}`,
        { name, email },
      );
    }
  }

  /**
   * Import an ASCII-armored public key, validate structure, and extract metadata.
   *
   * @param armoredKey - ASCII-armored PGP public key block
   * @returns Metadata extracted from the imported key
   * @throws EmailError with GPG_INVALID_KEY if the key is malformed
   *
   * @see Requirement 2.2 — Import and validate ASCII-armored PGP public key
   */
  async importPublicKey(armoredKey: string): Promise<IGpgKeyMetadata> {
    try {
      const key = await (await this.openpgp()).readKey({ armoredKey });
      return this.extractMetadata(key);
    } catch (error) {
      if (error instanceof EmailError) {
        throw error;
      }
      throw new EmailError(
        EmailErrorType.GPG_INVALID_KEY,
        `Failed to import GPG public key: ${error instanceof Error ? error.message : String(error)}`,
      );
    }
  }

  /**
   * Export a public key as ASCII armor, validating it first.
   *
   * @param publicKeyArmored - ASCII-armored PGP public key to export
   * @returns The validated ASCII-armored public key string
   * @throws EmailError with GPG_INVALID_KEY if the key is malformed
   *
   * @see Requirement 2.6 — Export GPG public key in ASCII armor format
   */
  async exportPublicKey(publicKeyArmored: string): Promise<string> {
    try {
      const key = await (
        await this.openpgp()
      ).readKey({ armoredKey: publicKeyArmored });
      return key.armor();
    } catch (error) {
      if (error instanceof EmailError) {
        throw error;
      }
      throw new EmailError(
        EmailErrorType.GPG_INVALID_KEY,
        `Failed to export GPG public key: ${error instanceof Error ? error.message : String(error)}`,
      );
    }
  }

  /**
   * Validate that a string is a well-formed ASCII-armored PGP public key.
   *
   * @param armoredKey - The string to validate
   * @returns true if the string is a valid ASCII-armored PGP public key
   *
   * @see Requirement 2.4 — Reject malformed or empty key imports
   */
  validatePublicKey(armoredKey: string): boolean {
    try {
      // openpgp.readKey is async, but for a synchronous check we can
      // do a basic structural validation. For full validation, use importPublicKey.
      if (!armoredKey || typeof armoredKey !== 'string') {
        return false;
      }
      const trimmed = armoredKey.trim();
      if (
        !trimmed.includes('-----BEGIN PGP PUBLIC KEY BLOCK-----') ||
        !trimmed.includes('-----END PGP PUBLIC KEY BLOCK-----')
      ) {
        return false;
      }
      return true;
    } catch {
      return false;
    }
  }

  /**
   * Encrypt content for one or more recipients using their GPG public keys.
   *
   * @param content - The binary content to encrypt
   * @param recipientPublicKeysArmored - Array of ASCII-armored PGP public keys for each recipient
   * @returns The encrypted message in ASCII-armored OpenPGP format
   * @throws EmailError with GPG_ENCRYPT_FAILED on encryption failure
   *
   * @see Requirements 3.1, 3.4 — GPG encryption per OpenPGP standard (RFC 4880)
   */
  async encrypt(
    content: Uint8Array,
    recipientPublicKeysArmored: string[],
  ): Promise<IGpgEncryptionResult> {
    try {
      const pgp = await this.openpgp();
      const encryptionKeys = await Promise.all(
        recipientPublicKeysArmored.map((armoredKey) =>
          pgp.readKey({ armoredKey }),
        ),
      );

      const message = await pgp.createMessage({ binary: content });
      const encryptedMessage = await pgp.encrypt({
        message,
        encryptionKeys,
        format: 'armored',
      });

      return { encryptedMessage: encryptedMessage as string };
    } catch (error) {
      if (error instanceof EmailError) {
        throw error;
      }
      throw new EmailError(
        EmailErrorType.GPG_ENCRYPT_FAILED,
        `GPG encryption failed: ${error instanceof Error ? error.message : String(error)}`,
        { recipientCount: recipientPublicKeysArmored.length },
      );
    }
  }

  /**
   * Decrypt an OpenPGP encrypted message using a private key.
   *
   * @param encryptedMessage - The ASCII-armored OpenPGP encrypted message
   * @param privateKeyArmored - The ASCII-armored PGP private key
   * @param passphrase - The passphrase to unlock the private key
   * @returns The decrypted content as a Uint8Array
   * @throws EmailError with GPG_DECRYPT_FAILED on decryption failure
   *
   * @see Requirements 5.1, 5.5 — GPG decryption with private key
   */
  async decrypt(
    encryptedMessage: string,
    privateKeyArmored: string,
    passphrase: string,
  ): Promise<Uint8Array> {
    try {
      const privateKey = await (
        await this.openpgp()
      ).readPrivateKey({
        armoredKey: privateKeyArmored,
      });
      const decryptedPrivateKey = await (
        await this.openpgp()
      ).decryptKey({
        privateKey,
        passphrase,
      });

      const message = await (
        await this.openpgp()
      ).readMessage({
        armoredMessage: encryptedMessage,
      });
      const { data } = await (
        await this.openpgp()
      ).decrypt({
        message,
        decryptionKeys: decryptedPrivateKey,
        format: 'binary',
      });

      return data as Uint8Array;
    } catch (error) {
      if (error instanceof EmailError) {
        throw error;
      }
      throw new EmailError(
        EmailErrorType.GPG_DECRYPT_FAILED,
        `GPG decryption failed: ${error instanceof Error ? error.message : String(error)}`,
      );
    }
  }

  /**
   * Create a detached OpenPGP signature over the given content.
   *
   * @param content - The binary content to sign
   * @param privateKeyArmored - ASCII-armored PGP private key
   * @param passphrase - Passphrase to unlock the private key
   * @returns The detached signature and signer key ID
   * @throws EmailError with GPG_VERIFY_FAILED on signing failure
   *
   * @see Requirements 4.1, 4.2 — Detached OpenPGP signature production
   */
  async sign(
    content: Uint8Array,
    privateKeyArmored: string,
    passphrase: string,
  ): Promise<IGpgSignatureResult> {
    try {
      const privateKey = await (
        await this.openpgp()
      ).readPrivateKey({
        armoredKey: privateKeyArmored,
      });
      const decryptedKey = await (
        await this.openpgp()
      ).decryptKey({
        privateKey,
        passphrase,
      });

      const message = await (
        await this.openpgp()
      ).createMessage({ binary: content });
      const signature = await (
        await this.openpgp()
      ).sign({
        message,
        signingKeys: decryptedKey,
        detached: true,
        format: 'armored',
      });

      const signerKeyId = decryptedKey.getKeyID().toHex();

      return {
        signature: signature as string,
        signerKeyId,
      };
    } catch (error) {
      if (error instanceof EmailError) {
        throw error;
      }
      throw new EmailError(
        EmailErrorType.GPG_VERIFY_FAILED,
        `GPG signing failed: ${error instanceof Error ? error.message : String(error)}`,
      );
    }
  }

  /**
   * Verify a detached OpenPGP signature against the given content.
   *
   * @param content - The binary content that was signed
   * @param signature - The detached ASCII-armored OpenPGP signature
   * @param signerPublicKeyArmored - ASCII-armored PGP public key of the expected signer
   * @returns Verification result with valid status, signerKeyId, and reason
   * @throws EmailError with GPG_VERIFY_FAILED on verification errors
   *
   * @see Requirements 5.2, 5.3, 5.4 — GPG signature verification
   */
  async verify(
    content: Uint8Array,
    signature: string,
    signerPublicKeyArmored: string,
  ): Promise<IGpgVerificationResult> {
    try {
      const publicKey = await (
        await this.openpgp()
      ).readKey({
        armoredKey: signerPublicKeyArmored,
      });
      const message = await (
        await this.openpgp()
      ).createMessage({ binary: content });
      const sig = await (
        await this.openpgp()
      ).readSignature({
        armoredSignature: signature,
      });

      const verificationResult = await (
        await this.openpgp()
      ).verify({
        message,
        signature: sig,
        verificationKeys: publicKey,
      });

      const signerKeyId = publicKey.getKeyID().toHex();

      try {
        await verificationResult.signatures[0].verified;
        return {
          valid: true,
          signerKeyId,
        };
      } catch (verifyError) {
        return {
          valid: false,
          signerKeyId,
          reason:
            verifyError instanceof Error
              ? verifyError.message
              : String(verifyError),
        };
      }
    } catch (error) {
      if (error instanceof EmailError) {
        throw error;
      }
      throw new EmailError(
        EmailErrorType.GPG_VERIFY_FAILED,
        `GPG verification failed: ${error instanceof Error ? error.message : String(error)}`,
      );
    }
  }

  /**
   * Publish a GPG public key to an HKP keyserver.
   *
   * @param publicKeyArmored - ASCII-armored PGP public key to publish
   * @param keyserverUrl - Base URL of the HKP keyserver (e.g. "https://keys.openpgp.org")
   * @throws EmailError with GPG_KEYSERVER_ERROR on network or server failures
   *
   * @see Requirements 2.1 — Publish GPG public key to keyserver
   */
  async publishToKeyserver(
    publicKeyArmored: string,
    keyserverUrl: string,
  ): Promise<void> {
    try {
      const response = await fetch(`${keyserverUrl}/pks/add`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
        },
        body: `keytext=${encodeURIComponent(publicKeyArmored)}`,
      });

      if (!response.ok) {
        throw new Error(
          `Keyserver returned HTTP ${response.status}: ${response.statusText}`,
        );
      }
    } catch (error) {
      if (error instanceof EmailError) {
        throw error;
      }
      throw new EmailError(
        EmailErrorType.GPG_KEYSERVER_ERROR,
        `Failed to publish key to keyserver: ${error instanceof Error ? error.message : String(error)}`,
        { keyserverUrl },
      );
    }
  }

  /**
   * Search an HKP keyserver for GPG public keys matching an email address.
   *
   * @param email - Email address to search for
   * @param keyserverUrl - Base URL of the HKP keyserver (e.g. "https://keys.openpgp.org")
   * @returns Array of ASCII-armored PGP public key blocks found
   * @throws EmailError with GPG_KEYSERVER_ERROR on network or server failures
   *
   * @see Requirements 2.3 — Search keyserver for public keys by email
   */
  async searchKeyserver(
    email: string,
    keyserverUrl: string,
  ): Promise<string[]> {
    try {
      const url = `${keyserverUrl}/pks/lookup?op=get&search=${encodeURIComponent(email)}&options=mr`;
      const response = await fetch(url);

      if (response.status === 404) {
        return [];
      }

      if (!response.ok) {
        throw new Error(
          `Keyserver returned HTTP ${response.status}: ${response.statusText}`,
        );
      }

      const body = await response.text();
      const keyBlocks: string[] = [];
      const regex =
        /-----BEGIN PGP PUBLIC KEY BLOCK-----[\s\S]*?-----END PGP PUBLIC KEY BLOCK-----/g;
      let match: RegExpExecArray | null;

      while ((match = regex.exec(body)) !== null) {
        keyBlocks.push(match[0]);
      }

      return keyBlocks;
    } catch (error) {
      if (error instanceof EmailError) {
        throw error;
      }
      throw new EmailError(
        EmailErrorType.GPG_KEYSERVER_ERROR,
        `Failed to search keyserver: ${error instanceof Error ? error.message : String(error)}`,
        { email, keyserverUrl },
      );
    }
  }

  /**
   * Extract metadata from an OpenPGP key object.
   *
   * @param key - The parsed OpenPGP key
   * @returns Metadata including keyId, fingerprint, dates, userId, and algorithm
   */
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  private async extractMetadata(key: any): Promise<IGpgKeyMetadata> {
    const keyId = key.getKeyID().toHex();
    const fingerprint = key.getFingerprint();
    const createdAt = key.getCreationTime();
    const expirationTime = await key.getExpirationTime();
    const userIds = key.getUserIDs();
    const algorithmInfo = key.getAlgorithmInfo();

    let expiresAt: Date | null = null;
    if (expirationTime instanceof Date) {
      expiresAt = expirationTime;
    }
    // If expirationTime is Infinity or null, expiresAt stays null (no expiration)

    const algorithm = algorithmInfo.curve
      ? String(algorithmInfo.curve)
      : `${String(algorithmInfo.algorithm)}${algorithmInfo.bits ? algorithmInfo.bits : ''}`;

    return {
      keyId,
      fingerprint,
      createdAt,
      expiresAt,
      userId: userIds[0] ?? '',
      algorithm,
    };
  }
}
