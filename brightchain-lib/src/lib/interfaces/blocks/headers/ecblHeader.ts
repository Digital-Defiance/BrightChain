import { IConstituentBlockListBlockHeader } from './cblHeader';

export interface IExtendedConstituentBlockListBlockHeader
  extends IConstituentBlockListBlockHeader {
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
