import {
  GuidV4,
  FullHexGuid,
  GuidBrandType,
  guidBrandToLength,
  isFullHexGuid,
  isShortHexGuid,
  lengthToGuidBrand,
  verifyGuid,
} from './guid';
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
    const shortHexGuidBuffer = uuid.asShortHexGuidBuffer;
    expect(shortHexGuidBuffer.length).toEqual(32);
    const shortHexGuidBuffer2 = new GuidV4(shortHexGuidBuffer);
    expect(uuid).toEqual(shortHexGuidBuffer2);
  });
  it('should convert uuid to and from string buffer', () => {
    const uuid = GuidV4.new();
    const uuidBuffer = uuid.asFullHexGuidBuffer;
    const uuid2 = new GuidV4(uuidBuffer);
    expect(uuid).toEqual(uuid2);
  });
  it('should create a GuidV4 from a Guid', () => {
    const uuidStr: FullHexGuid = uuid.v4() as FullHexGuid;
    const guidV4 = new GuidV4(uuidStr);
    expect(guidV4.asFullHexGuid).toEqual(uuidStr);
    expect(guidV4.asFullHexGuidBuffer).toEqual(Buffer.from(uuidStr));
  });
  it('should test verifyGuid with validate=false', () => {
    const uuidStr: FullHexGuid = uuid.v4() as FullHexGuid;
    expect(verifyGuid(GuidBrandType.FullHexGuid, uuidStr, false)).toBeTruthy();
  });
  it('should test verifyGuid with validate=true', () => {
    const uuidStr: FullHexGuid = uuid.v4() as FullHexGuid;
    expect(verifyGuid(GuidBrandType.FullHexGuid, uuidStr, true)).toBeTruthy();
  });
  it('should test an unknown type', () => {
    const uuidStr: FullHexGuid = uuid.v4() as FullHexGuid;
    expect(verifyGuid(GuidBrandType.Unknown, uuidStr, true)).toBeFalsy();
  });
  it('should test guidBrandToLength with an unknown type', () => {
    expect(() => guidBrandToLength(GuidBrandType.Unknown)).toThrow();
  });
  it('should test lengthToGuidBrand with an unknown type', () => {
    expect(() => lengthToGuidBrand(0, false)).toThrow();
    expect(() => lengthToGuidBrand(0, true)).toThrow();
  });
  it('should test isFullHexGuid with invalid id buffer and string', () => {
    expect(isFullHexGuid('x'.repeat(36), true)).toBeFalsy();
    expect(isFullHexGuid(Buffer.from('x'.repeat(36)), true)).toBeFalsy();
  });
  it('it should test isShortHexGuid with an invalid guid', () => {
    expect(isShortHexGuid('a'.repeat(32), true)).toBeFalsy();
    expect(isShortHexGuid(Buffer.from('a'.repeat(32)), true)).toBeFalsy();
  });
  it('should test isShortHexGuid with a valid guid', () => {
    const uuidStr: FullHexGuid = uuid.v4() as FullHexGuid;
    const guidV4 = new GuidV4(uuidStr);
    const shortHexGuidBuffer = guidV4.asShortHexGuidBuffer;
    const shortHexGuid = guidV4.asShortHexGuid;
    expect(shortHexGuidBuffer.length).toEqual(32);
    expect(shortHexGuid.length).toEqual(32);
    expect(isShortHexGuid(shortHexGuidBuffer, true)).toBeTruthy();
    expect(isShortHexGuid(shortHexGuid, true)).toBeTruthy();
  });
});
