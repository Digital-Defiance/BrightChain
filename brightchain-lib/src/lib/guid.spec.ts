import {
  GuidV4,
} from './guid';
import { FullHexGuid } from './types';
import { GuidBrandType } from './enumerations/guidBrandType';
import * as uuid from 'uuid';

describe('guid', () => {
  it('should create a new guid', () => {
    const guid = GuidV4.new();
    expect(guid.asFullHexGuid).toBeTruthy();
  });
  it('should convert uuid to and from bigint', () => {
    const uuid = GuidV4.new();
    const uuidBigint = uuid.asBigIntGuid;
    const uuid2 = new GuidV4(uuidBigint);
    expect(uuid).toEqual(uuid2);
  });
  it('should convert uuid to and from base64', () => {
    const uuid = GuidV4.new();
    const uuidBase64 = uuid.asBase64Guid;
    const uuid2 = new GuidV4(uuidBase64);
    expect(uuid.asFullHexGuid).toEqual(uuid2.asFullHexGuid);
  });
  it('should convert uuid to and from buffer', () => {
    const uuid = GuidV4.new();
    const rawGuidBuffer = uuid.asRawGuidBuffer;
    expect(rawGuidBuffer.length).toEqual(16);
    const rawGuidBuffer2 = new GuidV4(rawGuidBuffer);
    expect(uuid).toEqual(rawGuidBuffer2);
  });
  it('should create a GuidV4 from a Guid', () => {
    const uuidStr: FullHexGuid = uuid.v4() as FullHexGuid;
    const guidV4 = new GuidV4(uuidStr);
    expect(guidV4.asFullHexGuid).toEqual(uuidStr);
  });
  it('should test verifyGuid with validate=false', () => {
    const uuidStr: FullHexGuid = uuid.v4() as FullHexGuid;
    expect(GuidV4.verifyGuid(GuidBrandType.FullHexGuid, uuidStr, false)).toBeTruthy();
  });
  it('should test verifyGuid with validate=true', () => {
    const uuidStr: FullHexGuid = uuid.v4() as FullHexGuid;
    expect(GuidV4.verifyGuid(GuidBrandType.FullHexGuid, uuidStr, true)).toBeTruthy();
  });
  it('should test an unknown type', () => {
    const uuidStr: FullHexGuid = uuid.v4() as FullHexGuid;
    expect(GuidV4.verifyGuid(GuidBrandType.Unknown, uuidStr, true)).toBeFalsy();
  });
  it('should test guidBrandToLength with an unknown type', () => {
    expect(() => GuidV4.guidBrandToLength(GuidBrandType.Unknown)).toThrow();
  });
  it('should test lengthToGuidBrand with an unknown type', () => {
    expect(() => GuidV4.lengthToGuidBrand(0, false)).toThrow();
    expect(() => GuidV4.lengthToGuidBrand(0, true)).toThrow();
  });
  it('should test isFullHexGuid with invalid id string', () => {
    expect(GuidV4.isFullHexGuid('x'.repeat(36), true)).toBeFalsy();
  });
  it('it should test isShortHexGuid with an invalid guid string', () => {
    expect(GuidV4.isShortHexGuid('a'.repeat(32), true)).toBeFalsy();
  });
  it('should test isShortHexGuid with a valid guid', () => {
    const uuidStr: FullHexGuid = uuid.v4() as FullHexGuid;
    const guidV4 = new GuidV4(uuidStr);
    const shortHexGuid = guidV4.asShortHexGuid;
    expect(shortHexGuid.length).toEqual(32);
    expect(GuidV4.isShortHexGuid(shortHexGuid, true)).toBeTruthy();
  });
  it('should test toFullHexFromBigInt', () => {
    const guid = GuidV4.new();
    const fullHex = GuidV4.toFullHexFromBigInt(guid.asBigIntGuid);
    expect(fullHex).toEqual(guid.asFullHexGuid);
  });
  it('should handle invalid FullHexGuid input string', () => {
    expect(GuidV4.isFullHexGuid('invalid-guid', true)).toBeFalsy();
  });

  it('should handle invalid ShortHexGuid input string', () => {
    expect(GuidV4.isShortHexGuid('invalid-guid', true)).toBeFalsy();
  });

  it('should throw error for invalid guid conversion', () => {
    expect(() => GuidV4.toFullHexGuid('invalid-guid')).toThrow();
    expect(() => GuidV4.toShortHexGuid('invalid-guid')).toThrow();
  });

  it('should throw error for invalid guid buffer conversion', () => {
    expect(() => GuidV4.toRawGuidBuffer('invalid-guid')).toThrow();
  });

  it('should verify invalid guid with verifyGuid function', () => {
    expect(GuidV4.verifyGuid(GuidBrandType.FullHexGuid, 'invalid-guid', true)).toBeFalsy();
  });

  it('should handle empty string input', () => {
    expect(GuidV4.isFullHexGuid('', true)).toBeFalsy();
  });

  it('should handle null and undefined inputs', () => {
    expect(() => GuidV4.isFullHexGuid(null as unknown as string, true)).toThrow();
  });

  it('should validate a valid FullHexGuid', () => {
    const validUuid = uuid.v4();
    expect(GuidV4.isFullHexGuid(validUuid, true)).toBeTruthy();
  });

  it('should validate a valid ShortHexGuid', () => {
    const validUuid = uuid.v4().replace(/-/g, '');
    expect(GuidV4.isShortHexGuid(validUuid, true)).toBeTruthy();
  });

  it('should correctly convert between FullHexGuid and ShortHexGuid', () => {
    const fullHexGuid = uuid.v4() as string;
    const shortHexGuid = GuidV4.toShortHexGuid(fullHexGuid);
    const convertedBackToFullHex = GuidV4.toFullHexGuid(shortHexGuid);
    expect(convertedBackToFullHex).toEqual(fullHexGuid);
  });
});
