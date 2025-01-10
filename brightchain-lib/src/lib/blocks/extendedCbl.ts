import { IExtendedConstituentBlockListBlock } from '../interfaces/extendedCbl';
import { ConstituentBlockListBlock } from './cbl';

export class ExtendedCBL
  extends ConstituentBlockListBlock
  implements IExtendedConstituentBlockListBlock
{
  public get mimeType(): string {
    throw new Error('Method not implemented.');
  }
  public get fileName(): string {
    throw new Error('Method not implemented.');
  }
  public override get overhead(): number {
    throw new Error('Method not implemented.');
  }
}
