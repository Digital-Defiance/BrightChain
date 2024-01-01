import { BrightChainMember } from '../brightChainMember';
import { BaseBlock } from './base';
import { ConstituentBlockListBlock } from './cbl';

export class EncryptedConstituentBlockListBlock extends BaseBlock {
  public override decrypt(creator: BrightChainMember): BaseBlock {
    const result = super.decrypt(creator);
    const newCbl = ConstituentBlockListBlock.newFromPlaintextBuffer(result.data, result.blockSize);
    return newCbl;
  }
}