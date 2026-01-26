import {
  Member,
  type ECIESService,
  type PlatformID,
} from '@digitaldefiance/ecies-lib';
import { BlockMetadata } from './blockMetadata';
import { BlockDataType } from './enumerations/blockDataType';
import { BlockSize } from './enumerations/blockSize';
import { BlockType } from './enumerations/blockType';
import { IEphemeralBlockMetadata } from './interfaces/blocks/metadata/ephemeralBlockMetadata';
import { getGlobalServiceProvider } from './services/globalServiceProvider';
import { parseDate } from './utils/dateUtils';
import { parseEphemeralBlockMetadataJson } from './utils/typeGuards';

export class EphemeralBlockMetadata<TID extends PlatformID = Uint8Array>
  extends BlockMetadata
  implements IEphemeralBlockMetadata<TID>
{
  private readonly _creator: Member<TID>;
  constructor(
    size: BlockSize,
    type: BlockType,
    dataType: BlockDataType,
    lengthWithoutPadding: number,
    creator: Member<TID>,
    dateCreated?: Date,
  ) {
    super(size, type, dataType, lengthWithoutPadding, dateCreated);
    this._creator = creator;
  }
  public get creator(): Member<TID> {
    return this._creator;
  }

  public override toJson(): string {
    return JSON.stringify({
      size: this.size,
      type: this.type,
      dataType: this.dataType,
      lengthWithoutPadding: this.lengthWithoutPadding,
      dateCreated: this.dateCreated.toISOString(),
      creator: this.creator.toJson(),
    });
  }

  /**
   * Parse ephemeral metadata from JSON representation using type guards.
   * Validates creator field with type guard.
   * Uses robust date parsing with timezone support.
   *
   * @param json - JSON string containing metadata
   * @param eciesService - Optional ECIES service for Member deserialization. If not provided, uses global service provider.
   * @returns Parsed EphemeralBlockMetadata instance
   * @throws JsonValidationError if JSON is invalid or required fields are missing/invalid
   * @throws Error if eciesService is not provided and service provider is not initialized
   */
  public static override fromJson<TID extends PlatformID = Uint8Array>(
    json: string,
    eciesService?: ECIESService<TID>,
  ): EphemeralBlockMetadata<TID> {
    // Use type guard to validate and parse
    const data = parseEphemeralBlockMetadataJson(json);

    // Get ECIES service from parameter or global provider
    const service =
      eciesService || getGlobalServiceProvider<TID>().eciesService;

    // Deserialize the Member from its JSON representation using provided service
    const creator = Member.fromJson<TID>(data.creator, service);

    // Parse date using robust date utilities
    const dateCreated = parseDate(data.dateCreated);

    // Create a proper EphemeralBlockMetadata instance
    return new EphemeralBlockMetadata<TID>(
      data.size as BlockSize,
      data.type as BlockType,
      data.dataType as BlockDataType,
      data.lengthWithoutPadding,
      creator,
      dateCreated,
    );
  }
}
