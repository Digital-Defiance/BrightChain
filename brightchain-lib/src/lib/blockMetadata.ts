import BlockDataType from './enumerations/blockDataType';
import { BlockMetadataErrorType } from './enumerations/blockMetadataErrorType';
import { BlockSize } from './enumerations/blockSize';
import BlockType from './enumerations/blockType';
import { BlockMetadataError } from './errors/block';
// Removed incorrect GuidString import, will use string for JSON representation
import { IBaseBlockMetadata } from './interfaces/blocks/metadata/blockMetadata';

/** Interface for the raw JSON structure of BlockMetadata */
export interface BlockMetadataJson extends Record<string, unknown> {
  // Define known properties
  size: BlockSize;
  type: BlockType;
  dataType: BlockDataType;
  lengthWithoutPadding: number;
  dateCreated: string; // Dates are typically strings in JSON
  // Record<string, unknown> allows other properties
}

/**
 * BlockMetadata provides utility functions for working with block metadata.
 * These functions ensure consistent metadata handling across the system.
 */
export class BlockMetadata implements IBaseBlockMetadata {
  private readonly _size: BlockSize;
  private readonly _type: BlockType;
  private readonly _dataType: BlockDataType;
  private readonly _lengthWithoutPadding: number;
  private readonly _dateCreated: Date;

  constructor(
    size: BlockSize,
    type: BlockType,
    dataType: BlockDataType,
    lengthWithoutPadding: number,
    dateCreated: Date | string = new Date(), // Allow string for constructor flexibility if needed, convert inside
  ) {
    this._size = size;
    this._type = type;
    this._dataType = dataType;
    this._lengthWithoutPadding = lengthWithoutPadding;
    // Ensure dateCreated is always a Date object internally
    this._dateCreated =
      typeof dateCreated === 'string' ? new Date(dateCreated) : dateCreated;
  }

  /**
   * Convert metadata to JSON string
   * @returns JSON representation of metadata
   */
  public toJson(): string {
    return JSON.stringify({
      size: this.size,
      type: this._type, // Use private fields directly
      dataType: this._dataType,
      lengthWithoutPadding: this._lengthWithoutPadding,
      dateCreated: this._dateCreated.toISOString(), // Convert Date to ISO string for JSON
    });
  }

  public static fromJsonValidator(data: Partial<BlockMetadataJson>): void {
    // Validate required fields
    if (
      data.size === undefined ||
      data.type === undefined ||
      data.dataType === undefined ||
      data.lengthWithoutPadding === undefined || // Added check
      data.dateCreated === undefined
    ) {
      throw new BlockMetadataError(
        BlockMetadataErrorType.MissingRequiredMetadata,
      );
    }
  }

  /**
   * Base implementation for handling additional data during JSON deserialization.
   * Subclasses should override this to handle their specific fields.
   * @param data The parsed JSON data object.
   * @returns An object containing the additional properties specific to the subclass, excluding base properties.
   */
  public static fromJsonAdditionalData<
    T extends Record<string, unknown> = Record<string, unknown>,
  >(data: BlockMetadataJson): T {
    // Base implementation returns an object containing only unknown properties.
    const {
      size,
      type,
      dataType,
      lengthWithoutPadding,
      dateCreated,
      ...additionalData
    } = data;
    return additionalData as T;
  }

  /**
   * Parse metadata from JSON representation.
   * Handles:
   * 1. Type conversion
   * 2. Optional fields
   * 3. Custom attributes
   *
   * @param json - JSON string containing metadata
   * @returns Parsed metadata object
   * @throws If JSON is invalid or required fields are missing
   */
  public static fromJson<
    B extends BlockMetadata,
    T extends Record<string, unknown> = Record<string, unknown>, // Default generic type
  >(json: string): B & T {
    let data: BlockMetadataJson;
    try {
      data = JSON.parse(json);
    } catch (parseError) {
      const errorMessage = `Failed to parse JSON: ${
        parseError instanceof Error ? parseError.message : 'Unknown parse error'
      }`;
      console.error(errorMessage, 'JSON:', json);
      // Use the correct error type and constructor
      throw new BlockMetadataError(
        BlockMetadataErrorType.InvalidBlockMetadata, // Using this as the closest match for parsing issues
        // No language specified, will use default
      );
    }

    try {
      // Validate required fields using the parsed data
      // Use 'this' to call the static method on the specific class (e.g., EphemeralBlockMetadata.fromJsonValidator)
      this.fromJsonValidator(data);

      // Extract additional data using the specific subclass's implementation
      const additionalData = this.fromJsonAdditionalData<T>(data);

      // Create a new instance of the correct class ('this' refers to the class constructor)
      // We assume the constructor signature matches the base properties.
      // This is a potential weak point if subclasses change the constructor significantly without overriding fromJson.
      const instance = new this(
        data.size,
        data.type,
        data.dataType,
        data.lengthWithoutPadding,
        data.dateCreated, // Pass the string date, constructor handles conversion
      );

      // Assign additional properties to the created instance
      Object.assign(instance, additionalData);

      // Cast and return the fully constructed instance
      return instance as B & T;
    } catch (validationOrConstructionError) {
      const errorMessage = `Failed to process metadata from JSON: ${
        validationOrConstructionError instanceof Error
          ? validationOrConstructionError.message
          : 'Unknown processing error'
      }`;
      console.error(errorMessage, 'Parsed Data:', data);
      // Use the correct error type and constructor
      // If the caught error is already a BlockMetadataError, rethrow its type, otherwise use InvalidBlockMetadata
      const errorType =
        validationOrConstructionError instanceof BlockMetadataError
          ? validationOrConstructionError.type // Assuming 'type' holds the BlockMetadataErrorType from TypedWithReasonError
          : BlockMetadataErrorType.InvalidBlockMetadata;
      throw new BlockMetadataError(
        errorType,
        // No language specified, will use default
      );
    }
  }

  // --- Getters ---
  public get size(): BlockSize {
    return this._size;
  }
  public get type(): BlockType {
    return this._type;
  }
  public get dataType(): BlockDataType {
    return this._dataType;
  }
  public get lengthWithoutPadding(): number {
    return this._lengthWithoutPadding;
  }
  public get dateCreated(): Date {
    return this._dateCreated;
  }
}
