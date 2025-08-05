import { IMultiEncryptedParsedHeader } from './multiEncryptedParsedHeader';

export interface IMultiEncryptedMessage extends IMultiEncryptedParsedHeader {
  /**
   * The encrypted message.
   */
  readonly encryptedMessage: Buffer;
}
