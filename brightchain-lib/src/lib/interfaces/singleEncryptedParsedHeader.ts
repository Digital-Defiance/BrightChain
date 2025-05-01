/**
 * Interface for encrypted messages
 */
export interface ISingleEncryptedParsedHeader {
  /**
   * The ephemeral public key used to encrypt the data
   */
  readonly ephemeralPublicKey: Buffer;
  /**
   * The initialization vector used to encrypt the data
   */
  readonly iv: Buffer;
  /**
   * The authentication tag used to encrypt the data
   */
  readonly authTag: Buffer;
  /**
   * The size of the encrypted data header
   */
  readonly headerSize: number;
}
