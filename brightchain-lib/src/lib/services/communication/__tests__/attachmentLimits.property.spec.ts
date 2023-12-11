/**
 * Property-based tests for Property 9: Attachment limits enforcement.
 *
 * Feature: brightchat-e2e-encryption, Property 9: Attachment limits enforcement
 *
 * **Validates: Requirements 11.4**
 *
 * For any attachment exceeding maxFileSizeBytes, the service SHALL reject the
 * send operation with an error. For any message with more than
 * maxAttachmentsPerMessage attachments, the service SHALL reject the send
 * operation with an error. For any attachment within limits, the service SHALL
 * accept it.
 *
 * Tests call `validateAndPrepareAttachments()` directly from attachmentUtils.ts
 * — the shared validation function used by all three services.
 *
 * Uses a custom config with smaller limits for faster testing:
 *   maxFileSizeBytes: 1024, maxAttachmentsPerMessage: 5
 */

import fc from 'fast-check';
import { validateAndPrepareAttachments } from '../attachmentUtils';
import {
  AttachmentTooLargeError,
  TooManyAttachmentsError,
} from '../../../errors/encryptionErrors';
import {
  IAttachmentConfig,
  IChatAttachmentInput,
} from '../../../interfaces/communication';

// ─── Test Config ────────────────────────────────────────────────────────────

const TEST_CONFIG: IAttachmentConfig = {
  maxFileSizeBytes: 1024,
  maxAttachmentsPerMessage: 5,
};

// ─── Arbitraries ────────────────────────────────────────────────────────────

const MIME_TYPES = [
  'application/octet-stream',
  'application/pdf',
  'image/png',
  'image/jpeg',
  'text/plain',
];

const arbMimeType = fc.constantFrom(...MIME_TYPES);

const arbFileName = fc
  .tuple(
    fc.stringMatching(/^[a-zA-Z0-9_-]{1,12}$/),
    fc.constantFrom('.txt', '.pdf', '.png', '.bin'),
  )
  .map(([name, ext]) => `${name}${ext}`);

/**
 * Arbitrary for an attachment whose content size exceeds maxFileSizeBytes.
 * Size range: (maxFileSizeBytes + 1) to (maxFileSizeBytes + 4096).
 */
const arbOversizedAttachment: fc.Arbitrary<IChatAttachmentInput> = fc
  .tuple(
    arbFileName,
    arbMimeType,
    fc.integer({
      min: TEST_CONFIG.maxFileSizeBytes + 1,
      max: TEST_CONFIG.maxFileSizeBytes + 4096,
    }),
  )
  .map(([fileName, mimeType, size]) => ({
    fileName,
    mimeType,
    content: new Uint8Array(size),
  }));

/**
 * Arbitrary for an attachment within the size limit.
 * Size range: 1 to maxFileSizeBytes (inclusive).
 */
const arbValidAttachment: fc.Arbitrary<IChatAttachmentInput> = fc
  .tuple(
    arbFileName,
    arbMimeType,
    fc.integer({ min: 1, max: TEST_CONFIG.maxFileSizeBytes }),
  )
  .map(([fileName, mimeType, size]) => ({
    fileName,
    mimeType,
    content: new Uint8Array(size),
  }));

/**
 * Arbitrary for a list of valid attachments that exceeds the count limit.
 * Count range: (maxAttachmentsPerMessage + 1) to (maxAttachmentsPerMessage + 10).
 */
const arbTooManyAttachments: fc.Arbitrary<IChatAttachmentInput[]> = fc.array(
  arbValidAttachment,
  {
    minLength: TEST_CONFIG.maxAttachmentsPerMessage + 1,
    maxLength: TEST_CONFIG.maxAttachmentsPerMessage + 10,
  },
);

/**
 * Arbitrary for a list of valid attachments within both size and count limits.
 * Count range: 1 to maxAttachmentsPerMessage.
 */
const arbValidAttachments: fc.Arbitrary<IChatAttachmentInput[]> = fc.array(
  arbValidAttachment,
  {
    minLength: 1,
    maxLength: TEST_CONFIG.maxAttachmentsPerMessage,
  },
);

// ─── Property Tests ─────────────────────────────────────────────────────────

describe('Feature: brightchat-e2e-encryption, Property 9: Attachment limits enforcement', () => {
  /**
   * Sub-property 1: Any attachment with size > maxFileSizeBytes throws
   * AttachmentTooLargeError.
   *
   * **Validates: Requirements 11.4**
   */
  it('rejects any attachment exceeding maxFileSizeBytes with AttachmentTooLargeError', () => {
    fc.assert(
      fc.property(arbOversizedAttachment, (oversized) => {
        expect(() =>
          validateAndPrepareAttachments([oversized], TEST_CONFIG),
        ).toThrow(AttachmentTooLargeError);
      }),
      { numRuns: 100 },
    );
  });

  /**
   * Sub-property 2: Any message with count > maxAttachmentsPerMessage throws
   * TooManyAttachmentsError.
   *
   * **Validates: Requirements 11.4**
   */
  it('rejects any message exceeding maxAttachmentsPerMessage with TooManyAttachmentsError', () => {
    fc.assert(
      fc.property(arbTooManyAttachments, (attachments) => {
        expect(() =>
          validateAndPrepareAttachments(attachments, TEST_CONFIG),
        ).toThrow(TooManyAttachmentsError);
      }),
      { numRuns: 100 },
    );
  });

  /**
   * Sub-property 3: Any attachment within both limits is accepted (no error).
   *
   * **Validates: Requirements 11.4**
   */
  it('accepts any attachments within both size and count limits', () => {
    fc.assert(
      fc.property(arbValidAttachments, (attachments) => {
        const result = validateAndPrepareAttachments(attachments, TEST_CONFIG);

        // Result should have the same count as input
        expect(result).toHaveLength(attachments.length);

        // Each metadata entry should match the corresponding input
        for (let i = 0; i < attachments.length; i++) {
          expect(result[i].fileName).toBe(attachments[i].fileName);
          expect(result[i].mimeType).toBe(attachments[i].mimeType);
          expect(result[i].originalSize).toBe(attachments[i].content.length);
        }
      }),
      { numRuns: 100 },
    );
  });
});
