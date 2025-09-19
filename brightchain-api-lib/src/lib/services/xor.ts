import { randomBytes } from 'crypto';

/**
 * A simple and fast XOR cipher for obfuscating data in memory.
 * This is not a substitute for strong cryptography but provides a lightweight way
 * to prevent sensitive data from being stored in plaintext in memory.
 */
export class XorService {
  /**
   * Encrypts or decrypts data using a simple XOR cipher.
   * The key is XORed with the data. The same function is used for
   * both encryption and decryption.
   *
   * @param data The data to process.
   * @param key The key to use for the XOR operation.
   * @returns A new Buffer containing the result of the XOR operation.
   */
  public static xor(data: Buffer, key: Buffer): Buffer {
    const result = Buffer.alloc(data.length);
    for (let i = 0; i < data.length; i++) {
      result[i] = data[i] ^ key[i % key.length];
    }
    return result;
  }

  /**
   * Generates a random key of a specified length.
   * @param length The length of the key in bytes.
   * @returns A Buffer containing the random key.
   */
  public static generateKey(length: number): Buffer {
    return randomBytes(length);
  }
}
