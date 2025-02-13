import { BrightChainMember } from '../brightChainMember';
import { GuidV4 } from '../guid';
import { IBlockMetadata } from './blockMetadata';

export interface IEphemeralBlockMetadata extends IBlockMetadata {
  /**
   * Whether the data is encrypted
   */
  get encrypted(): boolean;
  /**
   * The creator of the block
   */
  get creator(): BrightChainMember | GuidV4;
}
