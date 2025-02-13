import { BrightChainMember } from './brightChainMember';
import { ECIES } from './constants';
import BlockDataType from './enumerations/blockDataType';
import BlockType from './enumerations/blockType';
import { EphemeralBlockMetadata } from './ephemeralBlockMetadata';
import { IEncryptedBlockMetadata } from './interfaces/blocks/metadata/encryptedBlockMetadata';
import { ECIESService } from './services/ecies.service';

export class EncryptedBlockMetadata
  extends EphemeralBlockMetadata
  implements IEncryptedBlockMetadata
{
  private static readonly eciesService = new ECIESService();
  private _recipientCount?: number;

  public get encryptedLength(): number {
    return this.lengthWithoutPadding + ECIES.OVERHEAD_SIZE;
  }

  public get recipientCount(): number | undefined {
    return this._recipientCount;
  }

  public set recipientCount(value: number | undefined) {
    this._recipientCount = value;
  }
  constructor(
    size: number,
    type: BlockType,
    dataType: BlockDataType,
    lengthWithoutPadding: number,
    creator: BrightChainMember,
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
