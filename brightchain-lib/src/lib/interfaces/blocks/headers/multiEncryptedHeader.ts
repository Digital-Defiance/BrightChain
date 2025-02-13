import { GuidV4 } from '../../../guid';

export interface IMultiEncryptedBlockHeader {
  /**
   * The initialization vector for the symmetric encryption
   */
  get iv(): Buffer;
  /**
   * The authentication tag for the symmetric encryption
   */
  get authTag(): Buffer;
  /**
   * The encrypted data length
   */
  get dataLength(): number;
  /**
   * The recipient count
   */
  get recipientCount(): number;
  /**
   * The recipient ids
   */
  get recipientIds(): GuidV4[];
  /**
   * The recipient keys
   */
  get recipientKeys(): Buffer[];
  /**
   * The header size
   */
  get headerSize(): number;
}
