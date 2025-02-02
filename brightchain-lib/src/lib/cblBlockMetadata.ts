import { BrightChainMember } from './brightChainMember';
import { BlockSize } from './enumerations/blockSizes';
import { EphemeralBlockMetadata } from './ephemeralBlockMetadata';
import { GuidV4 } from './guid';
import { ICBLBlockMetadata } from './interfaces/cblBlockMetadata';

export class CblBlockMetadata
  extends EphemeralBlockMetadata
  implements ICBLBlockMetadata
{
  private readonly _fileDataLength: bigint;
  public get fileDataLength(): bigint {
    return this._fileDataLength;
  }
  constructor(
    size: BlockSize,
    type: number,
    dataType: number,
    originalDataLength: number,
    fileDataLength: bigint,
    dateCreated?: Date,
    creator?: BrightChainMember | GuidV4,
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
