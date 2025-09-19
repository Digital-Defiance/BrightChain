/* eslint-disable @typescript-eslint/no-explicit-any */
import * as moment from 'moment-timezone';
import { GlobalActiveContext } from './globalActiveContext';
import { t } from './i18n';
import { LanguageContext } from './sharedTypes';
import { TranslatableError } from './errors/translatable';
import { LengthEncodingType } from './enumerations/lengthEncodingType';
import StringNames from './enumerations/stringNames';

export type DEBUG_TYPE = 'error' | 'warn' | 'log';

/**
 * Optionally prints certain debug messages
 * @param debug Whether to print debug messages
 * @param type What type of message to print
 * @param args Any args to print
 */
export function debugLog(
  debug: boolean,
  type: DEBUG_TYPE = 'log',
  ...args: any[]
): void {
  if (debug && type === 'error') {
    console.error(...args);
  } else if (debug && type === 'warn') {
    console.warn(...args);
  } else if (debug && type === 'log') {
    console.log(...args);
  }
}

/**
 * Translates a string and logs it if debug is enabled
 * @param debug Whether to print debug messages
 * @param type What type of message to print
 * @param context The context for the translation
 * @param stringValue The string to translate
 * @param otherVars Additional variables for the translation
 * @param args Additional arguments to log
 */
export function translatedDebugLog(
  debug: boolean,
  type: DEBUG_TYPE = 'log',
  context: LanguageContext = GlobalActiveContext.currentContext,
  stringValue: string,
  otherVars: Record<string, string | number>[] = [],
  ...args: any[]
) {
  const translatedString = t(
    stringValue,
    GlobalActiveContext.adminLanguage,
    context,
    ...otherVars,
  );
  debugLog(debug, type, translatedString, ...args);
}

export function isValidTimezone(timezone: string): boolean {
  return moment.tz.zone(timezone) !== null;
}

/**
 * Omits keys from an object
 */
export function omit<T extends object, K extends keyof T>(
  obj: T,
  keys: K[],
): Omit<T, K> {
  const result = { ...obj };
  for (const key of keys) {
    delete result[key];
  }
  return result;
}


/**
 * Validates that a collection contains exactly the keys from an enum
 * @param collection The collection to validate
 * @param enumObject The enum object to validate against
 * @param collectionName Optional name for the collection (for better error messages)
 * @param enumName Optional name for the enum (for better error messages)
 * @throws Error if collection has missing, extra, or invalid keys
 */
export function validateEnumCollection<T extends Record<string, any>>(
  collection: Record<string, unknown>,
  enumObject: T,
  collectionName?: string,
  enumName?: string,
): void {
  // For numeric enums, filter out reverse mappings (number -> string)
  const enumKeys = Object.keys(enumObject).filter((key) => isNaN(Number(key)));
  const allEnumValues = enumKeys.map((key) => enumObject[key]);
  const collectionKeys = Object.keys(collection);

  const collectionLabel = collectionName || 'Collection';
  const enumLabel = enumName || `enum with keys [${enumKeys.join(', ')}]`;

  if (collectionKeys.length !== allEnumValues.length) {
    throw new Error(
      `${collectionLabel} must contain exactly ${
        allEnumValues.length
      } keys to match ${enumLabel}. Found ${
        collectionKeys.length
      } keys: [${collectionKeys.join(', ')}]`,
    );
  }

  const invalidKeys = collectionKeys.filter(
    (key) => !allEnumValues.includes(key),
  );
  if (invalidKeys.length > 0) {
    throw new Error(
      `${collectionLabel} contains invalid keys for ${enumLabel}: [${invalidKeys.join(
        ', ',
      )}]. Valid keys are: [${allEnumValues.join(', ')}]`,
    );
  }

  const missingKeys = allEnumValues.filter((value) => !(value in collection));
  if (missingKeys.length > 0) {
    throw new Error(
      `${collectionLabel} is missing required keys for ${enumLabel}: [${missingKeys.join(
        ', ',
      )}]`,
    );
  }
}

export function uint8ArrayToBase64(uint8Array: Uint8Array): string {
  let binaryString = '';
  for (let i = 0; i < uint8Array.length; i++) {
    binaryString += String.fromCharCode(uint8Array[i]);
  }
  return btoa(binaryString);
}

export function base64ToUint8Array(base64String: string): Uint8Array {
  const binaryString = atob(base64String);
  const len = binaryString.length;
  const bytes = new Uint8Array(len);
  for (let i = 0; i < len; i++) {
    bytes[i] = binaryString.charCodeAt(i);
  }
  return bytes;
}

export function uint8ArrayToHex(uint8Array: Uint8Array): string {
  return Array.from(uint8Array)
    .map((byte) => byte.toString(16).padStart(2, '0'))
    .join('');
}

export function hexToUint8Array(hexString: string): Uint8Array {
  const len = hexString.length;
  const bytes = new Uint8Array(len / 2);
  for (let i = 0; i < len; i += 2) {
    bytes[i / 2] = parseInt(hexString.substring(i, i + 2), 16);
  }
  return bytes;
}

/**
 * Utility functions for browser ECIES implementation
 */

/**
 * CRC16-CCITT implementation for data integrity checking
 * Uses the same algorithm as the server-side implementation (CRC16-CCITT-FALSE)
 */
export function crc16(data: Uint8Array): Uint8Array {
  let crc = 0xffff; // Initial value for CRC16-CCITT-FALSE
  const polynomial = 0x1021; // CRC16-CCITT polynomial

  for (let i = 0; i < data.length; i++) {
    crc ^= data[i] << 8;
    for (let j = 0; j < 8; j++) {
      if (crc & 0x8000) {
        crc = (crc << 1) ^ polynomial;
      } else {
        crc = crc << 1;
      }
      crc &= 0xffff; // Keep it 16-bit
    }
  }

  const result = new Uint8Array(2);
  result[0] = (crc >>> 8) & 0xff; // Big-endian
  result[1] = crc & 0xff;
  return result;
}

/**
 * Convert string to Uint8Array (UTF-8 encoding)
 */
export function stringToUint8Array(str: string): Uint8Array {
  return new TextEncoder().encode(str);
}

/**
 * Convert Uint8Array to string (UTF-8 decoding)
 */
export function uint8ArrayToString(array: Uint8Array): string {
  return new TextDecoder().decode(array);
}

/**
 * Secure random bytes generation
 */
export function randomBytes(length: number): Uint8Array {
  return crypto.getRandomValues(new Uint8Array(length));
}

/**
 * Compare two Uint8Arrays for equality
 */
export function arraysEqual(a: Uint8Array, b: Uint8Array): boolean {
  if (a.length !== b.length) return false;
  for (let i = 0; i < a.length; i++) {
    if (a[i] !== b[i]) return false;
  }
  return true;
}

/**
 * Concatenate multiple Uint8Arrays
 */
export function concatUint8Arrays(...arrays: Uint8Array[]): Uint8Array {
  const totalLength = arrays.reduce((sum, arr) => sum + arr.length, 0);
  const result = new Uint8Array(totalLength);
  let offset = 0;
  for (const array of arrays) {
    result.set(array, offset);
    offset += array.length;
  }
  return result;
}

/**
 * Get the length encoding type for a given length
 * @param length The length to evaluate
 * @returns The corresponding LengthEncodingType
 */
export function getLengthEncodingTypeForLength(
  length: number | BigInt,
): LengthEncodingType {
  if (typeof length === 'number') {
    if (length < 256) {
      return LengthEncodingType.UInt8;
    } else if (length < 65536) {
      return LengthEncodingType.UInt16;
    } else if (length < 4294967296) {
      return LengthEncodingType.UInt32;
    } else if (length < Number.MAX_SAFE_INTEGER) {
      return LengthEncodingType.UInt64;
    } else {
      throw new TranslatableError(StringNames.Error_LengthExceedsMaximum);
    }
  } else if (typeof length === 'bigint') {
    if (length < 256n) {
      return LengthEncodingType.UInt8;
    } else if (length < 65536n) {
      return LengthEncodingType.UInt16;
    } else if (length < 4294967296n) {
      return LengthEncodingType.UInt32;
    } else if (length < 18446744073709551616n) {
      return LengthEncodingType.UInt64;
    } else {
      throw new TranslatableError(StringNames.Error_LengthExceedsMaximum);
    }
  } else {
    throw new TranslatableError(StringNames.Error_LengthIsInvalidType);
  }
}

/**
 * Get the length encoding type for a given value
 * @param value The value to evaluate
 * @returns The corresponding LengthEncodingType
 */
export function getLengthEncodingTypeFromValue(
  value: number,
): LengthEncodingType {
  for (const length of Object.values(LengthEncodingType)) {
    if (length === value) {
      return length;
    }
  }
  throw new TranslatableError(StringNames.Error_LengthIsInvalidType);
}

/**
 * Get the length in bytes for a given LengthEncodingType
 * @param type The LengthEncodingType to evaluate
 * @returns The length in bytes
 */
export function getLengthForLengthType(type: LengthEncodingType): number {
  switch (type) {
    case LengthEncodingType.UInt8:
      return 1;
    case LengthEncodingType.UInt16:
      return 2;
    case LengthEncodingType.UInt32:
      return 4;
    case LengthEncodingType.UInt64:
      return 8;
    default:
      throw new TranslatableError(StringNames.Error_LengthIsInvalidType);
  }
}
/**
 * Encodes the length of the data in the Uint8Array
 * @param data The Uint8Array to encode
 * @returns The encoded Uint8Array
 */
export function lengthEncodeData(data: Uint8Array): Uint8Array {
  const lengthType = getLengthEncodingTypeForLength(data.length);
  const lengthTypeSize = getLengthForLengthType(lengthType);
  const result = new Uint8Array(1 + lengthTypeSize + data.length);

  result[0] = lengthType;

  const view = new DataView(result.buffer, result.byteOffset);
  switch (lengthType) {
    case LengthEncodingType.UInt8:
      view.setUint8(1, data.length);
      break;
    case LengthEncodingType.UInt16:
      view.setUint16(1, data.length, false);
      break;
    case LengthEncodingType.UInt32:
      view.setUint32(1, data.length, false);
      break;
    case LengthEncodingType.UInt64:
      view.setBigUint64(1, BigInt(data.length), false);
      break;
  }

  result.set(data, 1 + lengthTypeSize);
  return result;
}

/**
 * Decodes length-encoded data from a Uint8Array
 * @param data The encoded Uint8Array
 * @returns The decoded data
 */
export function decodeLengthEncodedData(data: Uint8Array): {
  data: Uint8Array;
  totalLength: number;
} {
  const lengthType = getLengthEncodingTypeFromValue(data[0]);
  const lengthTypeSize = getLengthForLengthType(lengthType);

  const view = new DataView(data.buffer, data.byteOffset);
  let length: number | bigint;

  switch (lengthType) {
    case LengthEncodingType.UInt8:
      length = view.getUint8(1);
      break;
    case LengthEncodingType.UInt16:
      length = view.getUint16(1, false);
      break;
    case LengthEncodingType.UInt32:
      length = view.getUint32(1, false);
      break;
    case LengthEncodingType.UInt64:
      length = view.getBigUint64(1, false);
      break;
    default:
      throw new TranslatableError(StringNames.Error_LengthIsInvalidType);
  }

  const totalLength = 1 + lengthTypeSize + Number(length);
  return {
    data: data.subarray(1 + lengthTypeSize, totalLength),
    totalLength,
  };
}
