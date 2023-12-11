/**
 * @fileoverview Property-based tests for EmailValidator - Header Name Validation
 *
 * **Feature: email-messaging-protocol**
 *
 * This test suite verifies:
 * - Property 8: Header Name Validation
 *
 * **Validates: Requirements 1.7, 15.3**
 *
 * Per RFC 5322 Section 2.2, a header field name must consist of printable
 * US-ASCII characters (codes 33-126) excluding the colon character (':' = 58).
 * The field name must also be non-empty.
 */

import fc from 'fast-check';
import { EmailValidator } from './emailValidator';

// Feature: email-messaging-protocol, Property 8: Header Name Validation

/**
 * Generator for a single valid header name character.
 * Valid characters are printable US-ASCII (33-126) excluding colon (58).
 */
const arbValidHeaderChar = fc.oneof(
  // Range 33-57 (! through 9, before colon)
  fc.integer({ min: 33, max: 57 }).map((code) => String.fromCharCode(code)),
  // Range 59-126 (; through ~, after colon)
  fc.integer({ min: 59, max: 126 }).map((code) => String.fromCharCode(code)),
);

/**
 * Generator for a valid RFC 5322 header field name.
 * Non-empty string of printable US-ASCII (33-126) excluding colon.
 */
const arbValidHeaderName = fc
  .array(arbValidHeaderChar, { minLength: 1, maxLength: 100 })
  .map((chars) => chars.join(''));

/**
 * Generator for a single invalid header name character.
 * Invalid characters are: control chars (0-32), colon (58), DEL (127), and non-ASCII (>127).
 */
const arbInvalidHeaderChar = fc.oneof(
  // Control characters and space (0-32)
  fc.integer({ min: 0, max: 32 }).map((code) => String.fromCharCode(code)),
  // Colon (58)
  fc.constant(String.fromCharCode(58)),
  // DEL (127)
  fc.constant(String.fromCharCode(127)),
  // Non-ASCII characters (128-65535)
  fc.integer({ min: 128, max: 65535 }).map((code) => String.fromCharCode(code)),
);

/**
 * Generator for an invalid header name: a non-empty string that contains
 * at least one invalid character (outside 33-126 or colon).
 * We build it by inserting an invalid character into an otherwise valid string.
 */
const arbInvalidHeaderName = fc
  .tuple(
    // Prefix: zero or more valid chars
    fc.array(arbValidHeaderChar, { minLength: 0, maxLength: 50 }),
    // At least one invalid character
    arbInvalidHeaderChar,
    // Suffix: zero or more valid chars
    fc.array(arbValidHeaderChar, { minLength: 0, maxLength: 50 }),
  )
  .map(([prefix, invalidChar, suffix]) =>
    [...prefix, invalidChar, ...suffix].join(''),
  );

describe('EmailValidator Property Tests', () => {
  let validator: EmailValidator;

  beforeEach(() => {
    validator = new EmailValidator();
  });

  describe('Property 8: Header Name Validation', () => {
    /**
     * **Feature: email-messaging-protocol, Property 8: Header Name Validation**
     *
     * *For any* string consisting only of printable US-ASCII characters (33-126)
     * excluding colon, and that is non-empty, `EmailValidator.validateHeaderName()`
     * SHALL return true.
     *
     * **Validates: Requirements 1.7, 15.3**
     */
    it('should return true for any non-empty string of valid header name characters (33-126, no colon)', () => {
      fc.assert(
        fc.property(arbValidHeaderName, (name) => {
          expect(validator.validateHeaderName(name)).toBe(true);
        }),
        { numRuns: 100 },
      );
    });

    /**
     * **Feature: email-messaging-protocol, Property 8: Header Name Validation**
     *
     * *For any* string containing characters outside printable US-ASCII (33-126)
     * or containing a colon character, `EmailValidator.validateHeaderName()`
     * SHALL return false.
     *
     * **Validates: Requirements 1.7, 15.3**
     */
    it('should return false for any string containing invalid characters (outside 33-126 or colon)', () => {
      fc.assert(
        fc.property(arbInvalidHeaderName, (name) => {
          expect(validator.validateHeaderName(name)).toBe(false);
        }),
        { numRuns: 100 },
      );
    });

    /**
     * **Feature: email-messaging-protocol, Property 8: Header Name Validation**
     *
     * The empty string SHALL always be rejected as a header name.
     *
     * **Validates: Requirements 1.7, 15.3**
     */
    it('should return false for the empty string', () => {
      expect(validator.validateHeaderName('')).toBe(false);
    });

    /**
     * **Feature: email-messaging-protocol, Property 8: Header Name Validation**
     *
     * *For any* arbitrary unicode string, `validateHeaderName()` returns true
     * if and only if the string is non-empty and every character code is in
     * [33-126] excluding 58 (colon). This tests both directions simultaneously.
     *
     * **Validates: Requirements 1.7, 15.3**
     */
    it('should return true iff every character is valid printable US-ASCII (33-126, no colon) and string is non-empty', () => {
      fc.assert(
        fc.property(fc.string({ minLength: 0, maxLength: 200 }), (s) => {
          const expected =
            s.length > 0 &&
            [...s].every((ch) => {
              const code = ch.charCodeAt(0);
              return code >= 33 && code <= 126 && code !== 58;
            });
          expect(validator.validateHeaderName(s)).toBe(expected);
        }),
        { numRuns: 100 },
      );
    });
  });
});

// Feature: email-messaging-protocol, Property 9: Address Length Validation

/**
 * @fileoverview Property-based tests for EmailValidator - Address Length Validation
 *
 * **Feature: email-messaging-protocol**
 *
 * This test suite verifies:
 * - Property 9: Address Length Validation
 *
 * **Validates: Requirements 2.5, 2.6**
 *
 * Per RFC 5321:
 * - Total email address length must not exceed 254 characters (Section 4.5.3.1.3)
 * - Local-part length must not exceed 64 characters (Section 4.5.3.1.1)
 */

import { createMailbox } from '../../interfaces/messaging/emailAddress';

// ─── Generators ─────────────────────────────────────────────────────────────

/**
 * Generator for a valid local-part character (simplified: lowercase alpha).
 * We use simple alphanumeric characters to avoid quoting complexities.
 */
const arbLocalPartChar = fc.constantFrom(
  ...'abcdefghijklmnopqrstuvwxyz0123456789'.split(''),
);

/**
 * Generator for a valid domain label character (lowercase alpha + digits).
 */
const arbDomainLabelChar = fc.constantFrom(
  ...'abcdefghijklmnopqrstuvwxyz0123456789'.split(''),
);

/**
 * Generator for a valid local-part string of a given length.
 */
function arbLocalPartOfLength(minLen: number, maxLen: number) {
  return fc
    .array(arbLocalPartChar, { minLength: minLen, maxLength: maxLen })
    .map((chars) => chars.join(''));
}

/**
 * Generator for a valid domain string of a given length.
 * Produces a domain like "aaa...aaa.com" with the label portion sized to hit the target.
 */
function arbDomainOfLength(minLen: number, maxLen: number) {
  // ".com" suffix is 4 chars, so the label part is length - 4
  const suffixLen = 4; // ".com"
  return fc
    .array(arbDomainLabelChar, {
      minLength: Math.max(1, minLen - suffixLen),
      maxLength: Math.max(1, maxLen - suffixLen),
    })
    .map((chars) => chars.join('') + '.com');
}

describe('Property 9: Address Length Validation', () => {
  let validator: EmailValidator;

  beforeEach(() => {
    validator = new EmailValidator();
  });

  /**
   * **Feature: email-messaging-protocol, Property 9: Address Length Validation**
   *
   * *For any* email address where the local-part is at most 64 characters
   * and the total address length is at most 254 characters,
   * `validateAddressLength()` SHALL return valid.
   *
   * **Validates: Requirements 2.5, 2.6**
   */
  it('should pass validation when local-part <= 64 chars and total address <= 254 chars', () => {
    fc.assert(
      fc.property(
        // Local-part: 1 to 64 characters
        arbLocalPartOfLength(1, 64),
        // Domain: 1 to 63 characters (label) + ".com"
        arbDomainOfLength(5, 63),
        (localPart, domain) => {
          const mailbox = createMailbox(localPart, domain);
          const totalLength = mailbox.address.length;

          // Only test cases within both limits
          fc.pre(localPart.length <= EmailValidator.MAX_LOCAL_PART_LENGTH);
          fc.pre(totalLength <= EmailValidator.MAX_ADDRESS_LENGTH);

          const result = validator.validateAddressLength(mailbox);
          expect(result.valid).toBe(true);
          expect(result.errors).toHaveLength(0);
        },
      ),
      { numRuns: 100 },
    );
  });

  /**
   * **Feature: email-messaging-protocol, Property 9: Address Length Validation**
   *
   * *For any* email address where the local-part exceeds 64 characters,
   * `validateAddressLength()` SHALL return invalid with an error on the localPart field.
   *
   * **Validates: Requirements 2.5, 2.6**
   */
  it('should fail validation when local-part exceeds 64 characters', () => {
    fc.assert(
      fc.property(
        // Local-part: 65 to 200 characters (always exceeds 64)
        arbLocalPartOfLength(EmailValidator.MAX_LOCAL_PART_LENGTH + 1, 200),
        (localPart) => {
          const mailbox = createMailbox(localPart, 'example.com');
          const result = validator.validateAddressLength(mailbox);

          expect(result.valid).toBe(false);
          expect(result.errors.some((e) => e.field === 'localPart')).toBe(true);
        },
      ),
      { numRuns: 100 },
    );
  });

  /**
   * **Feature: email-messaging-protocol, Property 9: Address Length Validation**
   *
   * *For any* email address where the total address length exceeds 254 characters
   * (but local-part is within 64 chars), `validateAddressLength()` SHALL return
   * invalid with an error on the address field.
   *
   * **Validates: Requirements 2.5, 2.6**
   */
  it('should fail validation when total address exceeds 254 characters (long domain)', () => {
    fc.assert(
      fc.property(
        // Local-part: short, within limit
        arbLocalPartOfLength(1, 10),
        // Domain: very long to push total over 254
        // With local-part up to 10 chars + "@" = 11 chars, domain needs > 243 chars
        arbDomainOfLength(245, 300),
        (localPart, domain) => {
          const mailbox = createMailbox(localPart, domain);
          const totalLength = mailbox.address.length;

          // Ensure total exceeds 254 but local-part is within limit
          fc.pre(totalLength > EmailValidator.MAX_ADDRESS_LENGTH);
          fc.pre(localPart.length <= EmailValidator.MAX_LOCAL_PART_LENGTH);

          const result = validator.validateAddressLength(mailbox);

          expect(result.valid).toBe(false);
          expect(result.errors.some((e) => e.field === 'address')).toBe(true);
        },
      ),
      { numRuns: 100 },
    );
  });

  /**
   * **Feature: email-messaging-protocol, Property 9: Address Length Validation**
   *
   * *For any* email address where BOTH the local-part exceeds 64 characters
   * AND the total address exceeds 254 characters, `validateAddressLength()`
   * SHALL return invalid with errors on both fields.
   *
   * **Validates: Requirements 2.5, 2.6**
   */
  it('should fail with errors on both fields when both limits are exceeded', () => {
    fc.assert(
      fc.property(
        // Local-part: 65 to 200 characters (exceeds 64)
        arbLocalPartOfLength(EmailValidator.MAX_LOCAL_PART_LENGTH + 1, 200),
        // Domain: long enough to push total over 254
        arbDomainOfLength(100, 200),
        (localPart, domain) => {
          const mailbox = createMailbox(localPart, domain);
          const totalLength = mailbox.address.length;

          // Ensure both limits are exceeded
          fc.pre(localPart.length > EmailValidator.MAX_LOCAL_PART_LENGTH);
          fc.pre(totalLength > EmailValidator.MAX_ADDRESS_LENGTH);

          const result = validator.validateAddressLength(mailbox);

          expect(result.valid).toBe(false);
          expect(result.errors.some((e) => e.field === 'localPart')).toBe(true);
          expect(result.errors.some((e) => e.field === 'address')).toBe(true);
        },
      ),
      { numRuns: 100 },
    );
  });

  /**
   * **Feature: email-messaging-protocol, Property 9: Address Length Validation**
   *
   * Boundary test: an address with exactly 64-character local-part SHALL pass
   * (assuming total length is within 254).
   *
   * **Validates: Requirements 2.5, 2.6**
   */
  it('should pass validation at the exact boundary of 64-character local-part', () => {
    const localPart = 'a'.repeat(EmailValidator.MAX_LOCAL_PART_LENGTH);
    const domain = 'example.com';
    const mailbox = createMailbox(localPart, domain);

    // Verify we're at exactly 64 chars for local-part
    expect(localPart.length).toBe(64);
    // Total: 64 + 1 (@) + 11 (example.com) = 76, well within 254
    expect(mailbox.address.length).toBeLessThanOrEqual(
      EmailValidator.MAX_ADDRESS_LENGTH,
    );

    const result = validator.validateAddressLength(mailbox);
    expect(result.valid).toBe(true);
    expect(result.errors).toHaveLength(0);
  });

  /**
   * **Feature: email-messaging-protocol, Property 9: Address Length Validation**
   *
   * Boundary test: an address with exactly 254-character total length SHALL pass.
   *
   * **Validates: Requirements 2.5, 2.6**
   */
  it('should pass validation at the exact boundary of 254-character total address', () => {
    // Build an address that is exactly 254 characters: localPart@domain
    // localPart = 10 chars, "@" = 1 char, domain needs to be 243 chars
    const localPart = 'a'.repeat(10);
    // Domain: 239 chars + ".com" = 243 chars
    const domain = 'b'.repeat(239) + '.com';
    const mailbox = createMailbox(localPart, domain);

    expect(mailbox.address.length).toBe(254);
    expect(localPart.length).toBeLessThanOrEqual(
      EmailValidator.MAX_LOCAL_PART_LENGTH,
    );

    const result = validator.validateAddressLength(mailbox);
    expect(result.valid).toBe(true);
    expect(result.errors).toHaveLength(0);
  });

  /**
   * **Feature: email-messaging-protocol, Property 9: Address Length Validation**
   *
   * Boundary test: an address with 255-character total length SHALL fail.
   *
   * **Validates: Requirements 2.5, 2.6**
   */
  it('should fail validation at 255-character total address (one over limit)', () => {
    // Build an address that is exactly 255 characters: localPart@domain
    // localPart = 10 chars, "@" = 1 char, domain needs to be 244 chars
    const localPart = 'a'.repeat(10);
    // Domain: 240 chars + ".com" = 244 chars
    const domain = 'b'.repeat(240) + '.com';
    const mailbox = createMailbox(localPart, domain);

    expect(mailbox.address.length).toBe(255);

    const result = validator.validateAddressLength(mailbox);
    expect(result.valid).toBe(false);
    expect(result.errors.some((e) => e.field === 'address')).toBe(true);
  });

  /**
   * **Feature: email-messaging-protocol, Property 9: Address Length Validation**
   *
   * Boundary test: an address with 65-character local-part SHALL fail.
   *
   * **Validates: Requirements 2.5, 2.6**
   */
  it('should fail validation at 65-character local-part (one over limit)', () => {
    const localPart = 'a'.repeat(EmailValidator.MAX_LOCAL_PART_LENGTH + 1);
    const domain = 'example.com';
    const mailbox = createMailbox(localPart, domain);

    expect(localPart.length).toBe(65);

    const result = validator.validateAddressLength(mailbox);
    expect(result.valid).toBe(false);
    expect(result.errors.some((e) => e.field === 'localPart')).toBe(true);
  });
});

// Feature: email-messaging-protocol, Property 10: Size Limit Enforcement

/**
 * @fileoverview Property-based tests for EmailValidator - Size Limit Enforcement
 *
 * **Feature: email-messaging-protocol**
 *
 * This test suite verifies:
 * - Property 10: Size Limit Enforcement
 *
 * **Validates: Requirements 8.5, 8.6, 8.8, 15.9**
 *
 * Per the design:
 * - Default maximum attachment size: 25MB per attachment (Requirement 8.5)
 * - Default maximum total message size: 50MB (Requirement 8.6)
 * - Attachments exceeding the limit SHALL be rejected with ATTACHMENT_TOO_LARGE (Requirement 8.8)
 * - Total message size SHALL be validated against configured maximum (Requirement 15.9)
 */

import { EmailErrorType } from '../../enumerations/messaging/emailErrorType';
import { IAttachmentInput, IEmailInput } from './emailValidator';

// ─── Constants ──────────────────────────────────────────────────────────────

const DEFAULT_MAX_ATTACHMENT_SIZE = EmailValidator.DEFAULT_MAX_ATTACHMENT_SIZE; // 25MB
const DEFAULT_MAX_MESSAGE_SIZE = EmailValidator.DEFAULT_MAX_MESSAGE_SIZE; // 50MB

// ─── Generators ─────────────────────────────────────────────────────────────

/**
 * Generator for a single valid filename character.
 */
const arbFilenameChar: fc.Arbitrary<string> = fc.constantFrom(
  ...'abcdefghijklmnopqrstuvwxyz0123456789_-'.split(''),
);

/**
 * Generator for a valid filename string.
 */
const arbFilename: fc.Arbitrary<string> = fc
  .array(arbFilenameChar, { minLength: 1, maxLength: 20 })
  .map((chars: string[]) => chars.join('') + '.dat');

/**
 * Generator for an attachment within the default size limit (0 to 25MB).
 */
const arbAttachmentWithinLimit: fc.Arbitrary<IAttachmentInput> = fc
  .tuple(arbFilename, fc.integer({ min: 0, max: DEFAULT_MAX_ATTACHMENT_SIZE }))
  .map(
    ([filename, size]: [string, number]): IAttachmentInput => ({
      filename,
      size,
    }),
  );

/**
 * Generator for an attachment exceeding the default size limit (> 25MB).
 */
const arbAttachmentExceedingLimit: fc.Arbitrary<IAttachmentInput> = fc
  .tuple(
    arbFilename,
    fc.integer({
      min: DEFAULT_MAX_ATTACHMENT_SIZE + 1,
      max: DEFAULT_MAX_ATTACHMENT_SIZE * 4,
    }),
  )
  .map(
    ([filename, size]: [string, number]): IAttachmentInput => ({
      filename,
      size,
    }),
  );

/**
 * Generator for a custom max size limit (1KB to 100MB).
 */
const arbCustomMaxSize: fc.Arbitrary<number> = fc.integer({
  min: 1024,
  max: 100 * 1024 * 1024,
});

/**
 * Generator for an attachment size relative to a custom limit (within limit).
 */
function arbAttachmentWithinCustomLimit(
  maxSize: number,
): fc.Arbitrary<IAttachmentInput> {
  return fc.tuple(arbFilename, fc.integer({ min: 0, max: maxSize })).map(
    ([filename, size]: [string, number]): IAttachmentInput => ({
      filename,
      size,
    }),
  );
}

/**
 * Generator for an email input whose total size (bodySize + sum of attachment sizes)
 * is within the default message size limit (50MB).
 */
const arbEmailWithinMessageLimit: fc.Arbitrary<IEmailInput> = fc
  .tuple(
    fc.integer({ min: 0, max: 10 * 1024 * 1024 }), // bodySize: 0 to 10MB
    fc.array(
      fc.tuple(arbFilename, fc.integer({ min: 0, max: 5 * 1024 * 1024 })).map(
        ([filename, size]: [string, number]): IAttachmentInput => ({
          filename,
          size,
        }),
      ),
      { minLength: 0, maxLength: 5 },
    ),
  )
  .filter(([bodySize, attachments]: [number, IAttachmentInput[]]) => {
    const totalAttachmentSize = attachments.reduce((sum, a) => sum + a.size, 0);
    return bodySize + totalAttachmentSize <= DEFAULT_MAX_MESSAGE_SIZE;
  })
  .map(
    ([bodySize, attachments]: [number, IAttachmentInput[]]): IEmailInput => ({
      bodySize,
      attachments,
    }),
  );

/**
 * Generator for an email input whose total size exceeds the default message size limit (> 50MB).
 * We ensure the total exceeds 50MB by generating a large body and/or large attachments.
 */
const arbEmailExceedingMessageLimit: fc.Arbitrary<IEmailInput> = fc
  .tuple(
    fc.integer({ min: 20 * 1024 * 1024, max: 30 * 1024 * 1024 }), // bodySize: 20-30MB
    fc.array(
      fc
        .tuple(
          arbFilename,
          fc.integer({ min: 10 * 1024 * 1024, max: 20 * 1024 * 1024 }),
        )
        .map(
          ([filename, size]: [string, number]): IAttachmentInput => ({
            filename,
            size,
          }),
        ),
      { minLength: 1, maxLength: 3 },
    ),
  )
  .filter(([bodySize, attachments]: [number, IAttachmentInput[]]) => {
    const totalAttachmentSize = attachments.reduce((sum, a) => sum + a.size, 0);
    return bodySize + totalAttachmentSize > DEFAULT_MAX_MESSAGE_SIZE;
  })
  .map(
    ([bodySize, attachments]: [number, IAttachmentInput[]]): IEmailInput => ({
      bodySize,
      attachments,
    }),
  );

// ─── Tests ──────────────────────────────────────────────────────────────────

describe('Property 10: Size Limit Enforcement', () => {
  let validator: EmailValidator;

  beforeEach(() => {
    validator = new EmailValidator();
  });

  // ── Attachment Size Validation ──────────────────────────────────────────

  /**
   * **Feature: email-messaging-protocol, Property 10: Size Limit Enforcement**
   *
   * *For any* attachment whose size is at most the default maximum (25MB),
   * `validateAttachmentSize()` SHALL return valid.
   *
   * **Validates: Requirements 8.5, 8.8**
   */
  it('should pass validation for attachments within the default 25MB limit', () => {
    fc.assert(
      fc.property(arbAttachmentWithinLimit, (attachment) => {
        const result = validator.validateAttachmentSize(attachment);
        expect(result.valid).toBe(true);
        expect(result.errors).toHaveLength(0);
      }),
      { numRuns: 100 },
    );
  });

  /**
   * **Feature: email-messaging-protocol, Property 10: Size Limit Enforcement**
   *
   * *For any* attachment whose size exceeds the default maximum (25MB),
   * `validateAttachmentSize()` SHALL return invalid with error code ATTACHMENT_TOO_LARGE.
   *
   * **Validates: Requirements 8.5, 8.8**
   */
  it('should fail validation with ATTACHMENT_TOO_LARGE for attachments exceeding the default 25MB limit', () => {
    fc.assert(
      fc.property(arbAttachmentExceedingLimit, (attachment) => {
        const result = validator.validateAttachmentSize(attachment);
        expect(result.valid).toBe(false);
        expect(result.errors.length).toBeGreaterThanOrEqual(1);
        expect(
          result.errors.some(
            (e) => e.code === EmailErrorType.ATTACHMENT_TOO_LARGE,
          ),
        ).toBe(true);
      }),
      { numRuns: 100 },
    );
  });

  // ── Message Size Validation ─────────────────────────────────────────────

  /**
   * **Feature: email-messaging-protocol, Property 10: Size Limit Enforcement**
   *
   * *For any* email where the total message size (bodySize + all attachment sizes)
   * is at most the default maximum (50MB), `validateMessageSize()` SHALL return valid.
   *
   * **Validates: Requirements 8.6, 15.9**
   */
  it('should pass validation for messages within the default 50MB total size limit', () => {
    fc.assert(
      fc.property(arbEmailWithinMessageLimit, (email) => {
        const result = validator.validateMessageSize(email);
        expect(result.valid).toBe(true);
        expect(result.errors).toHaveLength(0);
      }),
      { numRuns: 100 },
    );
  });

  /**
   * **Feature: email-messaging-protocol, Property 10: Size Limit Enforcement**
   *
   * *For any* email where the total message size (bodySize + all attachment sizes)
   * exceeds the default maximum (50MB), `validateMessageSize()` SHALL return invalid
   * with error code MESSAGE_TOO_LARGE.
   *
   * **Validates: Requirements 8.6, 15.9**
   */
  it('should fail validation with MESSAGE_TOO_LARGE for messages exceeding the default 50MB limit', () => {
    fc.assert(
      fc.property(arbEmailExceedingMessageLimit, (email) => {
        const result = validator.validateMessageSize(email);
        expect(result.valid).toBe(false);
        expect(result.errors.length).toBeGreaterThanOrEqual(1);
        expect(
          result.errors.some(
            (e) => e.code === EmailErrorType.MESSAGE_TOO_LARGE,
          ),
        ).toBe(true);
      }),
      { numRuns: 100 },
    );
  });

  // ── Custom Configurable Limits ──────────────────────────────────────────

  /**
   * **Feature: email-messaging-protocol, Property 10: Size Limit Enforcement**
   *
   * *For any* custom max attachment size and any attachment whose size is within
   * that custom limit, `validateAttachmentSize(attachment, customMax)` SHALL return valid.
   *
   * **Validates: Requirements 8.5, 8.8**
   */
  it('should pass validation for attachments within a custom configurable limit', () => {
    fc.assert(
      fc.property(arbCustomMaxSize, (customMax) => {
        return fc.assert(
          fc.property(
            arbAttachmentWithinCustomLimit(customMax),
            (attachment) => {
              const result = validator.validateAttachmentSize(
                attachment,
                customMax,
              );
              expect(result.valid).toBe(true);
              expect(result.errors).toHaveLength(0);
            },
          ),
          { numRuns: 10 },
        );
      }),
      { numRuns: 10 },
    );
  });

  /**
   * **Feature: email-messaging-protocol, Property 10: Size Limit Enforcement**
   *
   * *For any* custom max attachment size and any attachment whose size exceeds
   * that custom limit, `validateAttachmentSize(attachment, customMax)` SHALL return
   * invalid with error code ATTACHMENT_TOO_LARGE.
   *
   * **Validates: Requirements 8.5, 8.8**
   */
  it('should fail validation with ATTACHMENT_TOO_LARGE for attachments exceeding a custom limit', () => {
    fc.assert(
      fc.property(
        arbCustomMaxSize,
        arbFilename,
        fc.integer({ min: 1, max: 1024 * 1024 }),
        (customMax: number, filename: string, excess: number) => {
          const size = customMax + excess;
          const attachment: IAttachmentInput = { filename, size };
          const result = validator.validateAttachmentSize(
            attachment,
            customMax,
          );
          expect(result.valid).toBe(false);
          expect(
            result.errors.some(
              (e) => e.code === EmailErrorType.ATTACHMENT_TOO_LARGE,
            ),
          ).toBe(true);
        },
      ),
      { numRuns: 100 },
    );
  });

  /**
   * **Feature: email-messaging-protocol, Property 10: Size Limit Enforcement**
   *
   * *For any* custom max message size and any email whose total size is within
   * that custom limit, `validateMessageSize(email, customMax)` SHALL return valid.
   *
   * **Validates: Requirements 8.6, 15.9**
   */
  it('should pass validation for messages within a custom configurable message size limit', () => {
    fc.assert(
      fc.property(
        fc.integer({ min: 1024, max: 100 * 1024 * 1024 }),
        (customMax) => {
          // Create an email well within the custom limit
          const bodySize = Math.floor(customMax * 0.3);
          const attachmentSize = Math.floor(customMax * 0.2);
          const email: IEmailInput = {
            bodySize,
            attachments: [{ filename: 'file.dat', size: attachmentSize }],
          };
          const result = validator.validateMessageSize(email, customMax);
          expect(result.valid).toBe(true);
          expect(result.errors).toHaveLength(0);
        },
      ),
      { numRuns: 100 },
    );
  });

  /**
   * **Feature: email-messaging-protocol, Property 10: Size Limit Enforcement**
   *
   * *For any* custom max message size and any email whose total size exceeds
   * that custom limit, `validateMessageSize(email, customMax)` SHALL return
   * invalid with error code MESSAGE_TOO_LARGE.
   *
   * **Validates: Requirements 8.6, 15.9**
   */
  it('should fail validation with MESSAGE_TOO_LARGE for messages exceeding a custom message size limit', () => {
    fc.assert(
      fc.property(
        fc.integer({ min: 1024, max: 50 * 1024 * 1024 }),
        (customMax) => {
          // Create an email that exceeds the custom limit
          const email: IEmailInput = {
            bodySize: customMax + 1,
            attachments: [],
          };
          const result = validator.validateMessageSize(email, customMax);
          expect(result.valid).toBe(false);
          expect(
            result.errors.some(
              (e) => e.code === EmailErrorType.MESSAGE_TOO_LARGE,
            ),
          ).toBe(true);
        },
      ),
      { numRuns: 100 },
    );
  });

  // ── Boundary Tests ────────────────────────────────────────────────────

  /**
   * **Feature: email-messaging-protocol, Property 10: Size Limit Enforcement**
   *
   * Boundary: an attachment at exactly the default max size (25MB) SHALL pass.
   *
   * **Validates: Requirements 8.5, 8.8**
   */
  it('should pass validation for an attachment at exactly the 25MB boundary', () => {
    const attachment: IAttachmentInput = {
      filename: 'exact-limit.dat',
      size: DEFAULT_MAX_ATTACHMENT_SIZE,
    };
    const result = validator.validateAttachmentSize(attachment);
    expect(result.valid).toBe(true);
    expect(result.errors).toHaveLength(0);
  });

  /**
   * **Feature: email-messaging-protocol, Property 10: Size Limit Enforcement**
   *
   * Boundary: an attachment at exactly one byte over the default max (25MB + 1) SHALL fail.
   *
   * **Validates: Requirements 8.5, 8.8**
   */
  it('should fail validation for an attachment one byte over the 25MB boundary', () => {
    const attachment: IAttachmentInput = {
      filename: 'over-limit.dat',
      size: DEFAULT_MAX_ATTACHMENT_SIZE + 1,
    };
    const result = validator.validateAttachmentSize(attachment);
    expect(result.valid).toBe(false);
    expect(
      result.errors.some((e) => e.code === EmailErrorType.ATTACHMENT_TOO_LARGE),
    ).toBe(true);
  });

  /**
   * **Feature: email-messaging-protocol, Property 10: Size Limit Enforcement**
   *
   * Boundary: a message at exactly the default max total size (50MB) SHALL pass.
   *
   * **Validates: Requirements 8.6, 15.9**
   */
  it('should pass validation for a message at exactly the 50MB total size boundary', () => {
    const email: IEmailInput = {
      bodySize: 20 * 1024 * 1024,
      attachments: [{ filename: 'part1.dat', size: 30 * 1024 * 1024 }],
    };
    // Total: 20MB + 30MB = 50MB exactly
    const result = validator.validateMessageSize(email);
    expect(result.valid).toBe(true);
    expect(result.errors).toHaveLength(0);
  });

  /**
   * **Feature: email-messaging-protocol, Property 10: Size Limit Enforcement**
   *
   * Boundary: a message at exactly one byte over the default max total size (50MB + 1) SHALL fail.
   *
   * **Validates: Requirements 8.6, 15.9**
   */
  it('should fail validation for a message one byte over the 50MB total size boundary', () => {
    const email: IEmailInput = {
      bodySize: DEFAULT_MAX_MESSAGE_SIZE + 1,
      attachments: [],
    };
    const result = validator.validateMessageSize(email);
    expect(result.valid).toBe(false);
    expect(
      result.errors.some((e) => e.code === EmailErrorType.MESSAGE_TOO_LARGE),
    ).toBe(true);
  });

  // ── Edge Cases ────────────────────────────────────────────────────────

  /**
   * **Feature: email-messaging-protocol, Property 10: Size Limit Enforcement**
   *
   * Edge case: a zero-size attachment SHALL pass validation.
   *
   * **Validates: Requirements 8.5, 8.8**
   */
  it('should pass validation for a zero-size attachment', () => {
    const attachment: IAttachmentInput = { filename: 'empty.dat', size: 0 };
    const result = validator.validateAttachmentSize(attachment);
    expect(result.valid).toBe(true);
    expect(result.errors).toHaveLength(0);
  });

  /**
   * **Feature: email-messaging-protocol, Property 10: Size Limit Enforcement**
   *
   * Edge case: a message with no attachments and zero bodySize SHALL pass validation.
   *
   * **Validates: Requirements 8.6, 15.9**
   */
  it('should pass validation for a message with no attachments and zero body size', () => {
    const email: IEmailInput = { bodySize: 0, attachments: [] };
    const result = validator.validateMessageSize(email);
    expect(result.valid).toBe(true);
    expect(result.errors).toHaveLength(0);
  });

  /**
   * **Feature: email-messaging-protocol, Property 10: Size Limit Enforcement**
   *
   * Edge case: a message with undefined attachments and undefined bodySize SHALL pass validation.
   *
   * **Validates: Requirements 8.6, 15.9**
   */
  it('should pass validation for a message with undefined attachments and bodySize', () => {
    const email: IEmailInput = {};
    const result = validator.validateMessageSize(email);
    expect(result.valid).toBe(true);
    expect(result.errors).toHaveLength(0);
  });

  /**
   * **Feature: email-messaging-protocol, Property 10: Size Limit Enforcement**
   *
   * *For any* attachment size, `validateAttachmentSize()` returns valid if and only if
   * the size is at most the configured maximum. This tests both directions simultaneously.
   *
   * **Validates: Requirements 8.5, 8.8**
   */
  it('should return valid iff attachment size <= maxSize for any size and limit', () => {
    fc.assert(
      fc.property(
        fc.integer({ min: 0, max: 200 * 1024 * 1024 }), // attachment size
        fc.integer({ min: 1, max: 200 * 1024 * 1024 }), // max size limit
        arbFilename,
        (size: number, maxSize: number, filename: string) => {
          const attachment: IAttachmentInput = { filename, size };
          const result = validator.validateAttachmentSize(attachment, maxSize);
          if (size <= maxSize) {
            expect(result.valid).toBe(true);
            expect(result.errors).toHaveLength(0);
          } else {
            expect(result.valid).toBe(false);
            expect(
              result.errors.some(
                (e) => e.code === EmailErrorType.ATTACHMENT_TOO_LARGE,
              ),
            ).toBe(true);
          }
        },
      ),
      { numRuns: 100 },
    );
  });

  /**
   * **Feature: email-messaging-protocol, Property 10: Size Limit Enforcement**
   *
   * *For any* email input and max size, `validateMessageSize()` returns valid if and only if
   * the total size (bodySize + sum of attachment sizes) is at most the configured maximum.
   *
   * **Validates: Requirements 8.6, 15.9**
   */
  it('should return valid iff total message size <= maxSize for any email and limit', () => {
    fc.assert(
      fc.property(
        fc.integer({ min: 0, max: 100 * 1024 * 1024 }), // bodySize
        fc.array(
          fc
            .tuple(arbFilename, fc.integer({ min: 0, max: 20 * 1024 * 1024 }))
            .map(
              ([filename, size]: [string, number]): IAttachmentInput => ({
                filename,
                size,
              }),
            ),
          { minLength: 0, maxLength: 5 },
        ),
        fc.integer({ min: 1, max: 200 * 1024 * 1024 }), // maxSize
        (
          bodySize: number,
          attachments: IAttachmentInput[],
          maxSize: number,
        ) => {
          const email: IEmailInput = { bodySize, attachments };
          const totalSize =
            bodySize + attachments.reduce((sum, a) => sum + a.size, 0);
          const result = validator.validateMessageSize(email, maxSize);
          if (totalSize <= maxSize) {
            expect(result.valid).toBe(true);
            expect(result.errors).toHaveLength(0);
          } else {
            expect(result.valid).toBe(false);
            expect(
              result.errors.some(
                (e) => e.code === EmailErrorType.MESSAGE_TOO_LARGE,
              ),
            ).toBe(true);
          }
        },
      ),
      { numRuns: 100 },
    );
  });
});
