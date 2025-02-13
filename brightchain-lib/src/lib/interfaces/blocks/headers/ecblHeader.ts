import { IConstituentBlockListBlockHeader } from './cblHeader';

export interface IExtendedConstituentBlockListBlockHeader
  extends IConstituentBlockListBlockHeader {
  /**
   * Length of the file name
   */
  get fileNameLength(): number;
  /**
   * Original file name from source system
   */
  get fileName(): string;
  /**
   * File content MIME type
   */
  get mimeType(): string;
  /**
   * Length of the MIME type
   */
  get mimeTypeLength(): number;
}
