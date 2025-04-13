import { BrightChainMember } from '../../../brightChainMember';
import { IBaseBlockMetadata } from './blockMetadata';

export interface IEphemeralBlockMetadata extends IBaseBlockMetadata {
  /**
   * The creator of the block
   */
  get creator(): BrightChainMember;
}
