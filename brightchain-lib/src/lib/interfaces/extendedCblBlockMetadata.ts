import { ICBLBlockMetadata } from './cblBlockMetadata';

export interface IExtendedCblBlockMetadata extends ICBLBlockMetadata {
  /**
   * Original file name from source system
   */
  fileName: string;

  /**
   * File content MIME type
   */
  mimeType: string;
}
