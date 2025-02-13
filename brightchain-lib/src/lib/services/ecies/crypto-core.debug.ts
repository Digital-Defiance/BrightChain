/**
 * Test helper for crypto-core debugging - this is a simpler implementation
 * that will help us understand what's happening with the encryption/decryption cycle
 */

import {
  createCipheriv,
  createDecipheriv,
  createECDH,
  randomBytes,
} from 'crypto';
import { ECIES, SYMMETRIC_ALGORITHM_CONFIGURATION } from '../../constants';
import { AuthenticatedCipher, AuthenticatedDecipher } from '../../types';

/**
 * Simple function to encrypt a message with a public key
 */
export function encryptDebug(
  receiverPublicKey: Buffer,
  message: Buffer,
): Buffer {
  // Create a new ephemeral key pair for this message
  const ecdh = createECDH(ECIES.CURVE_NAME);
  ecdh.generateKeys();

  // Normalize receiver's public key
  let normalizedPublicKey = receiverPublicKey;
  if (normalizedPublicKey.length === ECIES.RAW_PUBLIC_KEY_LENGTH) {
    normalizedPublicKey = Buffer.concat([
      Buffer.from([ECIES.PUBLIC_KEY_MAGIC]),
      normalizedPublicKey,
    ]);
  }
  console.log('DEBUG: Receiver public key length:', normalizedPublicKey.length);

  // Compute the shared secret
  const sharedSecret = ecdh.computeSecret(normalizedPublicKey);
  console.log('DEBUG: Shared secret length:', sharedSecret.length);

  // Get ephemeral public key with correct format
  let ephemeralPublicKey = ecdh.getPublicKey();
  if (ephemeralPublicKey.length === ECIES.RAW_PUBLIC_KEY_LENGTH) {
    ephemeralPublicKey = Buffer.concat([
      Buffer.from([ECIES.PUBLIC_KEY_MAGIC]),
      ephemeralPublicKey,
    ]);
  }
  console.log('DEBUG: Ephemeral public key length:', ephemeralPublicKey.length);

  // Generate random IV
  const iv = randomBytes(ECIES.IV_LENGTH);
  console.log('DEBUG: IV length:', iv.length);

  // Create cipher
  const cipher = createCipheriv(
    SYMMETRIC_ALGORITHM_CONFIGURATION,
    sharedSecret.subarray(0, ECIES.SYMMETRIC.KEY_LENGTH),
    iv,
  ) as unknown as AuthenticatedCipher;

  cipher.setAutoPadding(true);

  // Encrypt the message
  let encrypted = cipher.update(message);
  encrypted = Buffer.concat([encrypted, cipher.final()]);
  console.log('DEBUG: Encrypted data length:', encrypted.length);

  // Get authentication tag
  const authTag = cipher.getAuthTag();
  console.log('DEBUG: Auth tag length:', authTag.length);

  // Format the final encrypted buffer
  const output = Buffer.concat([ephemeralPublicKey, iv, authTag, encrypted]);
  console.log('DEBUG: Full output length:', output.length);

  return output;
}

/**
 * Simple function to decrypt a message with a private key
 */
export function decryptDebug(
  privateKey: Buffer,
  encryptedData: Buffer,
): Buffer {
  console.log('DEBUG: Input encrypted data length:', encryptedData.length);

  // Parse header components
  const ephemeralPublicKey = encryptedData.subarray(0, ECIES.PUBLIC_KEY_LENGTH);
  console.log('DEBUG: Ephemeral public key length:', ephemeralPublicKey.length);

  const iv = encryptedData.subarray(
    ECIES.PUBLIC_KEY_LENGTH,
    ECIES.PUBLIC_KEY_LENGTH + ECIES.IV_LENGTH,
  );
  console.log('DEBUG: IV length:', iv.length);

  const authTag = encryptedData.subarray(
    ECIES.PUBLIC_KEY_LENGTH + ECIES.IV_LENGTH,
    ECIES.PUBLIC_KEY_LENGTH + ECIES.IV_LENGTH + ECIES.AUTH_TAG_LENGTH,
  );
  console.log('DEBUG: Auth tag length:', authTag.length);

  // Extract the ciphertext
  const encrypted = encryptedData.subarray(
    ECIES.PUBLIC_KEY_LENGTH + ECIES.IV_LENGTH + ECIES.AUTH_TAG_LENGTH,
  );
  console.log('DEBUG: Ciphertext length:', encrypted.length);

  // Set up ECDH
  const ecdh = createECDH(ECIES.CURVE_NAME);
  ecdh.setPrivateKey(privateKey);

  // Compute shared secret
  const sharedSecret = ecdh.computeSecret(ephemeralPublicKey);
  console.log('DEBUG: Shared secret length:', sharedSecret.length);

  // Create decipher
  const decipher = createDecipheriv(
    SYMMETRIC_ALGORITHM_CONFIGURATION,
    sharedSecret.subarray(0, ECIES.SYMMETRIC.KEY_LENGTH),
    iv,
  ) as unknown as AuthenticatedDecipher;

  // Set authentication tag
  decipher.setAuthTag(authTag);

  // Decrypt the data
  try {
    let decrypted = decipher.update(encrypted);
    decrypted = Buffer.concat([decrypted, decipher.final()]);
    console.log('DEBUG: Decrypted data length:', decrypted.length);
    return decrypted;
  } catch (error) {
    console.error('DEBUG: Decryption failed:', error);
    console.log(
      'DEBUG: First few bytes of ciphertext:',
      encrypted.subarray(0, 16),
    );
    throw error;
  }
}
