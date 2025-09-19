import { AnyBrand } from 'ts-brand';
import * as uuid from 'uuid';
import CONSTANTS from './constants';
import { GuidBrandType } from './enumerations/guidBrandType';
import { GuidErrorType } from './enumerations/guidErrorType';
import { GuidError } from './errors/guidError';
import { IGuidV4 } from './interfaces/guid';
import { FecService } from './services/fec.service';
import { ServiceLocator } from './services/serviceLocator';
import {
  Base64Guid,
  BigIntGuid,
  FullHexGuid,
  RawGuidUint8Array,
  ShortHexGuid,
} from './types';
import {
  base64ToUint8Array,
  hexToUint8Array,
  uint8ArrayToBase64,
  uint8ArrayToHex,
} from './utils';

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
export class GuidV4 implements IGuidV4 {
  /**
   * GUID is stored internally as a raw 16-byte Buffer.
   */
  private readonly _value: RawGuidUint8Array;
  constructor(
    value:
      | string
      | FullHexGuid
      | ShortHexGuid
      | Base64Guid
      | BigIntGuid
      | RawGuidUint8Array,
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

  public static isValid(
    value:
      | string
      | FullHexGuid
      | ShortHexGuid
      | Base64Guid
      | BigIntGuid
      | RawGuidUint8Array,
  ): boolean {
    try {
      if (value === null || value === undefined) {
        return false;
      }
      const strValue = String(value);
      if (!strValue) {
        return false;
      }
      const expectedBrand = GuidV4.whichBrand(value);
      const verifiedBrand = GuidV4.verifyGuid(expectedBrand, value);
      if (!verifiedBrand) {
        const valueBuffer = Buffer.isBuffer(value)
          ? value
          : Buffer.from(strValue);
        return false;
      }
      const buffer = GuidV4.toRawGuidBuffer(value);
      const fullHex = GuidV4.toFullHexGuid(buffer);
      if (!uuid.validate(fullHex)) {
        return false;
      }
    } catch (error) {
      return false;
    }
    return true;
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
    [GuidBrandType.RawGuidUint8Array]: 16,
    [GuidBrandType.BigIntGuid]: -1, // Variable length
  };

  private static readonly ReverseLengthMap: Record<number, GuidBrandType> = {
    0: GuidBrandType.Unknown,
    36: GuidBrandType.FullHexGuid,
    32: GuidBrandType.ShortHexGuid,
    24: GuidBrandType.Base64Guid,
    16: GuidBrandType.RawGuidUint8Array,
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
    [GuidBrandType.RawGuidUint8Array]: this.isRawGuidBuffer.bind(this),
  };

  /**
   * Returns the GUID as a raw Buffer.
   */
  public get asRawGuidArray(): RawGuidUint8Array {
    return this._value;
  }
  public static new(): GuidV4 {
    try {
      const uuidStr = uuid.v4();
      if (!uuidStr) {
        throw new GuidError(GuidErrorType.Invalid);
      }
      return new GuidV4(uuidStr as FullHexGuid);
    } catch (error) {
      // If there's an error creating the GUID, throw a more specific error
      if (error instanceof GuidError) {
        throw error;
      }
      throw new GuidError(GuidErrorType.Invalid);
    }
  }
  /**
   * Returns the GUID as a full hex string.
   */
  public get asFullHexGuid(): FullHexGuid {
    return GuidV4.toFullHexGuid(uint8ArrayToHex(this._value)) as FullHexGuid;
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
    return BigInt('0x' + uint8ArrayToHex(this._value)) as BigIntGuid;
  }
  /**
   * Returns the GUID as a base64 string.
   */
  public get asBase64Guid(): Base64Guid {
    return uint8ArrayToBase64(this._value) as Base64Guid;
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
      | RawGuidUint8Array,
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
    try {
      if (fullHexGuidValue === null || fullHexGuidValue === undefined) {
        throw new GuidError(GuidErrorType.Invalid);
      }
      const expectedLength = GuidV4.guidBrandToLength(
        GuidBrandType.FullHexGuid,
      );
      const strValue = String(fullHexGuidValue);

      if (strValue.length !== expectedLength) {
        return false;
      }

      return GuidV4.validateUuid(strValue);
    } catch (error) {
      return false;
    }
  }

  /**
   * Verifies if a given GUID is a valid short hex GUID.
   * @param shortHexGuidValue The short hex GUID to verify.
   * @returns True if the GUID is a valid short hex GUID, false otherwise.
   */
  public static isShortHexGuid(
    shortHexGuidValue: string | ShortHexGuid | Buffer,
  ): boolean {
    try {
      if (shortHexGuidValue === null || shortHexGuidValue === undefined) {
        throw new GuidError(GuidErrorType.Invalid);
      }
      const expectedLength = GuidV4.guidBrandToLength(
        GuidBrandType.ShortHexGuid,
      );
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
    } catch (error) {
      return false;
    }
  }

  /**
   * Verifies if a given GUID is a valid base64 GUID.
   * @param value The base64 GUID to verify.
   * @returns True if the GUID is a valid base64 GUID, false otherwise.
   */
  public static isBase64Guid(value: string | Base64Guid | Buffer): boolean {
    try {
      if (value === null || value === undefined) {
        throw new GuidError(GuidErrorType.Invalid);
      }
      const result =
        value.length === GuidV4.guidBrandToLength(GuidBrandType.Base64Guid);

      if (result) {
        try {
          const fromBase64 = GuidV4.toRawGuidBuffer(value);
          const fullHexGuid = GuidV4.toFullHexGuid(uint8ArrayToHex(fromBase64));
          return uuid.validate(fullHexGuid);
        } catch {
          return false;
        }
      }
      return result;
    } catch (error) {
      return false;
    }
  }

  /**
   * Verifies if a given GUID is a valid raw GUID buffer.
   * @param value The raw GUID buffer to verify.
   * @returns True if the GUID is a valid raw GUID buffer, false otherwise.
   */
  public static isRawGuidBuffer(
    value: Buffer | RawGuidUint8Array | Buffer,
  ): boolean {
    try {
      if (value === null || value === undefined) {
        throw new GuidError(GuidErrorType.Invalid);
      }
      const expectedLength = GuidV4.guidBrandToLength(
        GuidBrandType.RawGuidUint8Array,
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
    } catch (error) {
      return false;
    }
  }

  /**
   * Verifies if a given GUID is a valid bigint GUID.
   * @param value The bigint GUID to verify.
   * @returns True if the GUID is a valid bigint GUID, false otherwise.
   */
  public static isBigIntGuid(value: bigint | BigIntGuid): boolean {
    try {
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
    } catch (error) {
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
      | RawGuidUint8Array
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
      guid.length === GuidV4.guidBrandToLength(GuidBrandType.RawGuidUint8Array)
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
      | RawGuidUint8Array
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
      guid.length === GuidV4.guidBrandToLength(GuidBrandType.RawGuidUint8Array)
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
  public static toRawGuidBuffer(value: AnyBrand): RawGuidUint8Array {
    const expectedBrand = GuidV4.whichBrand(value);
    let rawGuidBufferResult: RawGuidUint8Array;
    switch (expectedBrand) {
      case GuidBrandType.FullHexGuid:
        rawGuidBufferResult = hexToUint8Array(
          GuidV4.toShortHexGuid(value as FullHexGuid),
        ) as RawGuidUint8Array;
        break;
      case GuidBrandType.ShortHexGuid:
        rawGuidBufferResult = hexToUint8Array(
          GuidV4.toShortHexGuid(value as ShortHexGuid),
        ) as RawGuidUint8Array;
        break;
      case GuidBrandType.Base64Guid:
        rawGuidBufferResult = base64ToUint8Array(
          value as Base64Guid,
        ) as RawGuidUint8Array;
        break;
      case GuidBrandType.RawGuidUint8Array:
        rawGuidBufferResult = value as RawGuidUint8Array;
        break;
      case GuidBrandType.BigIntGuid:
        rawGuidBufferResult = hexToUint8Array(
          GuidV4.toShortHexGuid(GuidV4.toFullHexFromBigInt(value as bigint)),
        ) as RawGuidUint8Array;
        break;
      default:
        throw new GuidError(GuidErrorType.UnknownBrand, value);
    }
    if (
      rawGuidBufferResult.length !==
      GuidV4.guidBrandToLength(GuidBrandType.RawGuidUint8Array)
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
  public equals(other: IGuidV4): boolean {
    return Buffer.compare(this.asRawGuidArray, other.asRawGuidArray) === 0;
  }

  /**
   * Compute FEC (Forward Error Correction) for the GUID for Brokered Anonymity
   */
  public async computeFEC(): Promise<Uint8Array> {
    const guidLength = GuidV4.guidBrandToLength(
      GuidBrandType.RawGuidUint8Array,
    );
    const dataShards = 2;
    const parityShards = 1;
    const shardSize = guidLength / dataShards;
    return await ServiceLocator.getServiceProvider().fecService.encode(
      this.asRawGuidArray,
      shardSize,
      dataShards,
      parityShards,
      true,
    );
  }

  /**
   * Reconstitutes a GUID from forward error correction data for Brokered Anonymity
   * @param fecService The FEC service to use
   * @param fecData The FEC data to use
   */
  public static async reconstituteFEC(
    fecService: FecService,
    fecData: Uint8Array,
  ): Promise<Uint8Array> {
    const guidLength = GuidV4.guidBrandToLength(
      GuidBrandType.RawGuidUint8Array,
    );
    const dataShards = 2;
    const parityShards = 1;
    const shardSize = guidLength / dataShards;
    return fecService.decode(fecData, shardSize, dataShards, parityShards, [
      true,
    ]);
  }
}
