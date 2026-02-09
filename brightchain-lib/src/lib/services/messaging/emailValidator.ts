/**
 * Email Validator Service
 *
 * Validates email messages against RFC 5322/MIME requirements.
 * Uses the `email-addresses` library for RFC 5322 address parsing/validation
 * and `validator.isEmail()` for basic email format validation.
 *
 * @remarks
 * This class implements header validation methods for Task 2.1:
 * - validateHeaderName(): RFC 5322 character validation
 * - validateMailbox(): Address format validation
 * - validateMessageId(): Message-ID format validation
 * - validateDate(): RFC 5322 date format validation
 *
 * Address length validation (Task 2.3):
 * - validateAddressLength(): Validates total address and local-part length limits
 * - Length checks are also integrated into validateMailbox()
 *
 * Content validation (validateContentType, validateMultipartBoundary,
 * validateContentTransferEncoding) and size validation (validateAttachmentSize,
 * validateMessageSize) are implemented in separate tasks (2.5, 2.6).
 *
 * @see RFC 5322 Section 2.2 - Header Fields
 * @see RFC 5322 Section 3.3 - Date and Time Specification
 * @see RFC 5322 Section 3.4 - Address Specification
 * @see RFC 5322 Section 3.6.4 - Identification Fields
 *
 * Requirements: 1.7, 2.5, 2.6, 15.2, 15.3, 15.4, 15.10
 */

import * as emailAddresses from 'email-addresses';
import validator from 'validator';
import { EmailErrorType } from '../../enumerations/messaging/emailErrorType';
import { IMailbox } from '../../interfaces/messaging/emailAddress';
import {
  ContentTransferEncoding,
  IContentType,
} from '../../interfaces/messaging/mimePart';

/**
 * Structured validation result returned by validation methods.
 */
export interface IValidationResult {
  valid: boolean;
  errors: IValidationError[];
}

/**
 * Individual validation error with code, field, and message.
 */
export interface IValidationError {
  code: string;
  field: string;
  message: string;
}

/**
 * Input for attachment size validation.
 *
 * @see Requirement 8.5 - Configurable maximum attachment size limit
 */
export interface IAttachmentInput {
  /** Original filename of the attachment */
  filename: string;
  /** Size of the attachment in bytes */
  size: number;
}

/**
 * Input for full email validation.
 *
 * Contains all fields needed for comprehensive email validation including
 * sender, recipients, headers, content type, attachments, and body size.
 *
 * @see Requirement 8.6 - Configurable maximum total message size limit
 * @see Requirement 15.1 - Validate at least one recipient is specified
 * @see Requirement 15.5 - Return structured error with error code, field name, and description
 * @see Requirement 15.9 - Validate total message size does not exceed configured maximum
 */
export interface IEmailInput {
  /** Sender mailbox (From header) */
  from?: IMailbox;
  /** Primary recipients (To header) */
  to?: IMailbox[];
  /** CC recipients */
  cc?: IMailbox[];
  /** BCC recipients */
  bcc?: IMailbox[];
  /** Subject line */
  subject?: string;
  /** Date */
  date?: Date;
  /** Message-ID (optional, auto-generated if missing) */
  messageId?: string;
  /** Content-Type */
  contentType?: IContentType;
  /** Attachments included in the email */
  attachments?: IAttachmentInput[];
  /** Size of the body content in bytes */
  bodySize?: number;
}

/**
 * Validates email messages against RFC 5322/MIME requirements.
 *
 * @see Design Document: EmailValidator Class
 */
export class EmailValidator {
  /**
   * Validates an RFC 5322 header field name.
   *
   * Per RFC 5322 Section 2.2, a header field name must consist of
   * printable US-ASCII characters (codes 33-126) excluding the colon (':').
   * The field name must also be non-empty.
   *
   * @param name - The header field name to validate
   * @returns true if the name is a valid RFC 5322 header field name
   *
   * @see RFC 5322 Section 2.2
   * @see Requirement 1.7 - Validate header field names
   * @see Requirement 15.3 - Validate header field names contain only valid characters
   *
   * @example
   * ```typescript
   * const validator = new EmailValidator();
   * validator.validateHeaderName('Content-Type');  // true
   * validator.validateHeaderName('X-Custom');      // true
   * validator.validateHeaderName('Bad:Name');      // false (contains colon)
   * validator.validateHeaderName('Bad Name');      // false (contains space, code 32)
   * validator.validateHeaderName('');              // false (empty)
   * ```
   */
  validateHeaderName(name: string): boolean {
    // Must be non-empty
    if (name.length === 0) {
      return false;
    }

    // Each character must be printable US-ASCII (33-126) excluding colon (58)
    for (let i = 0; i < name.length; i++) {
      const code = name.charCodeAt(i);
      if (code < 33 || code > 126 || code === 58) {
        return false;
      }
    }

    return true;
  }

  /**
   * Validates an IMailbox address using the `email-addresses` library
   * for RFC 5322 address grammar parsing and `validator.isEmail()` for
   * basic format validation.
   *
   * Validation checks:
   * 1. localPart and domain must be non-empty strings
   * 2. The composed address must pass `validator.isEmail()` basic format check
   * 3. The address must parse successfully with the `email-addresses` library
   *    using RFC 5322 grammar
   *
   * @param mailbox - The IMailbox to validate
   * @returns IValidationResult with valid flag and any errors
   *
   * @see RFC 5322 Section 3.4
   * @see Requirement 15.2 - Validate From header contains exactly one mailbox
   * @see Requirement 15.10 - Validate date-time format per RFC 5322
   *
   * @example
   * ```typescript
   * const validator = new EmailValidator();
   * const result = validator.validateMailbox({
   *   localPart: 'john',
   *   domain: 'example.com',
   *   get address() { return `${this.localPart}@${this.domain}`; }
   * });
   * // result.valid === true
   * ```
   */
  validateMailbox(mailbox: IMailbox): IValidationResult {
    const errors: IValidationError[] = [];

    // Check that localPart is non-empty
    if (!mailbox.localPart || mailbox.localPart.trim().length === 0) {
      errors.push({
        code: EmailErrorType.INVALID_MAILBOX,
        field: 'localPart',
        message: 'Local part must not be empty',
      });
    }

    // Check that domain is non-empty
    if (!mailbox.domain || mailbox.domain.trim().length === 0) {
      errors.push({
        code: EmailErrorType.INVALID_MAILBOX,
        field: 'domain',
        message: 'Domain must not be empty',
      });
    }

    // If basic fields are missing, return early
    if (errors.length > 0) {
      return { valid: false, errors };
    }

    // Validate address length constraints per RFC 5321
    const lengthResult = this.validateAddressLength(mailbox);
    if (!lengthResult.valid) {
      return lengthResult;
    }

    const address = mailbox.address;

    // Use validator.isEmail() for basic email format validation
    if (!validator.isEmail(address)) {
      errors.push({
        code: EmailErrorType.INVALID_MAILBOX,
        field: 'address',
        message: `Invalid email address format: ${address}`,
      });
      return { valid: false, errors };
    }

    // Use email-addresses library for RFC 5322 address grammar parsing
    // Build the full mailbox string for parsing (with display name if present)
    const mailboxString = mailbox.displayName
      ? `"${mailbox.displayName}" <${address}>`
      : address;

    const parsed = emailAddresses.parseOneAddress({
      input: mailboxString,
      rfc6532: true,
    });

    if (!parsed) {
      errors.push({
        code: EmailErrorType.INVALID_MAILBOX,
        field: 'address',
        message: `Address does not conform to RFC 5322 grammar: ${mailboxString}`,
      });
      return { valid: false, errors };
    }

    return { valid: true, errors: [] };
  }

  /**
   * Maximum total length of an email address per RFC 5321 Section 4.5.3.1.3.
   * The path (including angle brackets) is limited to 256 octets, which means
   * the addr-spec itself is limited to 254 characters.
   */
  static readonly MAX_ADDRESS_LENGTH = 254;

  /**
   * Maximum length of the local-part of an email address per RFC 5321 Section 4.5.3.1.1.
   */
  static readonly MAX_LOCAL_PART_LENGTH = 64;

  /**
   * Validates the length constraints of an email address per RFC 5321.
   *
   * Per RFC 5321:
   * - The total address (local-part@domain) must not exceed 254 characters
   *   (Section 4.5.3.1.3: path is max 256 octets including angle brackets)
   * - The local-part must not exceed 64 characters (Section 4.5.3.1.1)
   *
   * @param mailbox - The IMailbox to validate for length constraints
   * @returns IValidationResult with valid flag and any length-related errors
   *
   * @see RFC 5321 Section 4.5.3.1
   * @see Requirement 2.5 - Reject addresses exceeding 254 characters total length
   * @see Requirement 2.6 - Reject local-parts exceeding 64 characters
   *
   * @example
   * ```typescript
   * const validator = new EmailValidator();
   *
   * // Valid address
   * const result1 = validator.validateAddressLength(
   *   createMailbox('user', 'example.com')
   * );
   * // result1.valid === true
   *
   * // Local-part too long (> 64 characters)
   * const result2 = validator.validateAddressLength(
   *   createMailbox('a'.repeat(65), 'example.com')
   * );
   * // result2.valid === false, error code INVALID_MAILBOX
   *
   * // Total address too long (> 254 characters)
   * const result3 = validator.validateAddressLength(
   *   createMailbox('user', 'a'.repeat(250) + '.com')
   * );
   * // result3.valid === false, error code INVALID_MAILBOX
   * ```
   */
  validateAddressLength(mailbox: IMailbox): IValidationResult {
    const errors: IValidationError[] = [];

    // Validate local-part length <= 64 characters per RFC 5321 Section 4.5.3.1.1
    if (mailbox.localPart.length > EmailValidator.MAX_LOCAL_PART_LENGTH) {
      errors.push({
        code: EmailErrorType.INVALID_MAILBOX,
        field: 'localPart',
        message: `Local part exceeds maximum length of ${EmailValidator.MAX_LOCAL_PART_LENGTH} characters: ${mailbox.localPart.length} characters`,
      });
    }

    // Validate total address length <= 254 characters per RFC 5321 Section 4.5.3.1.3
    const address = mailbox.address;
    if (address.length > EmailValidator.MAX_ADDRESS_LENGTH) {
      errors.push({
        code: EmailErrorType.INVALID_MAILBOX,
        field: 'address',
        message: `Email address exceeds maximum length of ${EmailValidator.MAX_ADDRESS_LENGTH} characters: ${address.length} characters`,
      });
    }

    return {
      valid: errors.length === 0,
      errors,
    };
  }

  /**
   * Validates a Message-ID string per RFC 5322 Section 3.6.4.
   *
   * A valid Message-ID must:
   * 1. Be enclosed in angle brackets: `<id-left@id-right>`
   * 2. Contain exactly one '@' character within the angle brackets
   * 3. Have non-empty id-left and id-right portions
   *
   * @param messageId - The Message-ID string to validate
   * @returns true if the Message-ID is valid per RFC 5322
   *
   * @see RFC 5322 Section 3.6.4
   * @see Requirement 15.4 - Validate required headers (Message-ID)
   *
   * @example
   * ```typescript
   * const validator = new EmailValidator();
   * validator.validateMessageId('<unique-id@example.com>');  // true
   * validator.validateMessageId('no-brackets@example.com');  // false
   * validator.validateMessageId('<no-at-sign>');             // false
   * validator.validateMessageId('<two@@signs>');             // false
   * ```
   */
  validateMessageId(messageId: string): boolean {
    // Must be non-empty
    if (!messageId || messageId.length === 0) {
      return false;
    }

    // Must be enclosed in angle brackets
    if (!messageId.startsWith('<') || !messageId.endsWith('>')) {
      return false;
    }

    // Extract the content between angle brackets
    const content = messageId.slice(1, -1);

    // Content must be non-empty
    if (content.length === 0) {
      return false;
    }

    // Must contain exactly one '@' character
    const atParts = content.split('@');
    if (atParts.length !== 2) {
      return false;
    }

    const [idLeft, idRight] = atParts;

    // Both id-left and id-right must be non-empty
    if (idLeft.length === 0 || idRight.length === 0) {
      return false;
    }

    return true;
  }

  /**
   * Validates a Date object for RFC 5322 date-time format compliance.
   *
   * Per RFC 5322 Section 3.3, a date-time must represent a valid date.
   * This method checks that:
   * 1. The date is a valid Date object (not NaN/Invalid Date)
   * 2. The date is not unreasonably far in the future (more than 1 day ahead,
   *    to allow for timezone differences)
   * 3. The date is not before the epoch of email (RFC 822 was published in 1982,
   *    but we use year 1970 as a reasonable lower bound)
   *
   * @param date - The Date object to validate
   * @returns true if the date is valid for RFC 5322
   *
   * @see RFC 5322 Section 3.3
   * @see Requirement 15.10 - Validate date-time format per RFC 5322
   *
   * @example
   * ```typescript
   * const validator = new EmailValidator();
   * validator.validateDate(new Date());                    // true
   * validator.validateDate(new Date('2024-01-15'));        // true
   * validator.validateDate(new Date('invalid'));           // false
   * validator.validateDate(new Date('1960-01-01'));        // false (before 1970)
   * ```
   */
  validateDate(date: Date): boolean {
    // Must be a Date object
    if (!(date instanceof Date)) {
      return false;
    }

    // Must not be an invalid date (NaN)
    if (isNaN(date.getTime())) {
      return false;
    }

    // Must not be before the epoch (1970-01-01)
    // RFC 822 was published in 1982, but 1970 is a reasonable lower bound
    const epochStart = new Date('1970-01-01T00:00:00Z');
    if (date.getTime() < epochStart.getTime()) {
      return false;
    }

    // Must not be unreasonably far in the future (more than 1 day ahead)
    // This allows for timezone differences while catching obviously wrong dates
    const oneDayFromNow = new Date(Date.now() + 24 * 60 * 60 * 1000);
    if (date.getTime() > oneDayFromNow.getTime()) {
      return false;
    }

    return true;
  }

  /**
   * Valid discrete MIME types per RFC 2046.
   */
  private static readonly VALID_DISCRETE_TYPES = new Set([
    'text',
    'image',
    'audio',
    'video',
    'application',
  ]);

  /**
   * Valid composite MIME types per RFC 2046.
   */
  private static readonly VALID_COMPOSITE_TYPES = new Set([
    'multipart',
    'message',
  ]);

  /**
   * RFC 2045 token characters.
   * A token is composed of any US-ASCII character except CTLs (0-31, 127),
   * spaces (32), and tspecials.
   *
   * tspecials: ( ) < > @ , ; : \ " / [ ] ? =
   */
  private static readonly TSPECIALS = new Set([
    '(',
    ')',
    '<',
    '>',
    '@',
    ',',
    ';',
    ':',
    '\\',
    '"',
    '/',
    '[',
    ']',
    '?',
    '=',
  ]);

  /**
   * Checks whether a string is a valid RFC 2045 token.
   * A token consists of any US-ASCII character (1-127) except CTLs (0-31, 127),
   * spaces (32), and tspecials.
   *
   * @param value - The string to check
   * @returns true if the string is a valid token
   */
  private isValidToken(value: string): boolean {
    if (value.length === 0) {
      return false;
    }
    for (let i = 0; i < value.length; i++) {
      const code = value.charCodeAt(i);
      // Must be US-ASCII (1-126), not CTL (0-31, 127), not space (32)
      if (code <= 32 || code >= 127) {
        return false;
      }
      if (EmailValidator.TSPECIALS.has(value[i])) {
        return false;
      }
    }
    return true;
  }

  /**
   * Validates a Content-Type header per RFC 2045.
   *
   * Validation rules:
   * 1. type must be non-empty and contain only valid token characters
   * 2. subtype must be non-empty and contain only valid token characters
   * 3. type must be a recognized discrete or composite type
   * 4. If type is "multipart", parameters must include a "boundary" parameter
   *
   * @param contentType - The IContentType to validate
   * @returns IValidationResult with valid flag and any errors
   *
   * @see RFC 2045 Section 5.1 - Syntax of the Content-Type Header Field
   * @see Requirement 15.6 - Validate Content-Type headers are well-formed with valid type/subtype
   *
   * @example
   * ```typescript
   * const validator = new EmailValidator();
   * const result = validator.validateContentType(
   *   createContentType('text', 'plain', new Map([['charset', 'utf-8']]))
   * );
   * // result.valid === true
   * ```
   */
  validateContentType(contentType: IContentType): IValidationResult {
    const errors: IValidationError[] = [];

    // Validate type is a valid token
    if (!this.isValidToken(contentType.type)) {
      errors.push({
        code: EmailErrorType.INVALID_CONTENT_TYPE,
        field: 'contentType.type',
        message: `Invalid Content-Type type: "${contentType.type}". Must be a non-empty RFC 2045 token.`,
      });
    }

    // Validate subtype is a valid token
    if (!this.isValidToken(contentType.subtype)) {
      errors.push({
        code: EmailErrorType.INVALID_CONTENT_TYPE,
        field: 'contentType.subtype',
        message: `Invalid Content-Type subtype: "${contentType.subtype}". Must be a non-empty RFC 2045 token.`,
      });
    }

    // If type/subtype are invalid tokens, return early
    if (errors.length > 0) {
      return { valid: false, errors };
    }

    // Validate type is a recognized discrete or composite type (case-insensitive)
    const typeLower = contentType.type.toLowerCase();
    if (
      !EmailValidator.VALID_DISCRETE_TYPES.has(typeLower) &&
      !EmailValidator.VALID_COMPOSITE_TYPES.has(typeLower)
    ) {
      errors.push({
        code: EmailErrorType.INVALID_CONTENT_TYPE,
        field: 'contentType.type',
        message: `Unrecognized Content-Type type: "${contentType.type}". Must be one of: text, image, audio, video, application, multipart, message.`,
      });
    }

    // If type is "multipart", parameters must include a "boundary" parameter
    if (typeLower === 'multipart') {
      const hasBoundary = Array.from(contentType.parameters.keys()).some(
        (key) => key.toLowerCase() === 'boundary',
      );
      if (!hasBoundary) {
        errors.push({
          code: EmailErrorType.INVALID_BOUNDARY,
          field: 'contentType.parameters.boundary',
          message:
            'Multipart Content-Type must include a "boundary" parameter.',
        });
      }
    }

    return {
      valid: errors.length === 0,
      errors,
    };
  }

  /**
   * Valid boundary characters per RFC 2046 Section 5.1.1.
   *
   * bcharsnospace := DIGIT / ALPHA / "'" / "(" / ")" / "+" / "_" / "," / "-" / "." / "/" / ":" / "=" / "?"
   * bchars := bcharsnospace / " "
   *
   * Note: The last character of a boundary must NOT be a space.
   */
  private static readonly BOUNDARY_CHARS = new Set(
    "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789'()+_,-./:=? ".split(
      '',
    ),
  );

  /**
   * Validates a multipart boundary string per RFC 2046 Section 5.1.1.
   *
   * Validation rules:
   * 1. Boundary must be 1-70 characters long
   * 2. Boundary must consist of valid boundary characters (RFC 2046 bchars)
   * 3. The last character must not be a space
   * 4. The boundary string must not appear in the content (ensures uniqueness)
   *
   * @param boundary - The boundary string to validate
   * @param content - The message content as Uint8Array to check for boundary collisions
   * @returns true if the boundary is valid
   *
   * @see RFC 2046 Section 5.1.1 - Common Syntax
   * @see Requirement 15.7 - Validate that multipart messages have valid boundary parameters
   *
   * @example
   * ```typescript
   * const validator = new EmailValidator();
   * const content = new TextEncoder().encode('Hello, world!');
   * validator.validateMultipartBoundary('----=_Part_123', content); // true
   * validator.validateMultipartBoundary('', content);               // false (empty)
   * ```
   */
  validateMultipartBoundary(boundary: string, content: Uint8Array): boolean {
    // Must be 1-70 characters
    if (boundary.length < 1 || boundary.length > 70) {
      return false;
    }

    // All characters must be valid boundary characters
    for (let i = 0; i < boundary.length; i++) {
      if (!EmailValidator.BOUNDARY_CHARS.has(boundary[i])) {
        return false;
      }
    }

    // Last character must not be a space
    if (boundary[boundary.length - 1] === ' ') {
      return false;
    }

    // The boundary string must not appear in the content
    const boundaryBytes = new TextEncoder().encode(boundary);
    const contentLength = content.length;
    const boundaryLength = boundaryBytes.length;

    if (contentLength >= boundaryLength) {
      for (let i = 0; i <= contentLength - boundaryLength; i++) {
        let match = true;
        for (let j = 0; j < boundaryLength; j++) {
          if (content[i + j] !== boundaryBytes[j]) {
            match = false;
            break;
          }
        }
        if (match) {
          return false;
        }
      }
    }

    return true;
  }

  /**
   * Validates a Content-Transfer-Encoding value per RFC 2045 Section 6.
   *
   * Valid values are: "7bit", "8bit", "binary", "quoted-printable", "base64".
   * Comparison is case-insensitive per RFC 2045.
   *
   * @param encoding - The encoding string to validate
   * @returns true if the encoding is a valid Content-Transfer-Encoding value
   *
   * @see RFC 2045 Section 6 - Content-Transfer-Encoding Header Field
   * @see Requirement 15.8 - Validate Content-Transfer-Encoding values
   *
   * @example
   * ```typescript
   * const validator = new EmailValidator();
   * validator.validateContentTransferEncoding('base64');           // true
   * validator.validateContentTransferEncoding('Base64');           // true (case-insensitive)
   * validator.validateContentTransferEncoding('quoted-printable'); // true
   * validator.validateContentTransferEncoding('invalid');          // false
   * ```
   */
  validateContentTransferEncoding(encoding: string): boolean {
    if (!encoding || encoding.length === 0) {
      return false;
    }

    const normalizedEncoding = encoding.toLowerCase();

    // Check against all valid ContentTransferEncoding values
    return (
      normalizedEncoding === ContentTransferEncoding.SevenBit ||
      normalizedEncoding === ContentTransferEncoding.EightBit ||
      normalizedEncoding === ContentTransferEncoding.Binary ||
      normalizedEncoding === ContentTransferEncoding.QuotedPrintable ||
      normalizedEncoding === ContentTransferEncoding.Base64
    );
  }

  /**
   * Default maximum attachment size: 25MB per attachment.
   * @see Requirement 8.5
   */
  static readonly DEFAULT_MAX_ATTACHMENT_SIZE = 25 * 1024 * 1024;

  /**
   * Default maximum total message size: 50MB.
   * @see Requirement 8.6
   */
  static readonly DEFAULT_MAX_MESSAGE_SIZE = 50 * 1024 * 1024;

  /**
   * Validates that an attachment does not exceed the configured maximum size.
   *
   * @param attachment - The attachment input to validate
   * @param maxSize - Maximum allowed attachment size in bytes (default: 25MB)
   * @returns IValidationResult with valid flag and any errors
   *
   * @see Requirement 8.5 - Configurable maximum attachment size limit (default: 25MB per attachment)
   *
   * @example
   * ```typescript
   * const validator = new EmailValidator();
   * const result = validator.validateAttachmentSize({ filename: 'doc.pdf', size: 1024 });
   * // result.valid === true
   *
   * const result2 = validator.validateAttachmentSize(
   *   { filename: 'huge.zip', size: 30 * 1024 * 1024 }
   * );
   * // result2.valid === false, error code ATTACHMENT_TOO_LARGE
   * ```
   */
  validateAttachmentSize(
    attachment: IAttachmentInput,
    maxSize: number = EmailValidator.DEFAULT_MAX_ATTACHMENT_SIZE,
  ): IValidationResult {
    const errors: IValidationError[] = [];

    if (attachment.size > maxSize) {
      errors.push({
        code: EmailErrorType.ATTACHMENT_TOO_LARGE,
        field: 'attachment.size',
        message: `Attachment "${attachment.filename}" exceeds maximum size of ${maxSize} bytes: ${attachment.size} bytes`,
      });
    }

    return {
      valid: errors.length === 0,
      errors,
    };
  }

  /**
   * Validates that the total message size does not exceed the configured maximum.
   *
   * Total message size is calculated as the sum of bodySize and all attachment sizes.
   *
   * @param email - The email input to validate
   * @param maxSize - Maximum allowed total message size in bytes (default: 50MB)
   * @returns IValidationResult with valid flag and any errors
   *
   * @see Requirement 8.6 - Configurable maximum total message size limit (default: 50MB)
   * @see Requirement 15.9 - Validate total message size does not exceed configured maximum
   *
   * @example
   * ```typescript
   * const validator = new EmailValidator();
   * const result = validator.validateMessageSize({
   *   bodySize: 1024,
   *   attachments: [{ filename: 'doc.pdf', size: 2048 }],
   * });
   * // result.valid === true
   * ```
   */
  validateMessageSize(
    email: IEmailInput,
    maxSize: number = EmailValidator.DEFAULT_MAX_MESSAGE_SIZE,
  ): IValidationResult {
    const errors: IValidationError[] = [];

    let totalSize = email.bodySize ?? 0;

    if (email.attachments) {
      for (const attachment of email.attachments) {
        totalSize += attachment.size;
      }
    }

    if (totalSize > maxSize) {
      errors.push({
        code: EmailErrorType.MESSAGE_TOO_LARGE,
        field: 'message.size',
        message: `Total message size exceeds maximum of ${maxSize} bytes: ${totalSize} bytes`,
      });
    }

    return {
      valid: errors.length === 0,
      errors,
    };
  }

  /**
   * Performs full validation of an email input, combining all individual validations.
   *
   * Validation steps:
   * 1. Validate that `from` is present and valid (using validateMailbox)
   * 2. Validate that at least one recipient exists (to, cc, or bcc has at least one entry)
   * 3. Validate all recipient mailboxes (to, cc, bcc) using validateMailbox
   * 4. Validate date if present (using validateDate)
   * 5. Validate messageId if present (using validateMessageId)
   * 6. Validate contentType if present (using validateContentType)
   * 7. Validate each attachment size (using validateAttachmentSize)
   * 8. Validate total message size (using validateMessageSize)
   * 9. Collect ALL errors from all validations and return them in a single IValidationResult
   *
   * @param email - The email input to validate
   * @returns IValidationResult with valid flag and all collected error details
   *
   * @see Requirement 15.1 - Validate at least one recipient (To, Cc, or Bcc) is specified
   * @see Requirement 15.5 - Return structured error with error code, field name, and description
   *
   * @example
   * ```typescript
   * const validator = new EmailValidator();
   * const result = validator.validate({
   *   from: createMailbox('sender', 'example.com'),
   *   to: [createMailbox('recipient', 'example.com')],
   * });
   * // result.valid === true
   * ```
   */
  validate(
    email: IEmailInput,
    config?: { maxAttachmentSize?: number; maxMessageSize?: number },
  ): IValidationResult {
    const errors: IValidationError[] = [];

    // 1. Validate that `from` is present and valid
    if (!email.from) {
      errors.push({
        code: EmailErrorType.MISSING_REQUIRED_HEADER,
        field: 'from',
        message: 'From header is required',
      });
    } else {
      const fromResult = this.validateMailbox(email.from);
      if (!fromResult.valid) {
        errors.push(...fromResult.errors);
      }
    }

    // 2. Validate that at least one recipient exists (to, cc, or bcc)
    const hasTo = email.to && email.to.length > 0;
    const hasCc = email.cc && email.cc.length > 0;
    const hasBcc = email.bcc && email.bcc.length > 0;

    if (!hasTo && !hasCc && !hasBcc) {
      errors.push({
        code: EmailErrorType.NO_RECIPIENTS,
        field: 'recipients',
        message: 'At least one recipient (To, Cc, or Bcc) must be specified',
      });
    }

    // 3. Validate all recipient mailboxes
    if (email.to) {
      for (let i = 0; i < email.to.length; i++) {
        const result = this.validateMailbox(email.to[i]);
        if (!result.valid) {
          for (const err of result.errors) {
            errors.push({
              code: err.code,
              field: `to[${i}].${err.field}`,
              message: err.message,
            });
          }
        }
      }
    }

    if (email.cc) {
      for (let i = 0; i < email.cc.length; i++) {
        const result = this.validateMailbox(email.cc[i]);
        if (!result.valid) {
          for (const err of result.errors) {
            errors.push({
              code: err.code,
              field: `cc[${i}].${err.field}`,
              message: err.message,
            });
          }
        }
      }
    }

    if (email.bcc) {
      for (let i = 0; i < email.bcc.length; i++) {
        const result = this.validateMailbox(email.bcc[i]);
        if (!result.valid) {
          for (const err of result.errors) {
            errors.push({
              code: err.code,
              field: `bcc[${i}].${err.field}`,
              message: err.message,
            });
          }
        }
      }
    }

    // 4. Validate date if present
    if (email.date !== undefined) {
      if (!this.validateDate(email.date)) {
        errors.push({
          code: EmailErrorType.INVALID_DATE,
          field: 'date',
          message: 'Invalid date value',
        });
      }
    }

    // 5. Validate messageId if present
    if (email.messageId !== undefined) {
      if (!this.validateMessageId(email.messageId)) {
        errors.push({
          code: EmailErrorType.INVALID_MESSAGE_ID,
          field: 'messageId',
          message: `Invalid Message-ID format: ${email.messageId}`,
        });
      }
    }

    // 6. Validate contentType if present
    if (email.contentType !== undefined) {
      const ctResult = this.validateContentType(email.contentType);
      if (!ctResult.valid) {
        errors.push(...ctResult.errors);
      }
    }

    // 7. Validate each attachment size
    if (email.attachments) {
      for (let i = 0; i < email.attachments.length; i++) {
        const attResult = this.validateAttachmentSize(
          email.attachments[i],
          config?.maxAttachmentSize,
        );
        if (!attResult.valid) {
          errors.push(...attResult.errors);
        }
      }
    }

    // 8. Validate total message size
    const sizeResult = this.validateMessageSize(email, config?.maxMessageSize);
    if (!sizeResult.valid) {
      errors.push(...sizeResult.errors);
    }

    return {
      valid: errors.length === 0,
      errors,
    };
  }
}
