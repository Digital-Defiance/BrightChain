/**
 * Interface for encrypted messages
 */
export interface ISingleEncryptedParsedHeader {
  /**
   * The optional preamble, if specified/relevant
   */
  readonly preamble?: Buffer;
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
   * The length of the encrypted data
   */
  readonly dataLength: number;
  /**
   * The crc16 checksum of the header and encrypted data
   */
  readonly crc16: Buffer;
  /**
   * The size of the encrypted data header
   */
  readonly headerSize: number;
}
