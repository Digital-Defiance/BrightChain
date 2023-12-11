import { CHECKSUM } from '@digitaldefiance/ecies-lib';
import { Checksum, ChecksumErrorType, isChecksum } from './checksum';

describe('Checksum', () => {
  // Helper to create valid checksum data
  const createValidData = (): Uint8Array => {
    const data = new Uint8Array(CHECKSUM.SHA3_BUFFER_LENGTH);
    for (let i = 0; i < data.length; i++) {
      data[i] = i % 256;
    }
    return data;
  };

  const createValidBuffer = (): Buffer => {
    return Buffer.from(createValidData());
  };

  const createValidHex = (): string => {
    return createValidBuffer().toString('hex');
  };

  describe('fromBuffer', () => {
    it('should create a Checksum from a valid Buffer', () => {
      const buffer = createValidBuffer();
      const checksum = Checksum.fromBuffer(buffer);
      expect(checksum).toBeInstanceOf(Checksum);
      expect(checksum.length).toBe(CHECKSUM.SHA3_BUFFER_LENGTH);
    });

    it('should throw an error for invalid buffer length', () => {
      const shortBuffer = Buffer.alloc(32);
      expect(() => Checksum.fromBuffer(shortBuffer)).toThrow(
        `Checksum must be ${CHECKSUM.SHA3_BUFFER_LENGTH} bytes`,
      );
    });

    it('should throw an error for empty buffer', () => {
      const emptyBuffer = Buffer.alloc(0);
      expect(() => Checksum.fromBuffer(emptyBuffer)).toThrow(
        `Checksum must be ${CHECKSUM.SHA3_BUFFER_LENGTH} bytes`,
      );
    });

    it('should create an immutable copy of the buffer', () => {
      const buffer = createValidBuffer();
      const checksum = Checksum.fromBuffer(buffer);
      const originalValue = buffer[0];
      buffer[0] = 255;
      expect(checksum.toBuffer()[0]).toBe(originalValue);
    });
  });

  describe('fromUint8Array', () => {
    it('should create a Checksum from a valid Uint8Array', () => {
      const array = createValidData();
      const checksum = Checksum.fromUint8Array(array);
      expect(checksum).toBeInstanceOf(Checksum);
      expect(checksum.length).toBe(CHECKSUM.SHA3_BUFFER_LENGTH);
    });

    it('should throw an error for invalid array length', () => {
      const shortArray = new Uint8Array(32);
      expect(() => Checksum.fromUint8Array(shortArray)).toThrow(
        `Checksum must be ${CHECKSUM.SHA3_BUFFER_LENGTH} bytes`,
      );
    });

    it('should throw an error for empty array', () => {
      const emptyArray = new Uint8Array(0);
      expect(() => Checksum.fromUint8Array(emptyArray)).toThrow(
        `Checksum must be ${CHECKSUM.SHA3_BUFFER_LENGTH} bytes`,
      );
    });

    it('should create an immutable copy of the array', () => {
      const array = createValidData();
      const checksum = Checksum.fromUint8Array(array);
      const originalValue = array[0];
      array[0] = 255;
      expect(checksum.toUint8Array()[0]).toBe(originalValue);
    });
  });

  describe('fromHex', () => {
    it('should create a Checksum from a valid hex string', () => {
      const hex = createValidHex();
      const checksum = Checksum.fromHex(hex);
      expect(checksum).toBeInstanceOf(Checksum);
      expect(checksum.length).toBe(CHECKSUM.SHA3_BUFFER_LENGTH);
    });

    it('should handle uppercase hex strings', () => {
      const hex = createValidHex().toUpperCase();
      const checksum = Checksum.fromHex(hex);
      expect(checksum).toBeInstanceOf(Checksum);
    });

    it('should handle mixed case hex strings', () => {
      const hex = createValidHex();
      const mixedHex = hex
        .split('')
        .map((c, i) => (i % 2 === 0 ? c.toUpperCase() : c.toLowerCase()))
        .join('');
      const checksum = Checksum.fromHex(mixedHex);
      expect(checksum).toBeInstanceOf(Checksum);
    });

    it('should throw an error for invalid hex characters', () => {
      const invalidHex = 'g'.repeat(CHECKSUM.SHA3_BUFFER_LENGTH * 2);
      expect(() => Checksum.fromHex(invalidHex)).toThrow(
        'Invalid hex string: contains non-hexadecimal characters',
      );
    });

    it('should throw an error for hex string with spaces', () => {
      const hexWithSpaces = createValidHex().slice(0, -2) + ' a';
      expect(() => Checksum.fromHex(hexWithSpaces)).toThrow(
        'Invalid hex string: contains non-hexadecimal characters',
      );
    });

    it('should throw an error for short hex string', () => {
      const shortHex = 'a'.repeat(32);
      expect(() => Checksum.fromHex(shortHex)).toThrow(
        `Invalid hex string length: expected ${CHECKSUM.SHA3_BUFFER_LENGTH * 2} characters`,
      );
    });

    it('should throw an error for long hex string', () => {
      const longHex = 'a'.repeat(CHECKSUM.SHA3_BUFFER_LENGTH * 2 + 2);
      expect(() => Checksum.fromHex(longHex)).toThrow(
        `Invalid hex string length: expected ${CHECKSUM.SHA3_BUFFER_LENGTH * 2} characters`,
      );
    });

    it('should throw an error for empty hex string', () => {
      expect(() => Checksum.fromHex('')).toThrow(
        `Invalid hex string length: expected ${CHECKSUM.SHA3_BUFFER_LENGTH * 2} characters`,
      );
    });
  });

  describe('equals', () => {
    it('should return true for equal checksums', () => {
      const data = createValidData();
      const checksum1 = Checksum.fromUint8Array(data);
      const checksum2 = Checksum.fromUint8Array(new Uint8Array(data));
      expect(checksum1.equals(checksum2)).toBe(true);
    });

    it('should return true for same checksum compared to itself', () => {
      const checksum = Checksum.fromBuffer(createValidBuffer());
      expect(checksum.equals(checksum)).toBe(true);
    });

    it('should return false for different checksums', () => {
      const data1 = createValidData();
      const data2 = createValidData();
      data2[0] = (data2[0] + 1) % 256;
      const checksum1 = Checksum.fromUint8Array(data1);
      const checksum2 = Checksum.fromUint8Array(data2);
      expect(checksum1.equals(checksum2)).toBe(false);
    });

    it('should return false when only last byte differs', () => {
      const data1 = createValidData();
      const data2 = createValidData();
      data2[data2.length - 1] = (data2[data2.length - 1] + 1) % 256;
      const checksum1 = Checksum.fromUint8Array(data1);
      const checksum2 = Checksum.fromUint8Array(data2);
      expect(checksum1.equals(checksum2)).toBe(false);
    });

    it('should be symmetric (a.equals(b) === b.equals(a))', () => {
      const checksum1 = Checksum.fromBuffer(createValidBuffer());
      const checksum2 = Checksum.fromBuffer(createValidBuffer());
      expect(checksum1.equals(checksum2)).toBe(checksum2.equals(checksum1));
    });
  });

  describe('toBuffer', () => {
    it('should return a Buffer with correct data', () => {
      const originalBuffer = createValidBuffer();
      const checksum = Checksum.fromBuffer(originalBuffer);
      const resultBuffer = checksum.toBuffer();
      expect(Buffer.compare(originalBuffer, resultBuffer)).toBe(0);
    });

    it('should return a new Buffer instance each time', () => {
      const checksum = Checksum.fromBuffer(createValidBuffer());
      const buffer1 = checksum.toBuffer();
      const buffer2 = checksum.toBuffer();
      expect(buffer1).not.toBe(buffer2);
      expect(Buffer.compare(buffer1, buffer2)).toBe(0);
    });

    it('should return a Buffer of correct length', () => {
      const checksum = Checksum.fromBuffer(createValidBuffer());
      expect(checksum.toBuffer().length).toBe(CHECKSUM.SHA3_BUFFER_LENGTH);
    });
  });

  describe('toUint8Array', () => {
    it('should return a Uint8Array with correct data', () => {
      const originalArray = createValidData();
      const checksum = Checksum.fromUint8Array(originalArray);
      const resultArray = checksum.toUint8Array();
      expect(resultArray).toEqual(originalArray);
    });

    it('should return a new Uint8Array instance each time', () => {
      const checksum = Checksum.fromUint8Array(createValidData());
      const array1 = checksum.toUint8Array();
      const array2 = checksum.toUint8Array();
      expect(array1).not.toBe(array2);
      expect(array1).toEqual(array2);
    });

    it('should return a Uint8Array of correct length', () => {
      const checksum = Checksum.fromUint8Array(createValidData());
      expect(checksum.toUint8Array().length).toBe(CHECKSUM.SHA3_BUFFER_LENGTH);
    });
  });

  describe('toHex', () => {
    it('should return a lowercase hex string', () => {
      const checksum = Checksum.fromBuffer(createValidBuffer());
      const hex = checksum.toHex();
      expect(hex).toBe(hex.toLowerCase());
    });

    it('should return hex string of correct length', () => {
      const checksum = Checksum.fromBuffer(createValidBuffer());
      const hex = checksum.toHex();
      expect(hex.length).toBe(CHECKSUM.SHA3_BUFFER_LENGTH * 2);
    });

    it('should round-trip correctly with fromHex', () => {
      const originalHex = createValidHex();
      const checksum = Checksum.fromHex(originalHex);
      expect(checksum.toHex()).toBe(originalHex.toLowerCase());
    });

    it('should contain only valid hex characters', () => {
      const checksum = Checksum.fromBuffer(createValidBuffer());
      const hex = checksum.toHex();
      expect(/^[0-9a-f]+$/.test(hex)).toBe(true);
    });
  });

  describe('toString', () => {
    it('should return the same value as toHex', () => {
      const checksum = Checksum.fromBuffer(createValidBuffer());
      expect(checksum.toString()).toBe(checksum.toHex());
    });

    it('should work with string interpolation', () => {
      const checksum = Checksum.fromBuffer(createValidBuffer());
      const interpolated = `${checksum}`;
      expect(interpolated).toBe(checksum.toHex());
    });
  });

  describe('length', () => {
    it('should return the correct length', () => {
      const checksum = Checksum.fromBuffer(createValidBuffer());
      expect(checksum.length).toBe(CHECKSUM.SHA3_BUFFER_LENGTH);
    });
  });

  describe('round-trip conversions', () => {
    it('should preserve data through Buffer round-trip', () => {
      const originalBuffer = createValidBuffer();
      const checksum = Checksum.fromBuffer(originalBuffer);
      const resultBuffer = checksum.toBuffer();
      expect(Buffer.compare(originalBuffer, resultBuffer)).toBe(0);
    });

    it('should preserve data through Uint8Array round-trip', () => {
      const originalArray = createValidData();
      const checksum = Checksum.fromUint8Array(originalArray);
      const resultArray = checksum.toUint8Array();
      expect(resultArray).toEqual(originalArray);
    });

    it('should preserve data through hex round-trip', () => {
      const originalHex = createValidHex();
      const checksum = Checksum.fromHex(originalHex);
      expect(checksum.toHex()).toBe(originalHex.toLowerCase());
    });

    it('should preserve data through mixed format conversions', () => {
      const originalBuffer = createValidBuffer();
      const checksum1 = Checksum.fromBuffer(originalBuffer);
      const hex = checksum1.toHex();
      const checksum2 = Checksum.fromHex(hex);
      const array = checksum2.toUint8Array();
      const checksum3 = Checksum.fromUint8Array(array);
      expect(checksum1.equals(checksum3)).toBe(true);
    });
  });
});

describe('isChecksum', () => {
  it('should return true for Checksum instances', () => {
    const data = new Uint8Array(CHECKSUM.SHA3_BUFFER_LENGTH);
    const checksum = Checksum.fromUint8Array(data);
    expect(isChecksum(checksum)).toBe(true);
  });

  it('should return false for Buffer', () => {
    const buffer = Buffer.alloc(CHECKSUM.SHA3_BUFFER_LENGTH);
    expect(isChecksum(buffer)).toBe(false);
  });

  it('should return false for Uint8Array', () => {
    const array = new Uint8Array(CHECKSUM.SHA3_BUFFER_LENGTH);
    expect(isChecksum(array)).toBe(false);
  });

  it('should return false for string', () => {
    expect(isChecksum('a'.repeat(CHECKSUM.SHA3_BUFFER_LENGTH * 2))).toBe(false);
  });

  it('should return false for null', () => {
    expect(isChecksum(null)).toBe(false);
  });

  it('should return false for undefined', () => {
    expect(isChecksum(undefined)).toBe(false);
  });

  it('should return false for plain object', () => {
    expect(
      isChecksum({ data: new Uint8Array(CHECKSUM.SHA3_BUFFER_LENGTH) }),
    ).toBe(false);
  });

  it('should return false for number', () => {
    expect(isChecksum(123)).toBe(false);
  });
});

describe('ChecksumErrorType', () => {
  it('should have InvalidLength type', () => {
    expect(ChecksumErrorType.InvalidLength).toBe('InvalidLength');
  });

  it('should have InvalidHex type', () => {
    expect(ChecksumErrorType.InvalidHex).toBe('InvalidHex');
  });

  it('should have ConversionFailed type', () => {
    expect(ChecksumErrorType.ConversionFailed).toBe('ConversionFailed');
  });

  it('should have ComparisonFailed type', () => {
    expect(ChecksumErrorType.ComparisonFailed).toBe('ComparisonFailed');
  });
});
