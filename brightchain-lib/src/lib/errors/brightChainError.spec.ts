import { BrightChainError, isBrightChainError } from './brightChainError';

// Concrete implementation for testing since BrightChainError is abstract
class TestError extends BrightChainError {
  constructor(
    message: string,
    context?: Record<string, unknown>,
    cause?: Error,
  ) {
    super('Test', message, context, cause);
  }
}

describe('BrightChainError', () => {
  describe('constructor', () => {
    it('should create an error with the correct type', () => {
      const error = new TestError('Test message');
      expect(error.type).toBe('Test');
    });

    it('should create an error with the correct message', () => {
      const message = 'Something went wrong';
      const error = new TestError(message);
      expect(error.message).toBe(message);
    });

    it('should set the error name to the class name', () => {
      const error = new TestError('Test');
      expect(error.name).toBe('TestError');
    });

    it('should extend Error', () => {
      const error = new TestError('Test');
      expect(error).toBeInstanceOf(Error);
    });

    it('should have a stack trace', () => {
      const error = new TestError('Test');
      expect(error.stack).toBeDefined();
      expect(typeof error.stack).toBe('string');
    });

    it('should include context when provided', () => {
      const context = { operationId: '123', userId: 'abc' };
      const error = new TestError('Test', context);
      expect(error.context).toEqual(context);
    });

    it('should have undefined context when not provided', () => {
      const error = new TestError('Test');
      expect(error.context).toBeUndefined();
    });

    it('should include cause when provided', () => {
      const cause = new Error('Original error');
      const error = new TestError('Wrapped error', undefined, cause);
      expect(error.cause).toBe(cause);
    });

    it('should have undefined cause when not provided', () => {
      const error = new TestError('Test');
      expect(error.cause).toBeUndefined();
    });
  });

  describe('toJSON', () => {
    it('should return a JSON-serializable object', () => {
      const error = new TestError('Test message', { key: 'value' });
      const json = error.toJSON();
      expect(json).toEqual({
        name: 'TestError',
        type: 'Test',
        message: 'Test message',
        context: { key: 'value' },
        cause: undefined,
        stack: expect.any(String),
      });
    });

    it('should include cause message when cause is provided', () => {
      const cause = new Error('Original error');
      const error = new TestError('Wrapped error', undefined, cause);
      const json = error.toJSON();
      expect(json).toEqual({
        name: 'TestError',
        type: 'Test',
        message: 'Wrapped error',
        context: undefined,
        cause: 'Original error',
        stack: expect.any(String),
      });
    });

    it('should be serializable with JSON.stringify', () => {
      const error = new TestError('Test', { data: 123 });
      const jsonString = JSON.stringify(error.toJSON());
      const parsed = JSON.parse(jsonString);
      expect(parsed.name).toBe('TestError');
      expect(parsed.type).toBe('Test');
      expect(parsed.message).toBe('Test');
      expect(parsed.context).toEqual({ data: 123 });
    });

    it('should handle nested context objects', () => {
      const context = {
        outer: {
          inner: {
            value: 'nested',
          },
        },
      };
      const error = new TestError('Test', context);
      const json = error.toJSON();
      expect(json).toHaveProperty('context.outer.inner.value', 'nested');
    });
  });

  describe('error chaining', () => {
    it('should preserve the original error as cause', () => {
      const originalError = new Error('Database connection failed');
      const wrappedError = new TestError(
        'Service operation failed',
        { service: 'UserService' },
        originalError,
      );
      expect(wrappedError.cause).toBe(originalError);
      expect(wrappedError.cause?.message).toBe('Database connection failed');
    });

    it('should allow multiple levels of error wrapping', () => {
      const level1 = new Error('Low level error');
      const level2 = new TestError('Mid level error', undefined, level1);
      const level3 = new TestError('High level error', undefined, level2);

      expect(level3.cause).toBe(level2);
      expect((level3.cause as TestError).cause).toBe(level1);
    });
  });

  describe('context preservation', () => {
    it('should preserve all context properties', () => {
      const context = {
        serviceName: 'ChecksumService',
        methodName: 'validate',
        inputLength: 32,
        expectedLength: 64,
        timestamp: new Date().toISOString(),
      };
      const error = new TestError('Validation failed', context);
      expect(error.context).toEqual(context);
    });

    it('should handle empty context object', () => {
      const error = new TestError('Test', {});
      expect(error.context).toEqual({});
    });

    it('should handle context with array values', () => {
      const context = {
        invalidFields: ['field1', 'field2'],
        counts: [1, 2, 3],
      };
      const error = new TestError('Multiple validation errors', context);
      expect(error.context).toEqual(context);
    });
  });
});

describe('isBrightChainError', () => {
  it('should return true for BrightChainError subclass instances', () => {
    const error = new TestError('Test');
    expect(isBrightChainError(error)).toBe(true);
  });

  it('should return false for generic Error', () => {
    const error = new Error('Test');
    expect(isBrightChainError(error)).toBe(false);
  });

  it('should return false for null', () => {
    expect(isBrightChainError(null)).toBe(false);
  });

  it('should return false for undefined', () => {
    expect(isBrightChainError(undefined)).toBe(false);
  });

  it('should return false for plain object with similar properties', () => {
    const fakeError = {
      type: 'Test',
      message: 'Test',
      context: {},
      toJSON: () => ({}),
    };
    expect(isBrightChainError(fakeError)).toBe(false);
  });

  it('should return false for string', () => {
    expect(isBrightChainError('BrightChainError')).toBe(false);
  });

  it('should return false for number', () => {
    expect(isBrightChainError(123)).toBe(false);
  });

  it('should narrow type correctly in TypeScript', () => {
    const maybeError: unknown = new TestError('Test');
    if (isBrightChainError(maybeError)) {
      // TypeScript should recognize these properties
      expect(maybeError.type).toBe('Test');
      expect(maybeError.message).toBe('Test');
      expect(typeof maybeError.toJSON).toBe('function');
    }
  });
});
