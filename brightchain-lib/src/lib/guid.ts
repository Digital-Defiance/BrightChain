import * as uuid from 'uuid';
import { AnyBrand } from 'ts-brand';
import { GuidBrandType } from './enumerations/guidBrandType';
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
      | RawGuidBuffer
  ) {
    const expectedBrand = GuidV4.whichBrand(value);
    const verifiedBrand = GuidV4.verifyGuid(expectedBrand, value);
    if (!verifiedBrand) {
      throw new Error(`Invalid guid: ${value}`);
    }
    this._value = GuidV4.toRawGuidBuffer(value);
    if (!uuid.validate(this.asFullHexGuid)) {
      throw new Error(`Invalid guid: ${value}`);
    }
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
    return new GuidV4(uuid.v4() as FullHexGuid);
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
  public toJSON(): string {
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
      | RawGuidBuffer
  ): boolean {
    const verifyFunc = GuidV4.verifyFunctions.get(guidBrand);
    if (verifyFunc === undefined) {
      return false;
    }
    return verifyFunc(guid);
  }

  public static guidBrandToLength(guidBrand: GuidBrandType): number {
    const guid = GuidV4.lengthMap.get(guidBrand);
    if (guid === undefined) {
      throw new Error(`Unknown guid brand: ${guidBrand}`);
    }
    return guid as number;
  }

  public static lengthToGuidBrand(
    length: number,
    isBuffer: boolean
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
    throw new Error(`Unknown guid length: ${length}`);
  }

  public static isFullHexGuid(fullHexGuidValue: string | FullHexGuid): boolean {
    const expectedLength = GuidV4.guidBrandToLength(GuidBrandType.FullHexGuid);

    if (fullHexGuidValue.length !== expectedLength) {
      return false;
    }

    if (!uuid.validate(fullHexGuidValue.toString())) {
      return false;
    }

    return true;
  }

  public static isShortHexGuid(
    shortHexGuidValue: string | ShortHexGuid
  ): boolean {
    const expectedLength = GuidV4.guidBrandToLength(GuidBrandType.ShortHexGuid);

    if (shortHexGuidValue.length !== expectedLength) {
      return false;
    }

    const rawGuidBuffer = GuidV4.toRawGuidBuffer(shortHexGuidValue);
    if (!uuid.validate(GuidV4.toFullHexGuid(rawGuidBuffer.toString('hex')))) {
      return false;
    }

    return true;
  }

  public static isBase64Guid(value: string | Base64Guid): boolean {
    const result =
      value.length === GuidV4.guidBrandToLength(GuidBrandType.Base64Guid);
    if (result) {
      const fromBase64: Buffer = GuidV4.toRawGuidBuffer(value);
      if (!uuid.validate(GuidV4.toFullHexGuid(fromBase64.toString('hex')))) {
        return false;
      }
    }
    return result;
  }

  public static isRawGuidBuffer(value: Buffer | RawGuidBuffer): boolean {
    const result =
      value.length === GuidV4.guidBrandToLength(GuidBrandType.RawGuidBuffer);
    if (result) {
      if (!uuid.validate(GuidV4.toFullHexGuid(value.toString('hex')))) {
        return false;
      }
    }
    return result;
  }

  public static isBigIntGuid(value: bigint | BigIntGuid): boolean {
    let result = false;
    if (typeof value === 'bigint') {
      const bigIntString = value.toString(16);
      result = value >= 1n && bigIntString.length <= 32;
    }
    if (result) {
      const fromBigInt = GuidV4.toFullHexFromBigInt(value);
      result = uuid.validate(fromBigInt);
    }
    return result;
  }

  public static whichBrand(value: AnyBrand): GuidBrandType {
    if (typeof value === 'bigint') {
      return GuidBrandType.BigIntGuid;
    }
    const isBuffer = value instanceof Buffer;
    const expectedLength = value.length;
    return GuidV4.lengthToGuidBrand(expectedLength, isBuffer);
  }

  public static toFullHexGuid(
    guid: ShortHexGuid | FullHexGuid | string
  ): FullHexGuid {
    if (guid.length == GuidV4.guidBrandToLength(GuidBrandType.ShortHexGuid)) {
      // insert dashes
      const str = guid.replace(
        /(.{8})(.{4})(.{4})(.{4})(.{12})/,
        '$1-$2-$3-$4-$5'
      );
      return str as FullHexGuid;
    } else if (
      guid.length == GuidV4.guidBrandToLength(GuidBrandType.FullHexGuid)
    ) {
      return guid as FullHexGuid;
    } else {
      throw new Error('Invalid Guid');
    }
  }

  public static toShortHexGuid(
    guid: string | FullHexGuid | ShortHexGuid | Base64Guid
  ): ShortHexGuid {
    if (guid.length == GuidV4.guidBrandToLength(GuidBrandType.ShortHexGuid)) {
      return guid as ShortHexGuid;
    } else if (
      guid.length == GuidV4.guidBrandToLength(GuidBrandType.FullHexGuid)
    ) {
      const stringGuid = guid as string;
      const str = stringGuid.toString().replace(/-/g, '');
      return str as ShortHexGuid;
    } else if (
      guid.length == GuidV4.guidBrandToLength(GuidBrandType.Base64Guid)
    ) {
      return Buffer.from(guid, 'base64').toString('hex') as ShortHexGuid;
    } else {
      throw new Error('Invalid Guid');
    }
  }

  public static toFullHexFromBigInt(bigInt: bigint): FullHexGuid {
    if (bigInt < 0n) {
      throw new Error('Invalid Guid');
    }
    const uuidBigInt = bigInt.toString(16).padStart(32, '0');
    if (uuidBigInt.length !== 32) {
      throw new Error('Invalid Guid');
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
      Buffer.from(base64, 'base64').toString('hex')
    ) as FullHexGuid;
  }

  public static toRawGuidBuffer(value: AnyBrand): RawGuidBuffer {
    const expectedBrand = GuidV4.whichBrand(value);
    let rawGuidBufferResult: RawGuidBuffer = Buffer.alloc(0) as RawGuidBuffer;
    switch (expectedBrand) {
      case GuidBrandType.FullHexGuid:
        rawGuidBufferResult = Buffer.from(
          GuidV4.toShortHexGuid(value as FullHexGuid),
          'hex'
        ) as RawGuidBuffer;
        break;
      case GuidBrandType.ShortHexGuid:
        rawGuidBufferResult = Buffer.from(
          GuidV4.toShortHexGuid(value as ShortHexGuid),
          'hex'
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
          'hex'
        ) as RawGuidBuffer;
        break;
      default:
        throw new Error(`Unknown guid brand: ${value}`);
    }
    if (
      rawGuidBufferResult.length !==
      GuidV4.guidBrandToLength(GuidBrandType.RawGuidBuffer)
    ) {
      throw new Error(
        `Invalid guid length: ${
          rawGuidBufferResult.length
        }, expected: ${GuidV4.guidBrandToLength(GuidBrandType.RawGuidBuffer)}`
      );
    }
    return rawGuidBufferResult;
  }
}
