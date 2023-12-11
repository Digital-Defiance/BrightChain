/**
 * BreachDetector - Check passwords against Have I Been Pwned database
 *
 * Uses k-anonymity model: only sends first 5 chars of SHA-1 hash to API.
 * This ensures the full password hash is never transmitted, protecting user privacy.
 *
 * Works in both browser and Node.js environments using:
 * - Platform-agnostic SHA-1 hashing via @noble/hashes
 * - Native fetch API (available in modern browsers and Node.js 18+)
 *
 * @module breachDetector
 * @see Requirements 3.1, 3.2, 3.3, 3.4, 3.5
 */

import { sha1Hash } from '../../crypto/platformCrypto';

/**
 * Result of a breach check operation.
 *
 * @see Requirement 3.4
 */
export interface BreachCheckResult {
  /** Whether the password was found in breach databases */
  breached: boolean;
  /** Number of times the password appeared in breaches (0 if not breached) */
  count: number;
  /** Whether the HIBP API was reachable */
  serviceAvailable: boolean;
}

/**
 * BreachDetector - Check passwords against Have I Been Pwned database
 *
 * Uses k-anonymity model: only sends first 5 chars of SHA-1 hash to API.
 * This ensures the full password hash is never transmitted, protecting user privacy.
 *
 * @see Requirements 3.1, 3.2, 3.3, 3.4, 3.5
 *
 * @example
 * ```typescript
 * const result = await BreachDetector.check('password123');
 * if (result.breached) {
 *   console.log(`Password found in ${result.count} breaches!`);
 * } else if (!result.serviceAvailable) {
 *   console.log('Could not check - HIBP service unavailable');
 * } else {
 *   console.log('Password not found in known breaches');
 * }
 * ```
 */
export class BreachDetector {
  private static readonly HIBP_API_URL =
    'https://api.pwnedpasswords.com/range/';

  /**
   * Check if a password has been exposed in known data breaches.
   *
   * Uses the Have I Been Pwned Passwords API with k-anonymity:
   * - Computes SHA-1 hash of the password
   * - Sends only the first 5 characters of the hash to the API
   * - Compares the remaining hash suffix locally against returned results
   *
   * @param password - The password to check
   * @returns Promise resolving to breach check result
   *
   * @see Requirement 3.1 - k-anonymity (only first 5 chars of SHA-1 sent)
   * @see Requirement 3.2 - Uses Fetch API in browser
   * @see Requirement 3.3 - Uses native fetch in Node.js 18+
   * @see Requirement 3.4 - Returns breach status, count, and service availability
   * @see Requirement 3.5 - Returns serviceAvailable: false on API errors
   */
  public static async check(password: string): Promise<BreachCheckResult> {
    // Hash password with SHA-1 using platform-agnostic implementation
    // sha1Hash returns uppercase hex string
    const hash = sha1Hash(password);

    // Split into prefix (5 chars) and suffix for k-anonymity
    // Only the prefix is sent to the API
    const prefix = hash.substring(0, 5);
    const suffix = hash.substring(5);

    try {
      // Query HIBP API with only the prefix (k-anonymity)
      // Uses native fetch which works in both browser and Node.js 18+
      const response = await fetch(`${this.HIBP_API_URL}${prefix}`, {
        headers: {
          'User-Agent': 'BrightChain-PasswordManager',
        },
      });

      if (!response.ok) {
        // API returned an error status
        return { breached: false, count: 0, serviceAvailable: false };
      }

      const text = await response.text();

      // Parse response: each line is "SUFFIX:COUNT"
      // The API returns all hash suffixes that match the prefix
      const lines = text.split('\n');
      for (const line of lines) {
        const [hashSuffix, countStr] = line.split(':');
        if (hashSuffix === suffix) {
          return {
            breached: true,
            count: parseInt(countStr, 10),
            serviceAvailable: true,
          };
        }
      }

      // Password hash suffix not found in breach database
      return { breached: false, count: 0, serviceAvailable: true };
    } catch {
      // API unreachable - network error, timeout, etc.
      // Return gracefully without throwing
      return { breached: false, count: 0, serviceAvailable: false };
    }
  }
}
