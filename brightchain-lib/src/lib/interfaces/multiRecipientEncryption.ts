import { GuidV4 } from '../guid';

export interface IMultiRecipientEncryption {
  encryptedMessage: Buffer;
  recipientIds: GuidV4[];
  encryptedKeys: Buffer[];
  originalMessageLength: number;
}
