/**
 * Result of a seal (encrypt + wrap key) operation.
 *
 * Uses Uint8Array for browser compatibility (Requirement 18.6).
 */
export interface ISealResults {
  encryptedData: Uint8Array;
  encryptedKey: Uint8Array;
}
