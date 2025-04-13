import { type PlatformID } from '@digitaldefiance/ecies-lib';
import { IEphemeralBlockMetadata } from './ephemeralBlockMetadata';

export interface ICBLBlockMetadata<
  TID extends PlatformID = Uint8Array,
> extends IEphemeralBlockMetadata<TID> {
  /**
   * The length of the file data across all blocks
   */
  get fileDataLength(): number;
}
