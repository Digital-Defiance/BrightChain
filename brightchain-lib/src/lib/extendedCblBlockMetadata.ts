import { BrightChainMember } from './brightChainMember';
import { CblBlockMetadata } from './cblBlockMetadata';
import BlockDataType from './enumerations/blockDataType';
import { BlockSize } from './enumerations/blockSizes';
import BlockType from './enumerations/blockType';
import { GuidV4 } from './guid';
import { IExtendedCblBlockMetadata } from './interfaces/extendedCblBlockMetadata';

export class ExtendedCblBlockMetadata
  extends CblBlockMetadata
  implements IExtendedCblBlockMetadata
{
  private readonly _fileName: string;
  private readonly _mimeType: string;
  public get fileName(): string {
    return this._fileName;
  }
  public get mimeType(): string {
    return this._mimeType;
  }
  constructor(
    size: BlockSize,
    lengthWithoutPadding: number,
    fileDataLength: bigint,
    fileName: string,
    mimeType: string,
    dateCreated?: Date,
    creator?: BrightChainMember | GuidV4,
  ) {
    super(
      size,
      BlockType.ExtendedConstituentBlockListBlock,
      BlockDataType.EphemeralStructuredData,
      lengthWithoutPadding,
      fileDataLength,
      dateCreated,
      creator,
    );
    this._fileName = fileName;
    this._mimeType = mimeType;
  }
  public static override fromInterface(
    metadata: IExtendedCblBlockMetadata,
  ): ExtendedCblBlockMetadata {
    return new ExtendedCblBlockMetadata(
      metadata.size,
      metadata.lengthWithoutPadding,
      metadata.fileDataLength,
      metadata.fileName,
      metadata.mimeType,
      metadata.dateCreated,
      metadata.creator,
    );
  }
}
