/**
 * Property test for compose state to SendEmailParams mapping.
 *
 * Feature: brightmail-composer-enhancements, Property 6: Compose state faithfully maps to SendEmailParams
 *
 * For any compose state consisting of recipients, subject, HTML body, text body,
 * a list of attachments (each with filename, mimeType, and base64 data), and an
 * encryption scheme, the constructed SendEmailParams SHALL include all provided
 * attachment objects with matching fields and the selected encryptionScheme value.
 *
 * Validates: Requirements 3.7, 5.6
 */

import * as fc from 'fast-check';

import { mapComposeStateToSendParams } from './ComposeView';
import type { AttachmentInput, MailboxInput } from './services/emailApi';

const MessageEncryptionScheme = {
  NONE: 'none',
  SHARED_KEY: 'shared_key',
  RECIPIENT_KEYS: 'recipient_keys',
  S_MIME: 's_mime',
} as const;

jest.mock('@brightchain/brightchain-lib', () => ({
  MessageEncryptionScheme,
}));

// ─── Generators ─────────────────────────────────────────────────────────────

const mailboxGen: fc.Arbitrary<MailboxInput> = fc.record({
  localPart: fc.stringMatching(/^[a-z]{1,10}$/),
  domain: fc.stringMatching(/^[a-z]{1,8}\.[a-z]{2,4}$/),
});

const attachmentGen: fc.Arbitrary<AttachmentInput> = fc.record({
  filename: fc.stringMatching(/^[a-z]{1,10}\.[a-z]{2,4}$/),
  mimeType: fc.constantFrom(
    'application/pdf',
    'image/png',
    'text/plain',
    'application/octet-stream',
  ),
  data: fc.base64String({ minLength: 4, maxLength: 100 }),
});

const schemeGen = fc.constantFrom(
  MessageEncryptionScheme.NONE,
  MessageEncryptionScheme.SHARED_KEY,
  MessageEncryptionScheme.RECIPIENT_KEYS,
  MessageEncryptionScheme.S_MIME,
);

// ─── Tests ──────────────────────────────────────────────────────────────────

describe('Property 6: Compose state faithfully maps to SendEmailParams', () => {
  it('includes all attachment objects with matching fields', () => {
    fc.assert(
      fc.property(
        mailboxGen,
        fc.array(mailboxGen, { minLength: 1, maxLength: 5 }),
        fc.string({ minLength: 0, maxLength: 50 }),
        fc.string({ minLength: 0, maxLength: 100 }),
        fc.string({ minLength: 0, maxLength: 100 }),
        fc.array(attachmentGen, { minLength: 0, maxLength: 5 }),
        schemeGen,
        (from, to, subject, htmlBody, textBody, attachments, scheme) => {
          const result = mapComposeStateToSendParams({
            from,
            to,
            subject,
            htmlBody,
            textBody,
            attachments,
            encryptionScheme: scheme,
          });

          // From and to are always present
          expect(result.from).toEqual(from);
          expect(result.to).toEqual(to);

          // Encryption scheme is always included
          expect(result.encryptionScheme).toBe(scheme);

          // Attachments: if non-empty, all should be present with matching fields
          if (attachments.length > 0) {
            expect(result.attachments).toBeDefined();

            expect(result.attachments).toHaveLength(attachments.length);
            for (let i = 0; i < attachments.length; i++) {
              const resultAttachment = result.attachments?.[i];
              expect(resultAttachment?.filename).toBe(attachments[i].filename);

              expect(resultAttachment?.mimeType).toBe(attachments[i].mimeType);

              expect(resultAttachment?.data).toBe(attachments[i].data);
            }
          } else {
            expect(result.attachments).toBeUndefined();
          }
        },
      ),
      { numRuns: 100 },
    );
  });

  it('includes htmlBody and textBody when non-empty', () => {
    fc.assert(
      fc.property(
        mailboxGen,
        fc.array(mailboxGen, { minLength: 1, maxLength: 3 }),
        fc.string({ minLength: 1, maxLength: 50 }),
        fc.string({ minLength: 1, maxLength: 50 }),
        (from, to, htmlBody, textBody) => {
          const result = mapComposeStateToSendParams({
            from,
            to,
            htmlBody,
            textBody,
            encryptionScheme: MessageEncryptionScheme.NONE,
          });

          expect(result.htmlBody).toBe(htmlBody);
          expect(result.textBody).toBe(textBody);
        },
      ),
      { numRuns: 100 },
    );
  });
});
