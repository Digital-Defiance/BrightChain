import { AnyBrand } from 'ts-brand';
import * as uuid from 'uuid';
import CONSTANTS from './constants';
import { GuidBrandType } from './enumerations/guidBrandType';
import { GuidErrorType } from './enumerations/guidErrorType';
import { GuidError } from './errors/guidError';
import {
  Base64Guid,
  BigIntGuid,
  FullHexGuid,
  RawGuidBuffer,
  ShortHexGuid,
} from './types';

/**
 * GuidV4 represents a GUID (Globally Unique Identifier) that is compliant with the RFC 4122 standard.
 * GuidV4 instances can be created from a variety of input types, including:
 * - FullHexGuid: A 36-character string representation of the GUID, including dashes
 * - ShortHexGuid: A 32-character string representation of the GUID, excluding dashes
 * - Base64Guid: A 24-character base64-encoded string representation of the GUID
 * - BigIntGuid: A bigint representation of the GUID
 * - RawGuidBuffer: A 16-byte Buffer representation of the GUID
 * GuidV4 instances can be converted to any of these representations using the appropriate method.
 */
export class GuidV4 {
  /**
   * GUID is stored internally as a raw 16-byte Buffer.
   */
  private readonly _value: RawGuidBuffer;
  constructor(
    value:
      | string
      | FullHexGuid
      | ShortHexGuid
      | Base64Guid
      | BigIntGuid
      | RawGuidBuffer,
  ) {
    try {
      if (value === null || value === undefined) {
        throw new GuidError(GuidErrorType.Invalid);
      }
      const strValue = String(value);
      if (!strValue) {
        throw new GuidError(GuidErrorType.Invalid);
      }
      const expectedBrand = GuidV4.whichBrand(value);
      const verifiedBrand = GuidV4.verifyGuid(expectedBrand, value);
      if (!verifiedBrand) {
        const valueBuffer = Buffer.isBuffer(value)
          ? value
          : Buffer.from(strValue);
        throw new GuidError(
          GuidErrorType.InvalidWithGuid,
          undefined,
          undefined,
          valueBuffer,
        );
      }
      this._value = GuidV4.toRawGuidBuffer(value);
      if (!uuid.validate(this.asFullHexGuid)) {
        throw new GuidError(
          GuidErrorType.InvalidWithGuid,
          undefined,
          undefined,
          this._value,
        );
      }
    } catch (error) {
      if (error instanceof GuidError) {
        throw error;
      }
      if (typeof value === 'bigint') {
        throw new GuidError(GuidErrorType.Invalid);
      }
      const length =
        value instanceof Buffer ? value.length : String(value).length;
      throw new GuidError(GuidErrorType.UnknownLength, undefined, length);
    }
  }

  public static validateUuid(value: string): boolean {
    return uuid.validate(value);
  }

  public serialize(): string {
    return this.asBase64Guid;
  }

  public static hydrate(value: string): GuidV4 {
    return new GuidV4(value as Base64Guid);
  }

  private static readonly LengthMap: Record<GuidBrandType, number> = {
    [GuidBrandType.Unknown]: -1,
    [GuidBrandType.FullHexGuid]: 36,
    [GuidBrandType.ShortHexGuid]: 32,
    [GuidBrandType.Base64Guid]: 24,
    [GuidBrandType.RawGuidBuffer]: 16,
    [GuidBrandType.BigIntGuid]: -1, // Variable length
  };

  private static readonly ReverseLengthMap: Record<number, GuidBrandType> = {
    0: GuidBrandType.Unknown,
    36: GuidBrandType.FullHexGuid,
    32: GuidBrandType.ShortHexGuid,
    24: GuidBrandType.Base64Guid,
    16: GuidBrandType.RawGuidBuffer,
    // BigIntGuid is variable length, so it is not included in the reverse map
  };

  private static readonly VerifyFunctions: Record<
    GuidBrandType,
    (guid: AnyBrand, validate?: boolean) => boolean
  > = {
    [GuidBrandType.Unknown]: () => false,
    [GuidBrandType.FullHexGuid]: this.isFullHexGuid.bind(this),
    [GuidBrandType.ShortHexGuid]: this.isShortHexGuid.bind(this),
    [GuidBrandType.Base64Guid]: this.isBase64Guid.bind(this),
    [GuidBrandType.BigIntGuid]: this.isBigIntGuid.bind(this),
    [GuidBrandType.RawGuidBuffer]: this.isRawGuidBuffer.bind(this),
  };

  /**
   * Returns the GUID as a raw Buffer.
   */
  public get asRawGuidBuffer(): RawGuidBuffer {
    return this._value;
  }
  public static new(): GuidV4 {
    const uuidStr = uuid.v4();
    if (!uuidStr) {
      throw new GuidError(GuidErrorType.Invalid);
    }
    return new GuidV4(uuidStr as FullHexGuid);
  }
  /**
   * Returns the GUID as a full hex string.
   */
  public get asFullHexGuid(): FullHexGuid {
    return GuidV4.toFullHexGuid(this._value.toString('hex')) as FullHexGuid;
  }
  /**
   * Returns the GUID as a raw Uint8Array.
   */
  public get asUint8Array(): Uint8Array {
    return this._value as Uint8Array;
  }
  /**
   * Returns the GUID as a short hex string.
   */
  public get asShortHexGuid(): ShortHexGuid {
    return GuidV4.toShortHexGuid(this.asFullHexGuid) as ShortHexGuid;
  }
  /**
   * Returns the GUID as a base64 string.
   */
  public toString(): Base64Guid {
    return this.asBase64Guid as Base64Guid;
  }
  /**
   * Returns the GUID as a JSON string.
   * @returns The GUID as a JSON string.
   */
  public toJson(): string {
    return JSON.stringify(this.asBase64Guid);
  }
  /**
   * Returns the GUID as a bigint.
   */
  public get asBigIntGuid(): BigIntGuid {
    return BigInt('0x' + this._value.toString('hex')) as BigIntGuid;
  }
  /**
   * Returns the GUID as a base64 string.
   */
  public get asBase64Guid(): Base64Guid {
    return this._value.toString('base64') as Base64Guid;
  }

  /**
   * Verifies if a given GUID is valid for the given brand.
   * @param guidBrand The brand of the GUID to verify.
   * @param guid The GUID to verify.
   * @returns True if the GUID is valid for the given brand, false otherwise.
   */
  public static verifyGuid(
    guidBrand: GuidBrandType,
    guid:
      | string
      | FullHexGuid
      | ShortHexGuid
      | Base64Guid
      | BigIntGuid
      | RawGuidBuffer,
  ): boolean {
    if (guid === null || guid === undefined) {
      return false;
    }
    try {
      const verifyFunc = GuidV4.VerifyFunctions[guidBrand];
      return verifyFunc(guid);
    } catch {
      return false;
    }
  }

  /**
   * Returns the length of the GUID for the given brand.
   * @param guidBrand The brand of the GUID to get the length for.
   * @returns The length of the GUID for the given brand.
   */
  public static guidBrandToLength(guidBrand: GuidBrandType): number {
    const length = GuidV4.LengthMap[guidBrand];
    if (length <= 0) {
      throw new GuidError(GuidErrorType.UnknownBrand, guidBrand);
    }
    return length as number;
  }

  /**
   * Returns the brand of the GUID for the given length.
   * @param length The length of the GUID to get the brand for.
   * @param isBuffer Whether the GUID is a Buffer.
   * @returns The brand of the GUID for the given length.
   */
  public static lengthToGuidBrand(
    length: number,
    isBuffer: boolean,
  ): GuidBrandType {
    if (length <= 0) {
      throw new GuidError(GuidErrorType.UnknownLength, undefined);
    }
    const keys = Object.keys(GuidV4.ReverseLengthMap);
    const values = Object.values(GuidV4.ReverseLengthMap);
    for (let i = 0; i < keys.length; i++) {
      const len = parseInt(keys[i]);
      const brand = values[i];
      if (len === length) {
        if (isBuffer && !brand.endsWith('Buffer')) {
          continue;
        } else if (!isBuffer && brand.endsWith('Buffer')) {
          continue;
        }
        return brand;
      }
    }
    throw new GuidError(GuidErrorType.UnknownLength, undefined, length);
  }

  /**
   * Verifies if a given GUID is a valid full hex GUID.
   * @param fullHexGuidValue The full hex GUID to verify.
   * @returns True if the GUID is a valid full hex GUID, false otherwise.
   */
  public static isFullHexGuid(
    fullHexGuidValue: string | FullHexGuid | Buffer,
  ): boolean {
    if (fullHexGuidValue === null || fullHexGuidValue === undefined) {
      throw new GuidError(GuidErrorType.Invalid);
    }
    const expectedLength = GuidV4.guidBrandToLength(GuidBrandType.FullHexGuid);
    const strValue = String(fullHexGuidValue);

    if (strValue.length !== expectedLength) {
      return false;
    }

    return GuidV4.validateUuid(strValue);
  }

  /**
   * Verifies if a given GUID is a valid short hex GUID.
   * @param shortHexGuidValue The short hex GUID to verify.
   * @returns True if the GUID is a valid short hex GUID, false otherwise.
   */
  public static isShortHexGuid(
    shortHexGuidValue: string | ShortHexGuid | Buffer,
  ): boolean {
    if (shortHexGuidValue === null || shortHexGuidValue === undefined) {
      throw new GuidError(GuidErrorType.Invalid);
    }
    const expectedLength = GuidV4.guidBrandToLength(GuidBrandType.ShortHexGuid);
    const strValue = String(shortHexGuidValue);

    if (strValue.length !== expectedLength) {
      return false;
    }

    try {
      const fullHexGuid = GuidV4.toFullHexGuid(strValue);
      return uuid.validate(fullHexGuid);
    } catch {
      return false;
    }
  }

  /**
   * Verifies if a given GUID is a valid base64 GUID.
   * @param value The base64 GUID to verify.
   * @returns True if the GUID is a valid base64 GUID, false otherwise.
   */
  public static isBase64Guid(value: string | Base64Guid | Buffer): boolean {
    if (value === null || value === undefined) {
      throw new GuidError(GuidErrorType.Invalid);
    }
    const result =
      value.length === GuidV4.guidBrandToLength(GuidBrandType.Base64Guid);
    if (result) {
      try {
        const fromBase64: Buffer = GuidV4.toRawGuidBuffer(value);
        const fullHexGuid = GuidV4.toFullHexGuid(fromBase64.toString('hex'));
        return uuid.validate(fullHexGuid);
      } catch {
        return false;
      }
    }
    return result;
  }

  /**
   * Verifies if a given GUID is a valid raw GUID buffer.
   * @param value The raw GUID buffer to verify.
   * @returns True if the GUID is a valid raw GUID buffer, false otherwise.
   */
  public static isRawGuidBuffer(
    value: Buffer | RawGuidBuffer | Buffer,
  ): boolean {
    if (value === null || value === undefined) {
      throw new GuidError(GuidErrorType.Invalid);
    }
    const expectedLength = GuidV4.guidBrandToLength(
      GuidBrandType.RawGuidBuffer,
    );
    if (value.length !== expectedLength) {
      return false;
    }
    try {
      const fullHexGuid = GuidV4.toFullHexGuid(value.toString('hex'));
      const result = GuidV4.validateUuid(fullHexGuid);
      return result;
    } catch {
      return false;
    }
  }

  /**
   * Verifies if a given GUID is a valid bigint GUID.
   * @param value The bigint GUID to verify.
   * @returns True if the GUID is a valid bigint GUID, false otherwise.
   */
  public static isBigIntGuid(value: bigint | BigIntGuid): boolean {
    if (value === null || value === undefined) {
      throw new TypeError(
        "Cannot read properties of null (reading 'toString')",
      );
    }
    if (typeof value !== 'bigint') {
      return false;
    }
    if (value < 0n) {
      return false;
    }
    const bigIntString = value.toString(CONSTANTS.HEX_RADIX);
    if (bigIntString.length > 32) {
      return false;
    }
    try {
      const fromBigInt = GuidV4.toFullHexFromBigInt(value);
      return uuid.validate(fromBigInt);
    } catch {
      return false;
    }
  }

  /**
   * Determines the brand of a given GUID value.
   * @param value The GUID value to determine the brand of.
   * @returns The brand of the GUID value.
   */
  public static whichBrand(value: AnyBrand): GuidBrandType {
    if (value === null || value === undefined) {
      throw new GuidError(GuidErrorType.Invalid);
    }
    if (typeof value === 'bigint') {
      return GuidBrandType.BigIntGuid;
    }
    const isBuffer = value instanceof Buffer;
    const expectedLength = isBuffer ? value.length : String(value).length;
    return GuidV4.lengthToGuidBrand(expectedLength, isBuffer);
  }

  /**
   * Converts a given short hex GUID to a full hex GUID.
   * @param shortGuid The short hex GUID to convert.
   * @returns The short hex GUID as a full hex GUID.
   */
  private static shortGuidToFullGuid(shortGuid: string): FullHexGuid {
    // insert dashes
    const str = shortGuid.replace(
      /(.{8})(.{4})(.{4})(.{4})(.{12})/,
      '$1-$2-$3-$4-$5',
    );
    return str as FullHexGuid;
  }

  /**
   * Converts a given GUID value to a full hex GUID.
   * @param guid The GUID value to convert.
   * @returns The GUID value as a full hex GUID.
   */
  public static toFullHexGuid(
    guid:
      | RawGuidBuffer
      | BigIntGuid
      | Base64Guid
      | ShortHexGuid
      | FullHexGuid
      | string,
  ): FullHexGuid {
    if (!guid) {
      throw new GuidError(GuidErrorType.Invalid);
    } else if (typeof guid === 'bigint') {
      return GuidV4.toFullHexFromBigInt(guid);
    } else if (
      Buffer.isBuffer(guid) &&
      guid.length === GuidV4.guidBrandToLength(GuidBrandType.RawGuidBuffer)
    ) {
      const shortHex = guid.toString('hex') as ShortHexGuid;
      return GuidV4.shortGuidToFullGuid(shortHex);
    } else if (Buffer.isBuffer(guid)) {
      throw new GuidError(GuidErrorType.Invalid);
    }
    // all remaining cases are string types
    const strValue = String(guid);
    if (
      strValue.length === GuidV4.guidBrandToLength(GuidBrandType.ShortHexGuid)
    ) {
      // short hex guid
      return GuidV4.shortGuidToFullGuid(strValue);
    } else if (
      strValue.length === GuidV4.guidBrandToLength(GuidBrandType.FullHexGuid)
    ) {
      // already a full hex guid
      return strValue as FullHexGuid;
    } else if (
      strValue.length === GuidV4.guidBrandToLength(GuidBrandType.Base64Guid)
    ) {
      // base64 guid
      const shortGuid = Buffer.from(strValue, 'base64').toString('hex');
      return GuidV4.shortGuidToFullGuid(shortGuid);
    } else {
      throw new GuidError(GuidErrorType.Invalid);
    }
  }

  public static toShortHexGuid(
    guid:
      | RawGuidBuffer
      | BigIntGuid
      | Base64Guid
      | ShortHexGuid
      | FullHexGuid
      | string,
  ): ShortHexGuid {
    if (!guid) {
      throw new GuidError(GuidErrorType.Invalid);
    } else if (typeof guid === 'bigint') {
      const fullHex = GuidV4.toFullHexFromBigInt(guid);
      return fullHex.replace(/-/g, '') as ShortHexGuid;
    } else if (
      Buffer.isBuffer(guid) &&
      guid.length === GuidV4.guidBrandToLength(GuidBrandType.RawGuidBuffer)
    ) {
      return guid.toString('hex') as ShortHexGuid;
    } else if (Buffer.isBuffer(guid)) {
      throw new GuidError(GuidErrorType.Invalid);
    }
    // all remaining cases are string types
    const strValue = String(guid);

    if (
      strValue.length === GuidV4.guidBrandToLength(GuidBrandType.ShortHexGuid)
    ) {
      // already a short hex guid
      return strValue as ShortHexGuid;
    } else if (
      strValue.length === GuidV4.guidBrandToLength(GuidBrandType.FullHexGuid)
    ) {
      // full hex guid
      return strValue.replace(/-/g, '') as ShortHexGuid;
    } else if (
      strValue.length === GuidV4.guidBrandToLength(GuidBrandType.Base64Guid)
    ) {
      // base64 guid
      return Buffer.from(strValue, 'base64').toString('hex') as ShortHexGuid;
    } else {
      throw new GuidError(GuidErrorType.Invalid);
    }
  }

  /**
   * Converts a given bigint to a full hex GUID.
   * @param bigInt The bigint to convert.
   * @returns The bigint as a full hex GUID.
   */
  public static toFullHexFromBigInt(bigInt: bigint): FullHexGuid {
    if (bigInt < 0n) {
      throw new GuidError(GuidErrorType.Invalid);
    }
    const uuidBigInt = bigInt.toString(16).padStart(32, '0');
    if (uuidBigInt.length !== 32) {
      throw new GuidError(GuidErrorType.Invalid);
    }
    const rebuiltUuid =
      uuidBigInt.slice(0, 8) +
      '-' +
      uuidBigInt.slice(8, 12) +
      '-' +
      uuidBigInt.slice(12, 16) +
      '-' +
      uuidBigInt.slice(16, 20) +
      '-' +
      uuidBigInt.slice(20);
    return rebuiltUuid as FullHexGuid;
  }

  /**
   * Converts a given GUID value to a raw GUID buffer.
   * @param value The GUID value to convert.
   * @returns The GUID value as a raw GUID buffer.
   */
  public static toRawGuidBuffer(value: AnyBrand): RawGuidBuffer {
    const expectedBrand = GuidV4.whichBrand(value);
    let rawGuidBufferResult: RawGuidBuffer = Buffer.alloc(0) as RawGuidBuffer;
    switch (expectedBrand) {
      case GuidBrandType.FullHexGuid:
        rawGuidBufferResult = Buffer.from(
          GuidV4.toShortHexGuid(value as FullHexGuid),
          'hex',
        ) as RawGuidBuffer;
        break;
      case GuidBrandType.ShortHexGuid:
        rawGuidBufferResult = Buffer.from(
          GuidV4.toShortHexGuid(value as ShortHexGuid),
          'hex',
        ) as RawGuidBuffer;
        break;
      case GuidBrandType.Base64Guid:
        rawGuidBufferResult = Buffer.from(value, 'base64') as RawGuidBuffer;
        break;
      case GuidBrandType.RawGuidBuffer:
        rawGuidBufferResult = value as RawGuidBuffer;
        break;
      case GuidBrandType.BigIntGuid:
        rawGuidBufferResult = Buffer.from(
          GuidV4.toShortHexGuid(GuidV4.toFullHexFromBigInt(value as bigint)),
          'hex',
        ) as RawGuidBuffer;
        break;
      default:
        throw new GuidError(GuidErrorType.UnknownBrand, value);
    }
    if (
      rawGuidBufferResult.length !==
      GuidV4.guidBrandToLength(GuidBrandType.RawGuidBuffer)
    ) {
      throw new GuidError(
        GuidErrorType.UnknownLength,
        undefined,
        rawGuidBufferResult.length,
      );
    }
    return rawGuidBufferResult;
  }

  /**
   * Compare two GuidV4 instances
   * @param other - The other GuidV4 instance to compare
   * @returns True if the two GuidV4 instances are equal, false otherwise
   */
  public equals(other: GuidV4): boolean {
    return Buffer.compare(this._value, other._value) === 0;
  }
}
