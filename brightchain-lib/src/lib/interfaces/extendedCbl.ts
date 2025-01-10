import { IConstituentBlockListBlock } from './cbl';

export interface IExtendedConstituentBlockListBlock
  extends IConstituentBlockListBlock {
  get fileName(): string;
  get mimeType(): string;
}
