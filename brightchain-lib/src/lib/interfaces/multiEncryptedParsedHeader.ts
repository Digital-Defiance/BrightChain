import { GuidV4 } from '../guid';

export interface IMultiEncryptedParsedHeader {
  readonly iv: Buffer;
  readonly authTag: Buffer;
  readonly dataLength: number;
  readonly recipientCount: number;
  readonly recipientIds: GuidV4[];
  readonly recipientKeys: Buffer[];
  readonly headerSize: number;
}
