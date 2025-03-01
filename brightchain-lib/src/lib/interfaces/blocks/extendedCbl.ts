import { IConstituentBlockListBlock } from './cbl';

/**
 * Interface for ExtendedCBL blocks that add file metadata to CBLs.
 * The block structure is:
 * [Base Block Header]
 * [Ephemeral Block Header]
 * [CBL Header]
 * [File Metadata Header]
 * [Block References]
 * [Padding]
 */
export interface IExtendedConstituentBlockListBlock
  extends IConstituentBlockListBlock {
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
