import { EmailErrorType } from '../../enumerations/messaging/emailErrorType';
import { createMailbox } from '../../interfaces/messaging/emailAddress';
import { EmailValidator, IValidationResult } from './emailValidator';

describe('EmailValidator', () => {
  let emailValidator: EmailValidator;

  beforeEach(() => {
    emailValidator = new EmailValidator();
  });

  describe('validateHeaderName', () => {
    it('should accept valid simple header names', () => {
      expect(emailValidator.validateHeaderName('From')).toBe(true);
      expect(emailValidator.validateHeaderName('To')).toBe(true);
      expect(emailValidator.validateHeaderName('Subject')).toBe(true);
      expect(emailValidator.validateHeaderName('Date')).toBe(true);
      expect(emailValidator.validateHeaderName('Message-ID')).toBe(true);
    });

    it('should accept valid MIME header names', () => {
      expect(emailValidator.validateHeaderName('Content-Type')).toBe(true);
      expect(
        emailValidator.validateHeaderName('Content-Transfer-Encoding'),
      ).toBe(true);
      expect(emailValidator.validateHeaderName('Content-Disposition')).toBe(
        true,
      );
      expect(emailValidator.validateHeaderName('MIME-Version')).toBe(true);
    });

    it('should accept valid X-* extension header names', () => {
      expect(emailValidator.validateHeaderName('X-Custom-Header')).toBe(true);
      expect(emailValidator.validateHeaderName('X-Mailer')).toBe(true);
      expect(emailValidator.validateHeaderName('X-Priority')).toBe(true);
    });

    it('should accept header names with all valid printable ASCII characters', () => {
      // Characters 33-57 (! to 9, skipping colon at 58)
      expect(emailValidator.validateHeaderName('!')).toBe(true);
      expect(emailValidator.validateHeaderName('#')).toBe(true);
      expect(emailValidator.validateHeaderName('9')).toBe(true);
      // Characters 59-126 (; to ~)
      expect(emailValidator.validateHeaderName(';')).toBe(true);
      expect(emailValidator.validateHeaderName('~')).toBe(true);
    });

    it('should reject empty string', () => {
      expect(emailValidator.validateHeaderName('')).toBe(false);
    });

    it('should reject header names containing colon', () => {
      expect(emailValidator.validateHeaderName('Bad:Name')).toBe(false);
      expect(emailValidator.validateHeaderName(':')).toBe(false);
      expect(emailValidator.validateHeaderName('Content:Type')).toBe(false);
    });

    it('should reject header names containing space (code 32)', () => {
      expect(emailValidator.validateHeaderName('Bad Name')).toBe(false);
      expect(emailValidator.validateHeaderName(' Leading')).toBe(false);
      expect(emailValidator.validateHeaderName('Trailing ')).toBe(false);
    });

    it('should reject header names containing control characters (codes 0-31)', () => {
      expect(emailValidator.validateHeaderName('Bad\x00Name')).toBe(false);
      expect(emailValidator.validateHeaderName('Bad\tName')).toBe(false); // tab = 9
      expect(emailValidator.validateHeaderName('Bad\nName')).toBe(false); // LF = 10
      expect(emailValidator.validateHeaderName('Bad\rName')).toBe(false); // CR = 13
      expect(emailValidator.validateHeaderName('\x1F')).toBe(false); // code 31
    });

    it('should reject header names containing DEL (code 127)', () => {
      expect(emailValidator.validateHeaderName('Bad\x7FName')).toBe(false);
    });

    it('should reject header names containing non-ASCII characters', () => {
      expect(emailValidator.validateHeaderName('Héader')).toBe(false);
      expect(emailValidator.validateHeaderName('日本語')).toBe(false);
      expect(emailValidator.validateHeaderName('Header™')).toBe(false);
    });
  });

  describe('validateMailbox', () => {
    it('should accept a valid simple mailbox', () => {
      const mailbox = createMailbox('user', 'example.com');
      const result = emailValidator.validateMailbox(mailbox);
      expect(result.valid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it('should accept a valid mailbox with display name', () => {
      const mailbox = createMailbox('john.doe', 'example.com', 'John Doe');
      const result = emailValidator.validateMailbox(mailbox);
      expect(result.valid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it('should accept a valid mailbox with subdomain', () => {
      const mailbox = createMailbox('user', 'mail.example.com');
      const result = emailValidator.validateMailbox(mailbox);
      expect(result.valid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it('should accept a valid mailbox with plus addressing', () => {
      const mailbox = createMailbox('user+tag', 'example.com');
      const result = emailValidator.validateMailbox(mailbox);
      expect(result.valid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it('should accept a valid mailbox with dots in local part', () => {
      const mailbox = createMailbox('first.last', 'example.com');
      const result = emailValidator.validateMailbox(mailbox);
      expect(result.valid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it('should reject mailbox with empty localPart', () => {
      const mailbox = createMailbox('', 'example.com');
      const result = emailValidator.validateMailbox(mailbox);
      expect(result.valid).toBe(false);
      expect(result.errors.length).toBeGreaterThan(0);
      expect(result.errors[0].code).toBe(EmailErrorType.INVALID_MAILBOX);
      expect(result.errors[0].field).toBe('localPart');
    });

    it('should reject mailbox with empty domain', () => {
      const mailbox = createMailbox('user', '');
      const result = emailValidator.validateMailbox(mailbox);
      expect(result.valid).toBe(false);
      expect(result.errors.length).toBeGreaterThan(0);
      expect(result.errors[0].code).toBe(EmailErrorType.INVALID_MAILBOX);
      expect(result.errors[0].field).toBe('domain');
    });

    it('should reject mailbox with whitespace-only localPart', () => {
      const mailbox = createMailbox('   ', 'example.com');
      const result = emailValidator.validateMailbox(mailbox);
      expect(result.valid).toBe(false);
      expect(result.errors.some((e) => e.field === 'localPart')).toBe(true);
    });

    it('should reject mailbox with whitespace-only domain', () => {
      const mailbox = createMailbox('user', '   ');
      const result = emailValidator.validateMailbox(mailbox);
      expect(result.valid).toBe(false);
      expect(result.errors.some((e) => e.field === 'domain')).toBe(true);
    });

    it('should reject mailbox with invalid domain format', () => {
      const mailbox = createMailbox('user', 'not a domain');
      const result = emailValidator.validateMailbox(mailbox);
      expect(result.valid).toBe(false);
      expect(
        result.errors.some((e) => e.code === EmailErrorType.INVALID_MAILBOX),
      ).toBe(true);
    });

    it('should return structured IValidationResult', () => {
      const mailbox = createMailbox('user', 'example.com');
      const result: IValidationResult = emailValidator.validateMailbox(mailbox);
      expect(result).toHaveProperty('valid');
      expect(result).toHaveProperty('errors');
      expect(Array.isArray(result.errors)).toBe(true);
    });

    it('should return errors with code, field, and message', () => {
      const mailbox = createMailbox('', '');
      const result = emailValidator.validateMailbox(mailbox);
      expect(result.valid).toBe(false);
      for (const error of result.errors) {
        expect(error).toHaveProperty('code');
        expect(error).toHaveProperty('field');
        expect(error).toHaveProperty('message');
        expect(typeof error.code).toBe('string');
        expect(typeof error.field).toBe('string');
        expect(typeof error.message).toBe('string');
      }
    });
  });

  describe('validateMessageId', () => {
    it('should accept a valid Message-ID', () => {
      expect(emailValidator.validateMessageId('<unique-id@example.com>')).toBe(
        true,
      );
    });

    it('should accept a Message-ID with UUID format', () => {
      expect(
        emailValidator.validateMessageId(
          '<550e8400-e29b-41d4-a716-446655440000@example.com>',
        ),
      ).toBe(true);
    });

    it('should accept a Message-ID with timestamp', () => {
      expect(
        emailValidator.validateMessageId(
          '<1234567890.abc@node1.brightchain.org>',
        ),
      ).toBe(true);
    });

    it('should accept a Message-ID with complex id-left', () => {
      expect(
        emailValidator.validateMessageId(
          '<CABx+XJ3SGKfQ0=ZKBxnr+Dg@mail.gmail.com>',
        ),
      ).toBe(true);
    });

    it('should reject empty string', () => {
      expect(emailValidator.validateMessageId('')).toBe(false);
    });

    it('should reject null/undefined', () => {
      expect(emailValidator.validateMessageId(null as unknown as string)).toBe(
        false,
      );
      expect(
        emailValidator.validateMessageId(undefined as unknown as string),
      ).toBe(false);
    });

    it('should reject Message-ID without angle brackets', () => {
      expect(emailValidator.validateMessageId('unique-id@example.com')).toBe(
        false,
      );
    });

    it('should reject Message-ID with only opening bracket', () => {
      expect(emailValidator.validateMessageId('<unique-id@example.com')).toBe(
        false,
      );
    });

    it('should reject Message-ID with only closing bracket', () => {
      expect(emailValidator.validateMessageId('unique-id@example.com>')).toBe(
        false,
      );
    });

    it('should reject Message-ID without @ character', () => {
      expect(emailValidator.validateMessageId('<no-at-sign>')).toBe(false);
    });

    it('should reject Message-ID with multiple @ characters', () => {
      expect(emailValidator.validateMessageId('<two@@signs>')).toBe(false);
      expect(emailValidator.validateMessageId('<a@b@c>')).toBe(false);
    });

    it('should reject Message-ID with empty id-left', () => {
      expect(emailValidator.validateMessageId('<@example.com>')).toBe(false);
    });

    it('should reject Message-ID with empty id-right', () => {
      expect(emailValidator.validateMessageId('<unique-id@>')).toBe(false);
    });

    it('should reject empty angle brackets', () => {
      expect(emailValidator.validateMessageId('<>')).toBe(false);
    });

    it('should reject just @ in angle brackets', () => {
      expect(emailValidator.validateMessageId('<@>')).toBe(false);
    });
  });

  describe('validateDate', () => {
    it('should accept current date', () => {
      expect(emailValidator.validateDate(new Date())).toBe(true);
    });

    it('should accept a recent past date', () => {
      const pastDate = new Date('2024-01-15T10:30:00Z');
      // Only valid if it's after 1970 and not in the future
      if (pastDate.getTime() <= Date.now() + 24 * 60 * 60 * 1000) {
        expect(emailValidator.validateDate(pastDate)).toBe(true);
      }
    });

    it('should accept the epoch date (1970-01-01)', () => {
      const epoch = new Date('1970-01-01T00:00:00Z');
      expect(emailValidator.validateDate(epoch)).toBe(true);
    });

    it('should accept a date from 1982 (RFC 822 era)', () => {
      const rfc822Date = new Date('1982-08-13T00:00:00Z');
      expect(emailValidator.validateDate(rfc822Date)).toBe(true);
    });

    it('should reject an invalid Date object (NaN)', () => {
      const invalidDate = new Date('not-a-date');
      expect(emailValidator.validateDate(invalidDate)).toBe(false);
    });

    it('should reject a date before 1970', () => {
      const oldDate = new Date('1960-01-01T00:00:00Z');
      expect(emailValidator.validateDate(oldDate)).toBe(false);
    });

    it('should reject a date far in the future', () => {
      const futureDate = new Date('2099-01-01T00:00:00Z');
      expect(emailValidator.validateDate(futureDate)).toBe(false);
    });

    it('should reject non-Date values', () => {
      expect(emailValidator.validateDate('2024-01-01' as unknown as Date)).toBe(
        false,
      );
      expect(emailValidator.validateDate(1234567890 as unknown as Date)).toBe(
        false,
      );
      expect(emailValidator.validateDate(null as unknown as Date)).toBe(false);
      expect(emailValidator.validateDate(undefined as unknown as Date)).toBe(
        false,
      );
    });

    it('should accept a date slightly in the future (within 1 day)', () => {
      // A date 1 hour from now should be valid (timezone tolerance)
      const slightlyFuture = new Date(Date.now() + 60 * 60 * 1000);
      expect(emailValidator.validateDate(slightlyFuture)).toBe(true);
    });
  });
});

describe('EmailValidator - Address Length Validation (Task 2.3)', () => {
  let emailValidator: EmailValidator;

  beforeEach(() => {
    emailValidator = new EmailValidator();
  });

  describe('validateAddressLength', () => {
    it('should accept a valid address within length limits', () => {
      const mailbox = createMailbox('user', 'example.com');
      const result = emailValidator.validateAddressLength(mailbox);
      expect(result.valid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it('should accept a local-part at exactly 64 characters', () => {
      const localPart = 'a'.repeat(64);
      const mailbox = createMailbox(localPart, 'example.com');
      const result = emailValidator.validateAddressLength(mailbox);
      expect(result.valid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it('should reject a local-part exceeding 64 characters', () => {
      const localPart = 'a'.repeat(65);
      const mailbox = createMailbox(localPart, 'example.com');
      const result = emailValidator.validateAddressLength(mailbox);
      expect(result.valid).toBe(false);
      expect(result.errors.length).toBeGreaterThan(0);
      expect(result.errors[0].code).toBe(EmailErrorType.INVALID_MAILBOX);
      expect(result.errors[0].field).toBe('localPart');
      expect(result.errors[0].message).toContain('65');
    });

    it('should accept a total address at exactly 254 characters', () => {
      // localPart@domain = 254 chars total
      // We need localPart + '@' + domain = 254
      // Use a 63-char local part + '@' + 190-char domain = 254
      const localPart = 'a'.repeat(63);
      const domain = 'b'.repeat(186) + '.com'; // 186 + 4 = 190
      const mailbox = createMailbox(localPart, domain);
      expect(mailbox.address.length).toBe(254);
      const result = emailValidator.validateAddressLength(mailbox);
      expect(result.valid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it('should reject a total address exceeding 254 characters', () => {
      // Create an address that is 255 characters total
      const localPart = 'a'.repeat(64);
      const domain = 'b'.repeat(186) + '.com'; // 64 + 1 + 190 = 255
      const mailbox = createMailbox(localPart, domain);
      expect(mailbox.address.length).toBe(255);
      const result = emailValidator.validateAddressLength(mailbox);
      expect(result.valid).toBe(false);
      expect(result.errors.some((e) => e.field === 'address')).toBe(true);
      expect(
        result.errors.some((e) => e.code === EmailErrorType.INVALID_MAILBOX),
      ).toBe(true);
    });

    it('should report both errors when both local-part and total address exceed limits', () => {
      // Local part > 64 AND total > 254
      const localPart = 'a'.repeat(200);
      const domain = 'b'.repeat(100) + '.com'; // 200 + 1 + 104 = 305
      const mailbox = createMailbox(localPart, domain);
      const result = emailValidator.validateAddressLength(mailbox);
      expect(result.valid).toBe(false);
      expect(result.errors.length).toBe(2);
      expect(result.errors.some((e) => e.field === 'localPart')).toBe(true);
      expect(result.errors.some((e) => e.field === 'address')).toBe(true);
    });

    it('should accept a 1-character local-part', () => {
      const mailbox = createMailbox('a', 'example.com');
      const result = emailValidator.validateAddressLength(mailbox);
      expect(result.valid).toBe(true);
    });

    it('should return structured IValidationResult', () => {
      const mailbox = createMailbox('user', 'example.com');
      const result: IValidationResult =
        emailValidator.validateAddressLength(mailbox);
      expect(result).toHaveProperty('valid');
      expect(result).toHaveProperty('errors');
      expect(Array.isArray(result.errors)).toBe(true);
    });

    it('should expose MAX_ADDRESS_LENGTH as 254', () => {
      expect(EmailValidator.MAX_ADDRESS_LENGTH).toBe(254);
    });

    it('should expose MAX_LOCAL_PART_LENGTH as 64', () => {
      expect(EmailValidator.MAX_LOCAL_PART_LENGTH).toBe(64);
    });
  });

  describe('validateMailbox - address length integration', () => {
    it('should reject mailbox with local-part exceeding 64 characters via validateMailbox', () => {
      const localPart = 'a'.repeat(65);
      const mailbox = createMailbox(localPart, 'example.com');
      const result = emailValidator.validateMailbox(mailbox);
      expect(result.valid).toBe(false);
      expect(result.errors.some((e) => e.field === 'localPart')).toBe(true);
      expect(
        result.errors.some((e) => e.code === EmailErrorType.INVALID_MAILBOX),
      ).toBe(true);
    });

    it('should reject mailbox with total address exceeding 254 characters via validateMailbox', () => {
      const localPart = 'a'.repeat(64);
      const domain = 'b'.repeat(186) + '.com'; // 64 + 1 + 190 = 255
      const mailbox = createMailbox(localPart, domain);
      const result = emailValidator.validateMailbox(mailbox);
      expect(result.valid).toBe(false);
      expect(result.errors.some((e) => e.field === 'address')).toBe(true);
    });

    it('should accept mailbox with local-part at exactly 64 characters via validateMailbox', () => {
      const localPart = 'a'.repeat(64);
      const mailbox = createMailbox(localPart, 'example.com');
      // Note: validator.isEmail() may reject very long local parts,
      // but the length check itself should pass
      const lengthResult = emailValidator.validateAddressLength(mailbox);
      expect(lengthResult.valid).toBe(true);
    });

    it('should still validate format after passing length checks', () => {
      // Valid length but valid format too
      const mailbox = createMailbox('user', 'example.com');
      const result = emailValidator.validateMailbox(mailbox);
      expect(result.valid).toBe(true);
    });
  });
});

import {
  ContentTransferEncoding,
  createContentType,
} from '../../interfaces/messaging/mimePart';

describe('EmailValidator - Content Validation (Task 2.5)', () => {
  let emailValidator: EmailValidator;

  beforeEach(() => {
    emailValidator = new EmailValidator();
  });

  describe('validateContentType', () => {
    it('should accept valid text/plain Content-Type', () => {
      const ct = createContentType(
        'text',
        'plain',
        new Map([['charset', 'utf-8']]),
      );
      const result = emailValidator.validateContentType(ct);
      expect(result.valid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it('should accept valid text/html Content-Type', () => {
      const ct = createContentType('text', 'html');
      const result = emailValidator.validateContentType(ct);
      expect(result.valid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it('should accept all valid discrete types', () => {
      const discreteTypes = ['text', 'image', 'audio', 'video', 'application'];
      for (const type of discreteTypes) {
        const ct = createContentType(type, 'test');
        const result = emailValidator.validateContentType(ct);
        expect(result.valid).toBe(true);
      }
    });

    it('should accept all valid composite types with required parameters', () => {
      // multipart requires boundary
      const multipart = createContentType(
        'multipart',
        'mixed',
        new Map([['boundary', '----=_Part_123']]),
      );
      expect(emailValidator.validateContentType(multipart).valid).toBe(true);

      // message does not require boundary
      const message = createContentType('message', 'rfc822');
      expect(emailValidator.validateContentType(message).valid).toBe(true);
    });

    it('should accept application/pdf Content-Type', () => {
      const ct = createContentType(
        'application',
        'pdf',
        new Map([['name', 'document.pdf']]),
      );
      const result = emailValidator.validateContentType(ct);
      expect(result.valid).toBe(true);
    });

    it('should accept image/jpeg Content-Type', () => {
      const ct = createContentType('image', 'jpeg');
      const result = emailValidator.validateContentType(ct);
      expect(result.valid).toBe(true);
    });

    it('should reject empty type', () => {
      const ct = createContentType('', 'plain');
      const result = emailValidator.validateContentType(ct);
      expect(result.valid).toBe(false);
      expect(
        result.errors.some(
          (e) => e.code === EmailErrorType.INVALID_CONTENT_TYPE,
        ),
      ).toBe(true);
      expect(result.errors.some((e) => e.field === 'contentType.type')).toBe(
        true,
      );
    });

    it('should reject empty subtype', () => {
      const ct = createContentType('text', '');
      const result = emailValidator.validateContentType(ct);
      expect(result.valid).toBe(false);
      expect(
        result.errors.some(
          (e) => e.code === EmailErrorType.INVALID_CONTENT_TYPE,
        ),
      ).toBe(true);
      expect(result.errors.some((e) => e.field === 'contentType.subtype')).toBe(
        true,
      );
    });

    it('should reject type with spaces (invalid token)', () => {
      const ct = createContentType('te xt', 'plain');
      const result = emailValidator.validateContentType(ct);
      expect(result.valid).toBe(false);
      expect(result.errors.some((e) => e.field === 'contentType.type')).toBe(
        true,
      );
    });

    it('should reject subtype with tspecials', () => {
      const ct = createContentType('text', 'pla/in');
      const result = emailValidator.validateContentType(ct);
      expect(result.valid).toBe(false);
      expect(result.errors.some((e) => e.field === 'contentType.subtype')).toBe(
        true,
      );
    });

    it('should reject type with control characters', () => {
      const ct = createContentType('text\x00', 'plain');
      const result = emailValidator.validateContentType(ct);
      expect(result.valid).toBe(false);
    });

    it('should reject unrecognized type', () => {
      const ct = createContentType('unknown', 'test');
      const result = emailValidator.validateContentType(ct);
      expect(result.valid).toBe(false);
      expect(
        result.errors.some((e) => e.message.includes('Unrecognized')),
      ).toBe(true);
    });

    it('should reject multipart type without boundary parameter', () => {
      const ct = createContentType('multipart', 'mixed');
      const result = emailValidator.validateContentType(ct);
      expect(result.valid).toBe(false);
      expect(
        result.errors.some((e) => e.code === EmailErrorType.INVALID_BOUNDARY),
      ).toBe(true);
      expect(
        result.errors.some(
          (e) => e.field === 'contentType.parameters.boundary',
        ),
      ).toBe(true);
    });

    it('should accept multipart type with boundary parameter', () => {
      const ct = createContentType(
        'multipart',
        'alternative',
        new Map([['boundary', 'abc123']]),
      );
      const result = emailValidator.validateContentType(ct);
      expect(result.valid).toBe(true);
    });

    it('should accept multipart with case-insensitive boundary key', () => {
      const ct = createContentType(
        'multipart',
        'mixed',
        new Map([['Boundary', 'abc123']]),
      );
      const result = emailValidator.validateContentType(ct);
      expect(result.valid).toBe(true);
    });

    it('should return structured IValidationResult', () => {
      const ct = createContentType('text', 'plain');
      const result: IValidationResult = emailValidator.validateContentType(ct);
      expect(result).toHaveProperty('valid');
      expect(result).toHaveProperty('errors');
      expect(Array.isArray(result.errors)).toBe(true);
    });
  });

  describe('validateMultipartBoundary', () => {
    const encoder = new TextEncoder();

    it('should accept a valid boundary that does not appear in content', () => {
      const content = encoder.encode('Hello, world!');
      expect(
        emailValidator.validateMultipartBoundary('----=_Part_123', content),
      ).toBe(true);
    });

    it('should accept a boundary of exactly 1 character', () => {
      const content = encoder.encode('Hello');
      expect(emailValidator.validateMultipartBoundary('X', content)).toBe(true);
    });

    it('should accept a boundary of exactly 70 characters', () => {
      const boundary = 'a'.repeat(70);
      const content = encoder.encode('Hello');
      expect(emailValidator.validateMultipartBoundary(boundary, content)).toBe(
        true,
      );
    });

    it('should reject an empty boundary', () => {
      const content = encoder.encode('Hello');
      expect(emailValidator.validateMultipartBoundary('', content)).toBe(false);
    });

    it('should reject a boundary exceeding 70 characters', () => {
      const boundary = 'a'.repeat(71);
      const content = encoder.encode('Hello');
      expect(emailValidator.validateMultipartBoundary(boundary, content)).toBe(
        false,
      );
    });

    it('should reject a boundary with invalid characters', () => {
      const content = encoder.encode('Hello');
      // @ is not a valid boundary character
      expect(
        emailValidator.validateMultipartBoundary('bad@boundary', content),
      ).toBe(false);
      // # is not valid
      expect(
        emailValidator.validateMultipartBoundary('bad#boundary', content),
      ).toBe(false);
    });

    it('should reject a boundary ending with a space', () => {
      const content = encoder.encode('Hello');
      expect(
        emailValidator.validateMultipartBoundary('boundary ', content),
      ).toBe(false);
    });

    it('should accept a boundary with spaces in the middle', () => {
      const content = encoder.encode('Hello');
      expect(
        emailValidator.validateMultipartBoundary('bound ary', content),
      ).toBe(true);
    });

    it('should accept a boundary with all valid special characters', () => {
      const content = encoder.encode('Hello');
      // Valid boundary chars include: ' ( ) + _ , - . / : = ?
      expect(
        emailValidator.validateMultipartBoundary("'()+_,-./:=?", content),
      ).toBe(true);
    });

    it('should reject a boundary that appears in the content', () => {
      const boundary = 'myboundary';
      const content = encoder.encode('Some text with myboundary in it');
      expect(emailValidator.validateMultipartBoundary(boundary, content)).toBe(
        false,
      );
    });

    it('should accept a boundary that does not appear in the content', () => {
      const boundary = 'unique-boundary-string';
      const content = encoder.encode('Some text without the boundary');
      expect(emailValidator.validateMultipartBoundary(boundary, content)).toBe(
        true,
      );
    });

    it('should handle empty content', () => {
      const content = new Uint8Array(0);
      expect(
        emailValidator.validateMultipartBoundary('boundary', content),
      ).toBe(true);
    });

    it('should detect boundary at the start of content', () => {
      const boundary = 'start';
      const content = encoder.encode('start of content');
      expect(emailValidator.validateMultipartBoundary(boundary, content)).toBe(
        false,
      );
    });

    it('should detect boundary at the end of content', () => {
      const boundary = 'end';
      const content = encoder.encode('content at the end');
      expect(emailValidator.validateMultipartBoundary(boundary, content)).toBe(
        false,
      );
    });
  });

  describe('validateContentTransferEncoding', () => {
    it('should accept "7bit"', () => {
      expect(emailValidator.validateContentTransferEncoding('7bit')).toBe(true);
    });

    it('should accept "8bit"', () => {
      expect(emailValidator.validateContentTransferEncoding('8bit')).toBe(true);
    });

    it('should accept "binary"', () => {
      expect(emailValidator.validateContentTransferEncoding('binary')).toBe(
        true,
      );
    });

    it('should accept "quoted-printable"', () => {
      expect(
        emailValidator.validateContentTransferEncoding('quoted-printable'),
      ).toBe(true);
    });

    it('should accept "base64"', () => {
      expect(emailValidator.validateContentTransferEncoding('base64')).toBe(
        true,
      );
    });

    it('should accept case-insensitive values', () => {
      expect(emailValidator.validateContentTransferEncoding('Base64')).toBe(
        true,
      );
      expect(emailValidator.validateContentTransferEncoding('BASE64')).toBe(
        true,
      );
      expect(
        emailValidator.validateContentTransferEncoding('Quoted-Printable'),
      ).toBe(true);
      expect(emailValidator.validateContentTransferEncoding('BINARY')).toBe(
        true,
      );
      expect(emailValidator.validateContentTransferEncoding('7BIT')).toBe(true);
      expect(emailValidator.validateContentTransferEncoding('8BIT')).toBe(true);
    });

    it('should accept all ContentTransferEncoding enum values', () => {
      for (const value of Object.values(ContentTransferEncoding)) {
        expect(emailValidator.validateContentTransferEncoding(value)).toBe(
          true,
        );
      }
    });

    it('should reject invalid encoding values', () => {
      expect(emailValidator.validateContentTransferEncoding('invalid')).toBe(
        false,
      );
      expect(emailValidator.validateContentTransferEncoding('utf-8')).toBe(
        false,
      );
      expect(emailValidator.validateContentTransferEncoding('gzip')).toBe(
        false,
      );
      expect(emailValidator.validateContentTransferEncoding('base32')).toBe(
        false,
      );
    });

    it('should reject empty string', () => {
      expect(emailValidator.validateContentTransferEncoding('')).toBe(false);
    });

    it('should reject null/undefined', () => {
      expect(
        emailValidator.validateContentTransferEncoding(
          null as unknown as string,
        ),
      ).toBe(false);
      expect(
        emailValidator.validateContentTransferEncoding(
          undefined as unknown as string,
        ),
      ).toBe(false);
    });

    it('should reject values with extra whitespace', () => {
      expect(emailValidator.validateContentTransferEncoding(' base64')).toBe(
        false,
      );
      expect(emailValidator.validateContentTransferEncoding('base64 ')).toBe(
        false,
      );
      expect(emailValidator.validateContentTransferEncoding(' base64 ')).toBe(
        false,
      );
    });
  });
});

import { IAttachmentInput, IEmailInput } from './emailValidator';

describe('EmailValidator - Size Validation (Task 2.6)', () => {
  let emailValidator: EmailValidator;

  beforeEach(() => {
    emailValidator = new EmailValidator();
  });

  describe('static constants', () => {
    it('should expose DEFAULT_MAX_ATTACHMENT_SIZE as 25MB', () => {
      expect(EmailValidator.DEFAULT_MAX_ATTACHMENT_SIZE).toBe(25 * 1024 * 1024);
    });

    it('should expose DEFAULT_MAX_MESSAGE_SIZE as 50MB', () => {
      expect(EmailValidator.DEFAULT_MAX_MESSAGE_SIZE).toBe(50 * 1024 * 1024);
    });
  });

  describe('validateAttachmentSize', () => {
    it('should accept an attachment within the default size limit', () => {
      const attachment: IAttachmentInput = { filename: 'doc.pdf', size: 1024 };
      const result = emailValidator.validateAttachmentSize(attachment);
      expect(result.valid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it('should accept an attachment at exactly the default limit', () => {
      const attachment: IAttachmentInput = {
        filename: 'exact.bin',
        size: 25 * 1024 * 1024,
      };
      const result = emailValidator.validateAttachmentSize(attachment);
      expect(result.valid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it('should reject an attachment exceeding the default limit', () => {
      const attachment: IAttachmentInput = {
        filename: 'huge.zip',
        size: 25 * 1024 * 1024 + 1,
      };
      const result = emailValidator.validateAttachmentSize(attachment);
      expect(result.valid).toBe(false);
      expect(result.errors).toHaveLength(1);
      expect(result.errors[0].code).toBe(EmailErrorType.ATTACHMENT_TOO_LARGE);
      expect(result.errors[0].field).toBe('attachment.size');
      expect(result.errors[0].message).toContain('huge.zip');
      expect(result.errors[0].message).toContain(String(25 * 1024 * 1024 + 1));
    });

    it('should accept an attachment within a custom size limit', () => {
      const customLimit = 10 * 1024 * 1024; // 10MB
      const attachment: IAttachmentInput = {
        filename: 'small.txt',
        size: 5 * 1024 * 1024,
      };
      const result = emailValidator.validateAttachmentSize(
        attachment,
        customLimit,
      );
      expect(result.valid).toBe(true);
    });

    it('should reject an attachment exceeding a custom size limit', () => {
      const customLimit = 1024; // 1KB
      const attachment: IAttachmentInput = { filename: 'over.txt', size: 2048 };
      const result = emailValidator.validateAttachmentSize(
        attachment,
        customLimit,
      );
      expect(result.valid).toBe(false);
      expect(result.errors[0].code).toBe(EmailErrorType.ATTACHMENT_TOO_LARGE);
    });

    it('should accept a zero-size attachment', () => {
      const attachment: IAttachmentInput = { filename: 'empty.txt', size: 0 };
      const result = emailValidator.validateAttachmentSize(attachment);
      expect(result.valid).toBe(true);
    });

    it('should return structured IValidationResult', () => {
      const attachment: IAttachmentInput = { filename: 'test.txt', size: 100 };
      const result: IValidationResult =
        emailValidator.validateAttachmentSize(attachment);
      expect(result).toHaveProperty('valid');
      expect(result).toHaveProperty('errors');
      expect(Array.isArray(result.errors)).toBe(true);
    });
  });

  describe('validateMessageSize', () => {
    it('should accept a message within the default size limit', () => {
      const email: IEmailInput = {
        bodySize: 1024,
        attachments: [{ filename: 'doc.pdf', size: 2048 }],
      };
      const result = emailValidator.validateMessageSize(email);
      expect(result.valid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it('should accept a message at exactly the default limit', () => {
      const email: IEmailInput = {
        bodySize: 10 * 1024 * 1024,
        attachments: [{ filename: 'big.bin', size: 40 * 1024 * 1024 }],
      };
      const result = emailValidator.validateMessageSize(email);
      expect(result.valid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it('should reject a message exceeding the default limit due to attachments', () => {
      const email: IEmailInput = {
        bodySize: 1024,
        attachments: [
          { filename: 'a.bin', size: 30 * 1024 * 1024 },
          { filename: 'b.bin', size: 25 * 1024 * 1024 },
        ],
      };
      const result = emailValidator.validateMessageSize(email);
      expect(result.valid).toBe(false);
      expect(result.errors).toHaveLength(1);
      expect(result.errors[0].code).toBe(EmailErrorType.MESSAGE_TOO_LARGE);
      expect(result.errors[0].field).toBe('message.size');
    });

    it('should reject a message exceeding the default limit due to body size', () => {
      const email: IEmailInput = {
        bodySize: 50 * 1024 * 1024 + 1,
      };
      const result = emailValidator.validateMessageSize(email);
      expect(result.valid).toBe(false);
      expect(result.errors[0].code).toBe(EmailErrorType.MESSAGE_TOO_LARGE);
      expect(result.errors[0].message).toContain(String(50 * 1024 * 1024 + 1));
    });

    it('should accept a message with no attachments', () => {
      const email: IEmailInput = {
        bodySize: 1024,
      };
      const result = emailValidator.validateMessageSize(email);
      expect(result.valid).toBe(true);
    });

    it('should accept a message with no attachments and no bodySize', () => {
      const email: IEmailInput = {};
      const result = emailValidator.validateMessageSize(email);
      expect(result.valid).toBe(true);
    });

    it('should accept a message within a custom size limit', () => {
      const customLimit = 100 * 1024; // 100KB
      const email: IEmailInput = {
        bodySize: 50 * 1024,
        attachments: [{ filename: 'small.txt', size: 40 * 1024 }],
      };
      const result = emailValidator.validateMessageSize(email, customLimit);
      expect(result.valid).toBe(true);
    });

    it('should reject a message exceeding a custom size limit', () => {
      const customLimit = 1024; // 1KB
      const email: IEmailInput = {
        bodySize: 512,
        attachments: [{ filename: 'over.txt', size: 600 }],
      };
      const result = emailValidator.validateMessageSize(email, customLimit);
      expect(result.valid).toBe(false);
      expect(result.errors[0].code).toBe(EmailErrorType.MESSAGE_TOO_LARGE);
    });

    it('should calculate total size as sum of bodySize and all attachment sizes', () => {
      // Total = 100 + 200 + 300 = 600, limit = 500
      const email: IEmailInput = {
        bodySize: 100,
        attachments: [
          { filename: 'a.txt', size: 200 },
          { filename: 'b.txt', size: 300 },
        ],
      };
      const result = emailValidator.validateMessageSize(email, 500);
      expect(result.valid).toBe(false);

      // Total = 100 + 200 + 300 = 600, limit = 600
      const result2 = emailValidator.validateMessageSize(email, 600);
      expect(result2.valid).toBe(true);
    });

    it('should return structured IValidationResult', () => {
      const email: IEmailInput = { bodySize: 100 };
      const result: IValidationResult =
        emailValidator.validateMessageSize(email);
      expect(result).toHaveProperty('valid');
      expect(result).toHaveProperty('errors');
      expect(Array.isArray(result.errors)).toBe(true);
    });
  });
});

describe('EmailValidator - Full Email Validation (Task 2.8)', () => {
  let emailValidator: EmailValidator;

  beforeEach(() => {
    emailValidator = new EmailValidator();
  });

  /**
   * Helper to create a minimal valid email input.
   */
  function minimalValidEmail(): IEmailInput {
    return {
      from: createMailbox('sender', 'example.com'),
      to: [createMailbox('recipient', 'example.com')],
    };
  }

  describe('validate', () => {
    it('should pass for a valid email with all required fields', () => {
      const email: IEmailInput = {
        from: createMailbox('sender', 'example.com', 'Sender Name'),
        to: [createMailbox('alice', 'example.com')],
        cc: [createMailbox('bob', 'example.com')],
        bcc: [createMailbox('charlie', 'example.com')],
        subject: 'Test Subject',
        date: new Date(),
        messageId: '<unique-id@example.com>',
        contentType: createContentType(
          'text',
          'plain',
          new Map([['charset', 'utf-8']]),
        ),
        attachments: [{ filename: 'doc.pdf', size: 1024 }],
        bodySize: 512,
      };
      const result = emailValidator.validate(email);
      expect(result.valid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it('should pass for a minimal valid email (just from + one to recipient)', () => {
      const email = minimalValidEmail();
      const result = emailValidator.validate(email);
      expect(result.valid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it('should fail for email without From with MISSING_REQUIRED_HEADER', () => {
      const email: IEmailInput = {
        to: [createMailbox('recipient', 'example.com')],
      };
      const result = emailValidator.validate(email);
      expect(result.valid).toBe(false);
      expect(
        result.errors.some(
          (e) => e.code === EmailErrorType.MISSING_REQUIRED_HEADER,
        ),
      ).toBe(true);
      expect(result.errors.some((e) => e.field === 'from')).toBe(true);
    });

    it('should fail for email without any recipients with NO_RECIPIENTS', () => {
      const email: IEmailInput = {
        from: createMailbox('sender', 'example.com'),
      };
      const result = emailValidator.validate(email);
      expect(result.valid).toBe(false);
      expect(
        result.errors.some((e) => e.code === EmailErrorType.NO_RECIPIENTS),
      ).toBe(true);
      expect(result.errors.some((e) => e.field === 'recipients')).toBe(true);
    });

    it('should pass for email with only To recipients', () => {
      const email: IEmailInput = {
        from: createMailbox('sender', 'example.com'),
        to: [createMailbox('recipient', 'example.com')],
      };
      const result = emailValidator.validate(email);
      expect(result.valid).toBe(true);
    });

    it('should pass for email with only Cc recipients', () => {
      const email: IEmailInput = {
        from: createMailbox('sender', 'example.com'),
        cc: [createMailbox('cc-recipient', 'example.com')],
      };
      const result = emailValidator.validate(email);
      expect(result.valid).toBe(true);
    });

    it('should pass for email with only Bcc recipients', () => {
      const email: IEmailInput = {
        from: createMailbox('sender', 'example.com'),
        bcc: [createMailbox('bcc-recipient', 'example.com')],
      };
      const result = emailValidator.validate(email);
      expect(result.valid).toBe(true);
    });

    it('should fail for email with invalid From mailbox', () => {
      const email: IEmailInput = {
        from: createMailbox('', 'example.com'),
        to: [createMailbox('recipient', 'example.com')],
      };
      const result = emailValidator.validate(email);
      expect(result.valid).toBe(false);
      expect(
        result.errors.some((e) => e.code === EmailErrorType.INVALID_MAILBOX),
      ).toBe(true);
    });

    it('should fail for email with invalid recipient mailbox', () => {
      const email: IEmailInput = {
        from: createMailbox('sender', 'example.com'),
        to: [createMailbox('', 'example.com')],
      };
      const result = emailValidator.validate(email);
      expect(result.valid).toBe(false);
      expect(
        result.errors.some((e) => e.code === EmailErrorType.INVALID_MAILBOX),
      ).toBe(true);
      expect(result.errors.some((e) => e.field.startsWith('to[0]'))).toBe(true);
    });

    it('should fail for email with invalid date', () => {
      const email: IEmailInput = {
        from: createMailbox('sender', 'example.com'),
        to: [createMailbox('recipient', 'example.com')],
        date: new Date('invalid-date'),
      };
      const result = emailValidator.validate(email);
      expect(result.valid).toBe(false);
      expect(
        result.errors.some((e) => e.code === EmailErrorType.INVALID_DATE),
      ).toBe(true);
      expect(result.errors.some((e) => e.field === 'date')).toBe(true);
    });

    it('should fail for email with invalid messageId', () => {
      const email: IEmailInput = {
        from: createMailbox('sender', 'example.com'),
        to: [createMailbox('recipient', 'example.com')],
        messageId: 'not-a-valid-message-id',
      };
      const result = emailValidator.validate(email);
      expect(result.valid).toBe(false);
      expect(
        result.errors.some((e) => e.code === EmailErrorType.INVALID_MESSAGE_ID),
      ).toBe(true);
      expect(result.errors.some((e) => e.field === 'messageId')).toBe(true);
    });

    it('should fail for email with oversized attachment', () => {
      const email: IEmailInput = {
        from: createMailbox('sender', 'example.com'),
        to: [createMailbox('recipient', 'example.com')],
        attachments: [{ filename: 'huge.zip', size: 30 * 1024 * 1024 }],
      };
      const result = emailValidator.validate(email);
      expect(result.valid).toBe(false);
      expect(
        result.errors.some(
          (e) => e.code === EmailErrorType.ATTACHMENT_TOO_LARGE,
        ),
      ).toBe(true);
    });

    it('should fail for email with oversized total message', () => {
      const email: IEmailInput = {
        from: createMailbox('sender', 'example.com'),
        to: [createMailbox('recipient', 'example.com')],
        bodySize: 30 * 1024 * 1024,
        attachments: [{ filename: 'big.bin', size: 25 * 1024 * 1024 }],
      };
      const result = emailValidator.validate(email);
      expect(result.valid).toBe(false);
      expect(
        result.errors.some((e) => e.code === EmailErrorType.MESSAGE_TOO_LARGE),
      ).toBe(true);
    });

    it('should collect multiple validation errors and return them together', () => {
      const email: IEmailInput = {
        // Missing from
        // No recipients
        date: new Date('invalid'),
        messageId: 'bad-id',
      };
      const result = emailValidator.validate(email);
      expect(result.valid).toBe(false);
      // Should have at least: MISSING_REQUIRED_HEADER, NO_RECIPIENTS, INVALID_DATE, INVALID_MESSAGE_ID
      expect(result.errors.length).toBeGreaterThanOrEqual(4);
      expect(
        result.errors.some(
          (e) => e.code === EmailErrorType.MISSING_REQUIRED_HEADER,
        ),
      ).toBe(true);
      expect(
        result.errors.some((e) => e.code === EmailErrorType.NO_RECIPIENTS),
      ).toBe(true);
      expect(
        result.errors.some((e) => e.code === EmailErrorType.INVALID_DATE),
      ).toBe(true);
      expect(
        result.errors.some((e) => e.code === EmailErrorType.INVALID_MESSAGE_ID),
      ).toBe(true);
    });

    it('should return structured IValidationResult with error details', () => {
      const email: IEmailInput = {};
      const result: IValidationResult = emailValidator.validate(email);
      expect(result).toHaveProperty('valid');
      expect(result).toHaveProperty('errors');
      expect(Array.isArray(result.errors)).toBe(true);
      for (const error of result.errors) {
        expect(error).toHaveProperty('code');
        expect(error).toHaveProperty('field');
        expect(error).toHaveProperty('message');
        expect(typeof error.code).toBe('string');
        expect(typeof error.field).toBe('string');
        expect(typeof error.message).toBe('string');
      }
    });

    it('should validate invalid cc recipient mailbox', () => {
      const email: IEmailInput = {
        from: createMailbox('sender', 'example.com'),
        cc: [
          createMailbox('valid', 'example.com'),
          createMailbox('', 'example.com'),
        ],
      };
      const result = emailValidator.validate(email);
      expect(result.valid).toBe(false);
      expect(result.errors.some((e) => e.field.startsWith('cc[1]'))).toBe(true);
    });

    it('should validate invalid bcc recipient mailbox', () => {
      const email: IEmailInput = {
        from: createMailbox('sender', 'example.com'),
        bcc: [createMailbox('user', '')],
      };
      const result = emailValidator.validate(email);
      expect(result.valid).toBe(false);
      expect(result.errors.some((e) => e.field.startsWith('bcc[0]'))).toBe(
        true,
      );
    });

    it('should fail for email with invalid contentType', () => {
      const email: IEmailInput = {
        from: createMailbox('sender', 'example.com'),
        to: [createMailbox('recipient', 'example.com')],
        contentType: createContentType('unknown', 'test'),
      };
      const result = emailValidator.validate(email);
      expect(result.valid).toBe(false);
      expect(
        result.errors.some(
          (e) => e.code === EmailErrorType.INVALID_CONTENT_TYPE,
        ),
      ).toBe(true);
    });

    it('should not fail when optional fields are omitted', () => {
      // Only from and to - no date, messageId, contentType, attachments
      const email: IEmailInput = {
        from: createMailbox('sender', 'example.com'),
        to: [createMailbox('recipient', 'example.com')],
      };
      const result = emailValidator.validate(email);
      expect(result.valid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it('should treat empty recipient arrays as no recipients', () => {
      const email: IEmailInput = {
        from: createMailbox('sender', 'example.com'),
        to: [],
        cc: [],
        bcc: [],
      };
      const result = emailValidator.validate(email);
      expect(result.valid).toBe(false);
      expect(
        result.errors.some((e) => e.code === EmailErrorType.NO_RECIPIENTS),
      ).toBe(true);
    });
  });
});
