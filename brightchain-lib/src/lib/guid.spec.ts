import * as uuid from 'uuid';
import { v4 } from 'uuid';
import { GuidBrandType } from './enumerations/guidBrandType';
import { GuidV4 } from './guid';
import { FullHexGuid, RawGuidBuffer } from './types';

type Version4Options = Parameters<typeof v4>[0];

jest.mock('uuid');

describe('guid', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    // Mock v4 to handle both string and buffer return types
    // Create a mock function that matches uuid.v4's behavior
    const mockV4 = jest
      .fn()
      .mockImplementation(
        (options?: Version4Options, buf?: Uint8Array, offset?: number) => {
          if (buf) {
            const bytes = Buffer.from(
              '5549c83a20fa4a11ae7d9dc3f1681e9e',
              'hex',
            );
            bytes.copy(buf, offset || 0);
            return buf;
          }
          return '5549c83a-20fa-4a11-ae7d-9dc3f1681e9e';
        },
      ) as unknown as typeof v4;

    // Mock uuid.v4 with our implementation
    jest.spyOn(uuid, 'v4').mockImplementation(mockV4);
  });
  it('should create a new guid', () => {
    jest.spyOn(uuid, 'validate').mockReturnValue(true);
    const guid = GuidV4.new();
    expect(guid.asFullHexGuid).toBeTruthy();
  });
  it('should throw an error for invalid guid format in constructor', () => {
    const invalidGuid = 'invalid-guid-format';
    expect(() => new GuidV4(invalidGuid)).toThrow('Unknown guid length: 19');
  });
  it('should throw an error for invalid guid validation in constructor', () => {
    const validGuidFormat = '12345678-1234-1234-1234-1234567890ab'; // Valid format but assume invalid UUID
    jest.spyOn(uuid, 'validate').mockReturnValue(false); // Mock validate to return false
    expect(() => new GuidV4(validGuidFormat)).toThrow(
      `Invalid guid: ${validGuidFormat}`,
    );
  });
  it('should convert uuid to and from bigint', () => {
    jest.spyOn(uuid, 'validate').mockReturnValue(true);
    const guid = GuidV4.new();
    const uuidBigint = guid.asBigIntGuid;
    const uuid2 = new GuidV4(uuidBigint);
    expect(guid).toEqual(uuid2);
  });
  it('should convert uuid to and from base64', () => {
    jest.spyOn(uuid, 'validate').mockReturnValue(true);
    const guid = GuidV4.new();
    const uuidBase64 = guid.asBase64Guid;
    const uuid2 = new GuidV4(uuidBase64);
    expect(guid.asFullHexGuid).toEqual(uuid2.asFullHexGuid);
  });
  it('should convert uuid to and from buffer', () => {
    jest.spyOn(uuid, 'validate').mockReturnValue(true);
    const guid = GuidV4.new();
    const rawGuidBuffer = guid.asRawGuidBuffer;
    expect(rawGuidBuffer.length).toEqual(16);
    const rawGuidBuffer2 = new GuidV4(rawGuidBuffer);
    expect(guid).toEqual(rawGuidBuffer2);
  });
  it('should create a GuidV4 from a Guid', () => {
    jest.spyOn(uuid, 'validate').mockReturnValue(true);
    const uuidStr: FullHexGuid = uuid.v4() as FullHexGuid;
    const guidV4 = new GuidV4(uuidStr);
    expect(guidV4.asFullHexGuid).toEqual(uuidStr);
  });
  it('should test verifyGuid with validate=false', () => {
    jest.spyOn(uuid, 'validate').mockReturnValue(false);
    const uuidStr: FullHexGuid = uuid.v4() as FullHexGuid;
    expect(GuidV4.verifyGuid(GuidBrandType.FullHexGuid, uuidStr)).toBeFalsy();
  });
  it('should test verifyGuid with validate=true', () => {
    jest.spyOn(uuid, 'validate').mockReturnValue(true);
    const uuidStr: FullHexGuid = uuid.v4() as FullHexGuid;
    expect(GuidV4.verifyGuid(GuidBrandType.FullHexGuid, uuidStr)).toBeTruthy();
  });
  it('should test an unknown type', () => {
    const uuidStr: FullHexGuid = uuid.v4() as FullHexGuid;
    expect(GuidV4.verifyGuid(GuidBrandType.Unknown, uuidStr)).toBeFalsy();
  });
  it('should test guidBrandToLength with an unknown type', () => {
    expect(() => GuidV4.guidBrandToLength(GuidBrandType.Unknown)).toThrow();
  });
  it('should test lengthToGuidBrand with an unknown type', () => {
    expect(() => GuidV4.lengthToGuidBrand(0, false)).toThrow();
    expect(() => GuidV4.lengthToGuidBrand(0, true)).toThrow();
  });
  it('should skip when isBuffer is true but the brand does not end with Buffer', () => {
    expect(() => GuidV4.lengthToGuidBrand(36, true)).toThrow();
  });
  it('should test isFullHexGuid with invalid id string', () => {
    jest.spyOn(uuid, 'validate').mockReturnValue(false);
    expect(GuidV4.isFullHexGuid('x'.repeat(36))).toBeFalsy();
  });
  it('it should test isShortHexGuid with an invalid guid string', () => {
    jest.spyOn(uuid, 'validate').mockReturnValue(false);
    expect(GuidV4.isShortHexGuid('a'.repeat(32))).toBeFalsy();
  });
  it('should test isShortHexGuid with a valid guid', () => {
    jest.spyOn(uuid, 'validate').mockReturnValue(true);
    const uuidStr: FullHexGuid = uuid.v4() as FullHexGuid;
    const guidV4 = new GuidV4(uuidStr);
    const shortHexGuid = guidV4.asShortHexGuid;
    expect(shortHexGuid.length).toEqual(32);
    expect(GuidV4.isShortHexGuid(shortHexGuid)).toBeTruthy();
  });
  describe('toFullHexFromBigInt', () => {
    it('should test toFullHexFromBigInt', () => {
      jest.spyOn(uuid, 'validate').mockReturnValue(true);
      const guid = GuidV4.new();
      const fullHex = GuidV4.toFullHexFromBigInt(guid.asBigIntGuid);
      expect(fullHex).toEqual(guid.asFullHexGuid);
    });
    it('should throw when bigint is < 0', () => {
      expect(() => GuidV4.toFullHexFromBigInt(-1n)).toThrow('Invalid Guid');
    });
    it('should throw when bigint hex length is > 32', () => {
      expect(() =>
        GuidV4.toFullHexFromBigInt(0xffffffffffffffffffffffffffffffffffn),
      ).toThrow('Invalid Guid');
    });
  });
  it('should handle invalid FullHexGuid input string', () => {
    expect(GuidV4.isFullHexGuid('invalid-guid')).toBeFalsy();
  });

  it('should handle invalid ShortHexGuid input string', () => {
    expect(GuidV4.isShortHexGuid('invalid-guid')).toBeFalsy();
  });

  it('should throw error for invalid guid conversion', () => {
    expect(() => GuidV4.toFullHexGuid('invalid-guid')).toThrow();
    expect(() => GuidV4.toShortHexGuid('invalid-guid')).toThrow();
  });

  it('should throw error for invalid guid buffer conversion', () => {
    expect(() => GuidV4.toRawGuidBuffer('invalid-guid')).toThrow();
  });

  it('should verify invalid guid with verifyGuid function', () => {
    expect(
      GuidV4.verifyGuid(GuidBrandType.FullHexGuid, 'invalid-guid'),
    ).toBeFalsy();
  });

  it('should handle empty string input', () => {
    expect(GuidV4.isFullHexGuid('')).toBeFalsy();
  });

  it('should handle null and undefined inputs', () => {
    expect(() => GuidV4.isFullHexGuid(null as unknown as string)).toThrow();
  });

  it('should validate a valid FullHexGuid', () => {
    jest.spyOn(uuid, 'validate').mockReturnValue(true);
    const validUuid = uuid.v4();
    expect(GuidV4.isFullHexGuid(validUuid)).toBeTruthy();
  });

  it('should validate a valid ShortHexGuid', () => {
    jest.spyOn(uuid, 'validate').mockReturnValue(true);
    const validUuid = uuid.v4().replace(/-/g, '');
    expect(GuidV4.isShortHexGuid(validUuid)).toBeTruthy();
  });

  it('should correctly convert between FullHexGuid and ShortHexGuid', () => {
    const fullHexGuid = uuid.v4() as string;
    const shortHexGuid = GuidV4.toShortHexGuid(fullHexGuid);
    const convertedBackToFullHex = GuidV4.toFullHexGuid(shortHexGuid);
    expect(convertedBackToFullHex).toEqual(fullHexGuid);
  });
  describe('Constructor and Basic Methods', () => {
    it('should throw an error for invalid guid in constructor', () => {
      expect(() => new GuidV4('invalid-guid')).toThrow();
    });

    it('should return Uint8Array for asUint8Array', () => {
      jest.spyOn(uuid, 'validate').mockReturnValue(true);
      const guid = GuidV4.new();
      expect(guid.asUint8Array).toBeInstanceOf(Uint8Array);
    });

    it('should return Base64 string for toString', () => {
      jest.spyOn(uuid, 'validate').mockReturnValue(true);
      const guid = GuidV4.new();
      expect(typeof guid.toString()).toBe('string');
    });

    it('should return Base64 string for toJSON', () => {
      jest.spyOn(uuid, 'validate').mockReturnValue(true);
      const guid = GuidV4.new();
      expect(typeof guid.toJSON()).toBe('string');
    });
  });

  describe('Static Methods', () => {
    it('should handle the continue branch in lengthToGuidBrand', () => {
      expect(() => GuidV4.lengthToGuidBrand(16, true)).not.toThrow();
    });
    it('should handle the second continue branch in lengthToGuidBrand', () => {
      expect(() => GuidV4.lengthToGuidBrand(16, false)).toThrow(
        'Unknown guid length: 16',
      );
    });

    describe('isBase64Guid', () => {
      // Add tests here to cover various aspects of isBase64Guid
      it('should fail for a non guid base64 string of incorrect length', () => {
        const testString = Buffer.from('12345').toString('base64');
        expect(GuidV4.isBase64Guid(testString)).toBeFalsy();
      });
      it('should fail for a non guid base64 string of the correct length', () => {
        jest.spyOn(uuid, 'validate').mockReturnValueOnce(false);
        const testString = 'URKafV2Y/ptQttEyyvUNHQ==';
        expect(GuidV4.isBase64Guid(testString)).toBeFalsy();
      });
    });

    it('should handle the uuid.validate branch in isRawGuid', () => {
      jest.spyOn(uuid, 'validate').mockReturnValueOnce(false);
      expect(GuidV4.isRawGuidBuffer(Buffer.alloc(16))).toBe(false);
    });

    describe('isBigIntGuid', () => {
      it('should return false when bigint is too long', () => {
        jest.spyOn(uuid, 'validate').mockReturnValueOnce(false);
        expect(
          GuidV4.isBigIntGuid(
            BigInt('12345678901234567890123456789012345678901234567890'),
          ),
        ).toBe(false);
      });

      it('should return false in catch block for negative numbers', () => {
        expect(GuidV4.isBigIntGuid(-1n)).toBe(false);
      });
    });

    it('should throw in whichBrand for unknown brand', () => {
      expect(() => GuidV4.whichBrand('unknown-brand')).toThrow();
    });

    describe('toFullHexGuid', () => {
      it('should handle the guid.length == 36 branch', () => {
        expect(
          GuidV4.toFullHexGuid('12345678-1234-1234-1234-1234567890ab'),
        ).toBe('12345678-1234-1234-1234-1234567890ab');
      });
    });

    describe('toShortHexGuid', () => {
      it('should handle the guid.length == 24 branch', () => {
        jest.spyOn(uuid, 'validate').mockReturnValue(true);
        expect(GuidV4.toShortHexGuid('MTIzNDU2Nzg5MDEyMzQ1Njc4')).toBe(
          '313233343536373839303132333435363738',
        );
      });
    });

    it('should convert fullHexFromBase64 correctly', () => {
      jest.spyOn(uuid, 'validate').mockReturnValue(true);
      expect(GuidV4.fullHexFromBase64('VUnIOiD6ShGufZ3D8Wgeng==')).toBe(
        '5549c83a-20fa-4a11-ae7d-9dc3f1681e9e',
      );
    });

    describe('toRawGuidBuffer', () => {
      it('should throw for invalid guid brand', () => {
        expect(() => GuidV4.toRawGuidBuffer('invalid')).toThrow();
      });

      it('should throw in default case', () => {
        expect(() => GuidV4.toRawGuidBuffer({} as unknown)).toThrow();
      });

      it('should throw if rawGuidBufferResult.length is incorrect', () => {
        // Add test here to cover the length check throw condition
      });
      it('should throw when expectedBrand is Unknown', () => {
        jest.spyOn(GuidV4, 'whichBrand').mockReturnValue(GuidBrandType.Unknown);
        expect(() => GuidV4.toRawGuidBuffer('invalid')).toThrow();
      });
      it('should throw when raw guid buffer length isnt correct', () => {
        jest
          .spyOn(GuidV4, 'whichBrand')
          .mockReturnValue(GuidBrandType.RawGuidBuffer);
        expect(() =>
          GuidV4.toRawGuidBuffer(Buffer.from('abcdef', 'hex') as RawGuidBuffer),
        ).toThrow();
      });
    });
  });
  it('should throw when we break the rules', () => {
    jest
      .spyOn(GuidV4, 'whichBrand')
      .mockReturnValue(GuidBrandType.RawGuidBuffer);
    jest.spyOn(GuidV4, 'verifyGuid').mockReturnValue(true);
    jest.spyOn(uuid, 'validate').mockReturnValue(false);
    expect(
      () =>
        new GuidV4(
          Buffer.from(
            '5549c83a20fa4a11ae7d9dc3f1681e9e',
            'hex',
          ) as RawGuidBuffer,
        ),
    ).toThrow();
  });
});
