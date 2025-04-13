import { type PlatformID } from '@digitaldefiance/ecies-lib';
import { BlockEncryptionType } from '../../../enumerations/blockEncryptionType';
import { IEphemeralBlockMetadata } from './ephemeralBlockMetadata';

export interface IEncryptedBlockMetadata<
  TID extends PlatformID = Uint8Array,
> extends IEphemeralBlockMetadata<TID> {
  /**
   * The encryption type of the block
   */
  get encryptionType(): BlockEncryptionType;
  /**
   * The number of recipients of the block
   */
  get recipientCount(): number;
}
