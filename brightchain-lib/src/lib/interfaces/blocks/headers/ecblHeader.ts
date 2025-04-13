import { PlatformID } from '@digitaldefiance/ecies-lib';
import { IConstituentBlockListBlockHeader } from './cblHeader';

export interface IExtendedConstituentBlockListBlockHeader<
  TID extends PlatformID = Uint8Array,
> extends IConstituentBlockListBlockHeader<TID> {
  /**
   * Length of the file name
   */
  readonly fileNameLength: number;
  /**
   * Original file name from source system
   */
  readonly fileName: string;
  /**
   * File content MIME type
   */
  readonly mimeType: string;
  /**
   * Length of the MIME type
   */
  readonly mimeTypeLength: number;
}
