import { PlatformID } from '@digitaldefiance/ecies-lib';
import { IConstituentBlockListBlockHeader } from './cblHeader';
import { MessageEncryptionScheme } from '../../../enumerations/messaging/messageEncryptionScheme';
import { MessagePriority } from '../../../enumerations/messaging/messagePriority';

export interface IMessageConstituentBlockListBlockHeader<
  TID extends PlatformID = Uint8Array,
> extends IConstituentBlockListBlockHeader<TID> {
  readonly isMessage: true;
  readonly messageType: string;
  readonly senderId: string;
  readonly recipients: string[];
  readonly priority: MessagePriority;
  readonly encryptionScheme: MessageEncryptionScheme;
}
