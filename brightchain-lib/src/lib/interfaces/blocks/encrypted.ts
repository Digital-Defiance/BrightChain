import { BrightChainMember } from '../../brightChainMember';
import { BlockEncryptionType } from '../../enumerations/blockEncryptionType';
import { GuidV4 } from '@digitaldefiance/ecies-lib';
import { IMultiEncryptedParsedHeader } from '../multiEncryptedParsedHeader';
import { ISingleEncryptedParsedHeader } from '../singleEncryptedParsedHeader';
import { IEphemeralBlock } from './ephemeral';

export interface IEncryptedBlock extends IEphemeralBlock {
  /**
   * The type of encryption used for the block
   */
  get encryptionType(): BlockEncryptionType;
  /**
   * The recipients of the block
   */
  get recipients(): GuidV4[];
  /**
   * The recipient with private key that will be used to decrypt the block
   */
  get recipientWithKey(): BrightChainMember;
  /**
   * The details of the encryption used for the block
   */
  get encryptionDetails():
    | ISingleEncryptedParsedHeader
    | IMultiEncryptedParsedHeader;
}
