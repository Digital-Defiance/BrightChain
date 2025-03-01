import { BlockMetadata } from './blockMetadata';
import { BrightChainMember } from './brightChainMember';
import { BlockDataType } from './enumerations/blockDataType';
import { BlockSize } from './enumerations/blockSizes';
import { BlockType } from './enumerations/blockType';
import { IEphemeralBlockMetadata } from './interfaces/blocks/metadata/ephemeralBlockMetadata';

export class EphemeralBlockMetadata
  extends BlockMetadata
  implements IEphemeralBlockMetadata
{
  private readonly _encrypted: boolean;
  private readonly _creator: BrightChainMember;
  constructor(
    size: BlockSize,
    type: BlockType,
    dataType: BlockDataType,
    lengthWithoutPadding: number,
    encrypted: boolean,
    creator: BrightChainMember,
    dateCreated?: Date,
  ) {
    super(size, type, dataType, lengthWithoutPadding, dateCreated);
    this._encrypted = encrypted;
    this._creator = creator;
  }
  public get encrypted(): boolean {
    return this._encrypted;
  }
  public get creator(): BrightChainMember {
    return this._creator;
  }
  public static override fromInterface(
    metadata: IEphemeralBlockMetadata,
  ): EphemeralBlockMetadata {
    return new EphemeralBlockMetadata(
      metadata.size,
      metadata.type,
      metadata.dataType,
      metadata.lengthWithoutPadding,
      metadata.encrypted,
      metadata.creator,
      metadata.dateCreated,
    );
  }
}
