import { BrightChainMember } from '../brightChainMember';
import { BlockDataType } from '../enumerations/blockDataType';
import { BlockSize } from '../enumerations/blockSizes';
import { ChecksumBuffer } from '../types';
import { BaseBlock } from './base';
import { ConstituentBlockListBlock } from './cbl';

export class EncryptedConstituentBlockListBlock extends BaseBlock {
  constructor(
    blockSize: BlockSize,
    data: Buffer,
    lengthBeforeEncryption: number,
    dateCreated?: Date,
    checksum?: ChecksumBuffer
  ) {
    super(
      blockSize,
      data,
      BlockDataType.EncryptedData,
      lengthBeforeEncryption,
      dateCreated,
      checksum
    );
  }
  public override decrypt(creator: BrightChainMember): BaseBlock {
    const result = super.decrypt(creator);
    return ConstituentBlockListBlock.newFromPlaintextBuffer(
      result.data,
      result.blockSize
    );
  }
}
