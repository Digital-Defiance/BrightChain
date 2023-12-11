import { PlatformID } from '@digitaldefiance/ecies-lib';
import { MessageEncryptionScheme } from '../../../enumerations/messaging/messageEncryptionScheme';
import { MessagePriority } from '../../../enumerations/messaging/messagePriority';
import { IConstituentBlockListBlockHeader } from './cblHeader';

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
