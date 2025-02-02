import { BrightChainMember } from './brightChainMember';
import BlockDataType from './enumerations/blockDataType';
import BlockType from './enumerations/blockType';
import { EphemeralBlockMetadata } from './ephemeralBlockMetadata';
import { GuidV4 } from './guid';
import { IEncryptedBlockMetadata } from './interfaces/encryptedBlockMetadata';
import { StaticHelpersECIES } from './staticHelpers.ECIES';

export class EncryptedBlockMetadata
  extends EphemeralBlockMetadata
  implements IEncryptedBlockMetadata
{
  public get encryptedLength(): number {
    return this.lengthWithoutPadding + StaticHelpersECIES.eciesOverheadLength;
  }
  constructor(
    size: number,
    type: BlockType,
    dataType: BlockDataType,
    lengthWithoutPadding: number,
    creator?: BrightChainMember | GuidV4,
    dateCreated?: Date,
  ) {
    super(
      size,
      type,
      dataType,
      lengthWithoutPadding,
      true,
      creator,
      dateCreated,
    );
  }
  public static fromEphemeralBlockMetadata(
    ephemeralBlockMetadata: EphemeralBlockMetadata,
  ): EncryptedBlockMetadata {
    return new EncryptedBlockMetadata(
      ephemeralBlockMetadata.size,
      ephemeralBlockMetadata.type,
      ephemeralBlockMetadata.dataType,
      ephemeralBlockMetadata.lengthWithoutPadding,
      ephemeralBlockMetadata.creator,
      ephemeralBlockMetadata.dateCreated,
    );
  }
  public static override fromInterface(
    metadata: IEncryptedBlockMetadata,
  ): EncryptedBlockMetadata {
    return new EncryptedBlockMetadata(
      metadata.size,
      metadata.type,
      metadata.dataType,
      metadata.lengthWithoutPadding,
      metadata.creator,
      metadata.dateCreated,
    );
  }
}
