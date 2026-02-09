import { DurabilityLevel } from '../../enumerations/durabilityLevel';
import { DeliveryStatus } from '../../enumerations/messaging/deliveryStatus';
import { MessageEncryptionScheme } from '../../enumerations/messaging/messageEncryptionScheme';
import { MessagePriority } from '../../enumerations/messaging/messagePriority';
import { ReplicationStatus } from '../../enumerations/replicationStatus';
import {
  createAddressGroup,
  createMailbox,
  type IAddress,
} from '../../interfaces/messaging/emailAddress';
import type { IEmailMetadata } from '../../interfaces/messaging/emailMetadata';
import {
  ContentTransferEncoding,
  createContentType,
  type IMimePart,
} from '../../interfaces/messaging/mimePart';
import { EmailParser } from './emailParser';
import { EmailSerializer } from './emailSerializer';

describe('EmailSerializer', () => {
  let serializer: EmailSerializer;

  beforeEach(() => {
    serializer = new EmailSerializer();
  });

  // ─── serializeMailbox ─────────────────────────────────────────────

  describe('serializeMailbox', () => {
    it('should serialize a simple mailbox without display name', () => {
      const mailbox = createMailbox('user', 'example.com');
      expect(serializer.serializeMailbox(mailbox)).toBe('user@example.com');
    });

    it('should serialize a mailbox with display name', () => {
      const mailbox = createMailbox('john', 'example.com', 'John Doe');
      expect(serializer.serializeMailbox(mailbox)).toBe(
        '"John Doe" <john@example.com>',
      );
    });

    it('should serialize a mailbox with special characters in display name', () => {
      const mailbox = createMailbox('user', 'example.com', "O'Brien, James");
      const result = serializer.serializeMailbox(mailbox);
      expect(result).toContain('user@example.com');
      expect(result).toContain("O'Brien, James");
    });
  });

  // ─── serializeAddressList ─────────────────────────────────────────

  describe('serializeAddressList', () => {
    it('should serialize a single mailbox', () => {
      const addresses: IAddress[] = [createMailbox('alice', 'example.com')];
      expect(serializer.serializeAddressList(addresses)).toBe(
        'alice@example.com',
      );
    });

    it('should serialize multiple mailboxes as comma-separated list', () => {
      const addresses: IAddress[] = [
        createMailbox('alice', 'example.com', 'Alice'),
        createMailbox('bob', 'example.com'),
      ];
      expect(serializer.serializeAddressList(addresses)).toBe(
        '"Alice" <alice@example.com>, bob@example.com',
      );
    });

    it('should serialize a group address', () => {
      const group = createAddressGroup('Team', [
        createMailbox('alice', 'example.com'),
        createMailbox('bob', 'example.com'),
      ]);
      const addresses: IAddress[] = [group];
      expect(serializer.serializeAddressList(addresses)).toBe(
        'Team: alice@example.com, bob@example.com;',
      );
    });

    it('should serialize an empty group address', () => {
      const group = createAddressGroup('Undisclosed Recipients', []);
      const addresses: IAddress[] = [group];
      expect(serializer.serializeAddressList(addresses)).toBe(
        'Undisclosed Recipients:;',
      );
    });

    it('should return empty string for empty array', () => {
      expect(serializer.serializeAddressList([])).toBe('');
    });

    it('should serialize mixed mailboxes and groups', () => {
      const addresses: IAddress[] = [
        createMailbox('alice', 'example.com'),
        createAddressGroup('Team', [createMailbox('bob', 'example.com')]),
      ];
      const result = serializer.serializeAddressList(addresses);
      expect(result).toContain('alice@example.com');
      expect(result).toContain('Team:');
      expect(result).toContain('bob@example.com');
    });
  });

  // ─── serializeMessageId ───────────────────────────────────────────

  describe('serializeMessageId', () => {
    it('should return Message-ID as-is when already in angle brackets', () => {
      expect(serializer.serializeMessageId('<unique-id@example.com>')).toBe(
        '<unique-id@example.com>',
      );
    });

    it('should add angle brackets when missing', () => {
      expect(serializer.serializeMessageId('unique-id@example.com')).toBe(
        '<unique-id@example.com>',
      );
    });

    it('should handle empty string', () => {
      expect(serializer.serializeMessageId('')).toBe('');
    });

    it('should trim whitespace', () => {
      expect(serializer.serializeMessageId('  <id@example.com>  ')).toBe(
        '<id@example.com>',
      );
    });
  });

  // ─── serializeDate ────────────────────────────────────────────────

  describe('serializeDate', () => {
    it('should serialize a date in RFC 5322 format', () => {
      const date = new Date('2025-02-13T15:30:00Z');
      const result = serializer.serializeDate(date);
      expect(result).toBe('Thu, 13 Feb 2025 15:30:00 +0000');
    });

    it('should serialize a date at midnight', () => {
      const date = new Date('2025-01-01T00:00:00Z');
      const result = serializer.serializeDate(date);
      expect(result).toBe('Wed, 01 Jan 2025 00:00:00 +0000');
    });

    it('should serialize a date at end of day', () => {
      const date = new Date('2025-12-31T23:59:59Z');
      const result = serializer.serializeDate(date);
      expect(result).toBe('Wed, 31 Dec 2025 23:59:59 +0000');
    });

    it('should produce a parseable date string', () => {
      const original = new Date('2025-06-15T10:30:45Z');
      const serialized = serializer.serializeDate(original);
      const parsed = new Date(serialized);
      expect(parsed.getTime()).toBe(original.getTime());
    });

    it('should handle invalid date by returning current date string', () => {
      const result = serializer.serializeDate(new Date('invalid'));
      // Should produce a valid date string (current time)
      expect(result).toMatch(
        /^(Mon|Tue|Wed|Thu|Fri|Sat|Sun), \d{2} (Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec) \d{4} \d{2}:\d{2}:\d{2} \+0000$/,
      );
    });
  });

  // ─── serializeContentType ─────────────────────────────────────────

  describe('serializeContentType', () => {
    it('should serialize a simple content type', () => {
      const ct = createContentType('text', 'plain');
      expect(serializer.serializeContentType(ct)).toBe('text/plain');
    });

    it('should serialize content type with charset parameter', () => {
      const ct = createContentType(
        'text',
        'plain',
        new Map([['charset', 'utf-8']]),
      );
      expect(serializer.serializeContentType(ct)).toBe(
        'text/plain; charset=utf-8',
      );
    });

    it('should serialize content type with boundary parameter (quoted)', () => {
      const ct = createContentType(
        'multipart',
        'mixed',
        new Map([['boundary', '----=_Part_123']]),
      );
      const result = serializer.serializeContentType(ct);
      expect(result).toBe('multipart/mixed; boundary="----=_Part_123"');
    });

    it('should serialize content type with multiple parameters', () => {
      const ct = createContentType(
        'text',
        'plain',
        new Map([
          ['charset', 'utf-8'],
          ['format', 'flowed'],
        ]),
      );
      const result = serializer.serializeContentType(ct);
      expect(result).toContain('text/plain');
      expect(result).toContain('charset=utf-8');
      expect(result).toContain('format=flowed');
    });

    it('should quote parameter values with special characters', () => {
      const ct = createContentType(
        'application',
        'octet-stream',
        new Map([['name', 'my file.txt']]),
      );
      const result = serializer.serializeContentType(ct);
      expect(result).toContain('name="my file.txt"');
    });
  });

  // ─── foldHeader ───────────────────────────────────────────────────

  describe('foldHeader', () => {
    it('should not fold a short header line', () => {
      const line = 'Subject: Hello World';
      expect(serializer.foldHeader(line)).toBe(line);
    });

    it('should fold a long header line at whitespace boundary', () => {
      const line =
        'Subject: This is a very long subject line that exceeds the seventy-eight character limit for RFC 5322 headers';
      const folded = serializer.foldHeader(line);

      // Each line should be <= 78 characters
      const lines = folded.split('\r\n');
      for (const l of lines) {
        expect(l.length).toBeLessThanOrEqual(78);
      }

      // Continuation lines should start with whitespace
      for (let i = 1; i < lines.length; i++) {
        expect(lines[i]).toMatch(/^[ \t]/);
      }
    });

    it('should preserve content when folding', () => {
      const line =
        'To: alice@example.com, bob@example.com, charlie@example.com, dave@example.com, eve@example.com';
      const folded = serializer.foldHeader(line);

      // Unfolding should recover the original content
      const parser = new EmailParser();
      const unfolded = parser.unfoldHeaders(folded);
      expect(unfolded).toBe(line);
    });

    it('should handle a line exactly at the limit', () => {
      const line = 'X-Header: ' + 'a'.repeat(68); // exactly 78 chars
      expect(serializer.foldHeader(line)).toBe(line);
    });

    it('should handle custom max length', () => {
      const line = 'Subject: This is a moderately long subject line';
      const folded = serializer.foldHeader(line, 30);
      const lines = folded.split('\r\n');
      // First line should be <= 30 chars
      expect(lines[0].length).toBeLessThanOrEqual(30);
    });

    it('should handle a line with no whitespace gracefully', () => {
      const line = 'X-Header:' + 'a'.repeat(100);
      const folded = serializer.foldHeader(line);
      // Should return the line as-is since there's no whitespace to fold at
      expect(folded).toBe(line);
    });

    it('should fold/unfold as inverse operations', () => {
      const line =
        'References: <id1@example.com> <id2@example.com> <id3@example.com> <id4@example.com> <id5@example.com>';
      const folded = serializer.foldHeader(line);
      const parser = new EmailParser();
      const unfolded = parser.unfoldHeaders(folded);
      expect(unfolded).toBe(line);
    });
  });

  // ─── generateBoundary ─────────────────────────────────────────────

  describe('generateBoundary', () => {
    it('should generate a non-empty boundary string', () => {
      const boundary = serializer.generateBoundary();
      expect(boundary.length).toBeGreaterThan(0);
    });

    it('should generate unique boundaries', () => {
      const boundaries = new Set<string>();
      for (let i = 0; i < 100; i++) {
        boundaries.add(serializer.generateBoundary());
      }
      // All 100 boundaries should be unique
      expect(boundaries.size).toBe(100);
    });

    it('should generate boundaries with the expected prefix', () => {
      const boundary = serializer.generateBoundary();
      expect(boundary).toMatch(/^----=_Part_/);
    });
  });

  // ─── serializeHeaders ─────────────────────────────────────────────

  describe('serializeHeaders', () => {
    function createMinimalEmailMetadata(
      overrides?: Partial<IEmailMetadata>,
    ): IEmailMetadata {
      const now = new Date('2025-02-13T15:30:00Z');
      const from = createMailbox('sender', 'example.com', 'Sender');
      return {
        // IBlockMetadata fields
        blockId: '<test-id@example.com>',
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
        recipients: ['recipient@example.com'],
        priority: MessagePriority.NORMAL,
        deliveryStatus: new Map<string, DeliveryStatus>(),
        acknowledgments: new Map<string, Date>(),
        encryptionScheme: MessageEncryptionScheme.NONE,
        isCBL: false,

        // IEmailMetadata fields
        from,
        to: [createMailbox('recipient', 'example.com')],
        messageId: '<test-id@example.com>',
        date: now,
        mimeVersion: '1.0',
        contentType: createContentType(
          'text',
          'plain',
          new Map([['charset', 'utf-8']]),
        ),
        customHeaders: new Map(),
        deliveryReceipts: new Map(),
        readReceipts: new Map(),
        ...overrides,
      } as IEmailMetadata;
    }

    it('should produce headers with CRLF line endings (Requirement 14.1)', () => {
      const email = createMinimalEmailMetadata();
      const headers = serializer.serializeHeaders(email);

      // All line endings should be CRLF
      // Split by CRLF and check no bare LF remains
      const withoutCRLF = headers.replace(/\r\n/g, '');
      expect(withoutCRLF).not.toContain('\n');
    });

    it('should terminate with blank line CRLF CRLF (Requirement 14.3)', () => {
      const email = createMinimalEmailMetadata();
      const headers = serializer.serializeHeaders(email);
      expect(headers).toMatch(/\r\n\r\n$/);
    });

    it('should include required headers: Date, From, Message-ID, MIME-Version, Content-Type', () => {
      const email = createMinimalEmailMetadata();
      const headers = serializer.serializeHeaders(email);

      expect(headers).toContain('Date:');
      expect(headers).toContain('From:');
      expect(headers).toContain('Message-ID:');
      expect(headers).toContain('MIME-Version: 1.0');
      expect(headers).toContain('Content-Type: text/plain');
    });

    it('should include To header', () => {
      const email = createMinimalEmailMetadata();
      const headers = serializer.serializeHeaders(email);
      expect(headers).toContain('To: recipient@example.com');
    });

    it('should include optional headers when present', () => {
      const email = createMinimalEmailMetadata({
        subject: 'Test Subject',
        cc: [createMailbox('cc', 'example.com')],
        bcc: [createMailbox('bcc', 'example.com')],
        sender: createMailbox('actual-sender', 'example.com'),
        replyTo: [createMailbox('reply', 'example.com')],
        inReplyTo: '<parent@example.com>',
        references: ['<ref1@example.com>', '<ref2@example.com>'],
        comments: ['A comment'],
        keywords: ['test', 'email'],
      });
      const headers = serializer.serializeHeaders(email);

      expect(headers).toContain('Subject: Test Subject');
      expect(headers).toContain('Cc: cc@example.com');
      expect(headers).toContain('Bcc: bcc@example.com');
      expect(headers).toContain('Sender: actual-sender@example.com');
      expect(headers).toContain('Reply-To: reply@example.com');
      expect(headers).toContain('In-Reply-To: <parent@example.com>');
      expect(headers).toContain(
        'References: <ref1@example.com> <ref2@example.com>',
      );
      expect(headers).toContain('Comments: A comment');
      expect(headers).toContain('Keywords: test, email');
    });

    it('should include custom headers', () => {
      const customHeaders = new Map<string, string[]>();
      customHeaders.set('X-Custom-Header', ['custom-value']);
      customHeaders.set('X-Another', ['val1', 'val2']);

      const email = createMinimalEmailMetadata({ customHeaders });
      const headers = serializer.serializeHeaders(email);

      expect(headers).toContain('X-Custom-Header: custom-value');
      expect(headers).toContain('X-Another: val1');
      expect(headers).toContain('X-Another: val2');
    });

    it('should include Content-Transfer-Encoding when present', () => {
      const email = createMinimalEmailMetadata({
        contentTransferEncoding: ContentTransferEncoding.Base64,
      });
      const headers = serializer.serializeHeaders(email);
      expect(headers).toContain('Content-Transfer-Encoding: base64');
    });

    it('should fold long header lines (Requirement 14.2)', () => {
      const longSubject =
        'A'.repeat(10) +
        ' ' +
        'B'.repeat(30) +
        ' ' +
        'C'.repeat(30) +
        ' ' +
        'D'.repeat(30);
      const email = createMinimalEmailMetadata({
        subject: longSubject,
      });
      const headers = serializer.serializeHeaders(email);

      // The Subject header line should be folded
      // Extract lines between Date and the next header
      const lines = headers.split('\r\n');
      for (const line of lines) {
        if (line.length > 0) {
          expect(line.length).toBeLessThanOrEqual(78);
        }
      }
    });
  });

  // ─── encodeEncodedWord ──────────────────────────────────────────────

  describe('encodeEncodedWord', () => {
    it('should encode ASCII text with B (base64) encoding', () => {
      const result = serializer.encodeEncodedWord('Hello World', 'UTF-8', 'B');
      expect(result).toBe('=?UTF-8?B?SGVsbG8gV29ybGQ=?=');
    });

    it('should encode ASCII text with Q (quoted-printable) encoding', () => {
      const result = serializer.encodeEncodedWord('Hello World', 'UTF-8', 'Q');
      // Spaces become underscores in Q encoding per RFC 2047 Section 4.2
      expect(result).toBe('=?UTF-8?Q?Hello_World?=');
    });

    it('should encode non-ASCII text with B encoding', () => {
      const result = serializer.encodeEncodedWord('Héllo', 'UTF-8', 'B');
      // 'Héllo' in UTF-8 is [0x48, 0xC3, 0xA9, 0x6C, 0x6C, 0x6F]
      const expectedBase64 = Buffer.from('Héllo', 'utf-8').toString('base64');
      expect(result).toBe(`=?UTF-8?B?${expectedBase64}?=`);
    });

    it('should encode non-ASCII text with Q encoding', () => {
      const result = serializer.encodeEncodedWord('Héllo', 'UTF-8', 'Q');
      // 'é' in UTF-8 is 0xC3 0xA9, encoded as =C3=A9
      expect(result).toBe('=?UTF-8?Q?H=C3=A9llo?=');
    });

    it('should encode special characters (=, ?, _) in Q encoding', () => {
      const result = serializer.encodeEncodedWord('a=b?c_d', 'UTF-8', 'Q');
      expect(result).toBe('=?UTF-8?Q?a=3Db=3Fc=5Fd?=');
    });

    it('should return empty string for empty input', () => {
      expect(serializer.encodeEncodedWord('', 'UTF-8', 'B')).toBe('');
      expect(serializer.encodeEncodedWord('', 'UTF-8', 'Q')).toBe('');
    });

    it('should produce output in the correct RFC 2047 format', () => {
      const result = serializer.encodeEncodedWord('Test', 'ISO-8859-1', 'B');
      // Format: =?charset?encoding?encoded-text?=
      expect(result).toMatch(/^=\?ISO-8859-1\?B\?[A-Za-z0-9+/=]+\?=$/);
    });

    it('should round-trip with EmailParser.decodeEncodedWord for B encoding', () => {
      const parser = new EmailParser();
      const original = 'Hello World 🚀';
      const encoded = serializer.encodeEncodedWord(original, 'UTF-8', 'B');
      const decoded = parser.decodeEncodedWord(encoded);
      expect(decoded).toBe(original);
    });

    it('should round-trip with EmailParser.decodeEncodedWord for Q encoding', () => {
      const parser = new EmailParser();
      const original = 'Hello World';
      const encoded = serializer.encodeEncodedWord(original, 'UTF-8', 'Q');
      const decoded = parser.decodeEncodedWord(encoded);
      expect(decoded).toBe(original);
    });

    it('should round-trip non-ASCII text with B encoding', () => {
      const parser = new EmailParser();
      const original = 'Ünïcödé Tëxt';
      const encoded = serializer.encodeEncodedWord(original, 'UTF-8', 'B');
      const decoded = parser.decodeEncodedWord(encoded);
      expect(decoded).toBe(original);
    });

    it('should round-trip non-ASCII text with Q encoding', () => {
      const parser = new EmailParser();
      const original = 'café résumé';
      const encoded = serializer.encodeEncodedWord(original, 'UTF-8', 'Q');
      const decoded = parser.decodeEncodedWord(encoded);
      expect(decoded).toBe(original);
    });
  });

  // ─── encodeQuotedPrintable ──────────────────────────────────────────

  describe('encodeQuotedPrintable', () => {
    it('should pass through printable ASCII characters unchanged', () => {
      const input = new TextEncoder().encode('Hello World!');
      const encoded = serializer.encodeQuotedPrintable(input);
      const result = new TextDecoder().decode(encoded);
      expect(result).toBe('Hello World!');
    });

    it('should encode the equals sign', () => {
      const input = new TextEncoder().encode('a=b');
      const encoded = serializer.encodeQuotedPrintable(input);
      const result = new TextDecoder().decode(encoded);
      expect(result).toBe('a=3Db');
    });

    it('should encode non-ASCII bytes as =XX hex', () => {
      const input = new Uint8Array([0xc3, 0xa9]); // UTF-8 'é'
      const encoded = serializer.encodeQuotedPrintable(input);
      const result = new TextDecoder().decode(encoded);
      expect(result).toBe('=C3=A9');
    });

    it('should encode null byte', () => {
      const input = new Uint8Array([0x00]);
      const encoded = serializer.encodeQuotedPrintable(input);
      const result = new TextDecoder().decode(encoded);
      expect(result).toBe('=00');
    });

    it('should insert soft line breaks for lines exceeding 76 characters', () => {
      // Create a string that will exceed 76 characters
      const longString = 'A'.repeat(80);
      const input = new TextEncoder().encode(longString);
      const encoded = serializer.encodeQuotedPrintable(input);
      const result = new TextDecoder().decode(encoded);

      // Lines should be split with soft line break (=\r\n)
      const lines = result.split('\r\n');
      for (const line of lines) {
        expect(line.length).toBeLessThanOrEqual(76);
      }
    });

    it('should encode trailing whitespace before line breaks', () => {
      // "Hello \r\n" - the space before CRLF should be encoded
      const input = new Uint8Array([
        0x48, 0x65, 0x6c, 0x6c, 0x6f, 0x20, 0x0d, 0x0a,
      ]);
      const encoded = serializer.encodeQuotedPrintable(input);
      const result = new TextDecoder().decode(encoded);
      expect(result).toBe('Hello=20\r\n');
    });

    it('should preserve tabs within a line', () => {
      const input = new TextEncoder().encode('Hello\tWorld');
      const encoded = serializer.encodeQuotedPrintable(input);
      const result = new TextDecoder().decode(encoded);
      expect(result).toBe('Hello\tWorld');
    });

    it('should round-trip with EmailParser.decodeQuotedPrintable', () => {
      const parser = new EmailParser();
      const original = new TextEncoder().encode(
        'Hello World! Special chars: é à ü',
      );
      const encoded = serializer.encodeQuotedPrintable(original);
      const decoded = parser.decodeQuotedPrintable(encoded);
      expect(Array.from(decoded)).toEqual(Array.from(original));
    });

    it('should round-trip binary data with EmailParser.decodeQuotedPrintable', () => {
      const parser = new EmailParser();
      const original = new Uint8Array([0x00, 0x01, 0xff, 0x80, 0x7f, 0x41]);
      const encoded = serializer.encodeQuotedPrintable(original);
      const decoded = parser.decodeQuotedPrintable(encoded);
      expect(Array.from(decoded)).toEqual(Array.from(original));
    });

    it('should handle empty input', () => {
      const input = new Uint8Array(0);
      const encoded = serializer.encodeQuotedPrintable(input);
      const result = new TextDecoder().decode(encoded);
      expect(result).toBe('');
    });
  });

  // ─── encodeBase64 ─────────────────────────────────────────────────

  describe('encodeBase64', () => {
    it('should encode simple ASCII text', () => {
      const input = new TextEncoder().encode('Hello World');
      const encoded = serializer.encodeBase64(input);
      const result = new TextDecoder().decode(encoded);
      expect(result).toBe('SGVsbG8gV29ybGQ=');
    });

    it('should insert line breaks every 76 characters', () => {
      // Create data that produces a base64 string longer than 76 chars
      const input = new Uint8Array(60); // 60 bytes -> 80 base64 chars
      for (let i = 0; i < input.length; i++) {
        input[i] = i % 256;
      }
      const encoded = serializer.encodeBase64(input);
      const result = new TextDecoder().decode(encoded);

      const lines = result.split('\r\n');
      for (const line of lines) {
        expect(line.length).toBeLessThanOrEqual(76);
      }
      // Should have at least 2 lines since 80 > 76
      expect(lines.length).toBeGreaterThanOrEqual(2);
    });

    it('should use CRLF for line breaks per RFC 2045', () => {
      const input = new Uint8Array(60);
      for (let i = 0; i < input.length; i++) {
        input[i] = i % 256;
      }
      const encoded = serializer.encodeBase64(input);
      const result = new TextDecoder().decode(encoded);

      // Should contain CRLF, not bare LF
      expect(result).toContain('\r\n');
      const withoutCRLF = result.replace(/\r\n/g, '');
      expect(withoutCRLF).not.toContain('\n');
    });

    it('should round-trip with EmailParser.decodeBase64', () => {
      const parser = new EmailParser();
      const original = new TextEncoder().encode('Hello World! 🚀');
      const encoded = serializer.encodeBase64(original);
      const decoded = parser.decodeBase64(encoded);
      expect(Array.from(decoded)).toEqual(Array.from(original));
    });

    it('should round-trip binary data with EmailParser.decodeBase64', () => {
      const parser = new EmailParser();
      const original = new Uint8Array(256);
      for (let i = 0; i < 256; i++) {
        original[i] = i;
      }
      const encoded = serializer.encodeBase64(original);
      const decoded = parser.decodeBase64(encoded);
      expect(Array.from(decoded)).toEqual(Array.from(original));
    });

    it('should handle empty input', () => {
      const input = new Uint8Array(0);
      const encoded = serializer.encodeBase64(input);
      const result = new TextDecoder().decode(encoded);
      expect(result).toBe('');
    });

    it('should handle single byte input', () => {
      const input = new Uint8Array([0x41]); // 'A'
      const encoded = serializer.encodeBase64(input);
      const result = new TextDecoder().decode(encoded);
      expect(result).toBe('QQ==');
    });
  });

  // ─── serializeMultipart ───────────────────────────────────────────

  describe('serializeMultipart', () => {
    it('should serialize a single text part with proper boundary delimiters (Requirement 6.6)', () => {
      const boundary = '----=_Part_test_boundary';
      const parts: IMimePart[] = [
        {
          contentType: createContentType(
            'text',
            'plain',
            new Map([['charset', 'utf-8']]),
          ),
          body: new TextEncoder().encode('Hello World'),
          size: 11,
        },
      ];

      const result = serializer.serializeMultipart(parts, boundary);
      const resultStr = new TextDecoder().decode(result);

      // Should start with --boundary
      expect(resultStr).toContain(`--${boundary}\r\n`);
      // Should end with --boundary--
      expect(resultStr).toContain(`--${boundary}--\r\n`);
      // Should contain the body
      expect(resultStr).toContain('Hello World');
      // Should contain Content-Type header
      expect(resultStr).toContain('Content-Type: text/plain; charset=utf-8');
    });

    it('should serialize multiple parts separated by boundary delimiters', () => {
      const boundary = '----=_Part_multi';
      const parts: IMimePart[] = [
        {
          contentType: createContentType('text', 'plain'),
          body: new TextEncoder().encode('Plain text'),
          size: 10,
        },
        {
          contentType: createContentType('text', 'html'),
          body: new TextEncoder().encode('<p>HTML</p>'),
          size: 11,
        },
      ];

      const result = serializer.serializeMultipart(parts, boundary);
      const resultStr = new TextDecoder().decode(result);

      // Count boundary occurrences (2 part separators + 1 closing)
      const partBoundaryCount = (
        resultStr.match(new RegExp(`--${boundary}(?!-)`, 'g')) || []
      ).length;
      expect(partBoundaryCount).toBe(2);

      // Should have closing boundary
      expect(resultStr).toContain(`--${boundary}--`);

      // Should contain both bodies
      expect(resultStr).toContain('Plain text');
      expect(resultStr).toContain('<p>HTML</p>');
    });

    it('should include Content-Transfer-Encoding header when specified', () => {
      const boundary = '----=_Part_enc';
      const parts: IMimePart[] = [
        {
          contentType: createContentType('text', 'plain'),
          contentTransferEncoding: ContentTransferEncoding.QuotedPrintable,
          body: new TextEncoder().encode('Hello'),
          size: 5,
        },
      ];

      const result = serializer.serializeMultipart(parts, boundary);
      const resultStr = new TextDecoder().decode(result);

      expect(resultStr).toContain(
        'Content-Transfer-Encoding: quoted-printable',
      );
    });

    it('should include Content-Disposition header when specified', () => {
      const boundary = '----=_Part_disp';
      const parts: IMimePart[] = [
        {
          contentType: createContentType('application', 'pdf'),
          contentDisposition: { type: 'attachment', filename: 'document.pdf' },
          body: new Uint8Array([0x25, 0x50, 0x44, 0x46]),
          size: 4,
        },
      ];

      const result = serializer.serializeMultipart(parts, boundary);
      const resultStr = new TextDecoder().decode(result);

      expect(resultStr).toContain(
        'Content-Disposition: attachment; filename=document.pdf',
      );
    });

    it('should quote filenames with special characters in Content-Disposition', () => {
      const boundary = '----=_Part_quoted';
      const parts: IMimePart[] = [
        {
          contentType: createContentType('application', 'pdf'),
          contentDisposition: {
            type: 'attachment',
            filename: 'my document (1).pdf',
          },
          body: new Uint8Array([0x25, 0x50, 0x44, 0x46]),
          size: 4,
        },
      ];

      const result = serializer.serializeMultipart(parts, boundary);
      const resultStr = new TextDecoder().decode(result);

      expect(resultStr).toContain(
        'Content-Disposition: attachment; filename="my document (1).pdf"',
      );
    });

    it('should include Content-ID header when specified', () => {
      const boundary = '----=_Part_cid';
      const parts: IMimePart[] = [
        {
          contentType: createContentType('image', 'png'),
          contentId: '<image001@example.com>',
          body: new Uint8Array([0x89, 0x50, 0x4e, 0x47]),
          size: 4,
        },
      ];

      const result = serializer.serializeMultipart(parts, boundary);
      const resultStr = new TextDecoder().decode(result);

      expect(resultStr).toContain('Content-ID: <image001@example.com>');
    });

    it('should include Content-Description header when specified', () => {
      const boundary = '----=_Part_desc';
      const parts: IMimePart[] = [
        {
          contentType: createContentType('image', 'jpeg'),
          contentDescription: 'A photo of a sunset',
          body: new Uint8Array([0xff, 0xd8]),
          size: 2,
        },
      ];

      const result = serializer.serializeMultipart(parts, boundary);
      const resultStr = new TextDecoder().decode(result);

      expect(resultStr).toContain('Content-Description: A photo of a sunset');
    });

    it('should encode base64 parts correctly', () => {
      const boundary = '----=_Part_b64';
      const binaryData = new Uint8Array([0x00, 0x01, 0x02, 0xff]);
      const parts: IMimePart[] = [
        {
          contentType: createContentType('application', 'octet-stream'),
          contentTransferEncoding: ContentTransferEncoding.Base64,
          body: binaryData,
          size: binaryData.length,
        },
      ];

      const result = serializer.serializeMultipart(parts, boundary);
      const resultStr = new TextDecoder().decode(result);

      // Should contain base64 encoded data
      const expectedBase64 = Buffer.from(binaryData).toString('base64');
      expect(resultStr).toContain(expectedBase64);
    });

    it('should handle nested multipart structures recursively', () => {
      const outerBoundary = '----=_Part_outer';
      const innerBoundary = '----=_Part_inner';

      const parts: IMimePart[] = [
        {
          contentType: createContentType(
            'multipart',
            'alternative',
            new Map([['boundary', innerBoundary]]),
          ),
          parts: [
            {
              contentType: createContentType('text', 'plain'),
              body: new TextEncoder().encode('Plain text'),
              size: 10,
            },
            {
              contentType: createContentType('text', 'html'),
              body: new TextEncoder().encode('<p>HTML</p>'),
              size: 11,
            },
          ],
          size: 0,
        },
        {
          contentType: createContentType('application', 'pdf'),
          contentDisposition: { type: 'attachment', filename: 'doc.pdf' },
          body: new Uint8Array([0x25, 0x50, 0x44, 0x46]),
          size: 4,
        },
      ];

      const result = serializer.serializeMultipart(parts, outerBoundary);
      const resultStr = new TextDecoder().decode(result);

      // Should contain outer boundaries
      expect(resultStr).toContain(`--${outerBoundary}`);
      expect(resultStr).toContain(`--${outerBoundary}--`);

      // Should contain inner boundaries
      expect(resultStr).toContain(`--${innerBoundary}`);
      expect(resultStr).toContain(`--${innerBoundary}--`);

      // Should contain both text parts and the attachment
      expect(resultStr).toContain('Plain text');
      expect(resultStr).toContain('<p>HTML</p>');
    });

    it('should handle empty parts array', () => {
      const boundary = '----=_Part_empty';
      const result = serializer.serializeMultipart([], boundary);
      const resultStr = new TextDecoder().decode(result);

      // Should only have closing boundary
      expect(resultStr).toBe(`--${boundary}--\r\n`);
    });

    it('should handle parts with no body', () => {
      const boundary = '----=_Part_nobody';
      const parts: IMimePart[] = [
        {
          contentType: createContentType('text', 'plain'),
          size: 0,
        },
      ];

      const result = serializer.serializeMultipart(parts, boundary);
      const resultStr = new TextDecoder().decode(result);

      expect(resultStr).toContain(`--${boundary}\r\n`);
      expect(resultStr).toContain('Content-Type: text/plain');
      expect(resultStr).toContain(`--${boundary}--\r\n`);
    });

    it('should round-trip with EmailParser.parseMultipart for simple parts', () => {
      const parser = new EmailParser();
      const boundary = '----=_Part_roundtrip';

      const originalParts: IMimePart[] = [
        {
          contentType: createContentType(
            'text',
            'plain',
            new Map([['charset', 'utf-8']]),
          ),
          body: new TextEncoder().encode('Hello World'),
          size: 11,
        },
        {
          contentType: createContentType(
            'text',
            'html',
            new Map([['charset', 'utf-8']]),
          ),
          body: new TextEncoder().encode('<p>Hello World</p>'),
          size: 18,
        },
      ];

      const serialized = serializer.serializeMultipart(originalParts, boundary);
      const parsed = parser.parseMultipart(serialized, boundary);

      expect(parsed.length).toBe(2);

      // Check first part
      expect(parsed[0].contentType.type).toBe('text');
      expect(parsed[0].contentType.subtype).toBe('plain');
      expect(new TextDecoder().decode(parsed[0].body!)).toBe('Hello World');

      // Check second part
      expect(parsed[1].contentType.type).toBe('text');
      expect(parsed[1].contentType.subtype).toBe('html');
      expect(new TextDecoder().decode(parsed[1].body!)).toBe(
        '<p>Hello World</p>',
      );
    });

    it('should round-trip base64 encoded parts with EmailParser.parseMultipart', () => {
      const parser = new EmailParser();
      const boundary = '----=_Part_b64_rt';
      const binaryData = new Uint8Array([0x00, 0x01, 0x02, 0x80, 0xff]);

      const originalParts: IMimePart[] = [
        {
          contentType: createContentType('application', 'octet-stream'),
          contentTransferEncoding: ContentTransferEncoding.Base64,
          body: binaryData,
          size: binaryData.length,
        },
      ];

      const serialized = serializer.serializeMultipart(originalParts, boundary);
      const parsed = parser.parseMultipart(serialized, boundary);

      expect(parsed.length).toBe(1);
      expect(parsed[0].contentType.type).toBe('application');
      expect(parsed[0].contentType.subtype).toBe('octet-stream');
      expect(Array.from(parsed[0].body!)).toEqual(Array.from(binaryData));
    });
  });

  // ─── serializeBody ────────────────────────────────────────────────

  describe('serializeBody', () => {
    it('should serialize a single text part directly', () => {
      const textContent = new TextEncoder().encode('Hello World');
      const parts: IMimePart[] = [
        {
          contentType: createContentType('text', 'plain'),
          body: textContent,
          size: textContent.length,
        },
      ];
      const contentType = createContentType('text', 'plain');

      const result = serializer.serializeBody(parts, contentType);
      expect(new TextDecoder().decode(result)).toBe('Hello World');
    });

    it('should serialize a single base64-encoded part', () => {
      const binaryData = new Uint8Array([0x00, 0x01, 0x02]);
      const parts: IMimePart[] = [
        {
          contentType: createContentType('application', 'octet-stream'),
          contentTransferEncoding: ContentTransferEncoding.Base64,
          body: binaryData,
          size: binaryData.length,
        },
      ];
      const contentType = createContentType('application', 'octet-stream');

      const result = serializer.serializeBody(parts, contentType);
      const resultStr = new TextDecoder().decode(result);
      expect(resultStr).toBe(Buffer.from(binaryData).toString('base64'));
    });

    it('should use serializeMultipart for multipart content types', () => {
      const boundary = '----=_Part_body_test';
      const parts: IMimePart[] = [
        {
          contentType: createContentType('text', 'plain'),
          body: new TextEncoder().encode('Plain text'),
          size: 10,
        },
        {
          contentType: createContentType('text', 'html'),
          body: new TextEncoder().encode('<p>HTML</p>'),
          size: 11,
        },
      ];
      const contentType = createContentType(
        'multipart',
        'alternative',
        new Map([['boundary', boundary]]),
      );

      const result = serializer.serializeBody(parts, contentType);
      const resultStr = new TextDecoder().decode(result);

      expect(resultStr).toContain(`--${boundary}`);
      expect(resultStr).toContain(`--${boundary}--`);
      expect(resultStr).toContain('Plain text');
      expect(resultStr).toContain('<p>HTML</p>');
    });

    it('should generate a boundary if multipart content type has no boundary parameter', () => {
      const parts: IMimePart[] = [
        {
          contentType: createContentType('text', 'plain'),
          body: new TextEncoder().encode('Hello'),
          size: 5,
        },
      ];
      const contentType = createContentType('multipart', 'mixed');

      const result = serializer.serializeBody(parts, contentType);
      const resultStr = new TextDecoder().decode(result);

      // Should contain auto-generated boundary markers
      expect(resultStr).toContain('----=_Part_');
      expect(resultStr).toContain('Hello');
    });

    it('should return empty Uint8Array for empty parts with non-multipart content type', () => {
      const contentType = createContentType('text', 'plain');
      const result = serializer.serializeBody([], contentType);
      expect(result.length).toBe(0);
    });

    it('should handle multipart/mixed with attachment', () => {
      const boundary = '----=_Part_mixed';
      const parts: IMimePart[] = [
        {
          contentType: createContentType('text', 'plain'),
          body: new TextEncoder().encode('See attached file.'),
          size: 18,
        },
        {
          contentType: createContentType('application', 'pdf'),
          contentTransferEncoding: ContentTransferEncoding.Base64,
          contentDisposition: { type: 'attachment', filename: 'report.pdf' },
          body: new Uint8Array([0x25, 0x50, 0x44, 0x46]),
          size: 4,
        },
      ];
      const contentType = createContentType(
        'multipart',
        'mixed',
        new Map([['boundary', boundary]]),
      );

      const result = serializer.serializeBody(parts, contentType);
      const resultStr = new TextDecoder().decode(result);

      expect(resultStr).toContain('See attached file.');
      expect(resultStr).toContain(
        'Content-Disposition: attachment; filename=report.pdf',
      );
      expect(resultStr).toContain('Content-Transfer-Encoding: base64');
    });
  });

  // ─── serialize ────────────────────────────────────────────────────

  describe('serialize', () => {
    function createTestEmailMetadata(
      overrides?: Partial<IEmailMetadata>,
    ): IEmailMetadata {
      const now = new Date('2025-02-13T15:30:00Z');
      const from = createMailbox('sender', 'example.com', 'Sender');
      return {
        // IBlockMetadata fields
        blockId: '<test-id@example.com>',
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
        recipients: ['recipient@example.com'],
        priority: MessagePriority.NORMAL,
        deliveryStatus: new Map<string, DeliveryStatus>(),
        acknowledgments: new Map<string, Date>(),
        encryptionScheme: MessageEncryptionScheme.NONE,
        isCBL: false,

        // IEmailMetadata fields
        from,
        to: [createMailbox('recipient', 'example.com')],
        messageId: '<test-id@example.com>',
        date: now,
        mimeVersion: '1.0',
        contentType: createContentType(
          'text',
          'plain',
          new Map([['charset', 'utf-8']]),
        ),
        customHeaders: new Map(),
        deliveryReceipts: new Map(),
        readReceipts: new Map(),
        ...overrides,
      } as IEmailMetadata;
    }

    it('should return a Uint8Array', () => {
      const email = createTestEmailMetadata();
      const result = serializer.serialize(email);
      expect(result).toBeInstanceOf(Uint8Array);
    });

    it('should produce output with CRLF line endings (Requirement 14.1)', () => {
      const email = createTestEmailMetadata();
      const result = serializer.serialize(email);
      const resultStr = new TextDecoder().decode(result);

      // All line endings should be CRLF - no bare LF
      const withoutCRLF = resultStr.replace(/\r\n/g, '');
      expect(withoutCRLF).not.toContain('\n');
    });

    it('should contain header section separated from body by blank line (CRLF CRLF)', () => {
      const email = createTestEmailMetadata({
        parts: [
          {
            contentType: createContentType(
              'text',
              'plain',
              new Map([['charset', 'utf-8']]),
            ),
            body: new TextEncoder().encode('Hello World'),
            size: 11,
          },
        ],
      });
      const result = serializer.serialize(email);
      const resultStr = new TextDecoder().decode(result);

      // Should contain the blank line separator between headers and body
      expect(resultStr).toContain('\r\n\r\n');

      // Headers should come before the blank line
      const [headerPart, ...bodyParts] = resultStr.split('\r\n\r\n');
      expect(headerPart).toContain('From:');
      expect(headerPart).toContain('Date:');
      expect(headerPart).toContain('Message-ID:');

      // Body should come after the blank line
      const bodyPart = bodyParts.join('\r\n\r\n');
      expect(bodyPart).toContain('Hello World');
    });

    it('should include required headers in the output', () => {
      const email = createTestEmailMetadata();
      const result = serializer.serialize(email);
      const resultStr = new TextDecoder().decode(result);

      expect(resultStr).toContain('Date:');
      expect(resultStr).toContain('From:');
      expect(resultStr).toContain('Message-ID:');
      expect(resultStr).toContain('MIME-Version: 1.0');
      expect(resultStr).toContain('Content-Type: text/plain');
    });

    it('should serialize a simple text email without parts', () => {
      const email = createTestEmailMetadata();
      const result = serializer.serialize(email);
      const resultStr = new TextDecoder().decode(result);

      // Should have headers but no body content (no parts provided)
      expect(resultStr).toContain('From:');
      expect(resultStr).toContain('To: recipient@example.com');
      // Should end with the blank line separator since there's no body
      expect(resultStr).toMatch(/\r\n\r\n$/);
    });

    it('should serialize a single-part text email with body', () => {
      const email = createTestEmailMetadata({
        parts: [
          {
            contentType: createContentType(
              'text',
              'plain',
              new Map([['charset', 'utf-8']]),
            ),
            body: new TextEncoder().encode('This is the email body.'),
            size: 23,
          },
        ],
      });
      const result = serializer.serialize(email);
      const resultStr = new TextDecoder().decode(result);

      expect(resultStr).toContain('This is the email body.');
    });

    it('should serialize a multipart email with multiple parts', () => {
      const boundary = '----=_Part_test_serialize';
      const email = createTestEmailMetadata({
        contentType: createContentType(
          'multipart',
          'alternative',
          new Map([['boundary', boundary]]),
        ),
        parts: [
          {
            contentType: createContentType(
              'text',
              'plain',
              new Map([['charset', 'utf-8']]),
            ),
            body: new TextEncoder().encode('Plain text version'),
            size: 18,
          },
          {
            contentType: createContentType(
              'text',
              'html',
              new Map([['charset', 'utf-8']]),
            ),
            body: new TextEncoder().encode('<p>HTML version</p>'),
            size: 19,
          },
        ],
      });
      const result = serializer.serialize(email);
      const resultStr = new TextDecoder().decode(result);

      // Should contain both parts
      expect(resultStr).toContain('Plain text version');
      expect(resultStr).toContain('<p>HTML version</p>');

      // Should contain boundary delimiters
      expect(resultStr).toContain(`--${boundary}`);
      expect(resultStr).toContain(`--${boundary}--`);
    });

    it('should serialize a multipart/mixed email with attachment', () => {
      const boundary = '----=_Part_mixed_serialize';
      const binaryData = new Uint8Array([0x25, 0x50, 0x44, 0x46]);
      const email = createTestEmailMetadata({
        contentType: createContentType(
          'multipart',
          'mixed',
          new Map([['boundary', boundary]]),
        ),
        parts: [
          {
            contentType: createContentType('text', 'plain'),
            body: new TextEncoder().encode('See attached.'),
            size: 13,
          },
          {
            contentType: createContentType('application', 'pdf'),
            contentTransferEncoding: ContentTransferEncoding.Base64,
            contentDisposition: { type: 'attachment', filename: 'report.pdf' },
            body: binaryData,
            size: binaryData.length,
          },
        ],
      });
      const result = serializer.serialize(email);
      const resultStr = new TextDecoder().decode(result);

      expect(resultStr).toContain('See attached.');
      expect(resultStr).toContain(
        'Content-Disposition: attachment; filename=report.pdf',
      );
      expect(resultStr).toContain('Content-Transfer-Encoding: base64');
    });

    it('should round-trip with EmailParser.parse() for a simple text email', async () => {
      const parser = new EmailParser();
      const email = createTestEmailMetadata({
        subject: 'Test Round Trip',
        parts: [
          {
            contentType: createContentType(
              'text',
              'plain',
              new Map([['charset', 'utf-8']]),
            ),
            body: new TextEncoder().encode('Hello from round-trip test!'),
            size: 26,
          },
        ],
      });

      const serialized = serializer.serialize(email);
      const parsed = await parser.parse(serialized);

      // Verify key fields survive the round-trip
      expect(parsed.from.localPart).toBe('sender');
      expect(parsed.from.domain).toBe('example.com');
      expect(parsed.to.length).toBeGreaterThanOrEqual(1);
      expect(parsed.to[0].localPart).toBe('recipient');
      expect(parsed.to[0].domain).toBe('example.com');
      expect(parsed.subject).toBe('Test Round Trip');
      expect(parsed.messageId).toBe('<test-id@example.com>');
    });

    it('should round-trip with EmailParser.parse() for a multipart email', async () => {
      const parser = new EmailParser();
      const boundary = '----=_Part_roundtrip_full';
      const email = createTestEmailMetadata({
        subject: 'Multipart Round Trip',
        contentType: createContentType(
          'multipart',
          'alternative',
          new Map([['boundary', boundary]]),
        ),
        parts: [
          {
            contentType: createContentType(
              'text',
              'plain',
              new Map([['charset', 'utf-8']]),
            ),
            body: new TextEncoder().encode('Plain text content'),
            size: 18,
          },
          {
            contentType: createContentType(
              'text',
              'html',
              new Map([['charset', 'utf-8']]),
            ),
            body: new TextEncoder().encode('<p>HTML content</p>'),
            size: 19,
          },
        ],
      });

      const serialized = serializer.serialize(email);
      const parsed = await parser.parse(serialized);

      expect(parsed.subject).toBe('Multipart Round Trip');
      expect(parsed.from.localPart).toBe('sender');
      // The parser should have found the parts
      expect(parsed.parts).toBeDefined();
      if (parsed.parts) {
        expect(parsed.parts.length).toBe(2);
      }
    });

    it('should handle email with optional headers (Cc, Bcc, Subject, etc.)', () => {
      const email = createTestEmailMetadata({
        subject: 'Important Email',
        cc: [createMailbox('cc-user', 'example.com')],
        bcc: [createMailbox('bcc-user', 'example.com')],
        inReplyTo: '<parent@example.com>',
        references: ['<ref1@example.com>'],
        comments: ['A test comment'],
        keywords: ['test', 'serialize'],
      });
      const result = serializer.serialize(email);
      const resultStr = new TextDecoder().decode(result);

      expect(resultStr).toContain('Subject: Important Email');
      expect(resultStr).toContain('Cc: cc-user@example.com');
      expect(resultStr).toContain('Bcc: bcc-user@example.com');
      expect(resultStr).toContain('In-Reply-To: <parent@example.com>');
      expect(resultStr).toContain('References: <ref1@example.com>');
      expect(resultStr).toContain('Comments: A test comment');
      expect(resultStr).toContain('Keywords: test, serialize');
    });

    it('should handle email with custom headers', () => {
      const customHeaders = new Map<string, string[]>();
      customHeaders.set('X-Priority', ['1']);
      customHeaders.set('X-Mailer', ['BrightChain']);

      const email = createTestEmailMetadata({ customHeaders });
      const result = serializer.serialize(email);
      const resultStr = new TextDecoder().decode(result);

      expect(resultStr).toContain('X-Priority: 1');
      expect(resultStr).toContain('X-Mailer: BrightChain');
    });
  });
});
