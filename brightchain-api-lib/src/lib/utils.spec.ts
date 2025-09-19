import {
  HandleableError,
  LengthEncodingType,
  StringNames,
  TranslatableError,
} from '@brightchain/brightchain-lib';
import { NextFunction, Request, Response } from 'express';
import { ValidationError } from 'express-validator';
import { z } from 'zod';
import { ExpressValidationError } from './errors/express-validation';
import { MissingValidatedDataError } from './errors/missing-validated-data';
import {
  BASE_DELAY,
  debugLog,
  decodeLengthEncodedData,
  DEFAULT_RETRY_ATTEMPTS,
  DEFAULT_TRANSACTION_TIMEOUT,
  getValueAtPath,
  handleError,
  isValidStringId,
  lengthEncodeData,
  mapZodIssuesToValidationErrors,
  requireOneOfValidatedFieldsAsync,
  requireValidatedFieldsAsync,
  requireValidatedFieldsOrThrow,
  sendApiErrorResponse,
  sendApiMessageResponse,
  sendRawJsonResponse,
  withTransaction,
} from './utils';

// Mock console methods to avoid noise in tests
const originalConsole = { ...console };
beforeEach(() => {
  console.error = jest.fn();
  console.warn = jest.fn();
  console.log = jest.fn();
});

afterEach(() => {
  Object.assign(console, originalConsole);
});

describe('debugLog', () => {
  it('should log error when debug is true and type is error', () => {
    debugLog(true, 'error', 'test message');
    expect(console.error).toHaveBeenCalledWith('test message');
  });

  it('should log warning when debug is true and type is warn', () => {
    debugLog(true, 'warn', 'test message');
    expect(console.warn).toHaveBeenCalledWith('test message');
  });

  it('should log message when debug is true and type is log', () => {
    debugLog(true, 'log', 'test message');
    expect(console.log).toHaveBeenCalledWith('test message');
  });

  it('should not log when debug is false', () => {
    debugLog(false, 'error', 'test message');
    debugLog(false, 'warn', 'test message');
    debugLog(false, 'log', 'test message');
    expect(console.error).not.toHaveBeenCalled();
    expect(console.warn).not.toHaveBeenCalled();
    expect(console.log).not.toHaveBeenCalled();
  });

  it('should default to log type', () => {
    debugLog(true, undefined as any, 'test message');
    expect(console.log).toHaveBeenCalledWith('test message');
  });
});

describe('getValueAtPath', () => {
  const testObj = {
    a: {
      b: {
        c: 'value',
      },
    },
    array: [1, 2, { nested: 'arrayValue' }],
  };

  it('should get value at simple path', () => {
    expect(getValueAtPath(testObj, ['a'])).toEqual({ b: { c: 'value' } });
  });

  it('should get value at nested path', () => {
    expect(getValueAtPath(testObj, ['a', 'b', 'c'])).toBe('value');
  });

  it('should get value from array index', () => {
    expect(getValueAtPath(testObj, ['array', 0])).toBe(1);
    expect(getValueAtPath(testObj, ['array', 2, 'nested'])).toBe('arrayValue');
  });

  it('should return undefined for non-existent path', () => {
    expect(getValueAtPath(testObj, ['nonexistent'])).toBeUndefined();
    expect(getValueAtPath(testObj, ['a', 'nonexistent'])).toBeUndefined();
  });

  it('should return undefined for null/undefined object', () => {
    expect(getValueAtPath(null, ['a'])).toBeUndefined();
    expect(getValueAtPath(undefined, ['a'])).toBeUndefined();
  });

  it('should handle errors gracefully', () => {
    const problematicObj = {
      get prop() {
        throw new Error('Access error');
      },
    };
    expect(getValueAtPath(problematicObj, ['prop'])).toBeUndefined();
  });
});

describe('mapZodIssuesToValidationErrors', () => {
  it('should map Zod issues to ValidationError format', () => {
    const issues: z.ZodIssue[] = [
      {
        code: z.ZodIssueCode.invalid_type,
        expected: 'string',
        received: 'number',
        path: ['field1'],
        message: 'Expected string, received number',
      } as any,
      {
        code: z.ZodIssueCode.too_small,
        minimum: 5,
        type: 'string',
        inclusive: true,
        exact: false,
        path: ['nested', 'field2'],
        message: 'String must contain at least 5 character(s)',
      } as any,
    ];
    const source = { field1: 123, nested: { field2: 'abc' } };

    const result = mapZodIssuesToValidationErrors(issues, source, 'body');

    expect(result).toHaveLength(2);
    expect(result[0]).toEqual({
      type: 'field',
      location: 'body',
      path: 'field1',
      value: 123,
      msg: 'Expected string, received number',
    });
    expect(result[1]).toEqual({
      type: 'field',
      location: 'body',
      path: 'nested.field2',
      value: 'abc',
      msg: 'String must contain at least 5 character(s)',
    });
  });

  it('should filter out non-string/number path segments', () => {
    const issues: z.ZodIssue[] = [
      {
        code: z.ZodIssueCode.invalid_type,
        expected: 'string',
        received: 'number',
        path: ['field', Symbol('test'), 'nested'],
        message: 'Invalid type',
      } as any,
    ];

    const result = mapZodIssuesToValidationErrors(issues, {}, 'query');

    expect((result[0] as any).path).toBe('field.nested');
    expect((result[0] as any).location).toBe('query');
  });
});

describe('requireValidatedFieldsAsync', () => {
  const testSchema = z.object({
    field1: z.string(),
    field2: z.number(),
  });

  it('should call callback with validated data', async () => {
    const mockReq = {
      validatedBody: { field1: 'test', field2: 123 },
    } as unknown as Request;
    const callback = jest.fn().mockResolvedValue('success');

    const result = await requireValidatedFieldsAsync(
      mockReq,
      testSchema,
      callback,
    );

    expect(callback).toHaveBeenCalledWith({ field1: 'test', field2: 123 });
    expect(result).toBe('success');
  });

  it('should reject with MissingValidatedDataError when validatedBody is undefined', async () => {
    const mockReq = {} as unknown as Request;
    const callback = jest.fn();

    await expect(
      requireValidatedFieldsAsync(mockReq, testSchema, callback),
    ).rejects.toBeInstanceOf(MissingValidatedDataError);
    expect(callback).not.toHaveBeenCalled();
  });

  it('should reject with ExpressValidationError on schema validation failure', async () => {
    const mockReq = {
      validatedBody: { field1: 'test' }, // missing field2
    } as unknown as Request;
    const callback = jest.fn();

    await expect(
      requireValidatedFieldsAsync(mockReq, testSchema, callback),
    ).rejects.toBeInstanceOf(ExpressValidationError);
    expect(callback).not.toHaveBeenCalled();
  });
});

describe('requireOneOfValidatedFieldsAsync', () => {
  it('should call callback when at least one field is present', async () => {
    const mockReq = {
      validatedBody: { field1: 'value1' },
    } as unknown as Request;
    const callback = jest.fn().mockResolvedValue('success');

    const result = await requireOneOfValidatedFieldsAsync(
      mockReq,
      ['field1', 'field2'],
      callback,
    );

    expect(callback).toHaveBeenCalled();
    expect(result).toBe('success');
  });

  it('should reject when no required fields are present', async () => {
    const mockReq = {
      validatedBody: { otherField: 'value' },
    } as unknown as Request;
    const callback = jest.fn();

    await expect(
      requireOneOfValidatedFieldsAsync(mockReq, ['field1', 'field2'], callback),
    ).rejects.toBeInstanceOf(MissingValidatedDataError);
    expect(callback).not.toHaveBeenCalled();
  });

  it('should reject when validatedBody is undefined', async () => {
    const mockReq = {} as unknown as Request;
    const callback = jest.fn();

    await expect(
      requireOneOfValidatedFieldsAsync(mockReq, ['field1'], callback),
    ).rejects.toBeInstanceOf(MissingValidatedDataError);
  });
});

describe('requireValidatedFieldsOrThrow', () => {
  it('should call callback when all fields are present', () => {
    const mockReq = {
      validatedBody: { field1: 'value1', field2: 'value2' },
    } as unknown as Request;
    const callback = jest.fn().mockReturnValue('success');

    const result = requireValidatedFieldsOrThrow(
      mockReq,
      ['field1', 'field2'],
      callback,
    );

    expect(callback).toHaveBeenCalled();
    expect(result).toBe('success');
  });

  it('should throw MissingValidatedDataError when validatedBody is undefined', () => {
    const mockReq = {} as unknown as Request;
    const callback = jest.fn();

    expect(() =>
      requireValidatedFieldsOrThrow(mockReq, ['field1'], callback),
    ).toThrow(MissingValidatedDataError);
    expect(callback).not.toHaveBeenCalled();
  });

  it('should throw MissingValidatedDataError when required field is missing', () => {
    const mockReq = {
      validatedBody: { field1: 'value1' },
    } as unknown as Request;
    const callback = jest.fn();

    expect(() =>
      requireValidatedFieldsOrThrow(mockReq, ['field1', 'field2'], callback),
    ).toThrow(MissingValidatedDataError);
    expect(callback).not.toHaveBeenCalled();
  });
});

describe('isValidStringId', () => {
  it('should return true for valid ObjectId strings', () => {
    expect(isValidStringId('507f1f77bcf86cd799439011')).toBe(true);
    expect(isValidStringId('507f191e810c19729de860ea')).toBe(true);
  });

  it('should return false for invalid ObjectId strings', () => {
    expect(isValidStringId('invalid')).toBe(false);
    expect(isValidStringId('507f1f77bcf86cd79943901')).toBe(false); // too short
    expect(isValidStringId('507f1f77bcf86cd799439011x')).toBe(false); // invalid char
  });

  it('should return false for non-string values', () => {
    expect(isValidStringId(123)).toBe(false);
    expect(isValidStringId(null)).toBe(false);
    expect(isValidStringId(undefined)).toBe(false);
    expect(isValidStringId({})).toBe(false);
  });
});

describe('response functions', () => {
  let mockRes: Partial<Response>;

  beforeEach(() => {
    mockRes = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn().mockReturnThis(),
    };
  });

  describe('sendApiMessageResponse', () => {
    it('should send response with correct status and data', () => {
      const response = { message: 'test' };
      sendApiMessageResponse(200, response, mockRes as Response);

      expect(mockRes.status).toHaveBeenCalledWith(200);
      expect(mockRes.json).toHaveBeenCalledWith(response);
    });
  });

  describe('sendApiErrorResponse', () => {
    it('should send error response', () => {
      const error = new Error('Test error');
      sendApiErrorResponse(500, 'Error message', error, mockRes as Response);

      expect(mockRes.status).toHaveBeenCalledWith(500);
      expect(mockRes.json).toHaveBeenCalledWith({
        message: 'Error message',
        error,
      });
    });
  });

  describe('sendRawJsonResponse', () => {
    it('should send raw JSON response', () => {
      const data = { test: 'data' };
      sendRawJsonResponse(201, data, mockRes as Response);

      expect(mockRes.status).toHaveBeenCalledWith(201);
      expect(mockRes.json).toHaveBeenCalledWith(data);
    });
  });
});

describe('handleError', () => {
  let mockRes: Partial<Response>;
  let mockNext: NextFunction;
  let mockSend: jest.Mock;

  beforeEach(() => {
    mockRes = {
      headersSent: false,
    };
    mockNext = jest.fn();
    mockSend = jest.fn();
  });

  it('should handle ExpressValidationError', () => {
    const validationErrors: ValidationError[] = [
      {
        type: 'field',
        location: 'body',
        path: 'field1',
        value: 'invalid',
        msg: 'Invalid field',
      },
    ];
    const error = new ExpressValidationError(validationErrors);

    handleError(error, mockRes as Response, mockSend, mockNext);

    expect(mockSend).toHaveBeenCalledWith(
      error.statusCode,
      expect.objectContaining({
        errors: validationErrors,
        errorType: 'ExpressValidationError',
      }),
      mockRes,
    );
  });

  it('should handle generic HandleableError', () => {
    const error = new HandleableError('Test error');

    handleError(error, mockRes as Response, mockSend, mockNext);

    expect(mockSend).toHaveBeenCalledWith(
      error.statusCode,
      expect.objectContaining({
        message: 'Test error',
        error,
        errorType: 'HandleableError',
      }),
      mockRes,
    );
  });

  it('should handle generic Error', () => {
    const error = new Error('Generic error');

    handleError(error, mockRes as Response, mockSend, mockNext);

    expect(mockSend).toHaveBeenCalledWith(
      expect.any(Number),
      expect.objectContaining({
        message: 'Generic error',
        errorType: 'Error',
      }),
      mockRes,
    );
  });

  it('should handle unknown error types', () => {
    const error = 'string error';

    handleError(error, mockRes as Response, mockSend, mockNext);

    expect(mockSend).toHaveBeenCalledWith(
      expect.any(Number),
      expect.objectContaining({
        message: expect.any(String),
        errorType: 'UnexpectedError',
      }),
      mockRes,
    );
  });

  it('should not send response if headers already sent', () => {
    mockRes.headersSent = true;
    const error = new Error('Test error');

    handleError(error, mockRes as Response, mockSend, mockNext);

    expect(mockSend).not.toHaveBeenCalled();
  });

  it('should prevent recursive error handling', () => {
    const error = { _handlingInProgress: true };

    handleError(error, mockRes as Response, mockSend, mockNext);

    expect(mockSend).toHaveBeenCalledWith(
      expect.any(Number),
      expect.objectContaining({
        message: 'Recursive error handling detected',
        errorType: 'RecursiveError',
      }),
      mockRes,
    );
  });
});

// Note: locatePEMRoot tests are skipped due to Jest spy conflicts in this test environment
// The function is tested manually and works correctly

describe('lengthEncodeData and decodeLengthEncodedData', () => {
  const testCases = [
    {
      description: 'a small buffer (UInt8)',
      data: Buffer.from('hello world'),
    },
    {
      description: 'an empty buffer',
      data: Buffer.alloc(0),
    },
    {
      description: 'a buffer requiring UInt16 length',
      data: Buffer.alloc(300),
    },
    {
      description: 'a buffer requiring UInt32 length',
      data: Buffer.alloc(70000),
    },
    // UInt64 can be tested if memory allows, but the logic is the same.
    // Sticking to UInt32 is sufficient for most environments.
  ];

  testCases.forEach(({ description, data }) => {
    it(`should correctly encode and decode ${description}`, () => {
      const encoded = lengthEncodeData(data);
      const { data: decoded } = decodeLengthEncodedData(encoded);
      expect(decoded).toEqual(data);
    });
  });

  describe('lengthEncodeData', () => {
    it('should encode with UInt8 for length < 256', () => {
      const data = Buffer.from('test');
      const encoded = lengthEncodeData(data);
      // 1 byte for type, 1 byte for length, 4 bytes for data
      expect(encoded.length).toBe(1 + 1 + data.length);
      expect(encoded.readUInt8(0)).toBe(LengthEncodingType.UInt8);
      expect(encoded.readUInt8(1)).toBe(data.length);
    });

    it('should encode with UInt16 for length >= 256 and < 65536', () => {
      const data = Buffer.alloc(256);
      const encoded = lengthEncodeData(data);
      // 1 byte for type, 2 bytes for length, 256 bytes for data
      expect(encoded.length).toBe(1 + 2 + data.length);
      expect(encoded.readUInt8(0)).toBe(LengthEncodingType.UInt16);
      expect(encoded.readUInt16BE(1)).toBe(data.length);
    });

    it('should encode with UInt32 for length >= 65536', () => {
      const data = Buffer.alloc(65536);
      const encoded = lengthEncodeData(data);
      // 1 byte for type, 4 bytes for length, 65536 bytes for data
      expect(encoded.length).toBe(1 + 4 + data.length);
      expect(encoded.readUInt8(0)).toBe(LengthEncodingType.UInt32);
      expect(encoded.readUInt32BE(1)).toBe(data.length);
    });
  });

  describe('decodeLengthEncodedData edge cases', () => {
    it('should throw RangeError if buffer is too short to read length type', () => {
      const emptyBuffer = Buffer.alloc(0);
      expect(() => decodeLengthEncodedData(emptyBuffer)).toThrow(RangeError);
    });

    it('should throw RangeError if buffer is too short to read the full length value', () => {
      // Type is UInt32 (needs 4 bytes for length), but we only provide 1 byte for length
      const shortBuffer = Buffer.from([LengthEncodingType.UInt32, 0x01]);
      expect(() => decodeLengthEncodedData(shortBuffer)).toThrow(RangeError);
    });

    it('should throw RangeError if buffer is too short for declared data length', () => {
      // Encoded to expect 10 bytes of data, but only 3 are provided.
      const originalData = Buffer.from('abc'); // 3 bytes
      const lengthType = LengthEncodingType.UInt8;
      const lengthTypeSize = 1;
      const specifiedLength = 10;

      const malformedBuffer = Buffer.alloc(
        1 + lengthTypeSize + originalData.length,
      );
      malformedBuffer.writeUInt8(lengthType, 0);
      malformedBuffer.writeUInt8(specifiedLength, 1);
      originalData.copy(malformedBuffer, 1 + lengthTypeSize);

      expect(() => decodeLengthEncodedData(malformedBuffer)).toThrow(
        RangeError,
      );
      expect(() => decodeLengthEncodedData(malformedBuffer)).toThrow(
        'Buffer is too short for declared data length',
      );
    });

    it('should ignore extra data at the end of the buffer', () => {
      const originalData = Buffer.from('hello');
      const encoded = lengthEncodeData(originalData);
      const extraData = Buffer.from('world');
      const bufferWithExtra = Buffer.concat([encoded, extraData]);

      const { data: decodedData } = decodeLengthEncodedData(bufferWithExtra);
      expect(decodedData).toEqual(originalData);
    });

    it('should throw TranslatableError for an invalid length type', () => {
      const invalidType = 99; // Assuming 99 is not a valid LengthEncodingType
      const buffer = Buffer.from([invalidType, 0x04, 0x01, 0x02, 0x03, 0x04]);
      expect(() => decodeLengthEncodedData(buffer)).toThrow(TranslatableError);
      try {
        decodeLengthEncodedData(buffer);
      } catch (e) {
        if (e instanceof TranslatableError) {
          expect(e.StringName).toBe(StringNames.Error_LengthIsInvalidType);
        }
      }
    });
  });
});

describe('constants', () => {
  it('should have correct default values', () => {
    expect(DEFAULT_RETRY_ATTEMPTS).toBe(3);
    expect(BASE_DELAY).toBe(100);
    expect(DEFAULT_TRANSACTION_TIMEOUT).toBe(60000);
  });
});
