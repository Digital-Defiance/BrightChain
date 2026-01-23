import { ECIES, Member, type PlatformID } from '@digitaldefiance/ecies-lib';
import { createECIESService } from './browserConfig';
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
  private static readonly eciesService = createECIESService();
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
  public static override fromJsonValidator(data: unknown): void {
    // Call parent validator first
    super.fromJsonValidator(data);

    // Then add our validation
    const typedData = data as Record<string, unknown>;
    if (!typedData['encryptionType']) {
      throw new BlockValidationError(
        BlockValidationErrorType.InvalidEncryptionType,
      );
    }
    if (!typedData['recipientCount']) {
      throw new BlockValidationError(
        BlockValidationErrorType.InvalidRecipientCount,
      );
    }
  }

  public static override fromJsonAdditionalData<
    T extends Record<string, unknown>,
  >(data: unknown): T {
    const typedData = data as Record<string, unknown>;
    return {
      ...super.fromJsonAdditionalData(data),
      encryptionType: typedData['encryptionType'] as BlockEncryptionType,
      recipientCount: typedData['recipientCount'],
    } as T;
  }

  public static override fromJson<
    B extends EncryptedBlockMetadata,
    T extends Record<string, unknown> = Record<string, never>,
    TID extends PlatformID = Uint8Array,
  >(json: string): EncryptedBlockMetadata & T {
    return super.fromJson<
      B,
      { encryptionType: BlockEncryptionType; recipientCount: number } & T,
      TID
    >(json) as B & T;
  }
}
