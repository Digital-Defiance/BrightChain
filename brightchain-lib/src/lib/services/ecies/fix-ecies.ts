import {
  createCipheriv,
  createDecipheriv,
  createECDH,
  randomBytes,
} from 'crypto';
import { ECIES, SYMMETRIC_ALGORITHM_CONFIGURATION } from '../../constants';
import { AuthenticatedCipher, AuthenticatedDecipher } from '../../types';

/**
 * This is a fixed implementation of the core ECIES functionality.
 * Simplifying the problem to identify the exact issue.
 */
export class FixedEcies {
  private readonly curveName = ECIES.CURVE_NAME;

  /**
   * Encrypt a message with a public key
   */
  public encrypt(receiverPublicKey: Buffer, message: Buffer): Buffer {
    console.log(`Encrypting message of length ${message.length}`);

    // Generate ephemeral ECDH key pair
    const ecdh = createECDH(this.curveName);
    ecdh.generateKeys();

    // Normalize the public key (ensure it has the 0x04 prefix)
    let normalizedPublicKey = receiverPublicKey;
    if (receiverPublicKey.length === ECIES.RAW_PUBLIC_KEY_LENGTH) {
      normalizedPublicKey = Buffer.concat([
        Buffer.from([ECIES.PUBLIC_KEY_MAGIC]),
        receiverPublicKey,
      ]);
    }

    console.log(
      `Public key length: ${normalizedPublicKey.length}, prefix: ${normalizedPublicKey[0].toString(16)}`,
    );

    // Compute shared secret
    const sharedSecret = ecdh.computeSecret(normalizedPublicKey);
    console.log(`Shared secret length: ${sharedSecret.length}`);

    // Get the ephemeral public key with the 0x04 prefix
    let ephemeralPublicKey = ecdh.getPublicKey();
    if (ephemeralPublicKey.length === ECIES.RAW_PUBLIC_KEY_LENGTH) {
      ephemeralPublicKey = Buffer.concat([
        Buffer.from([ECIES.PUBLIC_KEY_MAGIC]),
        ephemeralPublicKey,
      ]);
    }
    console.log(
      `Ephemeral public key length: ${ephemeralPublicKey.length}, prefix: ${ephemeralPublicKey[0].toString(16)}`,
    );

    // Generate random IV
    const iv = randomBytes(ECIES.IV_LENGTH);
    console.log(`IV length: ${iv.length}`);

    // Create cipher with shared secret (using first 32 bytes as key)
    const symmetricKey = sharedSecret.subarray(0, ECIES.SYMMETRIC.KEY_LENGTH);
    console.log(`Symmetric key length: ${symmetricKey.length}`);

    const cipher = createCipheriv(
      SYMMETRIC_ALGORITHM_CONFIGURATION,
      symmetricKey,
      iv,
    ) as unknown as AuthenticatedCipher;

    // Encrypt the message
    const encrypted = Buffer.concat([cipher.update(message), cipher.final()]);
    console.log(`Encrypted data length: ${encrypted.length}`);

    // Get authentication tag
    const authTag = cipher.getAuthTag();
    console.log(`Auth tag length: ${authTag.length}`);

    // Double-check our header size calculation
    const actualHeaderSize =
      ephemeralPublicKey.length + iv.length + authTag.length;
    console.log(
      `Expected header size: ${ECIES.OVERHEAD_SIZE}, actual: ${actualHeaderSize}`,
    );

    // If there's a mismatch, log it as a warning
    if (ECIES.OVERHEAD_SIZE !== actualHeaderSize) {
      console.warn(
        `⚠️ CRITICAL: Header size mismatch! ECIES.OVERHEAD_SIZE (${ECIES.OVERHEAD_SIZE}) != actual size (${actualHeaderSize})`,
      );
    }

    // Add a length prefix to the encrypted data to ensure we can extract the exact number of bytes during decryption
    const lengthBuffer = Buffer.alloc(4);
    lengthBuffer.writeUInt32BE(encrypted.length);

    // Construct the final encrypted buffer:
    // Format: | ephemeralPublicKey (65) | iv (16) | authTag (16) | length (4) | encryptedData |
    const result = Buffer.concat([
      ephemeralPublicKey,
      iv,
      authTag,
      lengthBuffer,
      encrypted,
    ]);
    console.log(`Total encrypted length: ${result.length}`);

    return result;
  }

  /**
   * Decrypt an encrypted message using a private key
   */
  public decrypt(privateKey: Buffer, encryptedData: Buffer): Buffer {
    console.log(`Decrypting message of total length ${encryptedData.length}`);

    // Check minimum length requirements
    if (encryptedData.length < ECIES.OVERHEAD_SIZE) {
      throw new Error(
        `Encrypted data too short. Got ${encryptedData.length} bytes, need at least ${ECIES.OVERHEAD_SIZE}`,
      );
    }

    // Extract header components
    const ephemeralPublicKey = encryptedData.subarray(
      0,
      ECIES.PUBLIC_KEY_LENGTH,
    );
    const iv = encryptedData.subarray(
      ECIES.PUBLIC_KEY_LENGTH,
      ECIES.PUBLIC_KEY_LENGTH + ECIES.IV_LENGTH,
    );
    const authTag = encryptedData.subarray(
      ECIES.PUBLIC_KEY_LENGTH + ECIES.IV_LENGTH,
      ECIES.PUBLIC_KEY_LENGTH + ECIES.IV_LENGTH + ECIES.AUTH_TAG_LENGTH,
    );

    // Read the message length from the 4-byte prefix after the header components
    const headerSize = ephemeralPublicKey.length + iv.length + authTag.length;
    console.log(`Actual header size: ${headerSize}`);

    const lengthPrefix = encryptedData.subarray(headerSize, headerSize + 4);

    const messageLength = lengthPrefix.readUInt32BE(0);
    console.log(`Message length from prefix: ${messageLength}`);

    // Extract ciphertext using the length
    const ciphertext = encryptedData.subarray(
      headerSize + 4,
      headerSize + 4 + messageLength,
    );

    console.log(`Header components:
      Ephemeral public key length: ${ephemeralPublicKey.length}
      IV length: ${iv.length}
      Auth tag length: ${authTag.length}
      Ciphertext length: ${ciphertext.length}
    `);

    // Setup ECDH with private key
    const ecdh = createECDH(this.curveName);
    ecdh.setPrivateKey(privateKey);

    // Normalize ephemeral public key to ensure 0x04 prefix
    let normalizedEphemeralKey = ephemeralPublicKey;
    if (ephemeralPublicKey.length === ECIES.RAW_PUBLIC_KEY_LENGTH) {
      normalizedEphemeralKey = Buffer.concat([
        Buffer.from([ECIES.PUBLIC_KEY_MAGIC]),
        ephemeralPublicKey,
      ]);
    }

    // Compute shared secret
    try {
      const sharedSecret = ecdh.computeSecret(normalizedEphemeralKey);
      console.log(`Computed shared secret length: ${sharedSecret.length}`);

      // Create decipher with shared secret (using first 32 bytes as key)
      const symmetricKey = sharedSecret.subarray(0, ECIES.SYMMETRIC.KEY_LENGTH);
      console.log(`Symmetric key length: ${symmetricKey.length}`);

      const decipher = createDecipheriv(
        SYMMETRIC_ALGORITHM_CONFIGURATION,
        symmetricKey,
        iv,
      ) as unknown as AuthenticatedDecipher;

      // Set the authentication tag
      decipher.setAuthTag(authTag);

      // Decrypt the ciphertext
      const decrypted = Buffer.concat([
        decipher.update(ciphertext),
        decipher.final(),
      ]);

      console.log(`Decrypted data length: ${decrypted.length}`);
      return decrypted;
    } catch (error) {
      console.error('Decryption failed:', error);
      throw error;
    }
  }

  /**
   * Simple test function to encrypt and decrypt a message
   */
  public testEncryptDecrypt(message: string): boolean {
    try {
      // Generate a key pair for testing
      const ecdh = createECDH(this.curveName);
      ecdh.generateKeys();
      const privateKey = ecdh.getPrivateKey();
      const publicKey = ecdh.getPublicKey();

      console.log('=== Testing encrypt/decrypt with generated keys ===');
      console.log(`Private key length: ${privateKey.length}`);
      console.log(
        `Public key length: ${publicKey.length}, prefix: ${publicKey[0].toString(16)}`,
      );

      const messageBuffer = Buffer.from(message);
      console.log(
        `Original message (${messageBuffer.length} bytes): "${message}"`,
      );

      // Encrypt the message
      console.log('\n--- Encryption ---');
      const encrypted = this.encrypt(publicKey, messageBuffer);

      // Decrypt the message
      console.log('\n--- Decryption ---');
      const decrypted = this.decrypt(privateKey, encrypted);

      // Verify the result
      const decryptedMessage = decrypted.toString();
      console.log(`Decrypted message: "${decryptedMessage}"`);

      const success = decryptedMessage === message;
      console.log(`Test ${success ? 'PASSED ✅' : 'FAILED ❌'}`);

      return success;
    } catch (error) {
      console.error('Test failed with error:', error);
      return false;
    }
  }
}
