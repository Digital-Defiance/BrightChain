/**
 * XOR operations for BrightChain.
 *
 * All XOR operations in BrightChain use equal-length arrays for whitening/brightening.
 * This is NOT a repeating-key cipher - arrays must always be the same length.
 */
export class XorService {
  /**
   * XOR two Uint8Arrays of equal length.
   * For BrightChain whitening/brightening operations, we always XOR equal-length blocks.
   *
   * Properties:
   * - Self-inverse: (A ⊕ B) ⊕ B = A
   * - Commutative: A ⊕ B = B ⊕ A
   * - Associative: (A ⊕ B) ⊕ C = A ⊕ (B ⊕ C)
   *
   * @param a The first array to XOR.
   * @param b The second array to XOR (same length as a).
   * @returns A new Uint8Array containing the result of the XOR operation.
   * @throws Error if arrays have different lengths.
   */
  public static xor(a: Uint8Array, b: Uint8Array): Uint8Array {
    if (a.length !== b.length) {
      throw new Error(
        `XOR requires equal-length arrays: a.length=${a.length}, b.length=${b.length}`,
      );
    }

    const result = new Uint8Array(a.length);
    for (let i = 0; i < a.length; i++) {
      result[i] = a[i] ^ b[i];
    }
    return result;
  }

  /**
   * XOR multiple equal-length arrays together.
   * Used for brightening operations where a source block is XORed with multiple random blocks.
   *
   * @param arrays Array of Uint8Arrays to XOR together (all must be same length)
   * @returns A new Uint8Array containing the XOR of all input arrays
   * @throws Error if arrays have different lengths or if no arrays provided
   */
  public static xorMultiple(arrays: Uint8Array[]): Uint8Array {
    if (arrays.length === 0) {
      throw new Error('At least one array must be provided for XOR');
    }

    const length = arrays[0].length;

    // Verify all arrays have the same length
    for (let i = 1; i < arrays.length; i++) {
      if (arrays[i].length !== length) {
        throw new Error(
          `All arrays must have the same length for XOR: expected ${length}, got ${arrays[i].length} at index ${i}`,
        );
      }
    }

    const result = new Uint8Array(length);

    // XOR all arrays together
    for (let i = 0; i < length; i++) {
      let xorValue = 0;
      for (const arr of arrays) {
        xorValue ^= arr[i];
      }
      result[i] = xorValue;
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

    // crypto.getRandomValues has a 65536 byte limit, so we need to chunk
    const CHUNK_SIZE = 65536;

    // Check if running in a browser with crypto support
    if (typeof window !== 'undefined' && window.crypto) {
      for (let offset = 0; offset < length; offset += CHUNK_SIZE) {
        const chunkLength = Math.min(CHUNK_SIZE, length - offset);
        const chunk = randomBytes.subarray(offset, offset + chunkLength);
        window.crypto.getRandomValues(chunk);
      }
    } else if (typeof crypto !== 'undefined') {
      // For environments where crypto is global (some newer JS runtimes)
      for (let offset = 0; offset < length; offset += CHUNK_SIZE) {
        const chunkLength = Math.min(CHUNK_SIZE, length - offset);
        const chunk = randomBytes.subarray(offset, offset + chunkLength);
        crypto.getRandomValues(chunk);
      }
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
