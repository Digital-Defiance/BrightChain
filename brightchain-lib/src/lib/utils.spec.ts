import { LengthEncodingType } from './enumerations/lengthEncodingType';
import { TranslatableError } from './errors/translatable';
import { GlobalActiveContext } from './globalActiveContext';
import { t, translate } from './i18n';
import { LanguageContext } from './sharedTypes';
import {
  arraysEqual,
  base64ToUint8Array,
  concatUint8Arrays,
  crc16,
  debugLog,
  decodeLengthEncodedData,
  getLengthEncodingTypeForLength,
  getLengthEncodingTypeFromValue,
  getLengthForLengthType,
  hexToUint8Array,
  isValidTimezone,
  lengthEncodeData,
  omit,
  randomBytes,
  stringToUint8Array,
  translatedDebugLog,
  uint8ArrayToBase64,
  uint8ArrayToHex,
  uint8ArrayToString,
  validateEnumCollection,
} from './utils';

// Mock dependencies
jest.mock('./i18n', () => ({
  t: jest.fn(),
  translate: jest.fn(),
}));

jest.mock('./global-active-context', () => ({
  GlobalActiveContext: {
    adminLanguage: 'en-US',
    currentContext: 'user',
  },
}));

describe('debugLog', () => {
  let consoleLogSpy: jest.SpyInstance;
  let consoleWarnSpy: jest.SpyInstance;
  let consoleErrorSpy: jest.SpyInstance;

  beforeEach(() => {
    // Spy on console methods
    consoleLogSpy = jest.spyOn(console, 'log').mockImplementation(() => {});
    consoleWarnSpy = jest.spyOn(console, 'warn').mockImplementation(() => {});
    consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation(() => {});
  });

  afterEach(() => {
    // Restore console spies
    consoleLogSpy.mockRestore();
    consoleWarnSpy.mockRestore();
    consoleErrorSpy.mockRestore();
  });

  it('should call console.log for "log" type when debug is true', () => {
    debugLog(true, 'log', 'message');
    expect(consoleLogSpy).toHaveBeenCalledWith('message');
  });

  it('should call console.warn for "warn" type when debug is true', () => {
    debugLog(true, 'warn', 'message');
    expect(consoleWarnSpy).toHaveBeenCalledWith('message');
  });

  it('should call console.error for "error" type when debug is true', () => {
    debugLog(true, 'error', 'message');
    expect(consoleErrorSpy).toHaveBeenCalledWith('message');
  });

  it('should not call any console method when debug is false', () => {
    debugLog(false, 'log', 'message');
    debugLog(false, 'warn', 'message');
    debugLog(false, 'error', 'message');
    expect(consoleLogSpy).not.toHaveBeenCalled();
    expect(consoleWarnSpy).not.toHaveBeenCalled();
    expect(consoleErrorSpy).not.toHaveBeenCalled();
  });

  it('should default to "log" type', () => {
    debugLog(true, undefined, 'message');
    expect(consoleLogSpy).toHaveBeenCalledWith('message');
  });
});

describe('translatedDebugLog', () => {
  let consoleLogSpy: jest.SpyInstance;
  let consoleWarnSpy: jest.SpyInstance;
  let consoleErrorSpy: jest.SpyInstance;

  beforeEach(() => {
    // Clear mocks and spy on console methods
    (t as jest.Mock).mockClear();
    (translate as jest.Mock).mockReturnValue('Mocked error message');
    consoleLogSpy = jest.spyOn(console, 'log').mockImplementation(() => {});
    consoleWarnSpy = jest.spyOn(console, 'warn').mockImplementation(() => {});
    consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation(() => {});
  });

  afterEach(() => {
    // Restore console spies
    consoleLogSpy.mockRestore();
    consoleWarnSpy.mockRestore();
    consoleErrorSpy.mockRestore();
  });

  it('should call t with correct parameters and default context', () => {
    const stringValue = 'Test string';
    const otherVars = [{ key: 'value' }];
    (t as jest.Mock).mockReturnValue('Translated string');

    translatedDebugLog(true, 'log', undefined, stringValue, otherVars, 'extra');

    expect(t).toHaveBeenCalledWith(
      stringValue,
      GlobalActiveContext.adminLanguage,
      GlobalActiveContext.currentContext,
      ...otherVars,
    );
  });

  it('should call t with a specific context', () => {
    const stringValue = 'Admin action: {{StringName.Action}}';
    const context: LanguageContext = 'admin';
    (t as jest.Mock).mockReturnValue('Translated admin action');

    translatedDebugLog(true, 'log', context, stringValue);

    expect(t).toHaveBeenCalledWith(
      stringValue,
      GlobalActiveContext.adminLanguage,
      context,
    );
  });

  it('should call console.log for "log" type when debug is true', () => {
    const translatedString = 'Log message';
    (t as jest.Mock).mockReturnValue(translatedString);
    translatedDebugLog(true, 'log', 'user', 'test');
    expect(consoleLogSpy).toHaveBeenCalledWith(translatedString);
    expect(consoleWarnSpy).not.toHaveBeenCalled();
    expect(consoleErrorSpy).not.toHaveBeenCalled();
  });

  it('should call console.warn for "warn" type when debug is true', () => {
    const translatedString = 'Warning message';
    (t as jest.Mock).mockReturnValue(translatedString);
    translatedDebugLog(true, 'warn', 'user', 'test');
    expect(consoleWarnSpy).toHaveBeenCalledWith(translatedString);
    expect(consoleLogSpy).not.toHaveBeenCalled();
    expect(consoleErrorSpy).not.toHaveBeenCalled();
  });

  it('should call console.error for "error" type when debug is true', () => {
    const translatedString = 'Error message';
    (t as jest.Mock).mockReturnValue(translatedString);
    translatedDebugLog(true, 'error', 'user', 'test');
    expect(consoleErrorSpy).toHaveBeenCalledWith(translatedString);
    expect(consoleLogSpy).not.toHaveBeenCalled();
    expect(consoleWarnSpy).not.toHaveBeenCalled();
  });

  it('should not call any console method when debug is false', () => {
    (t as jest.Mock).mockReturnValue('Some message');
    translatedDebugLog(false, 'log', 'user', 'test');
    translatedDebugLog(false, 'warn', 'user', 'test');
    translatedDebugLog(false, 'error', 'user', 'test');

    expect(consoleLogSpy).not.toHaveBeenCalled();
    expect(consoleWarnSpy).not.toHaveBeenCalled();
    expect(consoleErrorSpy).not.toHaveBeenCalled();
  });

  it('should pass extra arguments to the console method', () => {
    const translatedString = 'Message with args';
    const arg1 = { a: 1 };
    const arg2 = [1, 2, 3];
    (t as jest.Mock).mockReturnValue(translatedString);

    translatedDebugLog(true, 'log', 'user', 'test', [], arg1, arg2);

    expect(consoleLogSpy).toHaveBeenCalledWith(translatedString, arg1, arg2);
  });

  it('should handle calls without otherVars', () => {
    const translatedString = 'Simple message';
    (t as jest.Mock).mockReturnValue(translatedString);

    translatedDebugLog(true, 'log', 'user', 'test');

    expect(t).toHaveBeenCalledWith(
      'test',
      GlobalActiveContext.adminLanguage,
      'user',
    );
    expect(consoleLogSpy).toHaveBeenCalledWith(translatedString);
  });
});

describe('isValidTimezone', () => {
  it('should return true for a valid timezone', () => {
    expect(isValidTimezone('America/New_York')).toBe(true);
  });

  it('should return false for an invalid timezone', () => {
    expect(isValidTimezone('Invalid/Timezone')).toBe(false);
  });
});

describe('omit', () => {
  it('should omit specified keys from an object', () => {
    const obj = { a: 1, b: 2, c: 3 };
    const result = omit(obj, ['b']);
    expect(result).toEqual({ a: 1, c: 3 });
    expect(result).not.toHaveProperty('b');
  });
});

describe('validateEnumCollection', () => {
  enum TestEnum {
    A = 'A_VAL',
    B = 'B_VAL',
  }

  it('should not throw for a valid collection', () => {
    const collection = { A_VAL: 1, B_VAL: 2 };
    expect(() =>
      validateEnumCollection(collection, TestEnum, 'TestCollection'),
    ).not.toThrow();
  });

  it('should throw if there are missing keys', () => {
    const collection = { A_VAL: 1 };
    expect(() =>
      validateEnumCollection(collection, TestEnum, 'TestCollection'),
    ).toThrow(
      'TestCollection must contain exactly 2 keys to match enum with keys [A, B]. Found 1 keys: [A_VAL]',
    );
  });

  it('should throw if there are extra keys', () => {
    const collection = { A_VAL: 1, B_VAL: 2, C_VAL: 3 };
    expect(() =>
      validateEnumCollection(collection, TestEnum, 'TestCollection'),
    ).toThrow(
      'TestCollection must contain exactly 2 keys to match enum with keys [A, B]. Found 3 keys: [A_VAL, B_VAL, C_VAL]',
    );
  });

  it('should throw if there are invalid keys', () => {
    const collection = { A_VAL: 1, C_VAL: 2 };
    expect(() =>
      validateEnumCollection(collection, TestEnum, 'TestCollection'),
    ).toThrow(
      'TestCollection contains invalid keys for enum with keys [A, B]: [C_VAL]. Valid keys are: [A_VAL, B_VAL]',
    );
  });
});

describe('base64 encoding/decoding', () => {
  it('should correctly convert a Uint8Array to a base64 string and back', () => {
    const original = new Uint8Array([104, 101, 108, 108, 111]); // "hello"
    const base64 = uint8ArrayToBase64(original);
    expect(base64).toBe('aGVsbG8=');
    const decoded = base64ToUint8Array(base64);
    expect(decoded).toEqual(original);
  });
});

describe('hex encoding/decoding', () => {
  it('should correctly convert a Uint8Array to a hex string and back', () => {
    const original = new Uint8Array([104, 101, 108, 108, 111]); // "hello"
    const hex = uint8ArrayToHex(original);
    expect(hex).toBe('68656c6c6f');
    const decoded = hexToUint8Array(hex);
    expect(decoded).toEqual(original);
  });
});

describe('crc16', () => {
  it('should compute the correct CRC16-CCITT checksum', () => {
    const data = new Uint8Array([
      0x31, 0x32, 0x33, 0x34, 0x35, 0x36, 0x37, 0x38, 0x39,
    ]); // "123456789"
    const expectedCrc = new Uint8Array([0x29, 0xb1]);
    expect(crc16(data)).toEqual(expectedCrc);
  });
});

describe('string/Uint8Array conversion', () => {
  it('should correctly convert a string to a Uint8Array and back', () => {
    const original = 'hello world';
    const uint8Array = stringToUint8Array(original);
    expect(uint8Array).toEqual(
      new Uint8Array([104, 101, 108, 108, 111, 32, 119, 111, 114, 108, 100]),
    );
    const decoded = uint8ArrayToString(uint8Array);
    expect(decoded).toBe(original);
  });
});

describe('randomBytes', () => {
  it('should generate a Uint8Array of the specified length', () => {
    const length = 16;
    const bytes = randomBytes(length);
    expect(bytes).toBeInstanceOf(Uint8Array);
    expect(bytes.length).toBe(length);
  });
});

describe('arraysEqual', () => {
  it('should return true for equal arrays', () => {
    const a = new Uint8Array([1, 2, 3]);
    const b = new Uint8Array([1, 2, 3]);
    expect(arraysEqual(a, b)).toBe(true);
  });

  it('should return false for arrays of different lengths', () => {
    const a = new Uint8Array([1, 2, 3]);
    const b = new Uint8Array([1, 2]);
    expect(arraysEqual(a, b)).toBe(false);
  });

  it('should return false for arrays with different content', () => {
    const a = new Uint8Array([1, 2, 3]);
    const b = new Uint8Array([1, 2, 4]);
    expect(arraysEqual(a, b)).toBe(false);
  });
});

describe('concatUint8Arrays', () => {
  it('should concatenate multiple Uint8Arrays', () => {
    const a = new Uint8Array([1, 2]);
    const b = new Uint8Array([3, 4]);
    const c = new Uint8Array([5, 6]);
    const result = concatUint8Arrays(a, b, c);
    expect(result).toEqual(new Uint8Array([1, 2, 3, 4, 5, 6]));
  });
});

describe('getLengthEncodingTypeForLength', () => {
  it('should return UInt8 for numbers < 256', () => {
    expect(getLengthEncodingTypeForLength(0)).toBe(LengthEncodingType.UInt8);
    expect(getLengthEncodingTypeForLength(255)).toBe(LengthEncodingType.UInt8);
  });

  it('should return UInt16 for numbers < 65536', () => {
    expect(getLengthEncodingTypeForLength(256)).toBe(LengthEncodingType.UInt16);
    expect(getLengthEncodingTypeForLength(65535)).toBe(
      LengthEncodingType.UInt16,
    );
  });

  it('should return UInt32 for numbers < 4294967296', () => {
    expect(getLengthEncodingTypeForLength(65536)).toBe(
      LengthEncodingType.UInt32,
    );
    expect(getLengthEncodingTypeForLength(4294967295)).toBe(
      LengthEncodingType.UInt32,
    );
  });

  it('should return UInt64 for numbers < 18446744073709551616', () => {
    expect(getLengthEncodingTypeForLength(4294967296)).toBe(
      LengthEncodingType.UInt64,
    );
  });

  it('should throw for numbers >= 18446744073709551616', () => {
    expect(() =>
      getLengthEncodingTypeForLength(Number.MAX_SAFE_INTEGER + 1),
    ).toThrow(TranslatableError);
  });

  it('should return UInt8 for bigints < 256n', () => {
    expect(getLengthEncodingTypeForLength(0n)).toBe(LengthEncodingType.UInt8);
    expect(getLengthEncodingTypeForLength(255n)).toBe(LengthEncodingType.UInt8);
  });

  it('should return UInt16 for bigints < 65536n', () => {
    expect(getLengthEncodingTypeForLength(256n)).toBe(
      LengthEncodingType.UInt16,
    );
    expect(getLengthEncodingTypeForLength(65535n)).toBe(
      LengthEncodingType.UInt16,
    );
  });

  it('should return UInt32 for bigints < 4294967296n', () => {
    expect(getLengthEncodingTypeForLength(65536n)).toBe(
      LengthEncodingType.UInt32,
    );
    expect(getLengthEncodingTypeForLength(4294967295n)).toBe(
      LengthEncodingType.UInt32,
    );
  });

  it('should return UInt64 for bigints < 18446744073709551616n', () => {
    expect(getLengthEncodingTypeForLength(4294967296n)).toBe(
      LengthEncodingType.UInt64,
    );
    expect(getLengthEncodingTypeForLength(18446744073709551615n)).toBe(
      LengthEncodingType.UInt64,
    );
  });

  it('should throw for bigints >= 18446744073709551616n', () => {
    expect(() => getLengthEncodingTypeForLength(18446744073709551616n)).toThrow(
      TranslatableError,
    );
  });

  it('should throw for invalid types', () => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    expect(() => getLengthEncodingTypeForLength('invalid' as any)).toThrow(
      TranslatableError,
    );
  });
});

describe('getLengthEncodingTypeFromValue', () => {
  it('should return correct type for valid values', () => {
    expect(getLengthEncodingTypeFromValue(0)).toBe(LengthEncodingType.UInt8);
    expect(getLengthEncodingTypeFromValue(1)).toBe(LengthEncodingType.UInt16);
    expect(getLengthEncodingTypeFromValue(2)).toBe(LengthEncodingType.UInt32);
    expect(getLengthEncodingTypeFromValue(3)).toBe(LengthEncodingType.UInt64);
  });

  it('should throw for invalid values', () => {
    expect(() => getLengthEncodingTypeFromValue(4)).toThrow(TranslatableError);
    expect(() => getLengthEncodingTypeFromValue(-1)).toThrow(TranslatableError);
  });
});

describe('getLengthForLengthType', () => {
  it('should return correct byte lengths', () => {
    expect(getLengthForLengthType(LengthEncodingType.UInt8)).toBe(1);
    expect(getLengthForLengthType(LengthEncodingType.UInt16)).toBe(2);
    expect(getLengthForLengthType(LengthEncodingType.UInt32)).toBe(4);
    expect(getLengthForLengthType(LengthEncodingType.UInt64)).toBe(8);
  });

  it('should throw for invalid types', () => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    expect(() => getLengthForLengthType(999 as any)).toThrow(TranslatableError);
  });
});

describe('lengthEncodeData and decodeLengthEncodedData', () => {
  const testCases = [
    {
      description: 'should correctly encode and decode a small buffer (UInt8)',
      size: 10,
      lengthType: LengthEncodingType.UInt8,
    },
    {
      description:
        'should correctly encode and decode a medium buffer (UInt16)',
      size: 300, // 256 < size < 65536
      lengthType: LengthEncodingType.UInt16,
    },
    {
      description: 'should correctly encode and decode a large buffer (UInt32)',
      size: 70000, // 65536 < size < 4294967296
      lengthType: LengthEncodingType.UInt32,
    },
  ];

  testCases.forEach(({ description, size }) => {
    it(description, () => {
      const originalData = new TextEncoder().encode('a'.repeat(size));
      const encodedData = lengthEncodeData(originalData);
      const { data: decodedData } = decodeLengthEncodedData(encodedData);
      expect(decodedData).toEqual(originalData);
    });
  });

  it('should correctly encode and decode a very large buffer (UInt64)', () => {
    // We use a smaller buffer but simulate a large length to avoid memory issues
    const originalData = new TextEncoder().encode('hello world');
    const largeLength = BigInt('5000000000'); // A length requiring UInt64

    // Manually construct the encoded buffer for the test
    const lengthType = LengthEncodingType.UInt64;
    const lengthTypeSize = 8;
    const encodedData = new Uint8Array(
      1 + lengthTypeSize + originalData.length,
    );
    const view = new DataView(encodedData.buffer);

    view.setUint8(0, lengthType);
    view.setBigUint64(1, largeLength, false); // false for big-endian
    encodedData.set(originalData, 1 + lengthTypeSize);

    // Now, decode it and check if we get the original data back
    const { data: decodedData } = decodeLengthEncodedData(encodedData);

    expect(decodedData).toEqual(originalData);
  });

  it('should encode data with the correct length type prefix', () => {
    const buffer8 = new Uint8Array(10);
    const encoded8 = lengthEncodeData(buffer8);
    expect(encoded8[0]).toBe(LengthEncodingType.UInt8);

    const buffer16 = new Uint8Array(300);
    const encoded16 = lengthEncodeData(buffer16);
    expect(encoded16[0]).toBe(LengthEncodingType.UInt16);

    const buffer32 = new Uint8Array(70000);
    const encoded32 = lengthEncodeData(buffer32);
    expect(encoded32[0]).toBe(LengthEncodingType.UInt32);
  });

  it('decodeLengthEncodedData should throw an error for an invalid length type', () => {
    const invalidBuffer = new Uint8Array([99, 0, 0, 0, 0]); // 99 is not a valid LengthEncodingType
    expect(() => decodeLengthEncodedData(invalidBuffer)).toThrow(
      new TranslatableError(StringName.Error_LengthIsInvalidType),
    );
  });
});
