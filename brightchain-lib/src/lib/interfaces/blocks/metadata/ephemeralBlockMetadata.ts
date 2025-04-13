import { Member, type PlatformID } from '@digitaldefiance/ecies-lib';
import { IBaseBlockMetadata } from './blockMetadata';

export interface IEphemeralBlockMetadata<
  TID extends PlatformID = Uint8Array,
> extends IBaseBlockMetadata {
  /**
   * The creator of the block
   */
  get creator(): Member<TID>;
}
