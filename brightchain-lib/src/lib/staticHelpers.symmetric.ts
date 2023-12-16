import { createCipheriv, createDecipheriv, randomBytes } from 'crypto';
import { ISymmetricEncryptionResults } from './interfaces/symmetricEncryptionResults';

/**
 * @description
 * Static helper functions for BrightChain and BrightChain Quorum. Encryption and other utilities.
 * - Uses secrets.js-34r7h fork of secrets.js for Shamir's Secret Sharing
 * - Uses elliptic for ECDSA
 * - Uses bip39 for BIP39 Mnemonic generation
 * - Uses crypto for AES encryption
 * - Uses crypto for RSA key generation, encryption/decryption
 */
export abstract class StaticHelpersSymmetric {
  public static readonly SymmetricKeyAlgorithm = 'aes';
  /**
   * The symmetric algorithm key size
   */
  public static readonly SymmetricKeyBits = 256;

  /**
   * Helper to convert the bits to bytes for the symmetric key size
   */
  public static readonly SymmetricKeyBytes =
    StaticHelpersSymmetric.SymmetricKeyBits / 8;

  /**
   * The symmetric algorithm data mode (CBC/CTR, etc)
   */
  public static readonly SymmetricKeyMode = 'ctr';

  /**
   * The number of bytes to use for the AES IV
   */
  public static readonly SymmetricKeyIvBytes = 16;

  /**
   * The encryption algorithm (cipher) type string to be used.
   * @type {String}
   * @const
   * @private
   */
  public static readonly SymmetricAlgorithmType: string = `${StaticHelpersSymmetric.SymmetricKeyAlgorithm}-${StaticHelpersSymmetric.SymmetricKeyBits}-${StaticHelpersSymmetric.SymmetricKeyMode}`;

  /**
   * Encrypt data with AES
   * @param data
   * @param encryptionKey
   * @returns
   */
  public static symmetricEncryptBuffer(
    data: Buffer,
    encryptionKey?: Buffer
  ): ISymmetricEncryptionResults {
    if (
      encryptionKey &&
      encryptionKey.length != StaticHelpersSymmetric.SymmetricKeyBytes
    )
      throw new Error(
        `Encryption key must be ${StaticHelpersSymmetric.SymmetricKeyBytes} bytes long`
      );

    // encrypt the document using AES-256 and the key
    // Initialization Vector
    const ivBuffer = randomBytes(StaticHelpersSymmetric.SymmetricKeyIvBytes);
    const key: Buffer = encryptionKey ?? randomBytes(this.SymmetricKeyBytes);
    const cipher = createCipheriv(
      StaticHelpersSymmetric.SymmetricAlgorithmType,
      key,
      ivBuffer
    );

    const ciphertextBuffer = cipher.update(data);
    const encryptionIvPlusData: Buffer = Buffer.concat([
      ivBuffer,
      ciphertextBuffer,
      cipher.final(),
    ]);
    return {
      encryptedData: encryptionIvPlusData,
      key: key,
    };
  }

  /**
   * Decrypt the given buffer with AES, as a buffer
   * @param encryptedData
   * @param key
   * @returns
   */
  public static symmetricDecryptBuffer(
    encryptedData: Buffer,
    key: Buffer
  ): Buffer {
    const ivBuffer = encryptedData.subarray(
      0,
      StaticHelpersSymmetric.SymmetricKeyIvBytes
    );
    const ciphertextBuffer = encryptedData.subarray(
      StaticHelpersSymmetric.SymmetricKeyIvBytes
    );
    const decipher = createDecipheriv(
      StaticHelpersSymmetric.SymmetricAlgorithmType,
      key,
      ivBuffer
    );
    const decryptedDataBuffer = decipher.update(ciphertextBuffer);
    return decryptedDataBuffer;
  }
  /**
   * Encrypt data with AES
   * @param data
   * @param encryptionKey
   * @param useBuffer
   * @returns
   */
  public static symmetricEncrypt<T>(
    data: T,
    encryptionKey?: Buffer,
  ): ISymmetricEncryptionResults {
    if (data === null || data === undefined) {
      throw new Error('Data to encrypt cannot be null or undefined');
    }
    const hasToJSON = data && typeof data === 'object' && (data as any).toJSON;
    const isString = typeof data === 'string';
    const isHexString = isString && data.length % 2 == 0 && data.match(/^[0-9A-Fa-f]*$/);
    let dataBuffer: Buffer;
    if (isHexString) {
      dataBuffer = Buffer.from(data as string, 'hex');
    } else if (isString) {
      dataBuffer = Buffer.from(data as string, 'utf8');
    } else if (Buffer.isBuffer(data)) {
      dataBuffer = data;
    } else if (hasToJSON) {
      dataBuffer = Buffer.from((data as any).toJSON(), 'utf8');
    } else {
      dataBuffer = Buffer.from(JSON.stringify(data), 'utf8');
    }
    if (
      encryptionKey &&
      encryptionKey.length != StaticHelpersSymmetric.SymmetricKeyBytes
    )
      throw new Error(
        `Encryption key must be ${StaticHelpersSymmetric.SymmetricKeyBytes} bytes long`
      );

    // encrypt the document using AES-256 and the key
    // Initialization Vector
    const ivBuffer = randomBytes(StaticHelpersSymmetric.SymmetricKeyIvBytes);
    const key =
      encryptionKey ?? randomBytes(StaticHelpersSymmetric.SymmetricKeyBytes);
    const cipher = createCipheriv(
      StaticHelpersSymmetric.SymmetricAlgorithmType,
      key,
      ivBuffer
    );

    const ciphertextBuffer = cipher.update(dataBuffer);
    const encryptionIvPlusData = Buffer.concat([
      ivBuffer,
      ciphertextBuffer,
      cipher.final(),
    ]);
    return {
      encryptedData: encryptionIvPlusData,
      key: key,
    };
  }

  /**
   * Decrypt the given buffer with AES, treat as JSON and cast to a type
   * @param encryptedData
   * @param key
   * @returns
   */
  public static symmetricDecrypt<T>(encryptedData: Buffer, key: Buffer): T {
    return JSON.parse(
      StaticHelpersSymmetric.symmetricDecryptBuffer(
        encryptedData,
        key
      ).toString()
    ) as T;
  }
}
