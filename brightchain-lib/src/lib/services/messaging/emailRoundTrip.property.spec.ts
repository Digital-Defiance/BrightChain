/**
 * @fileoverview Property-based tests for Email Metadata Round-Trip
 *
 * **Feature: email-messaging-protocol, Property 1: Email Metadata Round-Trip**
 *
 * **Validates: Requirements 14.6, 14.7, 4.6, 7.1-7.8, 1.1-1.6**
 *
 * For any valid IEmailMetadata object, serializing it to RFC 5322 format using
 * EmailSerializer and then parsing it back using EmailParser SHALL produce an
 * IEmailMetadata object that is semantically equivalent to the original.
 *
 * Semantic equivalence means:
 * - All header fields have the same values (order may differ for unordered fields)
 * - All MIME parts have the same content and structure
 * - All metadata fields are preserved
 */

import fc from 'fast-check';
import { DurabilityLevel } from '../../enumerations/durabilityLevel';
import { DeliveryStatus } from '../../enumerations/messaging/deliveryStatus';
import { MessageEncryptionScheme } from '../../enumerations/messaging/messageEncryptionScheme';
import { MessagePriority } from '../../enumerations/messaging/messagePriority';
import { ReplicationStatus } from '../../enumerations/replicationStatus';
import {
  createMailbox,
  type IMailbox,
} from '../../interfaces/messaging/emailAddress';
import type { IEmailMetadata } from '../../interfaces/messaging/emailMetadata';
import {
  createContentType,
  type IContentType,
  type IMimePart,
} from '../../interfaces/messaging/mimePart';
import { EmailParser } from './emailParser';
import { EmailSerializer } from './emailSerializer';

// Feature: email-messaging-protocol, Property 1: Email Metadata Round-Trip

// ─── Character Sets ─────────────────────────────────────────────────────────

const ALPHA_LOWER = 'abcdefghijklmnopqrstuvwxyz';
const ALPHA_UPPER = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
const DIGITS = '0123456789';
const ALPHA_NUM_LOWER = ALPHA_LOWER + DIGITS;

// ─── Generators ─────────────────────────────────────────────────────────────

/**
 * Generator for a simple alphanumeric word (safe for email local-parts and domains).
 * Produces lowercase strings of 3-10 characters using array+map pattern.
 */
const arbAlphaWord: fc.Arbitrary<string> = fc
  .array(fc.constantFrom(...ALPHA_NUM_LOWER.split('')), {
    minLength: 3,
    maxLength: 10,
  })
  .map((chars: string[]) => chars.join(''));

/**
 * Generator for a valid domain name (e.g., "example.com").
 */
const arbDomain: fc.Arbitrary<string> = fc
  .tuple(arbAlphaWord, fc.constantFrom('com', 'org', 'net', 'io', 'dev'))
  .map(([name, tld]: [string, string]) => `${name}.${tld}`);

/**
 * Generator for a valid IMailbox with simple RFC 5322 addr-spec format.
 * Produces addresses like "user@example.com" without display names
 * to avoid quoting/encoding issues in round-trip.
 */
const arbMailbox: fc.Arbitrary<IMailbox> = fc
  .tuple(arbAlphaWord, arbDomain)
  .map(([local, domain]: [string, string]) => createMailbox(local, domain));

/**
 * Generator for a valid IMailbox with an optional ASCII display name.
 */
const arbMailboxWithName: fc.Arbitrary<IMailbox> = fc
  .tuple(
    arbAlphaWord,
    arbDomain,
    fc.option(
      fc
        .tuple(
          fc
            .array(fc.constantFrom(...ALPHA_UPPER.split('')), {
              minLength: 2,
              maxLength: 8,
            })
            .map((chars: string[]) => chars.join('')),
          fc
            .array(fc.constantFrom(...ALPHA_UPPER.split('')), {
              minLength: 2,
              maxLength: 8,
            })
            .map((chars: string[]) => chars.join('')),
        )
        .map(([first, last]: [string, string]) => `${first} ${last}`),
      { nil: undefined },
    ),
  )
  .map(([local, domain, displayName]: [string, string, string | undefined]) =>
    createMailbox(local, domain, displayName),
  );

/**
 * Generator for a non-empty array of mailboxes (for To field).
 */
const arbMailboxArray: fc.Arbitrary<IMailbox[]> = fc.array(arbMailbox, {
  minLength: 1,
  maxLength: 3,
});

/**
 * Generator for an optional array of mailboxes (for Cc field).
 */
const arbOptionalMailboxArray: fc.Arbitrary<IMailbox[] | undefined> = fc.option(
  fc.array(arbMailbox, { minLength: 1, maxLength: 2 }),
  { nil: undefined },
);

/**
 * Generator for a valid Message-ID in angle brackets: <id@domain>.
 */
const arbMessageId: fc.Arbitrary<string> = fc
  .tuple(
    fc
      .array(fc.constantFrom(...ALPHA_NUM_LOWER.split('')), {
        minLength: 5,
        maxLength: 20,
      })
      .map((chars: string[]) => chars.join('')),
    arbDomain,
  )
  .map(([id, domain]: [string, string]) => `<${id}@${domain}>`);

/**
 * Generator for a valid date (within a reasonable range).
 * Truncates to seconds since email dates don't preserve milliseconds.
 */
const arbDate: fc.Arbitrary<Date> = fc
  .date({
    min: new Date('2000-01-01T00:00:00Z'),
    max: new Date('2030-12-31T23:59:59Z'),
  })
  .filter((d: Date) => !isNaN(d.getTime()))
  .map((d: Date) => {
    // Truncate to seconds (email dates don't preserve milliseconds)
    return new Date(Math.floor(d.getTime() / 1000) * 1000);
  });

/**
 * Generator for a simple ASCII subject line.
 * Avoids non-ASCII to prevent encoding round-trip issues with RFC 2047.
 * Ensures subjects are not whitespace-only, since the parser normalizes
 * whitespace-only subjects to undefined (postal-mime trims subjects).
 */
const SUBJECT_CHARS = (ALPHA_UPPER + ALPHA_LOWER + DIGITS + ' .,!?-:').split(
  '',
);
const SUBJECT_NON_SPACE_CHARS = (
  ALPHA_UPPER +
  ALPHA_LOWER +
  DIGITS +
  '.,!?-:'
).split('');
const arbSubject: fc.Arbitrary<string | undefined> = fc.option(
  fc
    .tuple(
      // Ensure at least one non-space character
      fc.constantFrom(...SUBJECT_NON_SPACE_CHARS),
      fc
        .array(fc.constantFrom(...SUBJECT_CHARS), {
          minLength: 0,
          maxLength: 49,
        })
        .map((chars: string[]) => chars.join('')),
    )
    .map(([first, rest]: [string, string]) => {
      // Trim trailing whitespace since postal-mime trims subjects,
      // and collapse internal runs of whitespace to single spaces
      // since RFC 5322 header unfolding normalizes whitespace.
      const raw = first + rest;
      return raw.replace(/\s+/g, ' ').trimEnd();
    })
    .filter((s: string) => s.length > 0),
  { nil: undefined },
);

/**
 * Generator for simple ASCII text content for MIME part bodies.
 * Uses printable ASCII characters that are safe for 7bit encoding.
 */
const TEXT_CHARS = (
  ALPHA_UPPER +
  ALPHA_LOWER +
  DIGITS +
  ' .,!?-:;()[]{}@#$%&*+='
).split('');
const arbTextContent: fc.Arbitrary<string> = fc
  .array(fc.constantFrom(...TEXT_CHARS), { minLength: 1, maxLength: 200 })
  .map((chars: string[]) => {
    const s = chars.join('').trim();
    return s.length > 0 ? s : 'Hello';
  });

/**
 * Generator for a text/plain MIME part.
 */
const arbTextPlainPart: fc.Arbitrary<IMimePart> = arbTextContent.map(
  (text: string) => {
    const body = new TextEncoder().encode(text);
    return {
      contentType: createContentType(
        'text',
        'plain',
        new Map([['charset', 'utf-8']]),
      ),
      body,
      size: body.length,
    };
  },
);

/**
 * Generator for a text/html MIME part.
 */
const arbTextHtmlPart: fc.Arbitrary<IMimePart> = arbTextContent.map(
  (text: string) => {
    const html = `<html><body><p>${text}</p></body></html>`;
    const body = new TextEncoder().encode(html);
    return {
      contentType: createContentType(
        'text',
        'html',
        new Map([['charset', 'utf-8']]),
      ),
      body,
      size: body.length,
    };
  },
);

/**
 * Generator for a single text/plain part (simple email body).
 */
const arbSingleTextParts: fc.Arbitrary<{
  parts: IMimePart[];
  contentType: IContentType;
}> = arbTextPlainPart.map((part: IMimePart) => ({
  parts: [part],
  contentType: createContentType(
    'text',
    'plain',
    new Map([['charset', 'utf-8']]),
  ),
}));

/**
 * Generator for multipart/alternative with text/plain and text/html parts.
 */
const arbMultipartAlternativeParts: fc.Arbitrary<{
  parts: IMimePart[];
  contentType: IContentType;
}> = fc
  .tuple(arbTextPlainPart, arbTextHtmlPart)
  .map(([textPart, htmlPart]: [IMimePart, IMimePart]) => {
    const boundary = `----=_Part_${Date.now()}_${Math.random().toString(36).substring(2, 10)}`;
    return {
      parts: [textPart, htmlPart],
      contentType: createContentType(
        'multipart',
        'alternative',
        new Map([['boundary', boundary]]),
      ),
    };
  });

/**
 * Generator for email body: either single-part text or multipart/alternative.
 */
const arbEmailBody: fc.Arbitrary<{
  parts: IMimePart[];
  contentType: IContentType;
}> = fc.oneof(
  { weight: 3, arbitrary: arbSingleTextParts },
  { weight: 1, arbitrary: arbMultipartAlternativeParts },
);

/**
 * Generator for optional In-Reply-To message ID.
 */
const arbOptionalInReplyTo: fc.Arbitrary<string | undefined> = fc.option(
  arbMessageId,
  { nil: undefined },
);

/**
 * Generator for optional References array.
 */
const arbOptionalReferences: fc.Arbitrary<string[] | undefined> = fc.option(
  fc.array(arbMessageId, { minLength: 1, maxLength: 3 }),
  { nil: undefined },
);

/**
 * Generator for a complete valid IEmailMetadata object.
 * Provides all required fields from IBlockMetadata, IMessageMetadata, and IEmailMetadata.
 */
const arbEmailMetadata: fc.Arbitrary<IEmailMetadata> = fc
  .tuple(
    arbMailboxWithName, // from
    arbMailboxArray, // to
    arbOptionalMailboxArray, // cc
    arbMessageId, // messageId
    arbDate, // date
    arbSubject, // subject
    arbEmailBody, // { parts, contentType }
    arbOptionalInReplyTo, // inReplyTo
    arbOptionalReferences, // references
  )
  .map(
    ([from, to, cc, messageId, date, subject, body, inReplyTo, references]) => {
      const now = new Date();
      const metadata: IEmailMetadata = {
        // IBlockMetadata fields
        blockId: messageId,
        createdAt: now,
        expiresAt: null,
        durabilityLevel: DurabilityLevel.Standard,
        parityBlockIds: [],
        accessCount: 0,
        lastAccessedAt: now,
        replicationStatus: ReplicationStatus.Pending,
        targetReplicationFactor: 0,
        replicaNodeIds: [],
        size: 0,
        checksum: '',

        // IMessageMetadata fields
        messageType: 'email',
        senderId: from.address,
        recipients: to.map((r: IMailbox) => r.address),
        priority: MessagePriority.NORMAL,
        deliveryStatus: new Map<string, DeliveryStatus>(),
        acknowledgments: new Map<string, Date>(),
        encryptionScheme: MessageEncryptionScheme.NONE,
        isCBL: false,

        // IEmailMetadata fields
        from,
        to,
        cc,
        messageId,
        date,
        subject,
        mimeVersion: '1.0',
        contentType: body.contentType,
        customHeaders: new Map<string, string[]>(),
        parts: body.parts,
        deliveryReceipts: new Map(),
        readReceipts: new Map(),
        inReplyTo,
        references,
      };

      return metadata;
    },
  );

// ─── Helper Functions ───────────────────────────────────────────────────────

/**
 * Extracts the text content from MIME parts for comparison.
 * Returns the decoded text body from the first text/plain part found.
 */
function extractTextContent(
  parts: IMimePart[] | undefined,
): string | undefined {
  if (!parts || parts.length === 0) return undefined;
  for (const part of parts) {
    if (
      part.contentType.type === 'text' &&
      part.contentType.subtype === 'plain' &&
      part.body
    ) {
      return new TextDecoder().decode(part.body);
    }
  }
  return undefined;
}

/**
 * Extracts the HTML content from MIME parts for comparison.
 * Returns the decoded text body from the first text/html part found.
 */
function extractHtmlContent(
  parts: IMimePart[] | undefined,
): string | undefined {
  if (!parts || parts.length === 0) return undefined;
  for (const part of parts) {
    if (
      part.contentType.type === 'text' &&
      part.contentType.subtype === 'html' &&
      part.body
    ) {
      return new TextDecoder().decode(part.body);
    }
  }
  return undefined;
}

/**
 * Compares mailbox addresses for semantic equivalence.
 * Addresses are compared case-insensitively since email addresses
 * are case-insensitive per RFC 5321.
 */
function mailboxAddressEquals(a: IMailbox, b: IMailbox): boolean {
  return a.address.toLowerCase() === b.address.toLowerCase();
}

/**
 * Compares arrays of mailbox addresses for semantic equivalence.
 * Order is preserved since To/Cc ordering matters.
 */
function mailboxArrayEquals(
  a: IMailbox[] | undefined,
  b: IMailbox[] | undefined,
): boolean {
  if (!a && !b) return true;
  if (!a || !b) return false;
  if (a.length !== b.length) return false;
  return a.every((mailbox, i) => mailboxAddressEquals(mailbox, b[i]));
}

/**
 * Normalizes a Message-ID by stripping angle brackets for comparison.
 */
function normalizeMessageId(id: string): string {
  return id.replace(/^</, '').replace(/>$/, '');
}

// ─── Tests ──────────────────────────────────────────────────────────────────

describe('Email Round-Trip Property Tests', () => {
  let serializer: EmailSerializer;
  let parser: EmailParser;

  beforeEach(() => {
    serializer = new EmailSerializer();
    parser = new EmailParser();
  });

  // Feature: email-messaging-protocol, Property 1: Email Metadata Round-Trip

  describe('Property 1: Email Metadata Round-Trip', () => {
    /**
     * **Feature: email-messaging-protocol, Property 1: Email Metadata Round-Trip**
     *
     * *For any* valid IEmailMetadata object, serializing it to RFC 5322 format
     * using EmailSerializer and then parsing it back using EmailParser SHALL
     * produce an IEmailMetadata object that is semantically equivalent to the
     * original.
     *
     * Semantic equivalence checks:
     * 1. from.address matches
     * 2. to[].address matches
     * 3. subject matches
     * 4. messageId matches
     * 5. date is equivalent (same timestamp)
     * 6. cc addresses match (if present)
     * 7. contentType.mediaType matches
     * 8. Text body content is preserved (check via parts)
     *
     * **Validates: Requirements 14.6, 14.7, 4.6, 7.1-7.8, 1.1-1.6**
     */
    it('should produce semantically equivalent metadata after serialize then parse round-trip', async () => {
      await fc.assert(
        fc.asyncProperty(arbEmailMetadata, async (original: IEmailMetadata) => {
          // Serialize to RFC 5322 format
          const serialized = serializer.serialize(original);

          // Parse back from RFC 5322 format
          const parsed = await parser.parse(serialized);

          // 1. from.address matches
          expect(parsed.from.address.toLowerCase()).toBe(
            original.from.address.toLowerCase(),
          );

          // 2. to[].address matches
          expect(parsed.to.length).toBe(original.to.length);
          expect(mailboxArrayEquals(original.to, parsed.to)).toBe(true);

          // 3. subject matches
          if (original.subject !== undefined) {
            expect(parsed.subject).toBe(original.subject);
          }

          // 4. messageId matches
          expect(normalizeMessageId(parsed.messageId)).toBe(
            normalizeMessageId(original.messageId),
          );

          // 5. date is equivalent (same timestamp, within 1 second tolerance)
          const originalTimestamp = Math.floor(original.date.getTime() / 1000);
          const parsedTimestamp = Math.floor(parsed.date.getTime() / 1000);
          expect(
            Math.abs(originalTimestamp - parsedTimestamp),
          ).toBeLessThanOrEqual(1);

          // 6. cc addresses match (if present)
          if (original.cc && original.cc.length > 0) {
            expect(parsed.cc).toBeDefined();
            expect(mailboxArrayEquals(original.cc, parsed.cc)).toBe(true);
          }

          // 7. contentType.mediaType matches
          expect(parsed.contentType.mediaType.toLowerCase()).toBe(
            original.contentType.mediaType.toLowerCase(),
          );

          // 8. Text body content is preserved (check via parts)
          const originalText = extractTextContent(original.parts);
          const parsedText = extractTextContent(parsed.parts);
          if (originalText !== undefined) {
            expect(parsedText).toBeDefined();
            // Trim both sides since serialization may add/remove trailing whitespace
            expect(parsedText!.trim()).toBe(originalText.trim());
          }
        }),
        { numRuns: 100 },
      );
    });

    /**
     * **Feature: email-messaging-protocol, Property 1: Email Metadata Round-Trip**
     *
     * *For any* valid IEmailMetadata with multipart/alternative content,
     * serializing and parsing SHALL preserve both text/plain and text/html parts.
     *
     * **Validates: Requirements 14.6, 14.7, 7.1-7.8**
     */
    it('should preserve multipart content through serialize then parse round-trip', async () => {
      await fc.assert(
        fc.asyncProperty(
          arbMailbox,
          arbMailboxArray,
          arbMessageId,
          arbDate,
          arbSubject,
          arbMultipartAlternativeParts,
          async (
            from: IMailbox,
            to: IMailbox[],
            messageId: string,
            date: Date,
            subject: string | undefined,
            body: { parts: IMimePart[]; contentType: IContentType },
          ) => {
            const now = new Date();
            const original: IEmailMetadata = {
              blockId: messageId,
              createdAt: now,
              expiresAt: null,
              durabilityLevel: DurabilityLevel.Standard,
              parityBlockIds: [],
              accessCount: 0,
              lastAccessedAt: now,
              replicationStatus: ReplicationStatus.Pending,
              targetReplicationFactor: 0,
              replicaNodeIds: [],
              size: 0,
              checksum: '',
              messageType: 'email',
              senderId: from.address,
              recipients: to.map((r: IMailbox) => r.address),
              priority: MessagePriority.NORMAL,
              deliveryStatus: new Map<string, DeliveryStatus>(),
              acknowledgments: new Map<string, Date>(),
              encryptionScheme: MessageEncryptionScheme.NONE,
              isCBL: false,
              from,
              to,
              messageId,
              date,
              subject,
              mimeVersion: '1.0',
              contentType: body.contentType,
              customHeaders: new Map<string, string[]>(),
              parts: body.parts,
              deliveryReceipts: new Map(),
              readReceipts: new Map(),
            };

            const serialized = serializer.serialize(original);
            const parsed = await parser.parse(serialized);

            // Both text and HTML content should be preserved
            const originalText = extractTextContent(original.parts);
            const parsedText = extractTextContent(parsed.parts);
            const originalHtml = extractHtmlContent(original.parts);
            const parsedHtml = extractHtmlContent(parsed.parts);

            if (originalText !== undefined) {
              expect(parsedText).toBeDefined();
              expect(parsedText!.trim()).toBe(originalText.trim());
            }

            if (originalHtml !== undefined) {
              expect(parsedHtml).toBeDefined();
              expect(parsedHtml!.trim()).toBe(originalHtml.trim());
            }
          },
        ),
        { numRuns: 100 },
      );
    });

    /**
     * **Feature: email-messaging-protocol, Property 1: Email Metadata Round-Trip**
     *
     * *For any* valid IEmailMetadata with In-Reply-To and References fields,
     * serializing and parsing SHALL preserve threading identification fields.
     *
     * **Validates: Requirements 14.6, 1.3**
     */
    it('should preserve threading fields (inReplyTo, references) through round-trip', async () => {
      await fc.assert(
        fc.asyncProperty(
          arbMailbox,
          arbMailboxArray,
          arbMessageId,
          arbDate,
          arbMessageId,
          fc.array(arbMessageId, { minLength: 1, maxLength: 3 }),
          arbSingleTextParts,
          async (
            from: IMailbox,
            to: IMailbox[],
            messageId: string,
            date: Date,
            inReplyTo: string,
            references: string[],
            body: { parts: IMimePart[]; contentType: IContentType },
          ) => {
            const now = new Date();
            const original: IEmailMetadata = {
              blockId: messageId,
              createdAt: now,
              expiresAt: null,
              durabilityLevel: DurabilityLevel.Standard,
              parityBlockIds: [],
              accessCount: 0,
              lastAccessedAt: now,
              replicationStatus: ReplicationStatus.Pending,
              targetReplicationFactor: 0,
              replicaNodeIds: [],
              size: 0,
              checksum: '',
              messageType: 'email',
              senderId: from.address,
              recipients: to.map((r: IMailbox) => r.address),
              priority: MessagePriority.NORMAL,
              deliveryStatus: new Map<string, DeliveryStatus>(),
              acknowledgments: new Map<string, Date>(),
              encryptionScheme: MessageEncryptionScheme.NONE,
              isCBL: false,
              from,
              to,
              messageId,
              date,
              subject: 'Re: Test thread',
              mimeVersion: '1.0',
              contentType: body.contentType,
              customHeaders: new Map<string, string[]>(),
              parts: body.parts,
              deliveryReceipts: new Map(),
              readReceipts: new Map(),
              inReplyTo,
              references,
            };

            const serialized = serializer.serialize(original);
            const parsed = await parser.parse(serialized);

            // In-Reply-To should be preserved
            expect(parsed.inReplyTo).toBeDefined();
            expect(normalizeMessageId(parsed.inReplyTo!)).toBe(
              normalizeMessageId(original.inReplyTo!),
            );

            // References should be preserved
            expect(parsed.references).toBeDefined();
            expect(parsed.references!.length).toBe(original.references!.length);
            for (let i = 0; i < original.references!.length; i++) {
              expect(normalizeMessageId(parsed.references![i])).toBe(
                normalizeMessageId(original.references![i]),
              );
            }
          },
        ),
        { numRuns: 100 },
      );
    });
  });
});
