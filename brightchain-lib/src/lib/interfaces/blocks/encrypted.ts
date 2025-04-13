import {
  IMultiEncryptedParsedHeader,
  ISingleEncryptedParsedHeader,
  Member,
  type PlatformID,
} from '@digitaldefiance/ecies-lib';
import { BlockEncryptionType } from '../../enumerations/blockEncryptionType';
import { IEphemeralBlock } from './ephemeral';

export interface IEncryptedBlock<
  TID extends PlatformID = Uint8Array,
> extends IEphemeralBlock<TID> {
  /**
   * The type of encryption used for the block
   */
  get encryptionType(): BlockEncryptionType;
  /**
   * The recipients of the block
   */
  get recipients(): TID[];
  /**
   * The recipient with private key that will be used to decrypt the block
   */
  get recipientWithKey(): Member<TID>;
  /**
   * The details of the encryption used for the block
   */
  get encryptionDetails():
    | ISingleEncryptedParsedHeader
    | IMultiEncryptedParsedHeader<TID>;
}
