/**
 * Entry in the secure keyring storage
 *
 * @remarks
 * Each keyring entry represents an encrypted key or secret stored in the
 * keyring. The entry includes the encrypted data, initialization vector,
 * salt for key derivation, and access timestamps.
 *
 * @example
 * ```typescript
 * const entry: IKeyringEntry = {
 *   id: 'key-id-123',
 *   version: 1,
 *   encryptedData: new Uint8Array([...]),
 *   iv: new Uint8Array([...]),
 *   salt: new Uint8Array([...]),
 *   created: new Date(),
 *   lastAccessed: new Date()
 * };
 * ```
 */
export interface IKeyringEntry {
  /** Unique identifier for this keyring entry */
  id: string;

  /** Version number for the encryption scheme used */
  version: number;

  /** The encrypted key or secret data */
  encryptedData: Uint8Array;

  /** Initialization vector used for encryption */
  iv: Uint8Array;

  /** Salt used for key derivation */
  salt: Uint8Array;

  /** Timestamp when the entry was created */
  created: Date;

  /**
   * Timestamp when the entry was last accessed (optional)
   * @remarks Updated each time the key is retrieved from the keyring
   */
  lastAccessed?: Date;
}
