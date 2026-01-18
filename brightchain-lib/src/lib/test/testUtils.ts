import { randomBytes } from '../browserCrypto';
import { Checksum } from '../types/checksum';

export function generateRandomString(length: number): string {
  let result = '';
  const characters =
    'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
  const charactersLength = characters.length;
  for (let i = 0; i < length; i++) {
    result += characters.charAt(Math.floor(Math.random() * charactersLength));
  }
  return result;
}

/**
 * Generate a random Checksum for testing purposes.
 *
 * This function creates a cryptographically secure random checksum
 * of the correct length (64 bytes for SHA3-512).
 *
 * @returns A new Checksum instance with random data
 *
 * @example
 * ```typescript
 * const checksum = generateRandomChecksum();
 * console.log(checksum.toHex());
 * ```
 *
 * @see Requirement 5.3
 */
export function generateRandomChecksum(): Checksum {
  const data = randomBytes(64); // SHA3-512 produces 64 bytes
  return Checksum.fromUint8Array(new Uint8Array(data));
}
