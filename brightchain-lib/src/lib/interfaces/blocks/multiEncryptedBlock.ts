import { BrightChainMember } from '../../brightChainMember';
import { IEphemeralBlock } from './ephemeral';
import { IMultiEncryptedBlockHeader } from './headers/multiEncryptedHeader';

export interface IMultiEncryptedBlock
  extends IEphemeralBlock,
    IMultiEncryptedBlockHeader {
  /**
   * The recipients of the block
   */
  get recipients(): BrightChainMember[];
  /**
   * The encrypted data of the block
   */
  get encryptedData(): Buffer;
}
