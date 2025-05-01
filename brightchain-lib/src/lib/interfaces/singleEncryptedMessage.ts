import { ISingleEncryptedParsedHeader } from './singleEncryptedParsedHeader';

export interface ISingleEncryptedMessage extends ISingleEncryptedParsedHeader {
  /**
   * The encrypted message.
   */
  readonly encryptedMessage: Buffer;
}
