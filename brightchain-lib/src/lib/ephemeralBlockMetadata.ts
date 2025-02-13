import { BlockMetadata, BlockMetadataJson } from './blockMetadata'; // Import BlockMetadataJson
import { BrightChainMember } from './brightChainMember';
import { BlockDataType } from './enumerations/blockDataType';
import { BlockSize } from './enumerations/blockSize';
import { BlockType } from './enumerations/blockType';
import { BlockValidationErrorType } from './enumerations/blockValidationErrorType';
import { BlockValidationError } from './errors/block/blockValidation'; // Corrected path
import { Base64Guid, GuidV4 } from './guid'; // Use Base64Guid
import { IEphemeralBlockMetadata } from './interfaces/blocks/metadata/ephemeralBlockMetadata';

/** Interface for the raw JSON structure of EphemeralBlockMetadata */
export interface EphemeralBlockMetadataJson extends BlockMetadataJson {
  creator: Base64Guid; // Creator is stored as a Base64 string ID in JSON
}

// Removed unused EphemeralBlockMetadataAdditionalData type alias

export class EphemeralBlockMetadata
  extends BlockMetadata
  implements IEphemeralBlockMetadata
{
  private readonly _creator: BrightChainMember;
  constructor(
    size: BlockSize,
    type: BlockType,
    dataType: BlockDataType,
    lengthWithoutPadding: number,
    creator: BrightChainMember, // Keep constructor accepting BrightChainMember
    dateCreated?: Date | string, // Match base constructor
  ) {
    super(size, type, dataType, lengthWithoutPadding, dateCreated);
    // Creator must be a BrightChainMember instance internally
    if (!(creator instanceof BrightChainMember)) {
      // This case should ideally not happen if called correctly, but good for robustness
      // Correct constructor call for BlockValidationError
      throw new BlockValidationError(BlockValidationErrorType.InvalidCreator);
    }
    this._creator = creator;
  }
  public get creator(): BrightChainMember {
    return this._creator;
  }

  public override toJson(): string {
    // Get base JSON data, but it might include fields we override
    const baseJson = JSON.parse(super.toJson());
    // Add/override subclass specific fields
    return JSON.stringify({
      ...baseJson, // Include base properties
      creator: this._creator.id.asBase64Guid, // Use Base64 representation consistent with hydrate
    });
  }

  /** Override validator to check for the creator field */
  public static override fromJsonValidator(
    data: Partial<EphemeralBlockMetadataJson>, // Use specific JSON type
  ): void {
    // Call base validator first
    super.fromJsonValidator(data);
    // Then validate subclass specific fields
    if (data.creator === undefined) {
      throw new BlockValidationError(BlockValidationErrorType.InvalidCreator);
    }
    // Could add more validation, e.g., check if data.creator is a valid GuidString format
  }

  /**
   * Override to handle deserialization of the 'creator' field.
   * @param data The parsed JSON data object specific to EphemeralBlockMetadata.
   * @param hydrateCreator Function to convert a GuidV4 ID back into a BrightChainMember instance.
   * @returns An object containing the hydrated 'creator' property and any other non-base properties, cast to T.
   */
  public static override fromJsonAdditionalData<
    // Reinstate generic T to match base signature
    T extends Record<string, unknown> = Record<string, unknown>,
  >(
    data: EphemeralBlockMetadataJson, // Use specific JSON type
    // Provide a default hydrateCreator that throws, requiring it to be passed in practice
    hydrateCreator: (id: GuidV4) => BrightChainMember = (
      id: GuidV4,
    ): BrightChainMember => {
      throw new Error(
        `Cannot hydrate creator ${id.toString()} without a hydrateCreator function`,
      );
    },
  ): T {
    // Return type must be T
    // Call super.fromJsonAdditionalData to get any other non-base properties, casting its result
    const baseAdditionalData = super.fromJsonAdditionalData<
      Record<string, unknown> // Get the non-creator properties
    >(data);

    // Hydrate the creator using the provided function and the Base64 string ID from JSON
    const creator = hydrateCreator(GuidV4.hydrate(data.creator)); // Use hydrate

    // Combine other non-base properties with the hydrated creator
    const result = {
      ...baseAdditionalData, // Spread any other unknown properties handled by parents
      creator: creator,
    };

    // Cast the specific result object via unknown to T to satisfy the base class signature
    // This assumes T will be compatible when called via EphemeralBlockMetadata.fromJson
    return result as unknown as T;
  }
}
