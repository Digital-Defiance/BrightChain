import { Member, type PlatformID } from '@digitaldefiance/ecies-lib';
import { BlockDataType } from './enumerations/blockDataType';
import { BlockSize } from './enumerations/blockSize';
import { BlockType } from './enumerations/blockType';
import { EphemeralBlockMetadata } from './ephemeralBlockMetadata';
import { ICBLBlockMetadata } from './interfaces/blocks/metadata/cblBlockMetadata';

export class CblBlockMetadata<TID extends PlatformID = Uint8Array>
  extends EphemeralBlockMetadata<TID>
  implements ICBLBlockMetadata<TID>
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
    creator: Member<TID>,
    dateCreated?: Date,
  ) {
    super(size, type, dataType, originalDataLength, creator, dateCreated);
    this._fileDataLength = fileDataLength;
  }
}
