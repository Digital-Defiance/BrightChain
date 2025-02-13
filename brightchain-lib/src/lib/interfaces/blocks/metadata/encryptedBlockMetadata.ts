import { BlockEncryptionType } from '../../../enumerations/blockEncryptionType';
import { IEphemeralBlockMetadata } from './ephemeralBlockMetadata';

export interface IEncryptedBlockMetadata extends IEphemeralBlockMetadata {
  /**
   * The encryption type of the block
   */
  get encryptionType(): BlockEncryptionType;
  /**
   * The number of recipients of the block
   */
  get recipientCount(): number;
}
