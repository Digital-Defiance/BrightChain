import { createCipheriv, createDecipheriv, randomBytes } from 'crypto';
import { ECIES, SYMMETRIC_ALGORITHM_CONFIGURATION } from '../constants';
import { SymmetricErrorType } from '../enumerations/symmetricErrorType';
import { SymmetricError } from '../errors/symmetricError';
import { ISymmetricEncryptionResults } from '../interfaces/symmetricEncryptionResults';

function hasToJsonMethod<T>(obj: T): obj is T & { toJson: () => string } {
  return typeof obj === 'object' && obj !== null && 'toJson' in obj;
}

/**
 * Service for handling symmetric encryption operations.
 * This service provides functionality for:
 * - AES encryption/decryption of buffers and JSON data
 * - Key and IV generation
 * - Secure cryptographic operations
 */
export class SymmetricService {
  public static get symmetricKeyBits(): number {
    return ECIES.SYMMETRIC.KEY_BITS;
  }

  public static get symmetricKeyBytes(): number {
    return ECIES.SYMMETRIC.KEY_LENGTH;
  }

  /**
   * Encrypt data with AES
   * @param data The data to encrypt
   * @param encryptionKey Optional encryption key (will be randomly generated if not provided)
   * @returns Object containing encrypted data and key
   */
  public static encryptBuffer(
    data: Buffer,
    encryptionKey?: Buffer,
  ): ISymmetricEncryptionResults {
    if (encryptionKey && encryptionKey.length != ECIES.SYMMETRIC.KEY_LENGTH) {
      throw new SymmetricError(SymmetricErrorType.InvalidKeyLength);
    }

    // encrypt the document using AES-256 and the key
    // Initialization Vector
    const ivBuffer = randomBytes(ECIES.IV_LENGTH);
    const key: Buffer =
      encryptionKey ?? randomBytes(ECIES.SYMMETRIC.KEY_LENGTH);
    const cipher = createCipheriv(
      SYMMETRIC_ALGORITHM_CONFIGURATION,
      key,
      ivBuffer,
    );

    const ciphertextBuffer = cipher.update(data);
    const finalBuffer = cipher.final();
    const authTag = cipher.getAuthTag(); // CRITICAL: Extract auth tag

    const encryptionIvPlusData: Buffer = Buffer.concat([
      ivBuffer,
      ciphertextBuffer,
      finalBuffer,
      authTag, // CRITICAL: Append auth tag
    ]);
    return {
      encryptedData: encryptionIvPlusData,
      key: key,
    };
  }

  /**
   * Decrypt the given buffer with AES
   * @param encryptedData The encrypted data to decrypt
   * @param key The key to use for decryption
   * @returns Decrypted data as a Buffer
   */
  public static decryptBuffer(encryptedData: Buffer, key: Buffer): Buffer {
    const ivBuffer = encryptedData.subarray(0, ECIES.IV_LENGTH);
    const authTagStart = encryptedData.length - ECIES.AUTH_TAG_LENGTH;
    const ciphertextBuffer = encryptedData.subarray(
      ECIES.IV_LENGTH,
      authTagStart,
    );
    const authTag = encryptedData.subarray(authTagStart); // CRITICAL: Extract auth tag

    const decipher = createDecipheriv(
      SYMMETRIC_ALGORITHM_CONFIGURATION,
      key,
      ivBuffer,
    );
    decipher.setAuthTag(authTag); // CRITICAL: Set auth tag for verification

    return Buffer.concat([decipher.update(ciphertextBuffer), decipher.final()]);
  }

  /**
   * Encrypt JSON data with AES
   * @param data The data to encrypt
   * @param encryptionKey Optional encryption key (will be randomly generated if not provided)
   * @returns Object containing encrypted data and key
   */
  public static encryptJson<T>(
    data: T,
    encryptionKey?: Buffer,
  ): ISymmetricEncryptionResults {
    if (data === null || data === undefined) {
      throw new SymmetricError(SymmetricErrorType.DataNullOrUndefined);
    }
    let dataBuffer: Buffer;
    if (hasToJsonMethod<T>(data)) {
      dataBuffer = Buffer.from(data.toJson(), 'utf8');
    } else {
      dataBuffer = Buffer.from(JSON.stringify(data), 'utf8');
    }
    return SymmetricService.encryptBuffer(dataBuffer, encryptionKey);
  }

  /**
   * Decrypt the given buffer with AES and parse as JSON
   * @param encryptedData The encrypted data to decrypt
   * @param key The key to use for decryption
   * @returns Decrypted data parsed as type T
   */
  public static decryptJson<T>(encryptedData: Buffer, key: Buffer): T {
    return JSON.parse(
      SymmetricService.decryptBuffer(encryptedData, key).toString('utf8'),
    ) as T;
  }
}
