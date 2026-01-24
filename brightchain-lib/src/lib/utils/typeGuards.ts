/**
 * Type Guards for JSON Deserialization
 *
 * This module provides runtime type checking for JSON deserialization of block metadata.
 * Type guards ensure that JSON data conforms to expected TypeScript interfaces before
 * constructing objects, maintaining type safety at runtime.
 *
 * @module typeGuards
 *
 * @example
 * ```typescript
 * import { isBlockMetadataJson, parseBlockMetadataJson } from 'brightchain-lib';
 *
 * // Validate JSON data structure
 * if (isBlockMetadataJson(data)) {
 *   // TypeScript knows data is BlockMetadataJson
 *   const metadata = new BlockMetadata(data.size, data.type, ...);
 * }
 *
 * // Parse and validate JSON string
 * try {
 *   const data = parseBlockMetadataJson(jsonString);
 *   // data is guaranteed to be BlockMetadataJson
 * } catch (error) {
 *   // Handle validation error with descriptive message
 * }
 * ```
 */

import { BlockSize, validBlockSizes } from '../enumerations/blockSize';
import BlockType from '../enumerations/blockType';
import BlockDataType from '../enumerations/blockDataType';

/**
 * JSON representation of BlockMetadata.
 * This interface defines the expected structure of JSON data
 * when deserializing BlockMetadata objects.
 */
export interface BlockMetadataJson {
  /** Block size in bytes (must be a valid BlockSize enum value) */
  size: number;
  /** Block type (must be a valid BlockType enum value) */
  type: number;
  /** Data type (must be a valid BlockDataType enum value) */
  dataType: number;
  /** Length of data without padding (must be non-negative) */
  lengthWithoutPadding: number;
  /** Date created (ISO 8601 string or Unix timestamp) */
  dateCreated: string | number;
}

/**
 * JSON representation of EphemeralBlockMetadata.
 * Extends BlockMetadataJson with creator information.
 */
export interface EphemeralBlockMetadataJson extends BlockMetadataJson {
  /** Creator ID (serialized as string) */
  creator: string;
}

/**
 * Error thrown when JSON validation fails.
 * Provides descriptive information about which field failed validation.
 */
export class JsonValidationError extends Error {
  constructor(
    public readonly field: string,
    public readonly reason: string,
    public readonly value?: unknown,
  ) {
    super(`JSON validation failed for field '${field}': ${reason}`);
    this.name = 'JsonValidationError';
  }
}

/**
 * Check if a value is a valid BlockSize enum value.
 * @param value - Value to check
 * @returns True if value is a valid BlockSize
 */
function isValidBlockSize(value: unknown): value is BlockSize {
  if (typeof value !== 'number') {
    return false;
  }
  return validBlockSizes.includes(value as BlockSize);
}

/**
 * Check if a value is a valid BlockType enum value.
 * BlockType.Unknown (-1) is explicitly rejected as it represents
 * uninitialized or invalid blocks and should not be used in metadata.
 * 
 * @param value - Value to check
 * @returns True if value is a valid BlockType (excluding Unknown)
 */
function isValidBlockType(value: unknown): value is BlockType {
  if (typeof value !== 'number') {
    return false;
  }
  // Explicitly reject BlockType.Unknown (-1)
  if (value === BlockType.Unknown) {
    return false;
  }
  // Check if the value exists in the BlockType enum
  return Object.values(BlockType).includes(value as BlockType);
}

/**
 * Check if a value is a valid BlockDataType enum value.
 * @param value - Value to check
 * @returns True if value is a valid BlockDataType
 */
function isValidBlockDataType(value: unknown): value is BlockDataType {
  if (typeof value !== 'number') {
    return false;
  }
  // Check if the value exists in the BlockDataType enum
  return Object.values(BlockDataType).includes(value as BlockDataType);
}

/**
 * Check if a value is a valid date representation (ISO 8601 string or Unix timestamp).
 * @param value - Value to check
 * @returns True if value can be parsed as a date
 */
function isValidDateValue(value: unknown): value is string | number {
  if (typeof value === 'string') {
    // Check if it's a valid ISO 8601 string
    const date = new Date(value);
    return !isNaN(date.getTime());
  }
  if (typeof value === 'number') {
    // Check if it's a valid Unix timestamp
    const date = new Date(value);
    return !isNaN(date.getTime());
  }
  return false;
}

/**
 * Type guard for BlockMetadataJson.
 * Validates that an unknown value conforms to the BlockMetadataJson interface.
 *
 * @param data - Data to validate
 * @returns True if data is BlockMetadataJson
 * @throws JsonValidationError if validation fails with descriptive error
 */
export function isBlockMetadataJson(data: unknown): data is BlockMetadataJson {
  // Check if data is an object
  if (typeof data !== 'object' || data === null) {
    throw new JsonValidationError(
      'data',
      'must be a non-null object',
      data,
    );
  }

  const obj = data as Record<string, unknown>;

  // Validate size field
  if (!('size' in obj)) {
    throw new JsonValidationError('size', 'field is required');
  }
  if (!isValidBlockSize(obj['size'])) {
    throw new JsonValidationError(
      'size',
      'must be a valid BlockSize enum value',
      obj['size'],
    );
  }

  // Validate type field
  if (!('type' in obj)) {
    throw new JsonValidationError('type', 'field is required');
  }
  if (!isValidBlockType(obj['type'])) {
    throw new JsonValidationError(
      'type',
      'must be a valid BlockType enum value',
      obj['type'],
    );
  }

  // Validate dataType field
  if (!('dataType' in obj)) {
    throw new JsonValidationError('dataType', 'field is required');
  }
  if (!isValidBlockDataType(obj['dataType'])) {
    throw new JsonValidationError(
      'dataType',
      'must be a valid BlockDataType enum value',
      obj['dataType'],
    );
  }

  // Validate lengthWithoutPadding field
  if (!('lengthWithoutPadding' in obj)) {
    throw new JsonValidationError('lengthWithoutPadding', 'field is required');
  }
  if (typeof obj['lengthWithoutPadding'] !== 'number') {
    throw new JsonValidationError(
      'lengthWithoutPadding',
      'must be a number',
      obj['lengthWithoutPadding'],
    );
  }
  if (obj['lengthWithoutPadding'] < 0) {
    throw new JsonValidationError(
      'lengthWithoutPadding',
      'must be non-negative',
      obj['lengthWithoutPadding'],
    );
  }
  if (!Number.isInteger(obj['lengthWithoutPadding'])) {
    throw new JsonValidationError(
      'lengthWithoutPadding',
      'must be an integer',
      obj['lengthWithoutPadding'],
    );
  }

  // Validate dateCreated field
  if (!('dateCreated' in obj)) {
    throw new JsonValidationError('dateCreated', 'field is required');
  }
  if (!isValidDateValue(obj['dateCreated'])) {
    throw new JsonValidationError(
      'dateCreated',
      'must be a valid ISO 8601 string or Unix timestamp',
      obj['dateCreated'],
    );
  }

  return true;
}

/**
 * Type guard for EphemeralBlockMetadataJson.
 * Validates that an unknown value conforms to the EphemeralBlockMetadataJson interface.
 *
 * @param data - Data to validate
 * @returns True if data is EphemeralBlockMetadataJson
 * @throws JsonValidationError if validation fails with descriptive error
 */
export function isEphemeralBlockMetadataJson(
  data: unknown,
): data is EphemeralBlockMetadataJson {
  // First validate as BlockMetadataJson
  if (!isBlockMetadataJson(data)) {
    return false;
  }

  const obj = data as unknown as Record<string, unknown>;

  // Validate creator field
  if (!('creator' in obj)) {
    throw new JsonValidationError('creator', 'field is required');
  }
  if (typeof obj['creator'] !== 'string') {
    throw new JsonValidationError(
      'creator',
      'must be a string',
      obj['creator'],
    );
  }
  if (obj['creator'].length === 0) {
    throw new JsonValidationError(
      'creator',
      'must not be empty',
      obj['creator'],
    );
  }

  return true;
}

/**
 * Parse and validate a JSON string as BlockMetadataJson.
 * Combines JSON parsing with type guard validation.
 *
 * @param json - JSON string to parse
 * @returns Validated BlockMetadataJson object
 * @throws JsonValidationError if validation fails
 * @throws SyntaxError if JSON parsing fails
 */
export function parseBlockMetadataJson(json: string): BlockMetadataJson {
  let data: unknown;
  
  try {
    data = JSON.parse(json);
  } catch (error) {
    throw new JsonValidationError(
      'json',
      `JSON parsing failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
    );
  }

  // Validate using type guard
  if (isBlockMetadataJson(data)) {
    return data;
  }

  // This should never be reached since isBlockMetadataJson throws on failure
  throw new JsonValidationError('json', 'validation failed');
}

/**
 * Parse and validate a JSON string as EphemeralBlockMetadataJson.
 * Combines JSON parsing with type guard validation.
 *
 * @param json - JSON string to parse
 * @returns Validated EphemeralBlockMetadataJson object
 * @throws JsonValidationError if validation fails
 * @throws SyntaxError if JSON parsing fails
 */
export function parseEphemeralBlockMetadataJson(
  json: string,
): EphemeralBlockMetadataJson {
  let data: unknown;
  
  try {
    data = JSON.parse(json);
  } catch (error) {
    throw new JsonValidationError(
      'json',
      `JSON parsing failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
    );
  }

  // Validate using type guard
  if (isEphemeralBlockMetadataJson(data)) {
    return data;
  }

  // This should never be reached since isEphemeralBlockMetadataJson throws on failure
  throw new JsonValidationError('json', 'validation failed');
}
