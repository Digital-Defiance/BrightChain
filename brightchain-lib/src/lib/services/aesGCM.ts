import { ECIES } from '../constants';

export abstract class AESGCMService {
    public static readonly ALGORITHM_NAME = 'AES-GCM';
  /**
   * Encrypt data using AES-GCM
   * @param data Data to encrypt
   * @param key Key to use for encryption (must be 16, 24 or 32 bytes for AES)
   * @returns Encrypted data
   */
  public static async encrypt(
    data: Uint8Array,
    key: Uint8Array,
    authTag: boolean = false,
  ): Promise<{ encrypted: Uint8Array; iv: Uint8Array; tag?: Uint8Array }> {
    const cryptoKey = await crypto.subtle.importKey(
      'raw',
      new Uint8Array(key),
      { name: AESGCMService.ALGORITHM_NAME },
      false,
      ['encrypt'],
    );

    const iv = crypto.getRandomValues(
      new Uint8Array(ECIES.IV_SIZE),
    );
    const encryptedResult = await crypto.subtle.encrypt(
      { name: AESGCMService.ALGORITHM_NAME, iv, ...(authTag && { tagLength: ECIES.AUTH_TAG_SIZE * 8}) },
      cryptoKey,
      new Uint8Array(data),
    );

    const encryptedArray = new Uint8Array(encryptedResult);
    if (!authTag) {
      return { encrypted: encryptedArray, iv };
    }
    const authTagLengthBytes = ECIES.AUTH_TAG_SIZE;
    const encryptedBytes = encryptedArray.slice(0, -authTagLengthBytes); // Remove auth tag
    const authTagBytes = encryptedArray.slice(-authTagLengthBytes); // Last 16 bytes are auth tag

    return { encrypted: encryptedBytes, iv, tag: authTagBytes };
  }

  /**
   * Combine encrypted data and auth tag into a single Uint8Array
   * @param encryptedData The encrypted data
   * @param authTag The authentication tag
   * @returns The combined Uint8Array
   */
  public static combineEncryptedDataAndTag(
    encryptedData: Uint8Array,
    authTag: Uint8Array,
  ): Uint8Array {
    const combined = new Uint8Array(encryptedData.length + authTag.length);
    combined.set(encryptedData);
    combined.set(authTag, encryptedData.length);
    return combined;
  }

  /**
   * Combine IV and encrypted data (with optional auth tag) into a single Uint8Array
   * @param iv The initialization vector
   * @param encryptedDataWithTag The encrypted data with auth tag already appended (if applicable)
   * @returns The combined Uint8Array
   */
  public static combineIvAndEncryptedData(
    iv: Uint8Array,
    encryptedDataWithTag: Uint8Array,
  ): Uint8Array {
    const combined = new Uint8Array(iv.length + encryptedDataWithTag.length);
    combined.set(iv);
    combined.set(encryptedDataWithTag, iv.length);
    return combined;
  }

  /**
   * Combine IV, encrypted data and auth tag into a single Uint8Array
   * @param iv The initialization vector
   * @param encryptedData The encrypted data
   * @param authTag The authentication tag
   * @returns The combined Uint8Array
   */
  public static combineIvTagAndEncryptedData(
    iv: Uint8Array,
    encryptedData: Uint8Array,
    authTag: Uint8Array,
  ): Uint8Array {
    const encryptedWithTag = AESGCMService.combineEncryptedDataAndTag(encryptedData, authTag);
    return AESGCMService.combineIvAndEncryptedData(iv, encryptedWithTag);
  }

  /**
   * Split combined encrypted data back into its components
   * @param combinedData The combined data containing IV, encrypted data, and optionally auth tag
   * @param hasAuthTag Whether the combined data includes an authentication tag
   * @returns Object containing the split components
   */
  public static splitEncryptedData(
    combinedData: Uint8Array,
    hasAuthTag: boolean = true,
  ): { iv: Uint8Array; encryptedDataWithTag: Uint8Array } {
    const ivLength = ECIES.IV_SIZE;
    const tagLength = hasAuthTag ? ECIES.AUTH_TAG_SIZE : 0;
    
    if (combinedData.length < ivLength + tagLength) {
      throw new Error('Combined data is too short to contain required components');
    }

    const iv = combinedData.slice(0, ivLength);
    const encryptedDataWithTag = combinedData.slice(ivLength);
    
    return { iv, encryptedDataWithTag };
  }

  /**
   * Decrypt data using AES-GCM
   * @param iv The initialization vector
   * @param encryptedData Data to decrypt (with auth tag appended if authTag is true)
   * @param key Key to use for decryption (must be 16, 24 or 32 bytes for AES)
   * @param authTag Whether the encrypted data includes an authentication tag
   * @returns Decrypted data
   */
  public static async decrypt(
    iv: Uint8Array,
    encryptedData: Uint8Array,
    key: Uint8Array,
    authTag: boolean = false,
  ): Promise<Uint8Array> {
    const cryptoKey = await crypto.subtle.importKey(
      'raw',
      new Uint8Array(key),
      { name: AESGCMService.ALGORITHM_NAME },
      false,
      ['decrypt'],
    );

    if (!authTag) {
      const decrypted = await crypto.subtle.decrypt(
        { name: AESGCMService.ALGORITHM_NAME, iv: new Uint8Array(iv) },
        cryptoKey,
        new Uint8Array(encryptedData),
      );

      return new Uint8Array(decrypted);
    }

    // Decrypt with auth tag (already appended to encryptedData)
    const decryptedResult = await crypto.subtle.decrypt(
      {
        name: AESGCMService.ALGORITHM_NAME,
        iv: new Uint8Array(iv),
        tagLength: ECIES.AUTH_TAG_SIZE * 8,
      },
      cryptoKey,
      new Uint8Array(encryptedData),
    );

    return new Uint8Array(decryptedResult);
  }
}