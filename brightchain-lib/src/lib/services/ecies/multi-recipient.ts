import { createCipheriv, createDecipheriv, randomBytes } from 'crypto';
import { BrightChainMember } from '../../brightChainMember';
import CONSTANTS, {
  ECIES,
  SYMMETRIC_ALGORITHM_CONFIGURATION,
} from '../../constants';
import { EciesErrorType } from '../../enumerations/eciesErrorType';
import { EciesError } from '../../errors/eciesError';
import { GuidV4 } from '../../guid';
import { IMultiEncryptedMessage } from '../../interfaces/multiEncryptedMessage';
import { IMultiEncryptedParsedHeader } from '../../interfaces/multiEncryptedParsedHeader';
import { RawGuidBuffer } from '../../types';
import { ServiceLocator } from '../serviceLocator';
import { EciesCryptoCore } from './crypto-core';

/**
 * Multiple recipient encryption/decryption functions for ECIES
 */
export class EciesMultiRecipient {
  private readonly cryptoCore: EciesCryptoCore;

  constructor(cryptoCore: EciesCryptoCore) {
    this.cryptoCore = cryptoCore;
  }

  /**
   * Encrypts a message for multiple recipients.
   * @param recipients The recipients to encrypt the message for.
   * @param message The message to encrypt.
   * @returns The encrypted message.
   * @throws EciesError if the number of recipients is greater than 65535.
   */
  public encryptMultiple(
    recipients: BrightChainMember[],
    message: Buffer,
  ): IMultiEncryptedMessage {
    if (recipients.length > CONSTANTS.UINT16_MAX) {
      throw new EciesError(EciesErrorType.TooManyRecipients);
    }

    // Generate a random symmetric key
    const symmetricKey = randomBytes(ECIES.SYMMETRIC.KEY_LENGTH);
    const iv = randomBytes(ECIES.IV_LENGTH);

    // Encrypt the message with the symmetric key
    const cipher = createCipheriv(
      SYMMETRIC_ALGORITHM_CONFIGURATION,
      symmetricKey,
      iv,
    );

    // Add CRC for message integrity
    const crc16 = ServiceLocator.getServiceProvider().crcService.crc16(message);
    const encrypted = cipher.update(Buffer.concat([crc16, message]));
    const final = cipher.final();
    const authTag = cipher.getAuthTag();

    const encryptedMessage = Buffer.concat([iv, authTag, encrypted, final]);

    // Encrypt the symmetric key for each recipient
    const encryptionResults = recipients.map((member) => ({
      id: member.id,
      encryptedKey: this.cryptoCore.encrypt(member.publicKey, symmetricKey),
    }));

    const recipientIds = encryptionResults.map(({ id }) => id);
    const recipientKeys = encryptionResults.map(
      ({ encryptedKey }) => encryptedKey,
    );

    // Verify the encrypted message size
    if (
      message.length + ECIES.MULTIPLE.ENCRYPTED_MESSAGE_OVERHEAD_SIZE !==
      encryptedMessage.length
    ) {
      throw new EciesError(EciesErrorType.MessageLengthMismatch);
    }

    const headerSize = this.calculateECIESMultipleRecipientOverhead(
      recipients.length,
      false,
    );

    return {
      dataLength: message.length,
      recipientCount: recipients.length,
      recipientIds,
      recipientKeys,
      encryptedMessage,
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
    recipient: BrightChainMember,
  ): Buffer {
    if (recipient.privateKey === undefined) {
      throw new EciesError(EciesErrorType.PrivateKeyNotLoaded);
    }

    // Find this recipient's encrypted key
    const recipientIndex = encryptedData.recipientIds.findIndex((id) =>
      id.equals(recipient.id),
    );
    if (recipientIndex === -1) {
      throw new EciesError(EciesErrorType.RecipientNotFound);
    }

    const encryptedKey = encryptedData.recipientKeys[recipientIndex];

    // Decrypt the symmetric key
    const symmetricKey = this.cryptoCore.decryptSingleWithHeader(
      recipient.privateKey,
      encryptedKey,
    );

    // Extract the IV and auth tag from the encrypted message
    const iv = encryptedData.encryptedMessage.subarray(0, ECIES.IV_LENGTH);
    const authTag = encryptedData.encryptedMessage.subarray(
      ECIES.IV_LENGTH,
      ECIES.IV_LENGTH + ECIES.AUTH_TAG_LENGTH,
    );

    // Extract the encrypted content
    const encrypted = encryptedData.encryptedMessage.subarray(
      ECIES.IV_LENGTH + ECIES.AUTH_TAG_LENGTH,
    );

    // Decrypt the content with the symmetric key
    const decipher = createDecipheriv(
      SYMMETRIC_ALGORITHM_CONFIGURATION,
      symmetricKey,
      iv,
    );
    decipher.setAuthTag(authTag);

    const decrypted = decipher.update(encrypted);
    const final = decipher.final();
    const decryptedMessage = Buffer.concat([decrypted, final]);

    // Verify the size of the decrypted message
    if (
      decryptedMessage.length !==
      encryptedData.dataLength + CONSTANTS.UINT16_SIZE
    ) {
      throw new EciesError(EciesErrorType.InvalidDataLength);
    }

    // Extract and verify the CRC
    const crc16 = decryptedMessage.subarray(0, CONSTANTS.UINT16_SIZE);
    const calculatedCrc16 =
      ServiceLocator.getServiceProvider().crcService.crc16(
        decryptedMessage.subarray(CONSTANTS.UINT16_SIZE),
      );
    if (!crc16.equals(calculatedCrc16)) {
      throw new EciesError(EciesErrorType.InvalidMessageCrc);
    }

    // Return the message without the CRC
    return decryptedMessage.subarray(CONSTANTS.UINT16_SIZE);
  }

  /**
   * Calculate the overhead for a message encrypted for multiple recipients
   * @param recipientCount number of recipients
   * @param includeMessageOverhead whether to include the overhead for the encrypted message
   * @returns the overhead size in bytes
   */
  public calculateECIESMultipleRecipientOverhead(
    recipientCount: number,
    includeMessageOverhead: boolean,
  ): number {
    if (recipientCount < 2) {
      throw new EciesError(EciesErrorType.InvalidRecipientCount);
    }

    const baseOverhead =
      ECIES.MULTIPLE.DATA_LENGTH_SIZE +
      ECIES.MULTIPLE.RECIPIENT_COUNT_SIZE +
      recipientCount * CONSTANTS.GUID_SIZE + // recipient ids
      recipientCount * ECIES.MULTIPLE.ENCRYPTED_KEY_SIZE; // recipient encrypted keys

    return includeMessageOverhead
      ? baseOverhead + ECIES.MULTIPLE.ENCRYPTED_MESSAGE_OVERHEAD_SIZE
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
      data.dataLength > ECIES.MULTIPLE.MAX_DATA_SIZE
    ) {
      throw new EciesError(EciesErrorType.FileSizeTooLarge);
    }

    // Create data length buffer
    const dataLengthBuffer = Buffer.alloc(
      CONSTANTS.ECIES.MULTIPLE.DATA_LENGTH_SIZE,
    );
    dataLengthBuffer.writeBigUInt64BE(BigInt(data.dataLength));

    // Create recipient count buffer
    const recipientCountBuffer = Buffer.alloc(
      CONSTANTS.ECIES.MULTIPLE.RECIPIENT_COUNT_SIZE,
    );
    recipientCountBuffer.writeUInt16BE(data.recipientIds.length);

    // Create recipients buffer
    const recipientsBuffer = Buffer.alloc(
      data.recipientIds.length * CONSTANTS.GUID_SIZE,
    );
    data.recipientIds.forEach((recipientId, index) => {
      recipientsBuffer.set(
        recipientId.asRawGuidBuffer,
        index * CONSTANTS.GUID_SIZE,
      );
    });

    // Validate encrypted key lengths
    data.recipientKeys.forEach((encryptedKey) => {
      if (encryptedKey.length !== ECIES.MULTIPLE.ENCRYPTED_KEY_SIZE) {
        throw new EciesError(EciesErrorType.InvalidEncryptedKeyLength);
      }
    });

    // Create encrypted keys buffer
    const encryptedKeysBuffer = Buffer.alloc(
      data.recipientKeys.length * ECIES.MULTIPLE.ENCRYPTED_KEY_SIZE,
    );
    data.recipientKeys.forEach((encryptedKey, index) => {
      encryptedKeysBuffer.set(
        encryptedKey,
        index * ECIES.MULTIPLE.ENCRYPTED_KEY_SIZE,
      );
    });

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
    if (dataLength <= 0 || dataLength > ECIES.MULTIPLE.MAX_DATA_SIZE) {
      throw new EciesError(EciesErrorType.InvalidDataLength);
    }
    offset += CONSTANTS.ECIES.MULTIPLE.DATA_LENGTH_SIZE; // 8 bytes

    // Read recipient count
    const recipientCount = data.readUInt16BE(offset);
    if (recipientCount <= 0 || recipientCount > ECIES.MULTIPLE.MAX_RECIPIENTS) {
      throw new EciesError(EciesErrorType.InvalidRecipientCount);
    }
    offset += CONSTANTS.ECIES.MULTIPLE.RECIPIENT_COUNT_SIZE; // 2 bytes

    // Ensure there's enough data for all recipients
    const requiredLength = this.calculateECIESMultipleRecipientOverhead(
      recipientCount,
      false,
    );
    if (data.length < requiredLength) {
      throw new EciesError(EciesErrorType.InvalidDataLength);
    }

    // Read recipient IDs
    const recipientIds: GuidV4[] = [];
    for (let i = 0; i < recipientCount; i++) {
      recipientIds.push(
        new GuidV4(
          data.subarray(offset, offset + CONSTANTS.GUID_SIZE) as RawGuidBuffer,
        ),
      );
      offset += CONSTANTS.GUID_SIZE;
    }

    // Read encrypted keys
    const recipientKeys: Buffer[] = [];
    for (let i = 0; i < recipientCount; i++) {
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
