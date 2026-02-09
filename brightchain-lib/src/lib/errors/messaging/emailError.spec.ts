import { EmailErrorType } from '../../enumerations/messaging/emailErrorType';
import { BrightChainError, isBrightChainError } from '../brightChainError';
import { EmailError, isEmailError } from './emailError';

describe('EmailErrorType', () => {
  it('should define all validation error types', () => {
    expect(EmailErrorType.INVALID_HEADER_NAME).toBe('INVALID_HEADER_NAME');
    expect(EmailErrorType.INVALID_MAILBOX).toBe('INVALID_MAILBOX');
    expect(EmailErrorType.INVALID_MESSAGE_ID).toBe('INVALID_MESSAGE_ID');
    expect(EmailErrorType.INVALID_DATE).toBe('INVALID_DATE');
    expect(EmailErrorType.INVALID_CONTENT_TYPE).toBe('INVALID_CONTENT_TYPE');
    expect(EmailErrorType.INVALID_BOUNDARY).toBe('INVALID_BOUNDARY');
    expect(EmailErrorType.MISSING_REQUIRED_HEADER).toBe(
      'MISSING_REQUIRED_HEADER',
    );
    expect(EmailErrorType.NO_RECIPIENTS).toBe('NO_RECIPIENTS');
  });

  it('should define all size error types', () => {
    expect(EmailErrorType.ATTACHMENT_TOO_LARGE).toBe('ATTACHMENT_TOO_LARGE');
    expect(EmailErrorType.MESSAGE_TOO_LARGE).toBe('MESSAGE_TOO_LARGE');
  });

  it('should define all parsing error types', () => {
    expect(EmailErrorType.PARSE_ERROR).toBe('PARSE_ERROR');
    expect(EmailErrorType.MALFORMED_HEADER).toBe('MALFORMED_HEADER');
    expect(EmailErrorType.MALFORMED_MIME).toBe('MALFORMED_MIME');
    expect(EmailErrorType.ENCODING_ERROR).toBe('ENCODING_ERROR');
  });

  it('should define all delivery error types', () => {
    expect(EmailErrorType.RECIPIENT_NOT_FOUND).toBe('RECIPIENT_NOT_FOUND');
    expect(EmailErrorType.NODE_UNREACHABLE).toBe('NODE_UNREACHABLE');
    expect(EmailErrorType.REPLICATION_FAILED).toBe('REPLICATION_FAILED');
    expect(EmailErrorType.DELIVERY_TIMEOUT).toBe('DELIVERY_TIMEOUT');
  });

  it('should define all storage error types', () => {
    expect(EmailErrorType.STORAGE_FAILED).toBe('STORAGE_FAILED');
    expect(EmailErrorType.MESSAGE_NOT_FOUND).toBe('MESSAGE_NOT_FOUND');
  });

  it('should define all security error types', () => {
    expect(EmailErrorType.ENCRYPTION_FAILED).toBe('ENCRYPTION_FAILED');
    expect(EmailErrorType.DECRYPTION_FAILED).toBe('DECRYPTION_FAILED');
    expect(EmailErrorType.SIGNATURE_INVALID).toBe('SIGNATURE_INVALID');
  });

  it('should have exactly 23 error types', () => {
    const values = Object.values(EmailErrorType);
    expect(values).toHaveLength(23);
  });

  it('should have unique values for all error types', () => {
    const values = Object.values(EmailErrorType);
    const uniqueValues = new Set(values);
    expect(uniqueValues.size).toBe(values.length);
  });
});

describe('EmailError', () => {
  describe('constructor', () => {
    it('should create an error with the correct errorType', () => {
      const error = new EmailError(
        EmailErrorType.INVALID_MAILBOX,
        'Invalid email address',
      );
      expect(error.errorType).toBe(EmailErrorType.INVALID_MAILBOX);
    });

    it('should create an error with the correct message', () => {
      const message = 'Invalid email address format';
      const error = new EmailError(EmailErrorType.INVALID_MAILBOX, message);
      expect(error.message).toBe(message);
    });

    it('should set the error name to EmailError', () => {
      const error = new EmailError(EmailErrorType.PARSE_ERROR, 'Parse failed');
      expect(error.name).toBe('EmailError');
    });

    it('should extend BrightChainError', () => {
      const error = new EmailError(
        EmailErrorType.STORAGE_FAILED,
        'Storage failed',
      );
      expect(error).toBeInstanceOf(BrightChainError);
    });

    it('should extend Error', () => {
      const error = new EmailError(
        EmailErrorType.STORAGE_FAILED,
        'Storage failed',
      );
      expect(error).toBeInstanceOf(Error);
    });

    it('should have a stack trace', () => {
      const error = new EmailError(EmailErrorType.PARSE_ERROR, 'Parse failed');
      expect(error.stack).toBeDefined();
      expect(typeof error.stack).toBe('string');
    });

    it('should set the type property to the error type value', () => {
      const error = new EmailError(
        EmailErrorType.INVALID_HEADER_NAME,
        'Bad header',
      );
      expect(error.type).toBe(EmailErrorType.INVALID_HEADER_NAME);
    });

    it('should include details when provided', () => {
      const details = { address: 'not-an-email', field: 'to' };
      const error = new EmailError(
        EmailErrorType.INVALID_MAILBOX,
        'Invalid address',
        details,
      );
      expect(error.details).toEqual(details);
    });

    it('should have undefined details when not provided', () => {
      const error = new EmailError(EmailErrorType.PARSE_ERROR, 'Parse failed');
      expect(error.details).toBeUndefined();
    });
  });

  describe('error categories', () => {
    it('should create validation errors', () => {
      const error = new EmailError(
        EmailErrorType.MISSING_REQUIRED_HEADER,
        'From header is required',
        { header: 'From' },
      );
      expect(error.errorType).toBe(EmailErrorType.MISSING_REQUIRED_HEADER);
      expect(error.details).toEqual({ header: 'From' });
    });

    it('should create size errors', () => {
      const error = new EmailError(
        EmailErrorType.ATTACHMENT_TOO_LARGE,
        'Attachment exceeds 25MB limit',
        { filename: 'large.zip', size: 30_000_000, maxSize: 25_000_000 },
      );
      expect(error.errorType).toBe(EmailErrorType.ATTACHMENT_TOO_LARGE);
      expect(error.details?.['size']).toBe(30_000_000);
    });

    it('should create delivery errors', () => {
      const error = new EmailError(
        EmailErrorType.DELIVERY_TIMEOUT,
        'Delivery timed out after 24 hours',
        { recipientId: 'user-123', timeout: 86400 },
      );
      expect(error.errorType).toBe(EmailErrorType.DELIVERY_TIMEOUT);
    });

    it('should create security errors', () => {
      const error = new EmailError(
        EmailErrorType.DECRYPTION_FAILED,
        'Failed to decrypt email content',
        { messageId: '<abc@example.com>' },
      );
      expect(error.errorType).toBe(EmailErrorType.DECRYPTION_FAILED);
    });
  });

  describe('toJSON', () => {
    it('should return a JSON-serializable object', () => {
      const details = { field: 'subject' };
      const error = new EmailError(
        EmailErrorType.PARSE_ERROR,
        'Failed to parse',
        details,
      );
      const json = error.toJSON();
      expect(json).toEqual({
        name: 'EmailError',
        type: EmailErrorType.PARSE_ERROR,
        message: 'Failed to parse',
        context: details,
        cause: undefined,
        stack: expect.any(String),
      });
    });

    it('should be serializable with JSON.stringify', () => {
      const error = new EmailError(
        EmailErrorType.INVALID_MAILBOX,
        'Bad address',
        { address: 'test' },
      );
      const jsonString = JSON.stringify(error.toJSON());
      const parsed = JSON.parse(jsonString);
      expect(parsed.name).toBe('EmailError');
      expect(parsed.type).toBe(EmailErrorType.INVALID_MAILBOX);
      expect(parsed.message).toBe('Bad address');
    });
  });

  describe('BrightChainError compatibility', () => {
    it('should be recognized by isBrightChainError type guard', () => {
      const error = new EmailError(
        EmailErrorType.STORAGE_FAILED,
        'Storage failed',
      );
      expect(isBrightChainError(error)).toBe(true);
    });

    it('should expose context through BrightChainError interface', () => {
      const details = { messageId: '<test@example.com>' };
      const error = new EmailError(
        EmailErrorType.MESSAGE_NOT_FOUND,
        'Not found',
        details,
      );
      // details is passed as context to BrightChainError
      expect(error.context).toEqual(details);
    });
  });
});

describe('isEmailError', () => {
  it('should return true for EmailError instances', () => {
    const error = new EmailError(EmailErrorType.PARSE_ERROR, 'Parse failed');
    expect(isEmailError(error)).toBe(true);
  });

  it('should return false for generic Error', () => {
    const error = new Error('Test');
    expect(isEmailError(error)).toBe(false);
  });

  it('should return false for null', () => {
    expect(isEmailError(null)).toBe(false);
  });

  it('should return false for undefined', () => {
    expect(isEmailError(undefined)).toBe(false);
  });

  it('should return false for plain object with similar properties', () => {
    const fakeError = {
      errorType: EmailErrorType.PARSE_ERROR,
      message: 'Test',
      details: {},
      name: 'EmailError',
    };
    expect(isEmailError(fakeError)).toBe(false);
  });

  it('should narrow type correctly', () => {
    const maybeError: unknown = new EmailError(
      EmailErrorType.INVALID_DATE,
      'Invalid date',
      { date: 'not-a-date' },
    );
    if (isEmailError(maybeError)) {
      expect(maybeError.errorType).toBe(EmailErrorType.INVALID_DATE);
      expect(maybeError.details).toEqual({ date: 'not-a-date' });
      expect(maybeError.message).toBe('Invalid date');
    } else {
      fail('Expected isEmailError to return true');
    }
  });
});
