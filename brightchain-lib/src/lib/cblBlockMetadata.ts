import { BrightChainMember } from './brightChainMember';
import { BlockDataType } from './enumerations/blockDataType';
import { BlockSize } from './enumerations/blockSize';
import { BlockType } from './enumerations/blockType';
import { EphemeralBlockMetadata } from './ephemeralBlockMetadata';
import { ICBLBlockMetadata } from './interfaces/blocks/metadata/cblBlockMetadata';

export class CblBlockMetadata
  extends EphemeralBlockMetadata
  implements ICBLBlockMetadata
{
  private readonly _fileDataLength: number;
  public get fileDataLength(): number {
    return this._fileDataLength;
  }
  constructor(
    size: BlockSize,
    type: BlockType,
    dataType: BlockDataType,
    originalDataLength: number,
    fileDataLength: number,
    creator: BrightChainMember,
    dateCreated?: Date,
  ) {
    super(
      size,
      type,
      dataType,
      originalDataLength,
      false,
      creator,
      dateCreated,
    );
    this._fileDataLength = fileDataLength;
  }
}
