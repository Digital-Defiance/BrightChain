import {
  AppConstants,
  ECIES,
  EciesEncryptionTypeEnum,
  EciesError,
  EciesErrorType,
} from '@brightchain/brightchain-lib';
import {
  createCipheriv,
  createDecipheriv,
  createECDH,
  randomBytes,
} from 'crypto';
import { ObjectId } from 'mongodb';
import { BackendBurnbagMember } from '../../backend-burnbag-member';
import { ApiConstants } from '../../constants';
import { AuthenticatedCipher } from '../../interfaces/authenticated-cipher';
import { IMultiEncryptedMessage } from '../../interfaces/multi-encrypted-message';
import { IMultiEncryptedParsedHeader } from '../../interfaces/multi-encrypted-parsed-header';
import { DefaultBackendIdType } from '../../shared-types';
import { EciesCryptoCore } from './cryptoCore';
import { EciesSingleRecipientCore } from './singleRecipient';

/**
 * Multiple recipient encryption/decryption functions for ECIES
 */
export class EciesMultiRecipient {
  private readonly cryptoCore: EciesCryptoCore;
  private readonly singleRecipientCore: EciesSingleRecipientCore;

  constructor(cryptoCore: EciesCryptoCore) {
    this.cryptoCore = cryptoCore;
    this.singleRecipientCore = new EciesSingleRecipientCore(cryptoCore.config);
  }

  /**
   * Get the size of the header for a given encryption type
   * @param encryptionType The encryption type (single, simple, etc.)
   * @param options Optional encryption options
   * @param options.recipientCount The number of recipients
   * @returns
   */
  public getHeaderSize(recipientCount: number): number {
    return (
      ECIES.MULTIPLE.FIXED_OVERHEAD_SIZE +
      recipientCount * ECIES.MULTIPLE.ENCRYPTED_KEY_SIZE
    );
  }

  /**
   * Encrypt a message symmetric key with a public key
   * @param receiverPublicKey The public key of the receiver
   * @param messageSymmetricKey The message to encrypt
   * @returns The encrypted message
   */
  public encryptKey(
    receiverPublicKey: Buffer,
    messageSymmetricKey: Buffer,
  ): Buffer {
    // Generate ephemeral ECDH key pair
    const ecdh = createECDH(this.cryptoCore.config.curveName);
    ecdh.generateKeys();

    // Compute shared secret
    let sharedSecret: Buffer;
    try {
      // Make sure we normalize the receiver's public key
      const normalizedReceiverPublicKey =
        this.cryptoCore.normalizePublicKey(receiverPublicKey);

      // Ensure we're using the properly formatted public key (with 0x04 prefix)
      // Our debugging shows only the full format with prefix works correctly
      sharedSecret = ecdh.computeSecret(normalizedReceiverPublicKey);
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

    // Get the key from the shared secret (always use first 32 bytes)
    const symKey = sharedSecret.subarray(0, ECIES.SYMMETRIC.KEY_SIZE);

    const iv = randomBytes(ECIES.IV_SIZE);

    // Create cipher with the derived symmetric key
    const cipher = createCipheriv(
      ECIES.SYMMETRIC_ALGORITHM_CONFIGURATION,
      symKey,
      iv,
    ) as unknown as AuthenticatedCipher;

    // Ensure auto padding is enabled
    cipher.setAutoPadding(true);

    // Encrypt the message
    let encrypted = cipher.update(messageSymmetricKey);
    encrypted = Buffer.concat([encrypted, cipher.final()]);

    // Get and explicitly set the authentication tag to max tag length for consistency
    const authTag = cipher.getAuthTag();

    // Format:ephemeralPublicKey (65) | iv (16) | authTag (16) | encryptedData (ECIES.SYMMETRIC.KEY_SIZE = 32)
    return Buffer.concat([ephemeralPublicKey, iv, authTag, encrypted]);
  }

  /**
   * Decrypts symmetric key encrypted with ECIES using a header
   * @param privateKey The private key to decrypt the data
   * @param encryptedKey The data to decrypt
   * @returns The decrypted data buffer
   */
  public decryptKey(privateKey: Buffer, encryptedKey: Buffer): Buffer {
    if (encryptedKey.length !== ECIES.MULTIPLE.ENCRYPTED_KEY_SIZE) {
      throw new EciesError(
        EciesErrorType.InvalidEncryptedKeyLength,
        undefined,
        {
          expected: String(ECIES.MULTIPLE.ENCRYPTED_KEY_SIZE),
          actual: String(encryptedKey.length),
        },
      );
    }
    const ephemeralPublicKey = encryptedKey.subarray(
      0,
      ECIES.PUBLIC_KEY_LENGTH,
    );
    const iv = encryptedKey.subarray(
      ECIES.PUBLIC_KEY_LENGTH,
      ECIES.PUBLIC_KEY_LENGTH + ECIES.IV_SIZE,
    );
    const authTag = encryptedKey.subarray(
      ECIES.PUBLIC_KEY_LENGTH + ECIES.IV_SIZE,
      ECIES.PUBLIC_KEY_LENGTH + ECIES.IV_SIZE + ECIES.AUTH_TAG_SIZE,
    );
    const encrypted = encryptedKey.subarray(
      ECIES.PUBLIC_KEY_LENGTH + ECIES.IV_SIZE + ECIES.AUTH_TAG_SIZE,
      ECIES.PUBLIC_KEY_LENGTH +
        ECIES.IV_SIZE +
        ECIES.AUTH_TAG_SIZE +
        ECIES.SYMMETRIC.KEY_SIZE,
    );
    // Normalize the public key (ensuring 0x04 prefix)
    const normalizedKey =
      this.cryptoCore.normalizePublicKey(ephemeralPublicKey);

    // Decrypt using components with the normalized key
    const decrypted = this.singleRecipientCore.decryptWithComponents(
      privateKey,
      normalizedKey,
      iv,
      authTag,
      encrypted,
    );
    if (decrypted.length !== ECIES.SYMMETRIC.KEY_SIZE) {
      throw new EciesError(EciesErrorType.InvalidDataLength, undefined, {
        expected: String(ECIES.SYMMETRIC.KEY_SIZE),
        actual: String(decrypted.length),
      });
    }
    return decrypted;
  }

  /**
   * Encrypts a message for multiple recipients.
   * @param recipients The recipients to encrypt the message for.
   * @param message The message to encrypt.
   * @param preamble Optional preamble to include in the encrypted message.
   * @returns The encrypted message.
   * @throws EciesError if the number of recipients is greater than 65535.
   */
  public encryptMultiple(
    recipients: BackendBurnbagMember[],
    message: Buffer,
    preamble?: Buffer,
  ): IMultiEncryptedMessage {
    if (recipients.length > AppConstants.UINT16_MAX) {
      throw new EciesError(EciesErrorType.TooManyRecipients);
    }

    const messageTypeBuffer = Buffer.alloc(1);
    messageTypeBuffer.writeUint8(EciesEncryptionTypeEnum.Multiple as number);

    // Generate a random symmetric key
    const symmetricKey = randomBytes(ECIES.SYMMETRIC.KEY_SIZE);
    const iv = randomBytes(ECIES.IV_SIZE);

    // Encrypt the message with the symmetric key
    const cipher = createCipheriv(
      ECIES.SYMMETRIC_ALGORITHM_CONFIGURATION,
      symmetricKey,
      iv,
    );

    const encrypted = cipher.update(message);
    const final = cipher.final();
    const authTag = cipher.getAuthTag();

    const encryptedMessage = Buffer.concat([encrypted, final]);

    const storedMessage = Buffer.concat([
      preamble ?? Buffer.alloc(0),
      iv,
      authTag,
      encryptedMessage,
    ]);

    const encryptionResults = recipients.map((member) => ({
      id: member.id,
      encryptedKey: this.encryptKey(member.publicKey, symmetricKey),
    }));

    const recipientIds = encryptionResults.map(({ id }) => id);
    const recipientKeys = encryptionResults.map(
      ({ encryptedKey }) => encryptedKey,
    );

    // Verify the encrypted message size (just the encrypted content)
    if (encryptedMessage.length !== message.length) {
      throw new EciesError(EciesErrorType.MessageLengthMismatch);
    }

    const headerSize = this.calculateECIESMultipleRecipientOverhead(
      recipients.length,
      false,
      recipientKeys,
    );

    return {
      dataLength: message.length,
      recipientCount: recipients.length,
      recipientIds,
      recipientKeys,
      encryptedMessage: storedMessage,
      headerSize,
    };
  }

  /**
   * Decrypts a message encrypted with multiple ECIE for a recipient.
   * @param encryptedData The encrypted data.
   * @param recipient The recipient.
   * @returns The decrypted message.
   */
  public decryptMultipleECIEForRecipient(
    encryptedData: IMultiEncryptedMessage,
    recipient: BackendBurnbagMember,
  ): Buffer {
    if (recipient.privateKey === undefined) {
      throw new EciesError(EciesErrorType.PrivateKeyNotLoaded);
    }

    // Find this recipient's encrypted key
    const recipientIndex: number = encryptedData.recipientIds.findIndex(
      (id: DefaultBackendIdType): boolean => id.equals(recipient.id),
    );
    if (recipientIndex === -1) {
      throw new EciesError(EciesErrorType.RecipientNotFound);
    }

    const encryptedKey = encryptedData.recipientKeys[recipientIndex];

    // Decrypt the symmetric key using the detected encryption type
    const symmetricKey = this.decryptKey(
      Buffer.from(recipient.privateKey.value),
      encryptedKey,
    );

    // Extract the IV and auth tag from the encrypted message
    const iv = encryptedData.encryptedMessage.subarray(0, ECIES.IV_SIZE);
    const authTag = encryptedData.encryptedMessage.subarray(
      ECIES.IV_SIZE,
      ECIES.IV_SIZE + ECIES.AUTH_TAG_SIZE,
    );

    // Extract the encrypted content (no CRC, AES-GCM provides authentication)
    const encrypted = encryptedData.encryptedMessage.subarray(
      ECIES.IV_SIZE + ECIES.AUTH_TAG_SIZE,
    );

    // Decrypt the content with the symmetric key
    const decipher = createDecipheriv(
      ECIES.SYMMETRIC_ALGORITHM_CONFIGURATION,
      symmetricKey,
      iv,
    );
    decipher.setAuthTag(authTag);

    const decrypted = decipher.update(encrypted);
    const final = decipher.final();
    const decryptedMessage = Buffer.concat([decrypted, final]);

    // AES-GCM provides authentication via auth tag (no separate CRC needed)

    // The decrypted message should match the original data length
    if (decryptedMessage.length !== encryptedData.dataLength) {
      throw new EciesError(EciesErrorType.InvalidDataLength);
    }

    return decryptedMessage;
  }

  /**
   * Calculate the overhead for a message encrypted for multiple recipients
   * @param recipientCount number of recipients
   * @param includeMessageOverhead whether to include the overhead for the encrypted message
   * @param encryptedKeys optional array of encrypted keys to calculate actual size
   * @returns the overhead size in bytes
   */
  public calculateECIESMultipleRecipientOverhead(
    recipientCount: number,
    includeMessageOverhead: boolean,
    encryptedKeys?: Buffer[],
  ): number {
    if (recipientCount < 2) {
      throw new EciesError(EciesErrorType.InvalidRecipientCount);
    }

    // Calculate encrypted keys size
    let encryptedKeysSize: number;
    if (encryptedKeys) {
      encryptedKeysSize = encryptedKeys.reduce(
        (total, key) => total + key.length,
        0,
      );
    } else {
      // Default assumption: all keys use Simple encryption type (more efficient)
      encryptedKeysSize = recipientCount * ECIES.MULTIPLE.ENCRYPTED_KEY_SIZE;
    }

    const baseOverhead =
      ECIES.MULTIPLE.DATA_LENGTH_SIZE +
      ECIES.MULTIPLE.RECIPIENT_COUNT_SIZE +
      recipientCount * ApiConstants.OBJECT_ID_LENGTH + // recipient ids
      encryptedKeysSize; // actual encrypted keys size

    return includeMessageOverhead
      ? baseOverhead + ECIES.MULTIPLE.FIXED_OVERHEAD_SIZE
      : baseOverhead;
  }

  /**
   * Builds the header for a message encrypted for multiple recipients
   * @param data The encrypted message data including recipients and encrypted keys
   * @returns The header buffer for the message
   * @throws EciesError if the number of recipients is greater than the maximum allowed
   * @throws EciesError if the number of encrypted keys does not match the number of recipients
   */
  public buildECIESMultipleRecipientHeader(
    data: IMultiEncryptedMessage,
  ): Buffer {
    if (data.recipientIds.length > ECIES.MULTIPLE.MAX_RECIPIENTS) {
      throw new EciesError(EciesErrorType.TooManyRecipients);
    } else if (data.recipientIds.length !== data.recipientKeys.length) {
      throw new EciesError(EciesErrorType.RecipientKeyCountMismatch);
    } else if (
      data.dataLength < 0 ||
      data.dataLength > ECIES.MAX_RAW_DATA_SIZE
    ) {
      throw new EciesError(EciesErrorType.FileSizeTooLarge);
    }

    // Create data length buffer
    const dataLengthBuffer = Buffer.alloc(ECIES.MULTIPLE.DATA_LENGTH_SIZE);
    dataLengthBuffer.writeBigUInt64BE(BigInt(data.dataLength));

    // Create recipient count buffer
    const recipientCountBuffer = Buffer.alloc(
      ECIES.MULTIPLE.RECIPIENT_COUNT_SIZE,
    );
    recipientCountBuffer.writeUInt16BE(data.recipientIds.length);

    // Create recipients buffer
    const recipientsBuffer = Buffer.alloc(
      data.recipientIds.length * ApiConstants.OBJECT_ID_LENGTH,
    );
    data.recipientIds.forEach(
      (recipientId: DefaultBackendIdType, index: number) => {
        recipientsBuffer.set(
          Buffer.from(recipientId.toHexString(), 'hex'),
          index * ApiConstants.OBJECT_ID_LENGTH,
        );
      },
    );

    // Validate encrypted key lengths based on their encryption type
    data.recipientKeys.forEach((encryptedKey: Buffer) => {
      if (encryptedKey.length === 0) {
        throw new EciesError(EciesErrorType.InvalidEncryptedKeyLength);
      }

      if (encryptedKey.length !== ECIES.MULTIPLE.ENCRYPTED_KEY_SIZE) {
        throw new EciesError(
          EciesErrorType.InvalidEncryptedKeyLength,
          undefined,
          {
            error: 'Encrypted key length does not match encryption type',
            expected: String(ECIES.MULTIPLE.ENCRYPTED_KEY_SIZE),
            actual: String(encryptedKey.length),
          },
        );
      }
    });

    // Create encrypted keys buffer with variable-length keys
    const encryptedKeysBuffer = Buffer.concat(data.recipientKeys);

    // Combine all buffers to form the header
    return Buffer.concat([
      dataLengthBuffer,
      recipientCountBuffer,
      recipientsBuffer,
      encryptedKeysBuffer,
    ]);
  }

  /**
   * Parses a multi-encrypted header.
   * @param data - The data to parse.
   * @returns The parsed header.
   */
  public parseMultiEncryptedHeader(data: Buffer): IMultiEncryptedParsedHeader {
    // Ensure there's enough data to read headers
    if (data.length < ECIES.MULTIPLE.FIXED_OVERHEAD_SIZE) {
      throw new EciesError(EciesErrorType.InvalidDataLength);
    }

    let offset = 0;

    // Read data length
    const dataLength = Number(data.readBigUInt64BE(offset));
    if (dataLength <= 0 || dataLength > ECIES.MAX_RAW_DATA_SIZE) {
      throw new EciesError(EciesErrorType.InvalidDataLength);
    }
    offset += ECIES.MULTIPLE.DATA_LENGTH_SIZE; // 8 bytes

    // Read recipient count
    const recipientCount = data.readUInt16BE(offset);
    if (recipientCount <= 0 || recipientCount > ECIES.MULTIPLE.MAX_RECIPIENTS) {
      throw new EciesError(EciesErrorType.InvalidRecipientCount);
    }
    offset += ECIES.MULTIPLE.RECIPIENT_COUNT_SIZE; // 2 bytes

    // Ensure there's enough data for all recipients
    const requiredLength = this.calculateECIESMultipleRecipientOverhead(
      recipientCount,
      false,
    );
    if (data.length < requiredLength) {
      throw new EciesError(EciesErrorType.InvalidDataLength);
    }

    // Read recipient IDs
    const recipientIds: DefaultBackendIdType[] = [];
    for (let i = 0; i < recipientCount; i++) {
      recipientIds.push(
        new ObjectId(
          data
            .subarray(offset, offset + ApiConstants.OBJECT_ID_LENGTH)
            .toString('hex'),
        ),
      );
      offset += ApiConstants.OBJECT_ID_LENGTH;
    }

    // Read encrypted keys with variable lengths based on encryption type
    const recipientKeys: Buffer[] = [];
    for (let i = 0; i < recipientCount; i++) {
      if (offset >= data.length) {
        throw new EciesError(EciesErrorType.InvalidDataLength, undefined, {
          error: 'Not enough data for encrypted keys',
        });
      }

      if (offset + ECIES.MULTIPLE.ENCRYPTED_KEY_SIZE > data.length) {
        throw new EciesError(EciesErrorType.InvalidDataLength, undefined, {
          error: 'Not enough data for encrypted key',
          required: String(ECIES.MULTIPLE.ENCRYPTED_KEY_SIZE),
          available: String(data.length - offset),
        });
      }

      recipientKeys.push(
        data.subarray(offset, offset + ECIES.MULTIPLE.ENCRYPTED_KEY_SIZE),
      );
      offset += ECIES.MULTIPLE.ENCRYPTED_KEY_SIZE;
    }

    return {
      dataLength,
      recipientCount,
      recipientIds,
      recipientKeys,
      headerSize: offset,
    };
  }

  /**
   * Parses a multi-encrypted buffer into its components.
   * @param data - The multi-encrypted buffer to parse.
   * @returns The parsed multi-encrypted buffer.
   */
  public parseMultiEncryptedBuffer(data: Buffer): IMultiEncryptedMessage {
    const header = this.parseMultiEncryptedHeader(data);
    const encryptedMessage = data.subarray(header.headerSize);

    return {
      ...header,
      encryptedMessage,
    };
  }
}
