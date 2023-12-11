/**
 * Result of symmetric encryption operation
 *
 * @remarks
 * This interface contains both the encrypted data and the encryption key
 * used for the operation. The key must be securely stored or transmitted
 * to allow decryption.
 *
 * Uses Uint8Array for browser compatibility (Requirement 18.6).
 *
 * @example
 * ```typescript
 * const result: ISymmetricEncryptionResults = {
 *   encryptedData: new Uint8Array([...]),
 *   key: new Uint8Array([...])
 * };
 * ```
 */
export interface ISymmetricEncryptionResults {
  /** The encrypted data */
  encryptedData: Uint8Array;

  /** The symmetric encryption key used for this operation */
  key: Uint8Array;
}
