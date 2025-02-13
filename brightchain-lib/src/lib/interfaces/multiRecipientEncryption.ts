import { GuidV4 } from '../guid';

export interface IMultiRecipientEncryption {
  /**
   * The recipient IDs.
   */
  recipientIds: GuidV4[];
  /**
   * The encrypted keys for each recipient, corresponding to the recipient IDs.
   */
  encryptedKeys: Buffer[];
  /**
   * The length of the original message before encryption.
   */
  originalMessageLength: number;
  /**
   * The encrypted message.
   */
  encryptedMessage: Buffer;
}
