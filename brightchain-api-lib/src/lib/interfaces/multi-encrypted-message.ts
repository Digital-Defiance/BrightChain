import { IMultiEncryptedParsedHeader } from './multi-encrypted-parsed-header';

export interface IMultiEncryptedMessage extends IMultiEncryptedParsedHeader {
  /**
   * The encrypted message.
   */
  readonly encryptedMessage: Buffer;
}
