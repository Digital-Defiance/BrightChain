import {
  createCipheriv,
  createDecipheriv,
  createECDH,
  randomBytes,
} from 'crypto';
import { ECIES, SYMMETRIC_ALGORITHM_CONFIGURATION } from '../../constants';
import { EciesErrorType } from '../../enumerations/eciesErrorType';
import { EciesError } from '../../errors/eciesError';
import { IECIESConfig } from '../../interfaces/eciesConfig';
import { ISingleEncryptedParsedHeader } from '../../interfaces/singleEncryptedParsedHeader';
import { AuthenticatedCipher, AuthenticatedDecipher } from '../../types';

/**
 * Core encryption and decryption functions for ECIES
 */
export class EciesCryptoCore {
  private readonly config: IECIESConfig;

  constructor(config: IECIESConfig) {
    this.config = config;
  }

  /**
   * Validates and normalizes a public key for ECIES operations
   * @param publicKey The public key to normalize
   * @returns Properly formatted public key
   */
  public normalizePublicKey(publicKey: Buffer): Buffer {
    if (!publicKey) {
      throw new EciesError(
        EciesErrorType.InvalidEphemeralPublicKey,
        undefined,
        {
          error: 'Received null or undefined public key',
        },
      );
    }

    const keyLength = publicKey.length;

    // Already in correct format (65 bytes with 0x04 prefix)
    if (
      keyLength === ECIES.PUBLIC_KEY_LENGTH &&
      publicKey[0] === ECIES.PUBLIC_KEY_MAGIC
    ) {
      return publicKey;
    }

    // Raw key without prefix (64 bytes) - add the 0x04 prefix
    if (keyLength === ECIES.RAW_PUBLIC_KEY_LENGTH) {
      return Buffer.concat([Buffer.from([ECIES.PUBLIC_KEY_MAGIC]), publicKey]);
    }

    // Invalid format
    throw new EciesError(EciesErrorType.InvalidEphemeralPublicKey, undefined, {
      error: 'Invalid public key format or length',
      keyLength: String(keyLength),
      expectedLength64: String(ECIES.RAW_PUBLIC_KEY_LENGTH),
      expectedLength65: String(ECIES.PUBLIC_KEY_LENGTH),
      keyPrefix: keyLength > 0 ? String(publicKey[0]) : 'N/A',
      expectedPrefix: String(ECIES.PUBLIC_KEY_MAGIC),
    });
  }

  /**
   * Encrypt a message with a public key
   * @param receiverPublicKey The public key of the receiver
   * @param message The message to encrypt
   * @returns The encrypted message
   */
  public encrypt(receiverPublicKey: Buffer, message: Buffer): Buffer {
    // Generate ephemeral ECDH key pair
    const ecdh = createECDH(this.config.curveName);
    ecdh.generateKeys();

    // Compute shared secret
    let sharedSecret: Buffer;
    try {
      // Make sure we normalize the receiver's public key
      const normalizedReceiverPublicKey =
        this.normalizePublicKey(receiverPublicKey);

      // Ensure we're using the properly formatted public key (with 0x04 prefix)
      // Our debugging shows only the full format with prefix works correctly
      sharedSecret = ecdh.computeSecret(normalizedReceiverPublicKey);
      console.debug(
        `[DEBUG][encrypt] Generated shared secret of length ${sharedSecret.length}`,
      );
    } catch (error: unknown) {
      console.error('[ERROR][encrypt] Failed to compute shared secret:', error);
      if (error instanceof Error) {
        if (
          'code' in error &&
          error.code === 'ERR_CRYPTO_ECDH_INVALID_PUBLIC_KEY'
        ) {
          throw new EciesError(
            EciesErrorType.InvalidRecipientPublicKey,
            undefined,
            {
              nodeError: error.code,
            },
          );
        }
        throw new EciesError(
          EciesErrorType.SecretComputationFailed,
          undefined,
          {
            error: error.message,
          },
        );
      }
      throw new EciesError(EciesErrorType.SecretComputationFailed);
    }

    // Get the ephemeral public key and ensure it has the 0x04 prefix
    let ephemeralPublicKey = ecdh.getPublicKey();
    if (ephemeralPublicKey.length === ECIES.RAW_PUBLIC_KEY_LENGTH) {
      ephemeralPublicKey = Buffer.concat([
        Buffer.from([ECIES.PUBLIC_KEY_MAGIC]),
        ephemeralPublicKey,
      ]);
    }

    // Generate random IV
    const iv = randomBytes(ECIES.IV_LENGTH);

    // Get the key from the shared secret (always use first 32 bytes)
    const symKey = sharedSecret.subarray(0, ECIES.SYMMETRIC.KEY_LENGTH);
    console.debug(
      `[DEBUG][encrypt] Using symmetric key of length ${symKey.length}`,
    );

    // Create cipher with the derived symmetric key
    const cipher = createCipheriv(
      SYMMETRIC_ALGORITHM_CONFIGURATION,
      symKey,
      iv,
    ) as unknown as AuthenticatedCipher;

    // Ensure auto padding is enabled
    cipher.setAutoPadding(true);

    // Encrypt the message
    let encrypted = cipher.update(message);
    encrypted = Buffer.concat([encrypted, cipher.final()]);

    // Get and explicitly set the authentication tag to max tag length for consistency
    const authTag = cipher.getAuthTag();

    // Debug log for encryption (remove in production)
    console.debug(`[DEBUG] Encryption - IV: ${iv.toString('hex')}`);
    console.debug(`[DEBUG] Encryption - Auth tag: ${authTag.toString('hex')}`);
    console.debug(`[DEBUG] Encryption - Message length: ${message.length}`);
    console.debug(`[DEBUG] Encryption - Encrypted length: ${encrypted.length}`);

    // Add a length prefix to the encrypted data to ensure we can extract the exact number of bytes during decryption
    const lengthBuffer = Buffer.alloc(4);
    lengthBuffer.writeUInt32BE(encrypted.length);

    // Format: | ephemeralPublicKey (65) | iv (16) | authTag (16) | length (4) | encryptedData |
    // IMPORTANT: The actual overhead size is different from ECIES.OVERHEAD_SIZE (98) and should be:
    // ephemeralPublicKey (65) + iv (16) + authTag (16) + length prefix (4) = 101 bytes
    return Buffer.concat([
      ephemeralPublicKey,
      iv,
      authTag,
      lengthBuffer,
      encrypted,
    ]);
  }

  /**
   * Parse the header from encrypted data
   * @param data The encrypted data
   * @returns The parsed header components
   */
  public parseSingleEncryptedHeader(
    data: Buffer,
  ): ISingleEncryptedParsedHeader {
    if (data.length < ECIES.OVERHEAD_SIZE) {
      throw new EciesError(
        EciesErrorType.InvalidEncryptedDataLength,
        undefined,
        {
          required: String(ECIES.OVERHEAD_SIZE),
          actual: String(data.length),
        },
      );
    }

    // Debug the raw data to understand format issues
    console.debug(`[DEBUG] Parsing header from data of length ${data.length}`);
    console.debug(
      `[DEBUG] Full data (first 32 bytes): ${data.subarray(0, Math.min(32, data.length)).toString('hex')}`,
    );

    // Extract components from the header
    const ephemeralPublicKey = data.subarray(0, ECIES.PUBLIC_KEY_LENGTH);

    // Make sure we normalize the ephemeral public key
    const normalizedKey = this.normalizePublicKey(ephemeralPublicKey);

    const iv = data.subarray(
      ECIES.PUBLIC_KEY_LENGTH,
      ECIES.PUBLIC_KEY_LENGTH + ECIES.IV_LENGTH,
    );

    const authTag = data.subarray(
      ECIES.PUBLIC_KEY_LENGTH + ECIES.IV_LENGTH,
      ECIES.PUBLIC_KEY_LENGTH + ECIES.IV_LENGTH + ECIES.AUTH_TAG_LENGTH,
    );

    console.debug(`[DEBUG] Header components:
      - Ephemeral key: ${ephemeralPublicKey.subarray(0, 16).toString('hex')}...
      - Normalized key: ${normalizedKey.subarray(0, 16).toString('hex')}...
      - IV: ${iv.toString('hex')}
      - Auth tag: ${authTag.toString('hex')}
    `);

    // Validate all header components have the correct lengths
    if (normalizedKey.length !== ECIES.PUBLIC_KEY_LENGTH) {
      throw new EciesError(
        EciesErrorType.InvalidEphemeralPublicKey,
        undefined,
        {
          error:
            'Ephemeral public key has incorrect length after normalization',
          expected: String(ECIES.PUBLIC_KEY_LENGTH),
          actual: String(normalizedKey.length),
        },
      );
    }

    if (iv.length !== ECIES.IV_LENGTH) {
      throw new EciesError(EciesErrorType.InvalidIVLength, undefined, {
        error: 'IV has incorrect length',
        expected: String(ECIES.IV_LENGTH),
        actual: String(iv.length),
      });
    }

    if (authTag.length !== ECIES.AUTH_TAG_LENGTH) {
      throw new EciesError(EciesErrorType.InvalidAuthTagLength, undefined, {
        error: 'Auth tag has incorrect length',
        expected: String(ECIES.AUTH_TAG_LENGTH),
        actual: String(authTag.length),
      });
    }

    return {
      ephemeralPublicKey: normalizedKey,
      iv,
      authTag,
      headerSize: ECIES.OVERHEAD_SIZE,
    };
  }

  /**
   * Decrypts data encrypted with ECIES using a header
   * This method maintains backward compatibility with the original implementation
   * by returning just the Buffer. For detailed information, use decryptSingleWithHeaderEx
   * @param privateKey The private key to decrypt the data
   * @param encryptedData The data to decrypt
   * @returns The decrypted data buffer
   */
  public decryptSingleWithHeader(
    privateKey: Buffer,
    encryptedData: Buffer,
  ): Buffer {
    try {
      // Call the extended version and return only the decrypted buffer for backward compatibility
      const result = this.decryptSingleWithHeaderEx(privateKey, encryptedData);
      return result.decrypted;
    } catch (error) {
      if (error instanceof EciesError) {
        throw error;
      }
      throw new EciesError(EciesErrorType.DecryptionFailed, undefined, {
        error: error instanceof Error ? error.message : String(error),
      });
    }
  }

  /**
   * Extended version of decryptSingleWithHeader that provides more detailed information
   * @param privateKey The private key to decrypt the data
   * @param encryptedData The data to decrypt
   * @returns The decrypted data and the number of bytes consumed from the input buffer
   */
  public decryptSingleWithHeaderEx(
    privateKey: Buffer,
    encryptedData: Buffer,
  ): { decrypted: Buffer; consumedBytes: number } {
    try {
      // Check if we have enough data for the header
      if (encryptedData.length < ECIES.OVERHEAD_SIZE) {
        throw new EciesError(
          EciesErrorType.InvalidEncryptedDataLength,
          undefined,
          {
            required: String(ECIES.OVERHEAD_SIZE),
            actual: String(encryptedData.length),
          },
        );
      }

      // Extract the standard header components (ephPublicKey, IV, authTag)
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

      // Calculate the actual header size
      const headerSize =
        ECIES.PUBLIC_KEY_LENGTH + ECIES.IV_LENGTH + ECIES.AUTH_TAG_LENGTH;

      // Read the length prefix (4 bytes) after the header components
      if (encryptedData.length < headerSize + 4) {
        throw new EciesError(
          EciesErrorType.InvalidEncryptedDataLength,
          undefined,
          {
            error: 'Not enough data for length prefix',
            required: String(headerSize + 4),
            actual: String(encryptedData.length),
          },
        );
      }

      // Extract the length prefix and read the message length
      const lengthPrefix = encryptedData.subarray(headerSize, headerSize + 4);
      const messageLength = lengthPrefix.readUInt32BE(0);

      // Validate message length to prevent invalid reads
      if (
        messageLength <= 0 ||
        messageLength > encryptedData.length - headerSize - 4
      ) {
        throw new EciesError(
          EciesErrorType.InvalidEncryptedDataLength,
          undefined,
          {
            error: 'Invalid message length from prefix',
            msgLength: String(messageLength),
            dataAvailable: String(encryptedData.length - headerSize - 4),
          },
        );
      }

      // Extract the ciphertext using the exact length from the prefix
      const encryptedCiphertext = encryptedData.subarray(
        headerSize + 4,
        headerSize + 4 + messageLength,
      );

      // Normalize the public key (ensuring 0x04 prefix)
      const normalizedKey = this.normalizePublicKey(ephemeralPublicKey);

      // Add detailed logging for troubleshooting
      console.debug(
        `[DEBUG] Decryption details - Public key: ${normalizedKey.length}, ` +
          `IV: ${iv.length}, Auth tag: ${authTag.length}, ` +
          `Ciphertext length: ${encryptedCiphertext.length}, ` +
          `From length prefix: ${messageLength}`,
      );

      // Decrypt using components with the normalized key
      const decrypted = this.decryptSingleWithComponents(
        privateKey,
        normalizedKey,
        iv,
        authTag,
        encryptedCiphertext,
      );

      // Calculate total consumed bytes (header + length prefix + ciphertext)
      const totalConsumedBytes = headerSize + 4 + messageLength;

      // Sanity check: ensure we didn't consume more than available
      if (totalConsumedBytes > encryptedData.length) {
        throw new EciesError(
          EciesErrorType.InvalidEncryptedDataLength,
          undefined,
          {
            consumed: String(totalConsumedBytes),
            available: String(encryptedData.length),
            headerSize: String(headerSize),
            lengthPrefixSize: '4',
            messageLength: String(messageLength),
          },
        );
      }

      return { decrypted, consumedBytes: totalConsumedBytes };
    } catch (error) {
      if (error instanceof EciesError) {
        throw error;
      }
      throw new EciesError(EciesErrorType.DecryptionFailed, undefined, {
        error: error instanceof Error ? error.message : String(error),
      });
    }
  }

  /**
   * Decrypts data encrypted with ECIES using components
   * @param privateKey The private key to decrypt the data
   * @param ephemeralPublicKey The ephemeral public key used to encrypt the data
   * @param iv The initialization vector used to encrypt the data
   * @param authTag The authentication tag used to encrypt the data
   * @param encrypted The encrypted data
   * @returns The decrypted data
   */
  public decryptSingleWithComponents(
    privateKey: Buffer,
    ephemeralPublicKey: Buffer,
    iv: Buffer,
    authTag: Buffer,
    encrypted: Buffer,
  ): Buffer {
    try {
      // Ensure the ephemeral public key has the correct format
      const normalizedEphemeralKey =
        this.normalizePublicKey(ephemeralPublicKey);

      // Set up ECDH with the private key
      const ecdh = createECDH(this.config.curveName);
      ecdh.setPrivateKey(privateKey);

      // Based on our ECDH test, we need to consistently use the full key with 0x04 prefix
      // Our debugging showed the raw keys without prefix always fail
      let sharedSecret: Buffer;
      try {
        sharedSecret = ecdh.computeSecret(normalizedEphemeralKey);
        console.debug(
          `[DEBUG][decrypt] Generated shared secret of length ${sharedSecret.length}`,
        );
      } catch (err) {
        console.error('[ERROR][decrypt] Failed to compute shared secret:', err);
        throw new EciesError(EciesErrorType.DecryptionFailed, undefined, {
          error: 'Failed to compute shared secret',
          originalError: err instanceof Error ? err.message : String(err),
          stage: 'shared_secret_computation',
        });
      }

      // Get the key from the shared secret (always use first 32 bytes)
      const symKey = sharedSecret.subarray(0, ECIES.SYMMETRIC.KEY_LENGTH);
      console.debug(
        `[DEBUG][decrypt] Using symmetric key of length ${symKey.length}`,
      );

      // Create decipher with shared secret-derived key
      const decipher = createDecipheriv(
        SYMMETRIC_ALGORITHM_CONFIGURATION,
        symKey,
        iv,
      ) as unknown as AuthenticatedDecipher;

      // Debug logs for decryption
      console.debug(`[DEBUG] Decryption - IV: ${iv.toString('hex')}`);
      console.debug(
        `[DEBUG] Decryption - Auth tag: ${authTag.toString('hex')}`,
      );
      console.debug(
        `[DEBUG] Decryption - Encrypted length: ${encrypted.length}`,
      );
      console.debug(
        `[DEBUG] Decryption - Shared secret: ${sharedSecret.toString('hex').substring(0, 16)}...`,
      );

      // Validate the tag and IV
      if (authTag.length !== ECIES.AUTH_TAG_LENGTH) {
        throw new EciesError(EciesErrorType.DecryptionFailed, undefined, {
          error: 'Invalid auth tag length',
          expected: String(ECIES.AUTH_TAG_LENGTH),
          actual: String(authTag.length),
          stage: 'auth_tag_validation',
        });
      }

      if (iv.length !== ECIES.IV_LENGTH) {
        throw new EciesError(EciesErrorType.DecryptionFailed, undefined, {
          error: 'Invalid IV length',
          expected: String(ECIES.IV_LENGTH),
          actual: String(iv.length),
          stage: 'iv_validation',
        });
      }

      // Set the authentication tag for GCM mode
      decipher.setAuthTag(authTag);

      // Decrypt the data
      try {
        // Handle edge case where encrypted data might be empty or malformed
        if (encrypted.length === 0) {
          throw new Error('Encrypted data is empty');
        }

        const firstPart = decipher.update(encrypted);
        const finalPart = decipher.final();
        const result = Buffer.concat([firstPart, finalPart]);

        console.debug(
          `[DEBUG] Decryption - Decrypted length: ${result.length}`,
        );

        return result;
      } catch (err) {
        throw new EciesError(EciesErrorType.DecryptionFailed, undefined, {
          error: err instanceof Error ? err.message : String(err),
          stage: 'decipher_operation',
        });
      }
    } catch (error) {
      if (error instanceof EciesError) {
        throw error;
      }

      // Wrap non-EciesError in an EciesError
      throw new EciesError(EciesErrorType.DecryptionFailed, undefined, {
        error: error instanceof Error ? error.message : String(error),
        privateKeyLength: String(privateKey.length),
        ephemeralPublicKeyLength: String(ephemeralPublicKey.length),
        ivLength: String(iv.length),
        authTagLength: String(authTag.length),
        encryptedLength: String(encrypted.length),
      });
    }
  }
}
