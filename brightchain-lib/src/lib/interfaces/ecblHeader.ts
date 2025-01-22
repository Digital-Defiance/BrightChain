import { IConstituentBlockListBlockHeader } from './cblHeader';

export interface IExtendedConstituentBlockListBlockHeader
  extends IConstituentBlockListBlockHeader {
  fileNameLength: number;
  fileName: string;
  mimeTypeLength: number;
  mimeType: string;
}
