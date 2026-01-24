/* eslint-disable @typescript-eslint/no-explicit-any, @typescript-eslint/no-unused-vars */
import BlockDataType from './enumerations/blockDataType';
import { BlockSize } from './enumerations/blockSize';
import BlockType from './enumerations/blockType';
import { IBaseBlockMetadata } from './interfaces/blocks/metadata/blockMetadata';
import { parseDate } from './utils/dateUtils';
import { parseBlockMetadataJson } from './utils/typeGuards';

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
      dateCreated: this.dateCreated.toISOString(),
    });
  }

  /**
   * Parse metadata from JSON representation using type guards.
   * Handles:
   * 1. Type validation with descriptive errors
   * 2. Type conversion
   * 3. Optional fields
   * 4. Custom attributes
   * 5. Robust date parsing with timezone support
   *
   * @param json - JSON string containing metadata
   * @returns Parsed BlockMetadata instance
   * @throws JsonValidationError if JSON is invalid or required fields are missing/invalid
   */
  public static fromJson(json: string): BlockMetadata {
    // Use type guard to validate and parse
    const data = parseBlockMetadataJson(json);

    // Parse date using robust date utilities
    const dateCreated = parseDate(data.dateCreated);

    // Create a proper BlockMetadata instance
    return new BlockMetadata(
      data.size as BlockSize,
      data.type as BlockType,
      data.dataType as BlockDataType,
      data.lengthWithoutPadding,
      dateCreated,
    );
  }

  public static fromJsonAdditionalData<T extends Record<string, any>>(
    data: any,
  ): T {
    return {} as T;
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
