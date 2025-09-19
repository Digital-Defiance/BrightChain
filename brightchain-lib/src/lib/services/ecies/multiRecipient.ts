import { ECIES } from '../../constants';
import { IECIESConfig } from '../../interfaces/eciesConfig';
import { concatUint8Arrays } from '../../utils';
import { AESGCMService } from '../aesGCM';
import { EciesCryptoCore } from './cryptoCore';
import {
  IMultiEncryptedMessage,
  IMultiEncryptedParsedHeader,
  IMultiRecipient,
} from './interfaces';

/**
 * Browser-compatible multi-recipient ECIES encryption/decryption
 */
export class EciesMultiRecipient {
  private readonly cryptoCore: EciesCryptoCore;

  constructor(config: IECIESConfig) {
    this.cryptoCore = new EciesCryptoCore(config);
  }

  /**
   * Get the header size for multi-recipient encryption
   */
  public getHeaderSize(recipientCount: number): number {
    return (
      ECIES.MULTIPLE.DATA_LENGTH_SIZE +
      ECIES.MULTIPLE.RECIPIENT_COUNT_SIZE +
      recipientCount * ECIES.MULTIPLE.RECIPIENT_ID_SIZE +
      recipientCount * ECIES.MULTIPLE.ENCRYPTED_KEY_SIZE
    );
  }

  /**
   * Encrypt a message symmetric key with a public key
   * @param receiverPublicKey The public key of the receiver
   * @param messageSymmetricKey The message to encrypt
   * @returns The encrypted message
   */
  public async encryptKey(
    receiverPublicKey: Uint8Array,
    messageSymmetricKey: Uint8Array,
  ): Promise<Uint8Array> {
    const ephemeralKeyPair = await this.cryptoCore.generateEphemeralKeyPair();
    const sharedSecret = await this.cryptoCore.computeSharedSecret(
      ephemeralKeyPair.privateKey,
      receiverPublicKey,
    );

    const symKey = sharedSecret.slice(0, ECIES.SYMMETRIC.KEY_LENGTH);

    const encryptResult = await AESGCMService.encrypt(
      messageSymmetricKey,
      symKey,
      true,
    );
    const { encrypted, iv } = encryptResult;
    const authTag = encryptResult.tag;

    if (!authTag) {
      throw new Error('Authentication tag is required for key encryption');
    }

    return concatUint8Arrays(
      new Uint8Array(ephemeralKeyPair.publicKey),
      iv,
      authTag,
      encrypted,
    );
  }

  /**
   * Decrypts symmetric key encrypted with ECIES
   * @param privateKey The private key to decrypt the data
   * @param encryptedKey The data to decrypt
   * @returns The decrypted data buffer
   */
  public async decryptKey(
    privateKey: Uint8Array,
    encryptedKey: Uint8Array,
  ): Promise<Uint8Array> {
    if (encryptedKey.length !== ECIES.MULTIPLE.ENCRYPTED_KEY_SIZE) {
      throw new Error(
        `Invalid encrypted key length: expected ${ECIES.MULTIPLE.ENCRYPTED_KEY_SIZE}, got ${encryptedKey.length}`,
      );
    }

    const ephemeralPublicKey = encryptedKey.slice(0, ECIES.PUBLIC_KEY_LENGTH);
    const iv = encryptedKey.slice(
      ECIES.PUBLIC_KEY_LENGTH,
      ECIES.PUBLIC_KEY_LENGTH + ECIES.IV_LENGTH,
    );
    const authTag = encryptedKey.slice(
      ECIES.PUBLIC_KEY_LENGTH + ECIES.IV_LENGTH,
      ECIES.PUBLIC_KEY_LENGTH + ECIES.IV_LENGTH + ECIES.AUTH_TAG_SIZE,
    );
    const encrypted = encryptedKey.slice(
      ECIES.PUBLIC_KEY_LENGTH + ECIES.IV_LENGTH + ECIES.AUTH_TAG_SIZE,
    );

    const sharedSecret = await this.cryptoCore.computeSharedSecret(
      privateKey,
      ephemeralPublicKey,
    );
    const symKey = sharedSecret.slice(0, ECIES.SYMMETRIC.KEY_LENGTH);

    const encryptedWithTag = AESGCMService.combineEncryptedDataAndTag(
      encrypted,
      authTag,
    );

    try {
      const decrypted = await AESGCMService.decrypt(
        iv,
        encryptedWithTag,
        symKey,
        true,
      );
      if (decrypted.length !== ECIES.SYMMETRIC.KEY_LENGTH) {
        throw new Error('Invalid data length');
      }
      return decrypted;
    } catch (error) {
      console.error('Failed to decrypt key:', error);
      throw new Error('Failed to decrypt key');
    }
  }

  /**
   * Encrypt a message for multiple recipients
   */
  public async encryptMultiple(
    recipients: IMultiRecipient[],
    message: Uint8Array,
    preamble: Uint8Array = new Uint8Array(0),
  ): Promise<IMultiEncryptedMessage> {
    if (recipients.length > ECIES.MULTIPLE.MAX_RECIPIENTS) {
      throw new Error(`Too many recipients: ${recipients.length}`);
    }

    if (message.length > ECIES.MAX_RAW_DATA_SIZE) {
      throw new Error(`Message too large: ${message.length}`);
    }

    // Generate symmetric key
    const symmetricKey = crypto.getRandomValues(
      new Uint8Array(ECIES.SYMMETRIC.KEY_LENGTH),
    );

    // Encrypt message with symmetric key
    const encryptResult = await AESGCMService.encrypt(
      message,
      symmetricKey,
      true,
    );
    const { encrypted, iv } = encryptResult;
    const authTag = encryptResult.tag;

    if (!authTag) {
      throw new Error(
        'Authentication tag is required for multi-recipient ECIES encryption',
      );
    }

    // Create stored message: preamble + iv + authTag + encrypted
    const storedMessage = concatUint8Arrays(preamble, iv, authTag, encrypted);

    // Encrypt symmetric key for each recipient
    const recipientIds: Uint8Array[] = [];
    const recipientKeys: Uint8Array[] = [];

    for (const recipient of recipients) {
      const encryptedKey = await this.encryptKey(
        recipient.publicKey,
        symmetricKey,
      );

      recipientIds.push(recipient.id);
      recipientKeys.push(encryptedKey);
    }

    const headerSize = this.getHeaderSize(recipients.length);

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
   * Decrypt a multi-recipient message for a specific recipient
   */
  public async decryptMultipleForRecipient(
    encryptedData: IMultiEncryptedMessage,
    recipientId: Uint8Array,
    privateKey: Uint8Array,
  ): Promise<Uint8Array> {
    // Find recipient's encrypted key
    const recipientIndex = encryptedData.recipientIds.findIndex((id) =>
      this.arraysEqual(id, recipientId),
    );

    if (recipientIndex === -1) {
      throw new Error('Recipient not found');
    }

    const encryptedKey = encryptedData.recipientKeys[recipientIndex];

    // Decrypt the symmetric key
    const symmetricKey = await this.decryptKey(privateKey, encryptedKey);

    // Extract components from encrypted message
    let offset = 0;
    const iv = encryptedData.encryptedMessage.slice(
      offset,
      offset + ECIES.IV_LENGTH,
    );
    offset += ECIES.IV_LENGTH;

    const authTag = encryptedData.encryptedMessage.slice(
      offset,
      offset + ECIES.AUTH_TAG_SIZE,
    );
    offset += ECIES.AUTH_TAG_SIZE;

    const encrypted = encryptedData.encryptedMessage.slice(offset);

    // AES-GCM provides authentication via auth tag (no separate CRC needed)

    // Decrypt with symmetric key
    const encryptedWithTag = AESGCMService.combineEncryptedDataAndTag(
      encrypted,
      authTag,
    );

    const decrypted = await AESGCMService.decrypt(
      iv,
      encryptedWithTag,
      symmetricKey,
      true,
    );

    // Verify length
    if (decrypted.length !== encryptedData.dataLength) {
      throw new Error('Decrypted data length mismatch');
    }

    return decrypted;
  }

  /**
   * Build header for multi-recipient message
   */
  public buildHeader(data: IMultiEncryptedMessage): Uint8Array {
    if (data.recipientIds.length !== data.recipientKeys.length) {
      throw new Error('Recipient count mismatch');
    }

    if (data.dataLength < 0 || data.dataLength > ECIES.MAX_RAW_DATA_SIZE) {
      throw new Error('Invalid data length');
    }

    // Data length (8 bytes)
    const dataLengthBuffer = new Uint8Array(8);
    new DataView(dataLengthBuffer.buffer).setBigUint64(
      0,
      BigInt(data.dataLength),
      false,
    );

    // Recipient count (2 bytes)
    const recipientCountBuffer = new Uint8Array(2);
    new DataView(recipientCountBuffer.buffer).setUint16(
      0,
      data.recipientIds.length,
      false,
    );

    // Recipient IDs
    const recipientIdsBuffer = concatUint8Arrays(...data.recipientIds);

    // Encrypted keys
    const encryptedKeysBuffer = concatUint8Arrays(...data.recipientKeys);

    return concatUint8Arrays(
      dataLengthBuffer,
      recipientCountBuffer,
      recipientIdsBuffer,
      encryptedKeysBuffer,
    );
  }

  /**
   * Parse multi-recipient header
   */
  public parseHeader(data: Uint8Array): IMultiEncryptedParsedHeader {
    if (data.length < 10) {
      // minimum: 8 + 2
      throw new Error('Data too short for multi-recipient header');
    }

    let offset = 0;
    const view = new DataView(data.buffer, data.byteOffset);

    // Read data length
    const dataLength = Number(view.getBigUint64(offset, false));
    offset += 8;

    if (dataLength <= 0 || dataLength > ECIES.MAX_RAW_DATA_SIZE) {
      throw new Error('Invalid data length');
    }

    // Read recipient count
    const recipientCount = view.getUint16(offset, false);
    offset += 2;

    if (recipientCount <= 0 || recipientCount > ECIES.MULTIPLE.MAX_RECIPIENTS) {
      throw new Error('Invalid recipient count');
    }

    // Read recipient IDs
    const recipientIds: Uint8Array[] = [];
    for (let i = 0; i < recipientCount; i++) {
      recipientIds.push(
        data.slice(offset, offset + ECIES.MULTIPLE.RECIPIENT_ID_SIZE),
      );
      offset += ECIES.MULTIPLE.RECIPIENT_ID_SIZE;
    }

    // Read encrypted keys
    const recipientKeys: Uint8Array[] = [];
    for (let i = 0; i < recipientCount; i++) {
      recipientKeys.push(
        data.slice(offset, offset + ECIES.MULTIPLE.ENCRYPTED_KEY_SIZE),
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
   * Parse complete multi-recipient message
   */
  public parseMessage(data: Uint8Array): IMultiEncryptedMessage {
    const header = this.parseHeader(data);
    const encryptedMessage = data.slice(header.headerSize);

    return {
      ...header,
      encryptedMessage,
    };
  }

  private arraysEqual(a: Uint8Array, b: Uint8Array): boolean {
    if (a.length !== b.length) return false;
    for (let i = 0; i < a.length; i++) {
      if (a[i] !== b[i]) return false;
    }
    return true;
  }
}
