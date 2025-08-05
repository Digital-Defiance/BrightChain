import BlockDataType from './enumerations/blockDataType';
import { BlockMetadataErrorType } from './enumerations/blockMetadataErrorType';
import { BlockSize } from './enumerations/blockSize';
import BlockType from './enumerations/blockType';
import { BlockMetadataError } from './errors/block';
import { IBaseBlockMetadata } from './interfaces/blocks/metadata/blockMetadata';

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
    dateCreated = new Date(),
  ) {
    this._size = size;
    this._type = type;
    this._dataType = dataType;
    this._lengthWithoutPadding = lengthWithoutPadding;
    this._dateCreated = dateCreated;
  }

  /**
   * Convert metadata to JSON string
   * @returns JSON representation of metadata
   */
  public toJson(): string {
    return JSON.stringify({
      size: this.size,
      type: this.type,
      dataType: this.dataType,
      lengthWithoutPadding: this.lengthWithoutPadding,
      dateCreated: this.dateCreated,
    });
  }

  public static fromJsonValidator(data: any): void {
    // Validate required fields
    if (!data.size || !data.type || !data.dataType || !data.dateCreated) {
      throw new BlockMetadataError(
        BlockMetadataErrorType.MissingRequiredMetadata,
      );
    }
  }

  public static fromJsonAdditionalData<T extends Record<string, any>>(data): T {
    return {} as T;
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
    T extends Record<string, any>,
  >(json: string): B & T {
    try {
      const data = JSON.parse(json);

      // Validate required fields
      this.fromJsonValidator(data);

      // Convert types and maintain extensibility
      return {
        ...data,
        ...this.fromJsonAdditionalData(data),
        dateCreated: data.dateCreated, // Already a string
        size: data.size as BlockSize,
        type: data.type as BlockType,
        dataType: data.dataType as BlockDataType,
        lengthWithoutPadding: data.lengthWithoutPadding,
      } as B & T;
    } catch (error) {
      throw new Error(
        `Failed to parse metadata: ${
          error instanceof Error ? error.message : 'Unknown error'
        }`,
      );
    }
  }
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
