/**
 * @fileoverview Property-based tests for email serialization round-trip
 *
 * **Feature: email-gateway**
 *
 * This test suite verifies:
 * - Property 5: Serialize IEmailMetadata → RFC 5322 → parse back yields equivalent metadata
 *
 * **Validates: Requirements 12.1, 12.2, 12.3**
 */

import type {
  BlockId,
  IEmailMetadata,
  IMailbox,
} from '@brightchain/brightchain-lib';
import {
  ContentTransferEncoding,
  createContentType,
  createMailbox,
  DeliveryStatus,
  DurabilityLevel,
  EmailParser,
  EmailSerializer,
  MessageEncryptionScheme,
  MessagePriority,
  ReplicationStatus,
} from '@brightchain/brightchain-lib';
import fc from 'fast-check';

// ─── Arbitraries ────────────────────────────────────────────────────────────

/**
 * Generates a valid RFC 5322 local-part (simplified: lowercase alpha + digits).
 * Avoids special characters that may not round-trip through all parsers.
 */
const arbLocalPart = fc
  .array(fc.constantFrom(...'abcdefghijklmnopqrstuvwxyz0123456789'.split('')), {
    minLength: 1,
    maxLength: 10,
  })
  .map((chars) => chars.join(''));

/**
 * Generates a valid domain (simplified: lowercase alpha label + .tld).
 */
const arbDomain = fc
  .tuple(
    fc.array(fc.constantFrom(...'abcdefghijklmnopqrstuvwxyz'.split('')), {
      minLength: 2,
      maxLength: 8,
    }),
    fc.constantFrom('com', 'org', 'net', 'io', 'dev'),
  )
  .map(([labelChars, tld]) => `${labelChars.join('')}.${tld}`);

/**
 * Generates a valid IMailbox without display name (simpler round-trip).
 */
const arbMailboxSimple: fc.Arbitrary<IMailbox> = fc
  .tuple(arbLocalPart, arbDomain)
  .map(([local, domain]) => createMailbox(local, domain));

/**
 * Generates a valid IMailbox with optional display name.
 * Display names are restricted to simple alphanumeric + space to avoid
 * encoding issues that may not round-trip perfectly.
 */
const arbMailbox: fc.Arbitrary<IMailbox> = fc
  .tuple(
    arbLocalPart,
    arbDomain,
    fc.option(
      fc
        .array(
          fc.constantFrom(
            ...'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz '.split(
              '',
            ),
          ),
          {
            minLength: 1,
            maxLength: 20,
          },
        )
        .map((chars) => chars.join('').trim())
        .filter((s) => s.length > 0),
      { nil: undefined },
    ),
  )
  .map(([local, domain, displayName]) =>
    createMailbox(local, domain, displayName),
  );

/**
 * Generates a valid RFC 5322 Message-ID in angle-bracket format.
 */
const arbMessageId: fc.Arbitrary<string> = fc
  .tuple(
    fc.array(
      fc.constantFrom(...'abcdefghijklmnopqrstuvwxyz0123456789'.split('')),
      {
        minLength: 5,
        maxLength: 20,
      },
    ),
    arbDomain,
  )
  .map(([leftChars, right]) => `<${leftChars.join('')}@${right}>`);

/**
 * Generates a simple ASCII subject line (avoids encoded-word round-trip issues).
 */
const arbSubject = fc
  .array(
    fc.constantFrom(
      ...'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789 '.split(
        '',
      ),
    ),
    {
      minLength: 1,
      maxLength: 60,
    },
  )
  .map((chars) => chars.join('').trim())
  .filter((s) => s.length > 0);

/**
 * Generates a Date with second-level precision (RFC 5322 dates don't carry ms).
 */
const arbDate: fc.Arbitrary<Date> = fc
  .integer({ min: 946684800, max: 1893456000 }) // 2000-01-01 to 2030-01-01 (seconds)
  .map((secs) => new Date(secs * 1000));

/**
 * Generates a simple text body (ASCII only for clean round-trip).
 */
const arbTextBody = fc
  .array(
    fc.constantFrom(
      ...'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789 '.split(
        '',
      ),
    ),
    {
      minLength: 1,
      maxLength: 200,
    },
  )
  .map((chars) => chars.join(''));

/**
 * Builds a minimal but valid IEmailMetadata suitable for serialization round-trip.
 * Focuses on the key fields that should survive: from, to, subject, messageId, date,
 * mimeVersion, contentType.
 */
const arbEmailMetadata: fc.Arbitrary<IEmailMetadata> = fc
  .tuple(
    arbMailbox, // from
    fc.array(arbMailboxSimple, { minLength: 1, maxLength: 3 }), // to
    arbSubject, // subject
    arbMessageId, // messageId
    arbDate, // date
    arbTextBody, // body text
  )
  .map(([from, to, subject, messageId, date, bodyText]) => {
    const contentType = createContentType(
      'text',
      'plain',
      new Map([['charset', 'utf-8']]),
    );
    const bodyBytes = new TextEncoder().encode(bodyText);

    const metadata: IEmailMetadata = {
      // IBlockMetadata fields (required but not part of round-trip)
      blockId: 'a'.repeat(64) as unknown as BlockId,
      createdAt: new Date(),
      expiresAt: null,
      durabilityLevel: DurabilityLevel.Standard,
      parityBlockIds: [],
      accessCount: 0,
      lastAccessedAt: new Date(),
      replicationStatus: ReplicationStatus.Pending,
      targetReplicationFactor: 0,
      replicaNodeIds: [],
      size: 0,
      checksum: '',

      // IMessageMetadata fields (required but not part of round-trip)
      messageType: 'email',
      senderId: from.address,
      recipients: to.map((r) => r.address),
      priority: MessagePriority.NORMAL,
      deliveryStatus: new Map<string, DeliveryStatus>(),
      acknowledgments: new Map<string, Date>(),
      encryptionScheme: MessageEncryptionScheme.NONE,
      isCBL: false,

      // IEmailMetadata fields (these should round-trip)
      from,
      to,
      messageId,
      subject,
      date,
      mimeVersion: '1.0',
      contentType,
      contentTransferEncoding: ContentTransferEncoding.SevenBit,
      customHeaders: new Map(),
      parts: [
        {
          contentType,
          contentTransferEncoding: ContentTransferEncoding.SevenBit,
          body: bodyBytes,
          size: bodyBytes.length,
        },
      ],
      deliveryReceipts: new Map(),
      readReceipts: new Map(),
    };

    return metadata;
  });

// ─── Helpers ────────────────────────────────────────────────────────────────

/**
 * Compares two IMailbox objects for semantic equivalence.
 * Display names may differ in quoting/whitespace, so we normalize.
 */
function mailboxesEqual(a: IMailbox, b: IMailbox): boolean {
  return (
    a.localPart.toLowerCase() === b.localPart.toLowerCase() &&
    a.domain.toLowerCase() === b.domain.toLowerCase()
  );
}

/**
 * Compares two dates at second-level precision (RFC 5322 doesn't carry ms).
 */
function datesEqualToSecond(a: Date, b: Date): boolean {
  return Math.floor(a.getTime() / 1000) === Math.floor(b.getTime() / 1000);
}

// ─── Property Tests ─────────────────────────────────────────────────────────

describe('Email Serialization Round-Trip Property Tests', () => {
  const serializer = new EmailSerializer();
  const parser = new EmailParser();

  describe('Property 5: Serialize IEmailMetadata → RFC 5322 → parse back yields equivalent metadata', () => {
    /**
     * **Feature: email-gateway, Property 5: Serialization round-trip**
     *
     * *For any* valid IEmailMetadata object with simple ASCII content,
     * serializing to RFC 5322 via EmailSerializer then parsing via EmailParser
     * produces an equivalent metadata object for key fields:
     * from, to, subject, messageId, date, mimeVersion, contentType.
     *
     * **Validates: Requirements 12.1, 12.2, 12.3**
     */
    it('should preserve the "from" field through serialize → parse round-trip', async () => {
      await fc.assert(
        fc.asyncProperty(arbEmailMetadata, async (original) => {
          const rfc5322 = serializer.serialize(original);
          const parsed = await parser.parse(rfc5322);

          expect(mailboxesEqual(original.from, parsed.from)).toBe(true);
        }),
        { numRuns: 100 },
      );
    });

    it('should preserve the "to" recipients through serialize → parse round-trip', async () => {
      await fc.assert(
        fc.asyncProperty(arbEmailMetadata, async (original) => {
          const rfc5322 = serializer.serialize(original);
          const parsed = await parser.parse(rfc5322);

          expect(parsed.to.length).toBe(original.to.length);
          for (let i = 0; i < original.to.length; i++) {
            expect(mailboxesEqual(original.to[i], parsed.to[i])).toBe(true);
          }
        }),
        { numRuns: 100 },
      );
    });

    it('should preserve the "subject" through serialize → parse round-trip', async () => {
      await fc.assert(
        fc.asyncProperty(arbEmailMetadata, async (original) => {
          const rfc5322 = serializer.serialize(original);
          const parsed = await parser.parse(rfc5322);

          // RFC 5322 folding/unfolding may collapse runs of whitespace to a single space
          const normalizeWs = (s: string) => s.replace(/\s+/g, ' ');
          expect(normalizeWs(parsed.subject)).toBe(
            normalizeWs(original.subject),
          );
        }),
        { numRuns: 100 },
      );
    });

    it('should preserve the "messageId" through serialize → parse round-trip', async () => {
      await fc.assert(
        fc.asyncProperty(arbEmailMetadata, async (original) => {
          const rfc5322 = serializer.serialize(original);
          const parsed = await parser.parse(rfc5322);

          expect(parsed.messageId).toBe(original.messageId);
        }),
        { numRuns: 100 },
      );
    });

    it('should preserve the "date" (to second precision) through serialize → parse round-trip', async () => {
      await fc.assert(
        fc.asyncProperty(arbEmailMetadata, async (original) => {
          const rfc5322 = serializer.serialize(original);
          const parsed = await parser.parse(rfc5322);

          expect(datesEqualToSecond(original.date, parsed.date)).toBe(true);
        }),
        { numRuns: 100 },
      );
    });

    it('should preserve the "mimeVersion" through serialize → parse round-trip', async () => {
      await fc.assert(
        fc.asyncProperty(arbEmailMetadata, async (original) => {
          const rfc5322 = serializer.serialize(original);
          const parsed = await parser.parse(rfc5322);

          expect(parsed.mimeVersion).toBe(original.mimeVersion);
        }),
        { numRuns: 100 },
      );
    });

    it('should preserve the "contentType" media type through serialize → parse round-trip', async () => {
      await fc.assert(
        fc.asyncProperty(arbEmailMetadata, async (original) => {
          const rfc5322 = serializer.serialize(original);
          const parsed = await parser.parse(rfc5322);

          expect(parsed.contentType.type).toBe(original.contentType.type);
          expect(parsed.contentType.subtype).toBe(original.contentType.subtype);
        }),
        { numRuns: 100 },
      );
    });
  });
});
