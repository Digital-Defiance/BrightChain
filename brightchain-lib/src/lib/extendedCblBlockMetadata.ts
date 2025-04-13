import { Member, PlatformID } from '@digitaldefiance/ecies-lib';
import { CblBlockMetadata } from './cblBlockMetadata';
import BlockDataType from './enumerations/blockDataType';
import { BlockSize } from './enumerations/blockSize';
import BlockType from './enumerations/blockType';
import { IExtendedCblBlockMetadata } from './interfaces/blocks/metadata/extendedCblBlockMetadata';

export class ExtendedCblBlockMetadata<TID extends PlatformID = Uint8Array>
  extends CblBlockMetadata<TID>
  implements IExtendedCblBlockMetadata<TID>
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
    fileDataLength: number,
    fileName: string,
    mimeType: string,
    creator: Member<TID>,
    dateCreated?: Date,
  ) {
    super(
      size,
      BlockType.ExtendedConstituentBlockListBlock,
      BlockDataType.EphemeralStructuredData,
      lengthWithoutPadding,
      fileDataLength,
      creator,
      dateCreated,
    );
    this._fileName = fileName;
    this._mimeType = mimeType;
  }

  public static fromInterface<TID extends PlatformID = Uint8Array>(
    metadata: IExtendedCblBlockMetadata<TID>,
  ): ExtendedCblBlockMetadata<TID> {
    return new ExtendedCblBlockMetadata<TID>(
      metadata.size,
      metadata.lengthWithoutPadding,
      metadata.fileDataLength,
      metadata.fileName,
      metadata.mimeType,
      metadata.creator,
      metadata.dateCreated,
    );
  }
}
