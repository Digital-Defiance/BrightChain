import { EciesEncryptionTypeEnum } from '@brightchain/brightchain-lib';

/**
 * Interface for encrypted messages
 */
export interface ISingleEncryptedParsedHeader {
  /**
   * The optional preamble, if specified/relevant
   */
  readonly preamble?: Buffer;
  /**
   * The encryption type used to encrypt the data
   */
  readonly encryptionType: EciesEncryptionTypeEnum;
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
   * The size of the encrypted data header
   */
  readonly headerSize: number;
}
