import { PlatformID } from '@digitaldefiance/ecies-lib';
import { ICBLBlockMetadata } from './cblBlockMetadata';

export interface IExtendedCblBlockMetadata<
  TID extends PlatformID = Uint8Array,
> extends ICBLBlockMetadata<TID> {
  /**
   * Original file name from source system
   */
  fileName: string;

  /**
   * File content MIME type
   */
  mimeType: string;
}
