import { BlockMetadata } from './blockMetadata';
import { BrightChainMember } from './brightChainMember';
import { BlockDataType } from './enumerations/blockDataType';
import { BlockSize } from './enumerations/blockSizes';
import { BlockType } from './enumerations/blockType';
import { GuidV4 } from './guid';
import { IEphemeralBlockMetadata } from './interfaces/ephemeralBlockMetadata';

export class EphemeralBlockMetadata
  extends BlockMetadata
  implements IEphemeralBlockMetadata
{
  private readonly _encrypted: boolean;
  private readonly _creator: BrightChainMember | GuidV4;
  constructor(
    size: BlockSize,
    type: BlockType,
    dataType: BlockDataType,
    lengthWithoutPadding: number,
    encrypted: boolean,
    creator: BrightChainMember | GuidV4,
    dateCreated?: Date,
  ) {
    super(size, type, dataType, lengthWithoutPadding, dateCreated);
    this._encrypted = encrypted;
    this._creator = creator;
  }
  public get encrypted(): boolean {
    return this._encrypted;
  }
  public get creator(): BrightChainMember | GuidV4 {
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
