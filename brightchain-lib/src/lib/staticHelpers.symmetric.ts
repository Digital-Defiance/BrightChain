import { createCipheriv, createDecipheriv, randomBytes } from 'crypto';
import { ISymmetricEncryptionResults } from './interfaces/symmetricEncryptionResults';

function hasToJsonMethod<T>(obj: T): obj is T & { toJSON: () => string } {
  return typeof obj === 'object' && obj !== null && 'toJSON' in obj;
}

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
    encryptionKey?: Buffer,
  ): ISymmetricEncryptionResults {
    if (
      encryptionKey &&
      encryptionKey.length != StaticHelpersSymmetric.SymmetricKeyBytes
    )
      throw new Error(
        `Encryption key must be ${StaticHelpersSymmetric.SymmetricKeyBytes} bytes long`,
      );

    // encrypt the document using AES-256 and the key
    // Initialization Vector
    const ivBuffer = randomBytes(StaticHelpersSymmetric.SymmetricKeyIvBytes);
    const key: Buffer = encryptionKey ?? randomBytes(this.SymmetricKeyBytes);
    const cipher = createCipheriv(
      StaticHelpersSymmetric.SymmetricAlgorithmType,
      key,
      ivBuffer,
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
    key: Buffer,
  ): Buffer {
    const ivBuffer = encryptedData.subarray(
      0,
      StaticHelpersSymmetric.SymmetricKeyIvBytes,
    );
    const ciphertextBuffer = encryptedData.subarray(
      StaticHelpersSymmetric.SymmetricKeyIvBytes,
    );
    const decipher = createDecipheriv(
      StaticHelpersSymmetric.SymmetricAlgorithmType,
      key,
      ivBuffer,
    );
    return decipher.update(ciphertextBuffer);
  }
  /**
   * Encrypt data with AES
   * @param data
   * @param encryptionKey
   * @returns
   */
  public static symmetricEncryptJson<T>(
    data: T,
    encryptionKey?: Buffer,
  ): ISymmetricEncryptionResults {
    if (data === null || data === undefined) {
      throw new Error('Data to encrypt cannot be null or undefined');
    }
    let dataBuffer: Buffer;
    if (hasToJsonMethod<T>(data)) {
      dataBuffer = Buffer.from(data.toJSON(), 'utf8');
    } else {
      dataBuffer = Buffer.from(JSON.stringify(data), 'utf8');
    }
    return StaticHelpersSymmetric.symmetricEncryptBuffer(
      dataBuffer,
      encryptionKey,
    );
  }

  /**
   * Decrypt the given buffer with AES, treat as JSON and cast to a type
   * @param encryptedData
   * @param key
   * @returns
   */
  public static symmetricDecryptJson<T>(encryptedData: Buffer, key: Buffer): T {
    return JSON.parse(
      StaticHelpersSymmetric.symmetricDecryptBuffer(
        encryptedData,
        key,
      ).toString('utf8'),
    ) as T;
  }
}
