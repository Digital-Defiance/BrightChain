/**
 * A simple and fast XOR cipher for obfuscating data in memory for browser environments.
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
   * @returns A new Uint8Array containing the result of the XOR operation.
   */
  public static xor(data: Uint8Array, key: Uint8Array): Uint8Array {
    const result = new Uint8Array(data.length);
    for (let i = 0; i < data.length; i++) {
      result[i] = data[i] ^ key[i % key.length];
    }
    return result;
  }

  /**
   * Generates a random key of a specified length.
   * @param length The length of the key in bytes.
   * @returns A Uint8Array containing the random key.
   * @throws Error if crypto API is not available.
   */
  public static generateKey(length: number): Uint8Array {
    const randomBytes = new Uint8Array(length);

    // Check if running in a browser with crypto support
    if (typeof window !== 'undefined' && window.crypto) {
      window.crypto.getRandomValues(randomBytes);
    } else if (typeof crypto !== 'undefined') {
      // For environments where crypto is global (some newer JS runtimes)
      crypto.getRandomValues(randomBytes);
    } else {
      throw new Error('Crypto API not available in this environment');
    }

    return randomBytes;
  }

  /**
   * Helper method to convert a string to a Uint8Array.
   * @param str The string to convert.
   * @returns A Uint8Array representation of the string.
   */
  public static stringToBytes(str: string): Uint8Array {
    const encoder = new TextEncoder();
    return encoder.encode(str);
  }

  /**
   * Helper method to convert a Uint8Array to a string.
   * @param bytes The Uint8Array to convert.
   * @returns A string representation of the Uint8Array.
   */
  public static bytesToString(bytes: Uint8Array): string {
    const decoder = new TextDecoder();
    return decoder.decode(bytes);
  }
}
