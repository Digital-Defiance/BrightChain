import { BrightChainMember } from './brightChainMember';
import { ECIES } from './constants';
import BlockDataType from './enumerations/blockDataType';
import { BlockEncryptionType } from './enumerations/blockEncryptionType';
import BlockType from './enumerations/blockType';
import { BlockValidationErrorType } from './enumerations/blockValidationErrorType';
import { EphemeralBlockMetadata } from './ephemeralBlockMetadata';
import { BlockValidationError } from './errors/block';
import { GuidV4 } from '@digitaldefiance/ecies-lib';
import { IEncryptedBlockMetadata } from './interfaces/blocks/metadata/encryptedBlockMetadata';
import { ECIESService } from '@digitaldefiance/node-ecies-lib';

export class EncryptedBlockMetadata
  extends EphemeralBlockMetadata
  implements IEncryptedBlockMetadata
{
  private static readonly eciesService = new ECIESService();
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
    creator: BrightChainMember,
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
  public static fromEphemeralBlockMetadata(
    ephemeralBlockMetadata: EphemeralBlockMetadata,
    encryptionType: BlockEncryptionType,
    recipientCount: number,
  ): EncryptedBlockMetadata {
    return new EncryptedBlockMetadata(
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
  public static override fromJsonValidator(data: any): void {
    // Call parent validator first
    super.fromJsonValidator(data);

    // Then add our validation
    if (!data.encryptionType) {
      throw new BlockValidationError(
        BlockValidationErrorType.InvalidEncryptionType,
      );
    }
    if (!data.recipientCount) {
      throw new BlockValidationError(
        BlockValidationErrorType.InvalidRecipientCount,
      );
    }
  }

  public static override fromJsonAdditionalData<T extends Record<string, any>>(
    data: any,
    hydrateCreator: (id: GuidV4) => BrightChainMember,
  ): T {
    return {
      ...super.fromJsonAdditionalData(data, hydrateCreator),
      encryptionType: data.encryptionType as BlockEncryptionType,
      recipientCount: data.recipientCount,
    } as T;
  }

  public static override fromJson<
    B extends EncryptedBlockMetadata,
    T extends Record<string, any> = Record<string, never>,
  >(json: string): EncryptedBlockMetadata & T {
    return super.fromJson<
      B,
      { encryptionType: BlockEncryptionType; recipientCount: number } & T
    >(json) as B & T;
  }
}
