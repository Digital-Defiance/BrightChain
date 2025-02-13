import * as uuid from 'uuid';
import { v4 } from 'uuid';
import { GuidBrandType } from './enumerations/guidBrandType';
import { GuidErrorType } from './enumerations/guidErrorType';
import { GuidError } from './errors/guidError';
import { GuidV4 } from './guid';
import { BigIntGuid, RawGuidBuffer } from './types';

const DEFAULT_UUID = '5549c83a-20fa-4a11-ae7d-9dc3f1681e9e';
type Version4Options = Parameters<typeof v4>[0];

// Mock uuid module
jest.mock('uuid', () => {
  const mockV4 = jest.fn(
    (options?: Version4Options, buf?: Uint8Array, offset?: number) => {
      if (buf) {
        const bytes = Buffer.from('5549c83a20fa4a11ae7d9dc3f1681e9e', 'hex');
        bytes.copy(buf, offset || 0);
        return buf;
      }
      return DEFAULT_UUID;
    },
  );

  const mockValidate = jest.fn((input: unknown) => {
    if (typeof input !== 'string') return false;
    const uuidRegex =
      /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
    return uuidRegex.test(input.toString());
  });

  return {
    v4: mockV4,
    validate: mockValidate,
  };
});

beforeEach(() => {
  jest.clearAllMocks();
  jest.resetAllMocks();
  // Reset the validateUuid spy if it exists
  const validateUuidMock = GuidV4.validateUuid as jest.Mock;
  if (validateUuidMock.mockRestore) {
    validateUuidMock.mockRestore();
  }
});

describe('guid', () => {
  describe('Format Conversions', () => {
    let guid: GuidV4;

    beforeEach(() => {
      jest.spyOn(uuid, 'validate').mockReturnValue(true);
      guid = GuidV4.new();
    });

    it('should convert between all formats correctly', () => {
      // Full hex -> Short hex -> Base64 -> Buffer -> BigInt -> Full hex
      const fullHex = guid.asFullHexGuid;
      const shortHex = GuidV4.toShortHexGuid(fullHex);
      const base64 = new GuidV4(shortHex).asBase64Guid;
      const buffer = new GuidV4(base64).asRawGuidBuffer;
      const bigInt = new GuidV4(buffer).asBigIntGuid;
      const backToFullHex = new GuidV4(bigInt).asFullHexGuid;

      expect(backToFullHex).toEqual(fullHex);
    });

    it('should handle boundary values in hex format', () => {
      // Test with all zeros
      const zeroHex = '00000000-0000-0000-0000-000000000000';
      const zeroGuid = new GuidV4(zeroHex);
      expect(zeroGuid.asFullHexGuid).toEqual(zeroHex);

      // Test with all fs
      const maxHex = 'ffffffff-ffff-ffff-ffff-ffffffffffff';
      const maxGuid = new GuidV4(maxHex);
      expect(maxGuid.asFullHexGuid).toEqual(maxHex);
    });

    it('should handle boundary values in base64 format', () => {
      // Test with all zeros
      const zeroBuffer = Buffer.alloc(16);
      const zeroBase64 = zeroBuffer.toString('base64');
      const zeroGuid = new GuidV4(zeroBase64);
      expect(zeroGuid.asBase64Guid).toEqual(zeroBase64);

      // Test with all ones
      const maxBuffer = Buffer.alloc(16, 0xff);
      const maxBase64 = maxBuffer.toString('base64');
      const maxGuid = new GuidV4(maxBase64);
      expect(maxGuid.asBase64Guid).toEqual(maxBase64);
    });

    it('should handle boundary values in bigint format', () => {
      // Test with zero
      const zeroGuid = new GuidV4(0n as BigIntGuid);
      expect(zeroGuid.asBigIntGuid).toEqual(0n as BigIntGuid);

      // Test with maximum valid value
      const maxBigInt = BigInt('0x' + 'f'.repeat(32)) as BigIntGuid;
      const maxGuid = new GuidV4(maxBigInt);
      expect(maxGuid.asBigIntGuid).toEqual(maxBigInt);
    });

    describe('Invalid Conversions', () => {
      it('should handle invalid hex to base64 conversion', () => {
        expect(() => GuidV4.toShortHexGuid('invalid-hex')).toThrowType(
          GuidError,
          (error: GuidError) => {
            expect(error.type).toBe(GuidErrorType.Invalid);
          },
        );
      });

      it('should handle invalid base64 to hex conversion', () => {
        expect(() => new GuidV4('!@#$%^&*')).toThrowType(
          GuidError,
          (error: GuidError) => {
            expect(error.type).toBe(GuidErrorType.UnknownLength);
          },
        );
      });

      it('should handle invalid buffer to hex conversion', () => {
        const invalidBuffer = Buffer.from([1, 2, 3]) as RawGuidBuffer;
        expect(() => new GuidV4(invalidBuffer)).toThrowType(
          GuidError,
          (error: GuidError) => {
            expect(error.type).toBe(GuidErrorType.UnknownLength);
          },
        );
      });
    });
  });

  describe('Validation', () => {
    describe('Full Hex Format', () => {
      it('should validate correct format with mixed case', () => {
        const mixedCase = '5549C83a-20fA-4a11-ae7D-9dc3f1681e9e';
        expect(GuidV4.isFullHexGuid(mixedCase)).toBeTruthy();
      });

      it('should reject invalid characters', () => {
        const invalidChars = '5549c83a-20fa-4g11-ae7d-9dc3f1681e9e';
        expect(GuidV4.isFullHexGuid(invalidChars)).toBeFalsy();
      });

      it('should reject incorrect dash positions', () => {
        const wrongDashes = '5549c83-a20fa-4a11-ae7d-9dc3f1681e9e';
        expect(GuidV4.isFullHexGuid(wrongDashes)).toBeFalsy();
      });

      it('should reject missing dashes', () => {
        const noDashes = '5549c83a20fa4a11ae7d9dc3f1681e9e';
        expect(GuidV4.isFullHexGuid(noDashes)).toBeFalsy();
      });

      it('should reject extra dashes', () => {
        const extraDashes = '5549c83a--20fa-4a11-ae7d-9dc3f1681e9e';
        expect(GuidV4.isFullHexGuid(extraDashes)).toBeFalsy();
      });
    });

    describe('Short Hex Format', () => {
      it('should validate correct format with mixed case', () => {
        const mixedCase = '5549C83a20fA4a11ae7D9dc3f1681e9e';
        expect(GuidV4.isShortHexGuid(mixedCase)).toBeTruthy();
      });

      it('should reject invalid characters', () => {
        const invalidChars = '5549c83a20fa4g11ae7d9dc3f1681e9e';
        expect(GuidV4.isShortHexGuid(invalidChars)).toBeFalsy();
      });

      it('should reject incorrect length', () => {
        const wrongLength = '5549c83a20fa4a11ae7d9dc3f1681e9';
        expect(GuidV4.isShortHexGuid(wrongLength)).toBeFalsy();
      });

      it('should reject dashes', () => {
        const withDashes = '5549c83a-20fa-4a11-ae7d-9dc3f1681e9e';
        expect(GuidV4.isShortHexGuid(withDashes)).toBeFalsy();
      });
    });

    describe('Base64 Format', () => {
      it('should validate correct base64 padding', () => {
        const validBase64 = Buffer.alloc(16).toString('base64');
        expect(GuidV4.isBase64Guid(validBase64)).toBeTruthy();
      });

      it('should reject invalid base64 characters', () => {
        const invalidChars = '!@#$%^&*()_+';
        expect(GuidV4.isBase64Guid(invalidChars)).toBeFalsy();
      });

      it('should reject incorrect padding', () => {
        const wrongPadding = Buffer.alloc(16).toString('base64').slice(0, -1);
        expect(GuidV4.isBase64Guid(wrongPadding)).toBeFalsy();
      });

      it('should reject non-base64 strings of correct length', () => {
        const invalidBase64 = 'x'.repeat(24);
        expect(GuidV4.isBase64Guid(invalidBase64)).toBeFalsy();
      });
    });

    describe('Buffer Format', () => {
      it('should validate correct buffer length', () => {
        const validBuffer = Buffer.alloc(16) as RawGuidBuffer;
        expect(GuidV4.isRawGuidBuffer(validBuffer)).toBeTruthy();
      });

      it('should reject too short buffer', () => {
        const shortBuffer = Buffer.alloc(15) as RawGuidBuffer;
        expect(GuidV4.isRawGuidBuffer(shortBuffer)).toBeFalsy();
      });

      it('should reject too long buffer', () => {
        const longBuffer = Buffer.alloc(17) as RawGuidBuffer;
        expect(GuidV4.isRawGuidBuffer(longBuffer)).toBeFalsy();
      });

      it('should reject non-buffer input', () => {
        expect(GuidV4.isRawGuidBuffer({} as RawGuidBuffer)).toBeFalsy();
      });
    });

    describe('BigInt Format', () => {
      it('should validate zero', () => {
        expect(GuidV4.isBigIntGuid(0n as BigIntGuid)).toBeTruthy();
      });

      it('should validate maximum value', () => {
        const maxBigInt = BigInt('0x' + 'f'.repeat(32)) as BigIntGuid;
        expect(GuidV4.isBigIntGuid(maxBigInt)).toBeTruthy();
      });

      it('should reject negative values', () => {
        expect(GuidV4.isBigIntGuid(-1n as BigIntGuid)).toBeFalsy();
      });

      it('should reject too large values', () => {
        const tooBig = BigInt('0x' + 'f'.repeat(33)) as BigIntGuid;
        expect(GuidV4.isBigIntGuid(tooBig)).toBeFalsy();
      });

      it('should reject non-bigint input', () => {
        expect(GuidV4.isBigIntGuid({} as unknown as BigIntGuid)).toBeFalsy();
      });
    });
  });

  describe('Error Handling', () => {
    it('should handle undefined input consistently', () => {
      expect(() => new GuidV4(undefined as unknown as string)).toThrowType(
        GuidError,
        (error: GuidError) => {
          expect(error.type).toBe(GuidErrorType.Invalid);
        },
      );
    });

    it('should handle non-string/non-buffer input', () => {
      expect(() => new GuidV4({} as unknown as string)).toThrowType(
        GuidError,
        (error: GuidError) => {
          expect(error.type).toBe(GuidErrorType.UnknownLength);
        },
      );
    });

    it('should handle invalid string length', () => {
      expect(() => new GuidV4('abc')).toThrowType(
        GuidError,
        (error: GuidError) => {
          expect(error.type).toBe(GuidErrorType.UnknownLength);
          expect(error.length).toBe(3);
        },
      );
    });

    it('should handle malformed hex string', () => {
      expect(
        () => new GuidV4('zzzzzzzz-zzzz-zzzz-zzzz-zzzzzzzzzzzz'),
      ).toThrowType(GuidError, (error: GuidError) => {
        expect(error.type).toBe(GuidErrorType.InvalidWithGuid);
      });
    });

    it('should handle malformed base64 string', () => {
      expect(() => new GuidV4('!@#$'.repeat(6))).toThrowType(
        GuidError,
        (error: GuidError) => {
          expect(error.type).toBe(GuidErrorType.InvalidWithGuid);
          expect(error.guid).toEqual(Buffer.from('!@#$'.repeat(6)));
        },
      );
    });
  });

  describe('Comparison', () => {
    it('should correctly compare equal guids from different formats', () => {
      jest.spyOn(uuid, 'validate').mockReturnValue(true);
      const guid1 = GuidV4.new();
      const guid2 = new GuidV4(guid1.asBase64Guid);
      const guid3 = new GuidV4(guid1.asBigIntGuid);
      const guid4 = new GuidV4(guid1.asRawGuidBuffer);

      expect(guid1.equals(guid2)).toBeTruthy();
      expect(guid2.equals(guid3)).toBeTruthy();
      expect(guid3.equals(guid4)).toBeTruthy();
      expect(guid4.equals(guid1)).toBeTruthy();
    });

    it('should correctly compare different guids', () => {
      jest.spyOn(uuid, 'validate').mockReturnValue(true);
      const guid1 = GuidV4.new();
      const guid2 = GuidV4.new();

      expect(guid1.equals(guid2)).toBeFalsy();
    });
  });

  describe('Brand Type Handling', () => {
    it('should handle unknown brand type', () => {
      expect(() => GuidV4.guidBrandToLength(GuidBrandType.Unknown)).toThrowType(
        GuidError,
        (error: GuidError) => {
          expect(error.type).toBe(GuidErrorType.UnknownBrand);
        },
      );
    });

    it('should handle unknown length', () => {
      expect(() => GuidV4.lengthToGuidBrand(0, false)).toThrowType(
        GuidError,
        (error: GuidError) => {
          expect(error.type).toBe(GuidErrorType.UnknownLength);
        },
      );
    });

    it('should handle buffer flag correctly', () => {
      expect(() => GuidV4.lengthToGuidBrand(36, true)).toThrowType(
        GuidError,
        (error: GuidError) => {
          expect(error.type).toBe(GuidErrorType.UnknownLength);
        },
      );
    });
  });
});
