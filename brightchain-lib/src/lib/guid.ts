import * as uuid from 'uuid';
import { AnyBrand } from 'ts-brand';
import { GuidBrandType } from './enumerations/guidBrandType';
import {
  Base64Guid,
  Base64GuidBuffer,
  BigIntGuid,
  FullHexGuid,
  FullHexGuidBuffer,
  RawGuidBuffer,
  ShortHexGuid,
  ShortHexGuidBuffer,
} from './types';

export class GuidV4 {
  private _value: RawGuidBuffer;
  constructor(value: string | AnyBrand) {
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
    [GuidBrandType.FullHexGuidBuffer, 36],
    [GuidBrandType.ShortHexGuidBuffer, 32],
    [GuidBrandType.Base64GuidBuffer, 24],
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
    [GuidBrandType.FullHexGuidBuffer, this.isFullHexGuid.bind(this)],
    [GuidBrandType.ShortHexGuidBuffer, this.isShortHexGuid.bind(this)],
    [GuidBrandType.Base64GuidBuffer, this.isBase64Guid.bind(this)],
    [GuidBrandType.RawGuidBuffer, this.isRawGuid.bind(this)],
  ]);

  public static new(): GuidV4 {
    return new GuidV4(uuid.v4() as FullHexGuid);
  }
  public get asFullHexGuid(): FullHexGuid {
    return GuidV4.toFullHexGuid(this._value.toString('hex')) as FullHexGuid;
  }
  public get asUint8Array(): Uint8Array {
    return this._value as Uint8Array;
  }
  public get asShortHexGuidBuffer(): ShortHexGuidBuffer {
    return Buffer.from(
      GuidV4.toShortHexGuid(this.asFullHexGuid)
    ) as ShortHexGuidBuffer;
  }
  public get asFullHexGuidBuffer(): FullHexGuidBuffer {
    return Buffer.from(this.asFullHexGuid) as FullHexGuidBuffer;
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
    guid: AnyBrand,
    validate?: boolean
  ): boolean {
    const verifyFunc = GuidV4.verifyFunctions.get(guidBrand);
    if (verifyFunc === undefined) {
      return false;
    }
    return verifyFunc(guid, validate);
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
        }
        return brand;
      }
    }
    throw new Error(`Unknown guid length: ${length}`);
  }

  public static isFullHexGuid(
    fullHexGuidValue: string | Buffer,
    validate?: boolean
  ): boolean {
    const expectedLength =
      fullHexGuidValue instanceof Buffer
        ? GuidV4.guidBrandToLength(GuidBrandType.FullHexGuidBuffer)
        : GuidV4.guidBrandToLength(GuidBrandType.FullHexGuid);

    if (fullHexGuidValue.length !== expectedLength) {
      return false;
    }

    if (validate && !uuid.validate(fullHexGuidValue.toString())) {
      return false;
    }

    return true;
  }

  public static isShortHexGuid(
    shortHexGuidValue: string | Buffer,
    validate?: boolean
  ): boolean {
    const expectedLength =
      shortHexGuidValue instanceof Buffer
        ? GuidV4.guidBrandToLength(GuidBrandType.ShortHexGuidBuffer)
        : GuidV4.guidBrandToLength(GuidBrandType.ShortHexGuid);

    if (shortHexGuidValue.length !== expectedLength) {
      return false;
    }

    if (validate) {
      const rawGuidBuffer = GuidV4.toRawGuidBuffer(shortHexGuidValue);
      if (!uuid.validate(GuidV4.toFullHexGuid(rawGuidBuffer.toString('hex')))) {
        return false;
      }
    }

    return true;
  }

  public static isBase64Guid(
    value: string | Buffer,
    validate?: boolean
  ): boolean {
    let result = false;
    if (value instanceof Buffer) {
      result =
        value.length ===
        GuidV4.guidBrandToLength(GuidBrandType.Base64GuidBuffer);
    }
    result =
      value.length === GuidV4.guidBrandToLength(GuidBrandType.Base64Guid);
    if (result && validate === true) {
      const fromBase64: Buffer = GuidV4.toRawGuidBuffer(value);
      if (
        fromBase64.length !==
        GuidV4.guidBrandToLength(GuidBrandType.RawGuidBuffer)
      ) {
        return false;
      }
      if (!uuid.validate(GuidV4.toFullHexGuid(fromBase64.toString('hex')))) {
        return false;
      }
    }
    return result;
  }

  public static isRawGuid(value: Buffer, validate?: boolean): boolean {
    let result = false;
    if (value instanceof Buffer) {
      result =
        value.length === GuidV4.guidBrandToLength(GuidBrandType.RawGuidBuffer);
    }
    if (result && validate === true) {
      if (!uuid.validate(GuidV4.toFullHexGuid(value.toString('hex')))) {
        return false;
      }
    }
    return result;
  }

  public static isBigIntGuid(value: bigint, validate?: boolean): boolean {
    let result = false;
    if (typeof value === 'bigint') {
      result = true;
    }
    if (result && validate === true) {
      try {
        const fromBigInt = GuidV4.toFullHexFromBigInt(value);
        if (!uuid.validate(GuidV4.toFullHexGuid(fromBigInt))) {
          return false;
        }
      } catch (e) {
        return false;
      }
    }
    return result;
  }

  public static whichBrand(value: AnyBrand): GuidBrandType {
    if (typeof value === 'bigint') {
      if (GuidV4.verifyGuid(GuidBrandType.BigIntGuid, value)) {
        return GuidBrandType.BigIntGuid;
      }
      throw new Error(`Unknown guid brand: ${value}`);
    }
    const isBuffer = value instanceof Buffer;
    const expectedLength = isBuffer ? value.length : value.length;
    const expectedBrand = GuidV4.lengthToGuidBrand(expectedLength, isBuffer);
    const verifiedBrand = GuidV4.verifyGuid(expectedBrand, value);
    if (verifiedBrand) {
      return expectedBrand;
    }
    throw new Error(`Unknown guid brand: ${value}`);
  }

  public static toFullHexGuid(guid: ShortHexGuid | FullHexGuid | string): FullHexGuid {
    if (guid.length == 32) {
      // insert dashes
      const str = guid.replace(
        /(.{8})(.{4})(.{4})(.{4})(.{12})/,
        '$1-$2-$3-$4-$5'
      );
      return str as FullHexGuid;
    } else if (guid.length == 36) {
      return guid as FullHexGuid;
    } else {
      throw new Error('Invalid Guid');
    }
  }

  public static toShortHexGuid(
    guid: string | FullHexGuid | ShortHexGuid | Base64Guid
  ): ShortHexGuid {
    if (guid.length == 32) {
      return guid as ShortHexGuid;
    } else if (guid.length == 36) {
      const stringGuid = guid as string;
      const str = stringGuid.toString().replace(/-/g, '');
      return str as ShortHexGuid;
    } else if (guid.length == 22) {
      return Buffer.from(guid, 'base64').toString('hex') as ShortHexGuid;
    } else {
      throw new Error('Invalid Guid');
    }
  }

  public static toFullHexFromBigInt(bigInt: bigint): FullHexGuid {
    const uuidBigInt = bigInt.toString(16).padStart(32, '0');
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
    if (!GuidV4.verifyGuid(expectedBrand, value)) {
      throw new Error(`Invalid guid brand: ${value}`);
    }
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
      case GuidBrandType.FullHexGuidBuffer:
        rawGuidBufferResult = Buffer.from(
          GuidV4.toShortHexGuid((value as FullHexGuidBuffer).toString()),
          'hex'
        ) as RawGuidBuffer;
        break;
      case GuidBrandType.ShortHexGuidBuffer:
        rawGuidBufferResult = Buffer.from(
          GuidV4.toShortHexGuid((value as ShortHexGuidBuffer).toString()),
          'hex'
        ) as RawGuidBuffer;
        break;
      case GuidBrandType.Base64GuidBuffer:
        rawGuidBufferResult = Buffer.from(
          (value as Base64GuidBuffer).toString(),
          'base64'
        ) as RawGuidBuffer;
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
        `Invalid guid length: ${rawGuidBufferResult.length
        }, expected: ${GuidV4.guidBrandToLength(GuidBrandType.RawGuidBuffer)}`
      );
    }
    return rawGuidBufferResult;
  }
}
