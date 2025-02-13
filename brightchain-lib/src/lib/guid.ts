import { AnyBrand } from 'ts-brand';
import * as uuid from 'uuid';
import { GuidBrandType } from './enumerations/guidBrandType';
import { GuidErrorType } from './enumerations/guidErrorType';
import { GuidError } from './errors/guidError';
import { SerializableBuffer } from './serializableBuffer';
import {
  Base64Guid,
  BigIntGuid,
  FullHexGuid,
  RawGuidBuffer,
  ShortHexGuid,
} from './types';

export class GuidV4 {
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
        const valueBuffer =
          value instanceof Buffer
            ? (value as RawGuidBuffer)
            : (SerializableBuffer.from(strValue) as RawGuidBuffer);
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

  private static readonly lengthMap: Map<GuidBrandType, number> = new Map<
    GuidBrandType,
    number
  >([
    [GuidBrandType.FullHexGuid, 36],
    [GuidBrandType.ShortHexGuid, 32],
    [GuidBrandType.Base64Guid, 24],
    [GuidBrandType.RawGuidBuffer, 16],
  ]);

  private static readonly verifyFunctions: Map<
    GuidBrandType,
    (guid: AnyBrand, validate?: boolean) => boolean
  > = new Map<GuidBrandType, (guid: AnyBrand) => boolean>([
    [GuidBrandType.FullHexGuid, this.isFullHexGuid.bind(this)],
    [GuidBrandType.ShortHexGuid, this.isShortHexGuid.bind(this)],
    [GuidBrandType.Base64Guid, this.isBase64Guid.bind(this)],
    [GuidBrandType.BigIntGuid, this.isBigIntGuid.bind(this)],
    [GuidBrandType.RawGuidBuffer, this.isRawGuidBuffer.bind(this)],
  ]);

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
  public get asFullHexGuid(): FullHexGuid {
    return GuidV4.toFullHexGuid(this._value.toString('hex')) as FullHexGuid;
  }
  public get asUint8Array(): Uint8Array {
    return this._value as Uint8Array;
  }
  public get asShortHexGuid(): ShortHexGuid {
    return GuidV4.toShortHexGuid(this.asFullHexGuid) as ShortHexGuid;
  }
  public toString(): Base64Guid {
    return this.asBase64Guid as Base64Guid;
  }
  public toJson(): string {
    return this.asBase64Guid;
  }
  public get asBigIntGuid(): BigIntGuid {
    return BigInt('0x' + this._value.toString('hex')) as BigIntGuid;
  }
  public get asBase64Guid(): Base64Guid {
    return this._value.toString('base64') as Base64Guid;
  }

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
      if (guidBrand === GuidBrandType.FullHexGuid) {
        return GuidV4.validateUuid(String(guid));
      }
      const verifyFunc = GuidV4.verifyFunctions.get(guidBrand);
      if (!verifyFunc) {
        return false;
      }
      return verifyFunc(guid);
    } catch {
      return false;
    }
  }

  public static guidBrandToLength(guidBrand: GuidBrandType): number {
    const guid = GuidV4.lengthMap.get(guidBrand);
    if (guid === undefined) {
      throw new GuidError(GuidErrorType.UnknownBrand, guidBrand);
    }
    return guid as number;
  }

  public static lengthToGuidBrand(
    length: number,
    isBuffer: boolean,
  ): GuidBrandType {
    for (const [brand, len] of GuidV4.lengthMap) {
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

  public static isFullHexGuid(fullHexGuidValue: string | FullHexGuid): boolean {
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

  public static isShortHexGuid(
    shortHexGuidValue: string | ShortHexGuid,
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

  public static isBase64Guid(value: string | Base64Guid): boolean {
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

  public static isRawGuidBuffer(value: Buffer | RawGuidBuffer): boolean {
    if (value === null || value === undefined) {
      throw new GuidError(GuidErrorType.Invalid);
    }
    if (
      value.length !== GuidV4.guidBrandToLength(GuidBrandType.RawGuidBuffer)
    ) {
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
    const bigIntString = value.toString(16);
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

  public static toFullHexGuid(
    guid: ShortHexGuid | FullHexGuid | string,
  ): FullHexGuid {
    if (!guid) {
      throw new GuidError(GuidErrorType.Invalid);
    }
    const strValue = String(guid);
    if (
      strValue.length === GuidV4.guidBrandToLength(GuidBrandType.ShortHexGuid)
    ) {
      // insert dashes
      const str = strValue.replace(
        /(.{8})(.{4})(.{4})(.{4})(.{12})/,
        '$1-$2-$3-$4-$5',
      );
      return str as FullHexGuid;
    } else if (
      strValue.length === GuidV4.guidBrandToLength(GuidBrandType.FullHexGuid)
    ) {
      return strValue as FullHexGuid;
    } else {
      throw new GuidError(GuidErrorType.Invalid);
    }
  }

  public static toShortHexGuid(
    guid: string | FullHexGuid | ShortHexGuid | Base64Guid,
  ): ShortHexGuid {
    if (!guid) {
      throw new GuidError(GuidErrorType.Invalid);
    }
    const strValue = String(guid);

    if (
      strValue.length === GuidV4.guidBrandToLength(GuidBrandType.ShortHexGuid)
    ) {
      return strValue as ShortHexGuid;
    } else if (
      strValue.length === GuidV4.guidBrandToLength(GuidBrandType.FullHexGuid)
    ) {
      return strValue.replace(/-/g, '') as ShortHexGuid;
    } else if (
      strValue.length === GuidV4.guidBrandToLength(GuidBrandType.Base64Guid)
    ) {
      return SerializableBuffer.from(strValue, 'base64').toString(
        'hex',
      ) as ShortHexGuid;
    } else {
      throw new GuidError(GuidErrorType.Invalid);
    }
  }

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

  public static fullHexFromBase64(base64: string | Base64Guid): FullHexGuid {
    return GuidV4.toFullHexGuid(
      SerializableBuffer.from(base64, 'base64').toString('hex'),
    ) as FullHexGuid;
  }

  public static toRawGuidBuffer(value: AnyBrand): RawGuidBuffer {
    const expectedBrand = GuidV4.whichBrand(value);
    let rawGuidBufferResult: RawGuidBuffer = Buffer.alloc(0) as RawGuidBuffer;
    switch (expectedBrand) {
      case GuidBrandType.FullHexGuid:
        rawGuidBufferResult = SerializableBuffer.from(
          GuidV4.toShortHexGuid(value as FullHexGuid),
          'hex',
        ) as RawGuidBuffer;
        break;
      case GuidBrandType.ShortHexGuid:
        rawGuidBufferResult = SerializableBuffer.from(
          GuidV4.toShortHexGuid(value as ShortHexGuid),
          'hex',
        ) as RawGuidBuffer;
        break;
      case GuidBrandType.Base64Guid:
        rawGuidBufferResult = SerializableBuffer.from(
          value,
          'base64',
        ) as RawGuidBuffer;
        break;
      case GuidBrandType.RawGuidBuffer:
        rawGuidBufferResult = value as RawGuidBuffer;
        break;
      case GuidBrandType.BigIntGuid:
        rawGuidBufferResult = SerializableBuffer.from(
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
