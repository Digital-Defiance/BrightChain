import { BrightChainMember } from '../../../brightChainMember';
import { IBaseBlockMetadata } from './blockMetadata';

export interface IEphemeralBlockMetadata extends IBaseBlockMetadata {
  /**
   * Whether the data is encrypted
   */
  get encrypted(): boolean;
  /**
   * The creator of the block
   */
  get creator(): BrightChainMember;
}
