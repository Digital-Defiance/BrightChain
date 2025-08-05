import { GuidV4 } from '../guid';

export interface IMultiEncryptedParsedHeader {
  /**
   * The length of the data before encryption
   */
  readonly dataLength: number;
  /**
   * The number of recipients
   */
  readonly recipientCount: number;
  /**
   * The IDs of the recipients
   */
  readonly recipientIds: GuidV4[];
  /**
   * An encrypted version of the symmetric key for each recipient
   */
  readonly recipientKeys: Buffer[];
  /**
   * The size of the header, up to the encrypted message start (excludes encrypted message IV+auth tag)
   */
  readonly headerSize: number;
}
