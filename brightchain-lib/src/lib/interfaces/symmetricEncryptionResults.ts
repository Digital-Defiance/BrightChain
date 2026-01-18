/**
 * Result of symmetric encryption operation
 *
 * @remarks
 * This interface contains both the encrypted data and the encryption key
 * used for the operation. The key must be securely stored or transmitted
 * to allow decryption.
 *
 * @example
 * ```typescript
 * const result: ISymmetricEncryptionResults = {
 *   encryptedData: Buffer.from('...'),
 *   key: Buffer.from('...')
 * };
 * ```
 */
export interface ISymmetricEncryptionResults {
  /** The encrypted data as a Buffer */
  encryptedData: Buffer;

  /** The symmetric encryption key used for this operation */
  key: Buffer;
}
