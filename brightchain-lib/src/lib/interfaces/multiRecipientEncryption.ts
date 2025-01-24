import { GuidV4 } from '../guid';

export interface MultiRecipientEncryption {
  encryptedMessage: Buffer;
  recipientIds: GuidV4[];
  encryptedKeys: Buffer[];
  originalMessageLength: number;
}
