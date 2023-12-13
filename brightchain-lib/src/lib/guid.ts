import * as uuid from 'uuid';
import { AnyBrand, Brand } from 'ts-brand';
import { GuidBrandType } from './enumerations/guidBrandType';
import { Base64Guid, Base64GuidBuffer, BigIntGuid, FullHexGuid, FullHexGuidBuffer, RawGuidBuffer, ShortHexGuid, ShortHexGuidBuffer } from './types';

export const lengthMap: Map<GuidBrandType, number> = new Map<
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

export const verifyFunctions: Map<
  GuidBrandType,
  (guid: AnyBrand, validate?: boolean) => boolean
> = new Map<GuidBrandType, (guid: AnyBrand) => boolean>([
  [GuidBrandType.FullHexGuid, isFullHexGuid],
  [GuidBrandType.ShortHexGuid, isShortHexGuid],
  [GuidBrandType.Base64Guid, isBase64Guid],
  [GuidBrandType.BigIntGuid, isBigIntGuid],
  [GuidBrandType.FullHexGuidBuffer, isFullHexGuid],
  [GuidBrandType.ShortHexGuidBuffer, isShortHexGuid],
  [GuidBrandType.Base64GuidBuffer, isBase64Guid],
  [GuidBrandType.RawGuidBuffer, isRawGuid],
]);

export function verifyGuid(
  guidBrand: GuidBrandType,
  guid: AnyBrand,
  validate?: boolean
): boolean {
  const verifyFunc = verifyFunctions.get(guidBrand);
  if (verifyFunc === undefined) {
    return false;
  }
  return verifyFunc(guid, validate);
}

export function guidBrandToLength(guidBrand: GuidBrandType): number {
  const guid = lengthMap.get(guidBrand);
  if (guid === undefined) {
    throw new Error(`Unknown guid brand: ${guidBrand}`);
  }
  return guid as number;
}

export function lengthToGuidBrand(
  length: number,
  isBuffer: boolean
): GuidBrandType {
  for (const [brand, len] of lengthMap) {
    if (len === length) {
      if (isBuffer && !brand.endsWith('Buffer')) {
        continue;
      }
      return brand;
    }
  }
  throw new Error(`Unknown guid length: ${length}`);
}

export function isFullHexGuid(
  fullHexGuidValue: string | Buffer,
  validate?: boolean
): boolean {
  const expectedLength = fullHexGuidValue instanceof Buffer
    ? guidBrandToLength(GuidBrandType.FullHexGuidBuffer)
    : guidBrandToLength(GuidBrandType.FullHexGuid);

  if (fullHexGuidValue.length !== expectedLength) {
    return false;
  }

  if (validate && !uuid.validate(fullHexGuidValue.toString())) {
    return false;
  }

  return true;
}

export function isShortHexGuid(
  shortHexGuidValue: string | Buffer,
  validate?: boolean
): boolean {
  const expectedLength = shortHexGuidValue instanceof Buffer
    ? guidBrandToLength(GuidBrandType.ShortHexGuidBuffer)
    : guidBrandToLength(GuidBrandType.ShortHexGuid);

  if (shortHexGuidValue.length !== expectedLength) {
    return false;
  }

  if (validate) {
    const rawGuidBuffer = toRawGuidBuffer(shortHexGuidValue);
    if (!uuid.validate(toFullHexGuid(rawGuidBuffer.toString('hex')))) {
      return false;
    }
  }

  return true;
}

export function isBase64Guid(
  value: string | Buffer,
  validate?: boolean
): boolean {
  let result = false;
  if (value instanceof Buffer) {
    result = value.length === guidBrandToLength(GuidBrandType.Base64GuidBuffer);
  }
  result = value.length === guidBrandToLength(GuidBrandType.Base64Guid);
  if (result && validate === true) {
    const fromBase64: Buffer = toRawGuidBuffer(value);
    if (fromBase64.length !== guidBrandToLength(GuidBrandType.RawGuidBuffer)) {
      return false;
    }
    if (!uuid.validate(toFullHexGuid(fromBase64.toString('hex')))) {
      return false;
    }
  }
  return result;
}

export function isRawGuid(value: Buffer, validate?: boolean): boolean {
  let result = false;
  if (value instanceof Buffer) {
    result = value.length === guidBrandToLength(GuidBrandType.RawGuidBuffer);
  }
  if (result && validate === true) {
    if (!uuid.validate(toFullHexGuid(value.toString('hex')))) {
      return false;
    }
  }
  return result;
}

export function isBigIntGuid(value: bigint, validate?: boolean): boolean {
  let result = false;
  if (typeof value === 'bigint') {
    result = true;
  }
  if (result && validate === true) {
    try {
      const fromBigInt = toFullHexFromBigInt(value);
      if (!uuid.validate(toFullHexGuid(fromBigInt))) {
        return false;
      }
    } catch (e) {
      return false;
    }
  }
  return result;
}

export function whichBrand(value: AnyBrand): GuidBrandType {
  if (typeof value === 'bigint') {
    if (verifyGuid(GuidBrandType.BigIntGuid, value)) {
      return GuidBrandType.BigIntGuid;
    }
    throw new Error(`Unknown guid brand: ${value}`);
  }
  const isBuffer = value instanceof Buffer;
  const expectedLength = isBuffer ? value.length : value.length;
  const expectedBrand = lengthToGuidBrand(expectedLength, isBuffer);
  const verifiedBrand = verifyGuid(expectedBrand, value);
  if (verifiedBrand) {
    return expectedBrand;
  }
  throw new Error(`Unknown guid brand: ${value}`);
}

export function toFullHexGuid(guid: string): FullHexGuid {
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

export function toShortHexGuid(
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

export function toFullHexFromBigInt(bigInt: bigint): FullHexGuid {
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

export function fullHexFromBase64(base64: string | Base64Guid): FullHexGuid {
  return toFullHexGuid(
    Buffer.from(base64, 'base64').toString('hex')
  ) as FullHexGuid;
}

export function toRawGuidBuffer(value: AnyBrand): RawGuidBuffer {
  const expectedBrand = whichBrand(value);
  if (!verifyGuid(expectedBrand, value)) {
    throw new Error(`Invalid guid brand: ${value}`);
  }
  let rawGuidBufferResult: RawGuidBuffer = Buffer.alloc(0) as RawGuidBuffer;
  switch (expectedBrand) {
    case GuidBrandType.FullHexGuid:
      rawGuidBufferResult = Buffer.from(
        toShortHexGuid(value as FullHexGuid),
        'hex'
      ) as RawGuidBuffer;
      break;
    case GuidBrandType.ShortHexGuid:
      rawGuidBufferResult = Buffer.from(
        toShortHexGuid(value as ShortHexGuid),
        'hex'
      ) as RawGuidBuffer;
      break;
    case GuidBrandType.Base64Guid:
      rawGuidBufferResult = Buffer.from(value, 'base64') as RawGuidBuffer;
      break;
    case GuidBrandType.FullHexGuidBuffer:
      rawGuidBufferResult = Buffer.from(
        toShortHexGuid((value as FullHexGuidBuffer).toString()),
        'hex'
      ) as RawGuidBuffer;
      break;
    case GuidBrandType.ShortHexGuidBuffer:
      rawGuidBufferResult = Buffer.from(
        toShortHexGuid((value as ShortHexGuidBuffer).toString()),
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
        toShortHexGuid(toFullHexFromBigInt(value as bigint)),
        'hex'
      ) as RawGuidBuffer;
      break;
    default:
      throw new Error(`Unknown guid brand: ${value}`);
  }
  if (rawGuidBufferResult.length !== guidBrandToLength(GuidBrandType.RawGuidBuffer)) {
    throw new Error(`Invalid guid length: ${rawGuidBufferResult.length}, expected: ${guidBrandToLength(GuidBrandType.RawGuidBuffer)}`);
  }
  return rawGuidBufferResult;
}

export class GuidV4 {
  private _value: RawGuidBuffer;
  constructor(value: string | AnyBrand) {
    const expectedBrand = whichBrand(value);
    const verifiedBrand = verifyGuid(expectedBrand, value);
    if (!verifiedBrand) {
      throw new Error(`Invalid guid: ${value}`);
    }
    this._value = toRawGuidBuffer(value);
  }
  public static new(): GuidV4 {
    return new GuidV4(uuid.v4() as FullHexGuid);
  }
  public get asFullHexGuid(): FullHexGuid {
    return toFullHexGuid(this._value.toString('hex')) as FullHexGuid;
  }
  public get asUint8Array(): Uint8Array {
    return this._value as Uint8Array;
  }
  public get asShortHexGuidBuffer(): ShortHexGuidBuffer {
    return Buffer.from(
      toShortHexGuid(this.asFullHexGuid)
    ) as ShortHexGuidBuffer;
  }
  public get asFullHexGuidBuffer(): FullHexGuidBuffer {
    return Buffer.from(this.asFullHexGuid) as FullHexGuidBuffer;
  }
  public get asShortHexGuid(): ShortHexGuid {
    return toShortHexGuid(this.asFullHexGuid) as ShortHexGuid;
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
}