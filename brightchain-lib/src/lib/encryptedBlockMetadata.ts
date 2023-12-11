import {
  ECIES,
  Member,
  uint8ArrayToHex,
  type ECIESService,
  type PlatformID,
} from '@digitaldefiance/ecies-lib';
import BlockDataType from './enumerations/blockDataType';
import { BlockEncryptionType } from './enumerations/blockEncryptionType';
import BlockType from './enumerations/blockType';
import { BlockValidationErrorType } from './enumerations/blockValidationErrorType';
import { EphemeralBlockMetadata } from './ephemeralBlockMetadata';
import { BlockValidationError } from './errors/block';
import { IEncryptedBlockMetadata } from './interfaces/blocks/metadata/encryptedBlockMetadata';

export class EncryptedBlockMetadata<TID extends PlatformID = Uint8Array>
  extends EphemeralBlockMetadata<TID>
  implements IEncryptedBlockMetadata<TID>
{
  private readonly _recipientCount: number;
  private readonly _encryptionType: BlockEncryptionType;

  public get encryptionType(): BlockEncryptionType {
    return this._encryptionType;
  }

  public get recipientCount(): number {
    return this._recipientCount;
  }

  constructor(
    size: number,
    type: BlockType,
    dataType: BlockDataType,
    lengthWithoutPadding: number,
    creator: Member<TID>,
    encryptionType: BlockEncryptionType,
    recipientCount: number,
    dateCreated?: Date,
  ) {
    if (encryptionType === BlockEncryptionType.None) {
      throw new BlockValidationError(
        BlockValidationErrorType.InvalidEncryptionType,
      );
    } else if (
      encryptionType === BlockEncryptionType.SingleRecipient &&
      recipientCount !== 1
    ) {
      throw new BlockValidationError(
        BlockValidationErrorType.InvalidRecipientCount,
      );
    } else if (
      encryptionType === BlockEncryptionType.MultiRecipient &&
      (recipientCount < 2 || recipientCount > ECIES.MULTIPLE.MAX_RECIPIENTS)
    ) {
      throw new BlockValidationError(
        BlockValidationErrorType.InvalidRecipientCount,
      );
    }
    super(size, type, dataType, lengthWithoutPadding, creator, dateCreated);
    this._encryptionType = encryptionType;
    this._recipientCount =
      encryptionType === BlockEncryptionType.SingleRecipient
        ? 1
        : recipientCount;
  }
  public static fromEphemeralBlockMetadata<TID extends PlatformID = Uint8Array>(
    ephemeralBlockMetadata: EphemeralBlockMetadata<TID>,
    encryptionType: BlockEncryptionType,
    recipientCount: number,
  ): EncryptedBlockMetadata<TID> {
    return new EncryptedBlockMetadata<TID>(
      ephemeralBlockMetadata.size,
      ephemeralBlockMetadata.type,
      ephemeralBlockMetadata.dataType,
      ephemeralBlockMetadata.lengthWithoutPadding,
      ephemeralBlockMetadata.creator,
      encryptionType,
      recipientCount,
      ephemeralBlockMetadata.dateCreated,
    );
  }

  public override toJson(): string {
    return JSON.stringify({
      size: this.size,
      type: this.type,
      dataType: this.dataType,
      lengthWithoutPadding: this.lengthWithoutPadding,
      dateCreated: this.dateCreated.toISOString(),
      creator: uint8ArrayToHex(this.creator.idBytes),
      encryptionType: this.encryptionType,
      recipientCount: this.recipientCount,
    });
  }

  /**
   * Parse encrypted metadata from JSON representation.
   * Note: This is a simplified implementation that doesn't fully deserialize
   * encrypted metadata. For full deserialization, additional fields would be needed.
   *
   * @param json - JSON string containing metadata
   * @param eciesService - Optional ECIES service for Member deserialization
   * @returns Parsed EncryptedBlockMetadata instance
   * @throws JsonValidationError if JSON is invalid or required fields are missing/invalid
   */
  public static override fromJson<TID extends PlatformID = Uint8Array>(
    json: string,
    eciesService?: ECIESService<TID>,
  ): EncryptedBlockMetadata<TID> {
    // Parse the JSON to get the data
    const parsed = JSON.parse(json);

    // Parse using parent's fromJson to get the ephemeral metadata
    const ephemeralData = super.fromJson<TID>(json, eciesService);

    // Extract encrypted-specific fields
    const encryptionType = parsed.encryptionType as BlockEncryptionType;
    const recipientCount = parsed.recipientCount as number;

    // Create a proper EncryptedBlockMetadata instance
    return new EncryptedBlockMetadata<TID>(
      ephemeralData.size,
      ephemeralData.type,
      ephemeralData.dataType,
      ephemeralData.lengthWithoutPadding,
      ephemeralData.creator,
      encryptionType,
      recipientCount,
      ephemeralData.dateCreated,
    );
  }
}
