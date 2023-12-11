import { EmailErrorType } from '../../enumerations/messaging/emailErrorType';
import { EmailError } from '../../errors/messaging/emailError';
import {
  IAddressGroup,
  IMailbox,
  isAddressGroup,
  isMailbox,
} from '../../interfaces/messaging/emailAddress';
import {
  ContentTransferEncoding,
  createContentType,
} from '../../interfaces/messaging/mimePart';
import { EmailParser } from './emailParser';

describe('EmailParser', () => {
  let parser: EmailParser;

  beforeEach(() => {
    parser = new EmailParser();
  });

  // ─── unfoldHeaders ──────────────────────────────────────────────────

  describe('unfoldHeaders', () => {
    it('should return the same string when no folding is present', () => {
      const input = 'Subject: Hello World';
      expect(parser.unfoldHeaders(input)).toBe(input);
    });

    it('should unfold CRLF followed by space', () => {
      const input = 'Subject: This is\r\n a long subject';
      expect(parser.unfoldHeaders(input)).toBe(
        'Subject: This is a long subject',
      );
    });

    it('should unfold CRLF followed by tab', () => {
      const input = 'Subject: This is\r\n\ta long subject';
      expect(parser.unfoldHeaders(input)).toBe(
        'Subject: This is\ta long subject',
      );
    });

    it('should unfold LF followed by space (robustness)', () => {
      const input = 'Subject: This is\n a long subject';
      expect(parser.unfoldHeaders(input)).toBe(
        'Subject: This is a long subject',
      );
    });

    it('should unfold LF followed by tab (robustness)', () => {
      const input = 'Subject: This is\n\ta long subject';
      expect(parser.unfoldHeaders(input)).toBe(
        'Subject: This is\ta long subject',
      );
    });

    it('should handle multiple folded lines', () => {
      const input = 'Subject: This is\r\n a very\r\n long\r\n subject line';
      expect(parser.unfoldHeaders(input)).toBe(
        'Subject: This is a very long subject line',
      );
    });

    it('should not unfold CRLF not followed by whitespace', () => {
      const input = 'From: alice@example.com\r\nTo: bob@example.com';
      expect(parser.unfoldHeaders(input)).toBe(
        'From: alice@example.com\r\nTo: bob@example.com',
      );
    });

    it('should handle empty string', () => {
      expect(parser.unfoldHeaders('')).toBe('');
    });
  });

  // ─── parseHeaders ──────────────────────────────────────────────────

  describe('parseHeaders', () => {
    it('should parse basic headers', () => {
      const input = 'From: alice@example.com\r\nTo: bob@example.com';
      const headers = parser.parseHeaders(input);

      expect(headers.get('from')).toEqual(['alice@example.com']);
      expect(headers.get('to')).toEqual(['bob@example.com']);
    });

    it('should handle multi-value headers', () => {
      const input =
        'Received: from server1\r\nReceived: from server2\r\nSubject: Test';
      const headers = parser.parseHeaders(input);

      expect(headers.get('received')).toEqual(['from server1', 'from server2']);
      expect(headers.get('subject')).toEqual(['Test']);
    });

    it('should handle folded headers', () => {
      const input =
        'Subject: This is\r\n a long subject\r\nFrom: alice@example.com';
      const headers = parser.parseHeaders(input);

      expect(headers.get('subject')).toEqual(['This is a long subject']);
      expect(headers.get('from')).toEqual(['alice@example.com']);
    });

    it('should return empty map for empty input', () => {
      expect(parser.parseHeaders('').size).toBe(0);
      expect(parser.parseHeaders('  ').size).toBe(0);
    });

    it('should handle LF line endings', () => {
      const input = 'From: alice@example.com\nTo: bob@example.com';
      const headers = parser.parseHeaders(input);

      expect(headers.get('from')).toEqual(['alice@example.com']);
      expect(headers.get('to')).toEqual(['bob@example.com']);
    });

    it('should lowercase header names', () => {
      const input = 'Content-Type: text/plain\r\nX-Custom-Header: value';
      const headers = parser.parseHeaders(input);

      expect(headers.get('content-type')).toEqual(['text/plain']);
      expect(headers.get('x-custom-header')).toEqual(['value']);
    });

    it('should handle header values with colons', () => {
      const input = 'Subject: Re: Hello: World';
      const headers = parser.parseHeaders(input);

      expect(headers.get('subject')).toEqual(['Re: Hello: World']);
    });
  });

  // ─── parseMailbox ──────────────────────────────────────────────────

  describe('parseMailbox', () => {
    it('should parse a simple address', () => {
      const mailbox = parser.parseMailbox('user@example.com');
      expect(mailbox.localPart).toBe('user');
      expect(mailbox.domain).toBe('example.com');
      expect(mailbox.address).toBe('user@example.com');
      expect(mailbox.displayName).toBeUndefined();
    });

    it('should parse an address with display name', () => {
      const mailbox = parser.parseMailbox('John Doe <john@example.com>');
      expect(mailbox.localPart).toBe('john');
      expect(mailbox.domain).toBe('example.com');
      expect(mailbox.address).toBe('john@example.com');
      expect(mailbox.displayName).toBe('John Doe');
    });

    it('should parse an address with quoted display name', () => {
      const mailbox = parser.parseMailbox('"John Doe" <john@example.com>');
      expect(mailbox.localPart).toBe('john');
      expect(mailbox.domain).toBe('example.com');
      expect(mailbox.displayName).toBe('John Doe');
    });

    it('should parse an address with quoted local-part', () => {
      // The email-addresses library returns the semantic local-part without quotes
      const mailbox = parser.parseMailbox('"user.name"@example.com');
      expect(mailbox.localPart).toBe('user.name');
      expect(mailbox.domain).toBe('example.com');
    });

    it('should throw EmailError for empty string', () => {
      expect(() => parser.parseMailbox('')).toThrow(EmailError);
      try {
        parser.parseMailbox('');
      } catch (e) {
        expect((e as EmailError).errorType).toBe(
          EmailErrorType.INVALID_MAILBOX,
        );
      }
    });

    it('should throw EmailError for invalid address', () => {
      expect(() => parser.parseMailbox('not-an-email')).toThrow(EmailError);
      try {
        parser.parseMailbox('not-an-email');
      } catch (e) {
        expect((e as EmailError).errorType).toBe(
          EmailErrorType.INVALID_MAILBOX,
        );
      }
    });

    it('should throw EmailError for group address', () => {
      expect(() => parser.parseMailbox('Team: alice@example.com;')).toThrow(
        EmailError,
      );
    });
  });

  // ─── parseAddressList ──────────────────────────────────────────────

  describe('parseAddressList', () => {
    it('should parse multiple addresses', () => {
      const addresses = parser.parseAddressList(
        'alice@example.com, Bob <bob@example.com>',
      );
      expect(addresses).toHaveLength(2);

      const first = addresses[0] as IMailbox;
      expect(isMailbox(first)).toBe(true);
      expect(first.localPart).toBe('alice');
      expect(first.domain).toBe('example.com');

      const second = addresses[1] as IMailbox;
      expect(isMailbox(second)).toBe(true);
      expect(second.localPart).toBe('bob');
      expect(second.domain).toBe('example.com');
      expect(second.displayName).toBe('Bob');
    });

    it('should parse group addresses', () => {
      const addresses = parser.parseAddressList(
        'Team: alice@example.com, bob@example.com;',
      );
      expect(addresses).toHaveLength(1);

      const group = addresses[0] as IAddressGroup;
      expect(isAddressGroup(group)).toBe(true);
      expect(group.displayName).toBe('Team');
      expect(group.mailboxes).toHaveLength(2);
      expect(group.mailboxes[0].localPart).toBe('alice');
      expect(group.mailboxes[1].localPart).toBe('bob');
    });

    it('should parse empty group addresses', () => {
      const addresses = parser.parseAddressList('Undisclosed Recipients:;');
      expect(addresses).toHaveLength(1);

      const group = addresses[0] as IAddressGroup;
      expect(isAddressGroup(group)).toBe(true);
      expect(group.displayName).toBe('Undisclosed Recipients');
      expect(group.mailboxes).toHaveLength(0);
    });

    it('should parse mixed mailboxes and groups', () => {
      const addresses = parser.parseAddressList(
        'alice@example.com, Team: bob@example.com;',
      );
      expect(addresses).toHaveLength(2);
      expect(isMailbox(addresses[0])).toBe(true);
      expect(isAddressGroup(addresses[1])).toBe(true);
    });

    it('should throw EmailError for empty string', () => {
      expect(() => parser.parseAddressList('')).toThrow(EmailError);
    });

    it('should throw EmailError for invalid address list', () => {
      expect(() => parser.parseAddressList('not valid at all')).toThrow(
        EmailError,
      );
    });
  });

  // ─── parseMessageId ────────────────────────────────────────────────

  describe('parseMessageId', () => {
    it('should parse a valid Message-ID', () => {
      expect(parser.parseMessageId('<unique-id@example.com>')).toBe(
        '<unique-id@example.com>',
      );
    });

    it('should parse a Message-ID with complex id-left', () => {
      expect(parser.parseMessageId('<abc123.456.789@mail.example.com>')).toBe(
        '<abc123.456.789@mail.example.com>',
      );
    });

    it('should trim whitespace', () => {
      expect(parser.parseMessageId('  <id@domain>  ')).toBe('<id@domain>');
    });

    it('should throw for missing angle brackets', () => {
      expect(() => parser.parseMessageId('id@domain')).toThrow(EmailError);
      try {
        parser.parseMessageId('id@domain');
      } catch (e) {
        expect((e as EmailError).errorType).toBe(
          EmailErrorType.INVALID_MESSAGE_ID,
        );
      }
    });

    it('should throw for missing opening bracket', () => {
      expect(() => parser.parseMessageId('id@domain>')).toThrow(EmailError);
    });

    it('should throw for missing closing bracket', () => {
      expect(() => parser.parseMessageId('<id@domain')).toThrow(EmailError);
    });

    it('should throw for no @ character', () => {
      expect(() => parser.parseMessageId('<id-no-at>')).toThrow(EmailError);
      try {
        parser.parseMessageId('<id-no-at>');
      } catch (e) {
        expect((e as EmailError).errorType).toBe(
          EmailErrorType.INVALID_MESSAGE_ID,
        );
        expect((e as EmailError).details?.['atCount']).toBe(0);
      }
    });

    it('should throw for multiple @ characters', () => {
      expect(() => parser.parseMessageId('<id@domain@extra>')).toThrow(
        EmailError,
      );
      try {
        parser.parseMessageId('<id@domain@extra>');
      } catch (e) {
        expect((e as EmailError).errorType).toBe(
          EmailErrorType.INVALID_MESSAGE_ID,
        );
        expect((e as EmailError).details?.['atCount']).toBe(2);
      }
    });

    it('should throw for empty string', () => {
      expect(() => parser.parseMessageId('')).toThrow(EmailError);
    });
  });

  // ─── parseMessageIdList ────────────────────────────────────────────

  describe('parseMessageIdList', () => {
    it('should extract a single Message-ID', () => {
      const ids = parser.parseMessageIdList('<id1@example.com>');
      expect(ids).toEqual(['<id1@example.com>']);
    });

    it('should extract multiple Message-IDs separated by whitespace', () => {
      const ids = parser.parseMessageIdList(
        '<id1@example.com> <id2@example.com> <id3@example.com>',
      );
      expect(ids).toEqual([
        '<id1@example.com>',
        '<id2@example.com>',
        '<id3@example.com>',
      ]);
    });

    it('should return empty array for empty string', () => {
      expect(parser.parseMessageIdList('')).toEqual([]);
    });

    it('should return empty array for string with no Message-IDs', () => {
      expect(parser.parseMessageIdList('no ids here')).toEqual([]);
    });

    it('should handle extra whitespace between Message-IDs', () => {
      const ids = parser.parseMessageIdList(
        '  <id1@example.com>   <id2@example.com>  ',
      );
      expect(ids).toEqual(['<id1@example.com>', '<id2@example.com>']);
    });
  });

  // ─── parseDate ─────────────────────────────────────────────────────

  describe('parseDate', () => {
    it('should parse a full RFC 5322 date', () => {
      const date = parser.parseDate('Thu, 13 Feb 2025 15:30:00 +0000');
      expect(date).toBeInstanceOf(Date);
      expect(date.getUTCFullYear()).toBe(2025);
      expect(date.getUTCMonth()).toBe(1); // February = 1
      expect(date.getUTCDate()).toBe(13);
      expect(date.getUTCHours()).toBe(15);
      expect(date.getUTCMinutes()).toBe(30);
    });

    it('should parse a date without day-of-week', () => {
      const date = parser.parseDate('13 Feb 2025 15:30:00 +0000');
      expect(date).toBeInstanceOf(Date);
      expect(date.getUTCFullYear()).toBe(2025);
    });

    it('should parse an ISO 8601 date', () => {
      const date = parser.parseDate('2025-02-13T15:30:00Z');
      expect(date).toBeInstanceOf(Date);
      expect(date.getUTCFullYear()).toBe(2025);
    });

    it('should throw EmailError for empty string', () => {
      expect(() => parser.parseDate('')).toThrow(EmailError);
      try {
        parser.parseDate('');
      } catch (e) {
        expect((e as EmailError).errorType).toBe(EmailErrorType.INVALID_DATE);
      }
    });

    it('should throw EmailError for invalid date', () => {
      expect(() => parser.parseDate('not a date')).toThrow(EmailError);
      try {
        parser.parseDate('not a date');
      } catch (e) {
        expect((e as EmailError).errorType).toBe(EmailErrorType.INVALID_DATE);
      }
    });
  });

  // ─── parseContentType ──────────────────────────────────────────────

  describe('parseContentType', () => {
    it('should parse a simple content type', () => {
      const ct = parser.parseContentType('text/plain');
      expect(ct.type).toBe('text');
      expect(ct.subtype).toBe('plain');
      expect(ct.mediaType).toBe('text/plain');
      expect(ct.parameters.size).toBe(0);
    });

    it('should parse content type with charset parameter', () => {
      const ct = parser.parseContentType('text/plain; charset=utf-8');
      expect(ct.type).toBe('text');
      expect(ct.subtype).toBe('plain');
      expect(ct.parameters.get('charset')).toBe('utf-8');
    });

    it('should parse content type with quoted parameter value', () => {
      const ct = parser.parseContentType(
        'multipart/mixed; boundary="----=_Part_123"',
      );
      expect(ct.type).toBe('multipart');
      expect(ct.subtype).toBe('mixed');
      expect(ct.parameters.get('boundary')).toBe('----=_Part_123');
    });

    it('should parse content type with multiple parameters', () => {
      const ct = parser.parseContentType(
        'text/plain; charset=utf-8; name="file.txt"',
      );
      expect(ct.type).toBe('text');
      expect(ct.subtype).toBe('plain');
      expect(ct.parameters.get('charset')).toBe('utf-8');
      expect(ct.parameters.get('name')).toBe('file.txt');
    });

    it('should lowercase type and subtype', () => {
      const ct = parser.parseContentType('Text/HTML');
      expect(ct.type).toBe('text');
      expect(ct.subtype).toBe('html');
    });

    it('should throw EmailError for empty string', () => {
      expect(() => parser.parseContentType('')).toThrow(EmailError);
      try {
        parser.parseContentType('');
      } catch (e) {
        expect((e as EmailError).errorType).toBe(
          EmailErrorType.INVALID_CONTENT_TYPE,
        );
      }
    });

    it('should throw EmailError for missing subtype', () => {
      expect(() => parser.parseContentType('text')).toThrow(EmailError);
    });

    it('should handle quoted parameter values with escaped characters', () => {
      const ct = parser.parseContentType('text/plain; name="file\\"name.txt"');
      expect(ct.parameters.get('name')).toBe('file"name.txt');
    });

    it('should parse custom/arbitrary parameters (Req 5.2)', () => {
      const ct = parser.parseContentType(
        'application/octet-stream; x-custom=myvalue; x-another=123',
      );
      expect(ct.type).toBe('application');
      expect(ct.subtype).toBe('octet-stream');
      expect(ct.parameters.get('x-custom')).toBe('myvalue');
      expect(ct.parameters.get('x-another')).toBe('123');
    });

    it('should handle quoted values containing semicolons (Req 5.3)', () => {
      const ct = parser.parseContentType('text/plain; name="file;name.txt"');
      expect(ct.parameters.get('name')).toBe('file;name.txt');
    });

    it('should handle quoted values containing spaces (Req 5.3)', () => {
      const ct = parser.parseContentType('text/plain; name="my file name.txt"');
      expect(ct.parameters.get('name')).toBe('my file name.txt');
    });

    it('should handle quoted values containing equals sign (Req 5.3)', () => {
      const ct = parser.parseContentType('text/plain; name="file=name.txt"');
      expect(ct.parameters.get('name')).toBe('file=name.txt');
    });

    it('should handle quoted values containing parentheses (Req 5.3)', () => {
      const ct = parser.parseContentType('text/plain; name="file (copy).txt"');
      expect(ct.parameters.get('name')).toBe('file (copy).txt');
    });

    it('should handle quoted boundary with special chars (Req 5.2, 5.3)', () => {
      const ct = parser.parseContentType(
        'multipart/alternative; boundary="=_NextPart_000_001A_01C6.ABCD"',
      );
      expect(ct.type).toBe('multipart');
      expect(ct.subtype).toBe('alternative');
      expect(ct.parameters.get('boundary')).toBe(
        '=_NextPart_000_001A_01C6.ABCD',
      );
    });

    it('should handle all standard parameters together (Req 5.1, 5.2)', () => {
      const ct = parser.parseContentType(
        'text/plain; charset=iso-8859-1; name="report.txt"; format=flowed',
      );
      expect(ct.type).toBe('text');
      expect(ct.subtype).toBe('plain');
      expect(ct.parameters.get('charset')).toBe('iso-8859-1');
      expect(ct.parameters.get('name')).toBe('report.txt');
      expect(ct.parameters.get('format')).toBe('flowed');
    });

    it('should handle quoted value with escaped backslash (Req 5.3)', () => {
      const ct = parser.parseContentType('text/plain; name="path\\\\file.txt"');
      expect(ct.parameters.get('name')).toBe('path\\file.txt');
    });
  });

  // ─── decodeEncodedWord ─────────────────────────────────────────────

  describe('decodeEncodedWord', () => {
    it('should decode B (base64) encoded-word', () => {
      // "Hello World" in base64
      const result = parser.decodeEncodedWord('=?UTF-8?B?SGVsbG8gV29ybGQ=?=');
      expect(result).toBe('Hello World');
    });

    it('should decode Q (quoted-printable) encoded-word', () => {
      // In Q encoding, underscores represent spaces
      const result = parser.decodeEncodedWord('=?UTF-8?Q?Hello_World?=');
      expect(result).toBe('Hello World');
    });

    it('should decode Q encoding with hex sequences', () => {
      // =C3=A9 is UTF-8 for 'é'
      const result = parser.decodeEncodedWord('=?UTF-8?Q?caf=C3=A9?=');
      expect(result).toBe('café');
    });

    it('should return non-encoded-word as-is', () => {
      expect(parser.decodeEncodedWord('plain text')).toBe('plain text');
    });

    it('should return empty string as-is', () => {
      expect(parser.decodeEncodedWord('')).toBe('');
    });

    it('should handle lowercase encoding indicator', () => {
      const result = parser.decodeEncodedWord('=?utf-8?b?SGVsbG8=?=');
      expect(result).toBe('Hello');
    });

    it('should handle ISO-8859-1 charset with B encoding', () => {
      // 0xE9 is 'é' in ISO-8859-1, base64 of byte 0xE9 is '6Q=='
      const result = parser.decodeEncodedWord('=?ISO-8859-1?B?6Q==?=');
      expect(result).toBe('é');
    });

    it('should handle multiple encoded-words in a string', () => {
      const result = parser.decodeEncodedWord(
        '=?UTF-8?B?SGVsbG8=?= =?UTF-8?B?V29ybGQ=?=',
      );
      expect(result).toBe('Hello World');
    });

    it('should handle UTF-8 encoded emoji via B encoding', () => {
      // '🚀' in UTF-8 is [0xF0, 0x9F, 0x9A, 0x80], base64 is '8J+agA=='
      const result = parser.decodeEncodedWord('=?UTF-8?B?8J+agA==?=');
      expect(result).toBe('🚀');
    });
  });

  // ─── decodeQuotedPrintable ─────────────────────────────────────────

  describe('decodeQuotedPrintable', () => {
    it('should decode basic =XX hex sequences', () => {
      const input = new TextEncoder().encode('Hello=20World');
      const result = parser.decodeQuotedPrintable(input);
      expect(Buffer.from(result).toString('utf-8')).toBe('Hello World');
    });

    it('should handle soft line breaks with CRLF', () => {
      const input = new TextEncoder().encode('Hello=\r\nWorld');
      const result = parser.decodeQuotedPrintable(input);
      expect(Buffer.from(result).toString('utf-8')).toBe('HelloWorld');
    });

    it('should handle soft line breaks with LF only', () => {
      const input = new TextEncoder().encode('Hello=\nWorld');
      const result = parser.decodeQuotedPrintable(input);
      expect(Buffer.from(result).toString('utf-8')).toBe('HelloWorld');
    });

    it('should pass through normal text unchanged', () => {
      const input = new TextEncoder().encode('Hello World');
      const result = parser.decodeQuotedPrintable(input);
      expect(Buffer.from(result).toString('utf-8')).toBe('Hello World');
    });

    it('should decode multiple hex sequences', () => {
      const input = new TextEncoder().encode('=48=65=6C=6C=6F');
      const result = parser.decodeQuotedPrintable(input);
      expect(Buffer.from(result).toString('utf-8')).toBe('Hello');
    });

    it('should handle mixed content with hex and plain text', () => {
      const input = new TextEncoder().encode('caf=C3=A9');
      const result = parser.decodeQuotedPrintable(input);
      expect(Buffer.from(result).toString('utf-8')).toBe('café');
    });

    it('should handle empty input', () => {
      const input = new Uint8Array(0);
      const result = parser.decodeQuotedPrintable(input);
      expect(result.length).toBe(0);
    });
  });

  // ─── decodeBase64 ──────────────────────────────────────────────────

  describe('decodeBase64', () => {
    it('should decode basic base64 data', () => {
      const input = new TextEncoder().encode('SGVsbG8gV29ybGQ=');
      const result = parser.decodeBase64(input);
      expect(Buffer.from(result).toString('utf-8')).toBe('Hello World');
    });

    it('should handle whitespace in base64 input', () => {
      // Base64 with line breaks (common in email)
      const input = new TextEncoder().encode('SGVs\r\nbG8g\r\nV29y\r\nbGQ=');
      const result = parser.decodeBase64(input);
      expect(Buffer.from(result).toString('utf-8')).toBe('Hello World');
    });

    it('should handle spaces and tabs in base64 input', () => {
      const input = new TextEncoder().encode('SGVsbG8g V29ybGQ=');
      const result = parser.decodeBase64(input);
      expect(Buffer.from(result).toString('utf-8')).toBe('Hello World');
    });

    it('should decode binary data correctly', () => {
      // Base64 for bytes [0x00, 0x01, 0x02, 0xFF]
      const input = new TextEncoder().encode('AAEC/w==');
      const result = parser.decodeBase64(input);
      expect(result).toEqual(new Uint8Array([0x00, 0x01, 0x02, 0xff]));
    });

    it('should handle empty input', () => {
      const input = new Uint8Array(0);
      const result = parser.decodeBase64(input);
      expect(result.length).toBe(0);
    });
  });

  // ─── parseBody ─────────────────────────────────────────────────────

  describe('parseBody', () => {
    const textPlain = createContentType('text', 'plain');

    it('should return body as-is for 7bit encoding', () => {
      const body = new TextEncoder().encode('Hello World');
      const result = parser.parseBody(
        body,
        textPlain,
        ContentTransferEncoding.SevenBit,
      );
      expect(result).toEqual(body);
    });

    it('should return body as-is for 8bit encoding', () => {
      const body = new TextEncoder().encode('Hello World');
      const result = parser.parseBody(
        body,
        textPlain,
        ContentTransferEncoding.EightBit,
      );
      expect(result).toEqual(body);
    });

    it('should return body as-is for binary encoding', () => {
      const body = new Uint8Array([0x00, 0x01, 0xff]);
      const result = parser.parseBody(
        body,
        textPlain,
        ContentTransferEncoding.Binary,
      );
      expect(result).toEqual(body);
    });

    it('should decode quoted-printable encoding', () => {
      const body = new TextEncoder().encode('Hello=20World');
      const result = parser.parseBody(
        body,
        textPlain,
        ContentTransferEncoding.QuotedPrintable,
      );
      expect(Buffer.from(result).toString('utf-8')).toBe('Hello World');
    });

    it('should decode base64 encoding', () => {
      const body = new TextEncoder().encode('SGVsbG8gV29ybGQ=');
      const result = parser.parseBody(
        body,
        textPlain,
        ContentTransferEncoding.Base64,
      );
      expect(Buffer.from(result).toString('utf-8')).toBe('Hello World');
    });
  });

  // ─── parseMultipart ────────────────────────────────────────────────

  describe('parseMultipart', () => {
    it('should parse a simple multipart body with two text parts', () => {
      const boundary = 'simple-boundary';
      const body = new TextEncoder().encode(
        [
          `--${boundary}\r\n`,
          'Content-Type: text/plain\r\n',
          '\r\n',
          'Hello, World!\r\n',
          `--${boundary}\r\n`,
          'Content-Type: text/html\r\n',
          '\r\n',
          '<p>Hello, World!</p>\r\n',
          `--${boundary}--`,
        ].join(''),
      );

      const parts = parser.parseMultipart(body, boundary);

      expect(parts).toHaveLength(2);

      // First part: text/plain
      expect(parts[0].contentType.type).toBe('text');
      expect(parts[0].contentType.subtype).toBe('plain');
      expect(Buffer.from(parts[0].body!).toString('utf-8')).toBe(
        'Hello, World!',
      );
      expect(parts[0].size).toBeGreaterThan(0);

      // Second part: text/html
      expect(parts[1].contentType.type).toBe('text');
      expect(parts[1].contentType.subtype).toBe('html');
      expect(Buffer.from(parts[1].body!).toString('utf-8')).toBe(
        '<p>Hello, World!</p>',
      );
    });

    it('should handle preamble text before the first boundary (Req 6.8)', () => {
      const boundary = 'preamble-boundary';
      const body = new TextEncoder().encode(
        [
          'This is the preamble. It should be ignored.\r\n',
          `--${boundary}\r\n`,
          'Content-Type: text/plain\r\n',
          '\r\n',
          'Part content\r\n',
          `--${boundary}--`,
        ].join(''),
      );

      const parts = parser.parseMultipart(body, boundary);

      expect(parts).toHaveLength(1);
      expect(parts[0].contentType.type).toBe('text');
      expect(parts[0].contentType.subtype).toBe('plain');
      expect(Buffer.from(parts[0].body!).toString('utf-8')).toBe(
        'Part content',
      );
    });

    it('should handle epilogue text after the final boundary (Req 6.8)', () => {
      const boundary = 'epilogue-boundary';
      const body = new TextEncoder().encode(
        [
          `--${boundary}\r\n`,
          'Content-Type: text/plain\r\n',
          '\r\n',
          'Part content\r\n',
          `--${boundary}--\r\n`,
          'This is the epilogue. It should be ignored.',
        ].join(''),
      );

      const parts = parser.parseMultipart(body, boundary);

      expect(parts).toHaveLength(1);
      expect(Buffer.from(parts[0].body!).toString('utf-8')).toBe(
        'Part content',
      );
    });

    it('should handle both preamble and epilogue (Req 6.8)', () => {
      const boundary = 'both-boundary';
      const body = new TextEncoder().encode(
        [
          'Preamble text here\r\n',
          `--${boundary}\r\n`,
          'Content-Type: text/plain\r\n',
          '\r\n',
          'Content here\r\n',
          `--${boundary}--\r\n`,
          'Epilogue text here',
        ].join(''),
      );

      const parts = parser.parseMultipart(body, boundary);

      expect(parts).toHaveLength(1);
      expect(Buffer.from(parts[0].body!).toString('utf-8')).toBe(
        'Content here',
      );
    });

    it('should parse nested multipart structures (Req 6.7)', () => {
      const outerBoundary = 'outer-boundary';
      const innerBoundary = 'inner-boundary';
      const body = new TextEncoder().encode(
        [
          `--${outerBoundary}\r\n`,
          `Content-Type: multipart/alternative; boundary="${innerBoundary}"\r\n`,
          '\r\n',
          `--${innerBoundary}\r\n`,
          'Content-Type: text/plain\r\n',
          '\r\n',
          'Plain text version\r\n',
          `--${innerBoundary}\r\n`,
          'Content-Type: text/html\r\n',
          '\r\n',
          '<p>HTML version</p>\r\n',
          `--${innerBoundary}--\r\n`,
          `--${outerBoundary}\r\n`,
          'Content-Type: application/pdf\r\n',
          'Content-Disposition: attachment; filename="doc.pdf"\r\n',
          '\r\n',
          'PDF content here\r\n',
          `--${outerBoundary}--`,
        ].join(''),
      );

      const parts = parser.parseMultipart(body, outerBoundary);

      expect(parts).toHaveLength(2);

      // First part: nested multipart/alternative
      expect(parts[0].contentType.type).toBe('multipart');
      expect(parts[0].contentType.subtype).toBe('alternative');
      expect(parts[0].parts).toBeDefined();
      expect(parts[0].parts!).toHaveLength(2);
      expect(parts[0].parts![0].contentType.subtype).toBe('plain');
      expect(Buffer.from(parts[0].parts![0].body!).toString('utf-8')).toBe(
        'Plain text version',
      );
      expect(parts[0].parts![1].contentType.subtype).toBe('html');
      expect(Buffer.from(parts[0].parts![1].body!).toString('utf-8')).toBe(
        '<p>HTML version</p>',
      );

      // Second part: attachment
      expect(parts[1].contentType.type).toBe('application');
      expect(parts[1].contentType.subtype).toBe('pdf');
      expect(parts[1].contentDisposition).toBeDefined();
      expect(parts[1].contentDisposition!.type).toBe('attachment');
      expect(parts[1].contentDisposition!.filename).toBe('doc.pdf');
    });

    it('should default to text/plain; charset=us-ascii when Content-Type is missing (Req 6.10)', () => {
      const boundary = 'default-ct-boundary';
      const body = new TextEncoder().encode(
        [
          `--${boundary}\r\n`,
          '\r\n',
          'No content type specified\r\n',
          `--${boundary}--`,
        ].join(''),
      );

      const parts = parser.parseMultipart(body, boundary);

      expect(parts).toHaveLength(1);
      expect(parts[0].contentType.type).toBe('text');
      expect(parts[0].contentType.subtype).toBe('plain');
      expect(parts[0].contentType.parameters.get('charset')).toBe('us-ascii');
    });

    it('should parse Content-Transfer-Encoding for parts', () => {
      const boundary = 'cte-boundary';
      const body = new TextEncoder().encode(
        [
          `--${boundary}\r\n`,
          'Content-Type: text/plain\r\n',
          'Content-Transfer-Encoding: base64\r\n',
          '\r\n',
          'SGVsbG8gV29ybGQ=\r\n',
          `--${boundary}--`,
        ].join(''),
      );

      const parts = parser.parseMultipart(body, boundary);

      expect(parts).toHaveLength(1);
      expect(parts[0].contentTransferEncoding).toBe(
        ContentTransferEncoding.Base64,
      );
      // Body should be decoded from base64
      expect(Buffer.from(parts[0].body!).toString('utf-8')).toBe('Hello World');
    });

    it('should parse Content-ID for inline parts', () => {
      const boundary = 'cid-boundary';
      const body = new TextEncoder().encode(
        [
          `--${boundary}\r\n`,
          'Content-Type: image/png\r\n',
          'Content-ID: <image001@example.com>\r\n',
          'Content-Disposition: inline\r\n',
          '\r\n',
          'PNG data here\r\n',
          `--${boundary}--`,
        ].join(''),
      );

      const parts = parser.parseMultipart(body, boundary);

      expect(parts).toHaveLength(1);
      expect(parts[0].contentId).toBe('<image001@example.com>');
      expect(parts[0].contentDisposition).toBeDefined();
      expect(parts[0].contentDisposition!.type).toBe('inline');
    });

    it('should parse Content-Description', () => {
      const boundary = 'desc-boundary';
      const body = new TextEncoder().encode(
        [
          `--${boundary}\r\n`,
          'Content-Type: text/plain\r\n',
          'Content-Description: A test document\r\n',
          '\r\n',
          'Document content\r\n',
          `--${boundary}--`,
        ].join(''),
      );

      const parts = parser.parseMultipart(body, boundary);

      expect(parts).toHaveLength(1);
      expect(parts[0].contentDescription).toBe('A test document');
    });

    it('should return empty array when no boundary is found in body', () => {
      const boundary = 'missing-boundary';
      const body = new TextEncoder().encode(
        'Just some text with no boundaries',
      );

      const parts = parser.parseMultipart(body, boundary);

      expect(parts).toHaveLength(0);
    });

    it('should throw EmailError when boundary is empty', () => {
      const body = new TextEncoder().encode('some content');

      expect(() => parser.parseMultipart(body, '')).toThrow(EmailError);
      try {
        parser.parseMultipart(body, '');
      } catch (e) {
        expect((e as EmailError).errorType).toBe(EmailErrorType.MALFORMED_MIME);
      }
    });

    it('should handle LF-only line endings', () => {
      const boundary = 'lf-boundary';
      const body = new TextEncoder().encode(
        [
          `--${boundary}\n`,
          'Content-Type: text/plain\n',
          '\n',
          'LF only content\n',
          `--${boundary}--`,
        ].join(''),
      );

      const parts = parser.parseMultipart(body, boundary);

      expect(parts).toHaveLength(1);
      expect(Buffer.from(parts[0].body!).toString('utf-8')).toBe(
        'LF only content',
      );
    });

    it('should handle multiple parts with various content types', () => {
      const boundary = 'multi-ct-boundary';
      const body = new TextEncoder().encode(
        [
          `--${boundary}\r\n`,
          'Content-Type: text/plain; charset=utf-8\r\n',
          '\r\n',
          'Plain text\r\n',
          `--${boundary}\r\n`,
          'Content-Type: text/html; charset=utf-8\r\n',
          '\r\n',
          '<b>Bold</b>\r\n',
          `--${boundary}\r\n`,
          'Content-Type: application/octet-stream\r\n',
          'Content-Disposition: attachment; filename="data.bin"\r\n',
          '\r\n',
          'binary data\r\n',
          `--${boundary}--`,
        ].join(''),
      );

      const parts = parser.parseMultipart(body, boundary);

      expect(parts).toHaveLength(3);
      expect(parts[0].contentType.mediaType).toBe('text/plain');
      expect(parts[0].contentType.parameters.get('charset')).toBe('utf-8');
      expect(parts[1].contentType.mediaType).toBe('text/html');
      expect(parts[2].contentType.mediaType).toBe('application/octet-stream');
      expect(parts[2].contentDisposition!.type).toBe('attachment');
      expect(parts[2].contentDisposition!.filename).toBe('data.bin');
    });

    it('should handle deeply nested multipart structures (Req 6.7)', () => {
      const outerBoundary = 'outer';
      const middleBoundary = 'middle';
      const innerBoundary = 'inner';
      const body = new TextEncoder().encode(
        [
          `--${outerBoundary}\r\n`,
          `Content-Type: multipart/mixed; boundary="${middleBoundary}"\r\n`,
          '\r\n',
          `--${middleBoundary}\r\n`,
          `Content-Type: multipart/alternative; boundary="${innerBoundary}"\r\n`,
          '\r\n',
          `--${innerBoundary}\r\n`,
          'Content-Type: text/plain\r\n',
          '\r\n',
          'Deep nested text\r\n',
          `--${innerBoundary}--\r\n`,
          `--${middleBoundary}--\r\n`,
          `--${outerBoundary}--`,
        ].join(''),
      );

      const parts = parser.parseMultipart(body, outerBoundary);

      expect(parts).toHaveLength(1);
      expect(parts[0].contentType.subtype).toBe('mixed');
      expect(parts[0].parts).toBeDefined();
      expect(parts[0].parts!).toHaveLength(1);
      expect(parts[0].parts![0].contentType.subtype).toBe('alternative');
      expect(parts[0].parts![0].parts).toBeDefined();
      expect(parts[0].parts![0].parts!).toHaveLength(1);
      expect(
        Buffer.from(parts[0].parts![0].parts![0].body!).toString('utf-8'),
      ).toBe('Deep nested text');
    });

    it('should handle empty body for a part', () => {
      const boundary = 'empty-body-boundary';
      const body = new TextEncoder().encode(
        [
          `--${boundary}\r\n`,
          'Content-Type: text/plain\r\n',
          '\r\n',
          '\r\n',
          `--${boundary}--`,
        ].join(''),
      );

      const parts = parser.parseMultipart(body, boundary);

      expect(parts).toHaveLength(1);
      expect(parts[0].body).toBeDefined();
      expect(parts[0].size).toBe(0);
    });

    it('should handle quoted-printable encoded parts', () => {
      const boundary = 'qp-boundary';
      const body = new TextEncoder().encode(
        [
          `--${boundary}\r\n`,
          'Content-Type: text/plain; charset=utf-8\r\n',
          'Content-Transfer-Encoding: quoted-printable\r\n',
          '\r\n',
          'caf=C3=A9\r\n',
          `--${boundary}--`,
        ].join(''),
      );

      const parts = parser.parseMultipart(body, boundary);

      expect(parts).toHaveLength(1);
      expect(parts[0].contentTransferEncoding).toBe(
        ContentTransferEncoding.QuotedPrintable,
      );
      expect(Buffer.from(parts[0].body!).toString('utf-8')).toBe('café');
    });
  });

  // ─── parse (main method) ───────────────────────────────────────────

  describe('parse', () => {
    /**
     * Helper to build a minimal valid RFC 5322 email string.
     */
    function buildRawEmail(options: {
      from?: string;
      to?: string;
      subject?: string;
      date?: string;
      messageId?: string;
      cc?: string;
      bcc?: string;
      inReplyTo?: string;
      references?: string;
      mimeVersion?: string;
      contentType?: string;
      contentTransferEncoding?: string;
      extraHeaders?: string[];
      body?: string;
      lineEnding?: string;
    }): string {
      const le = options.lineEnding || '\r\n';
      const headers: string[] = [];

      if (options.from) headers.push(`From: ${options.from}`);
      if (options.to) headers.push(`To: ${options.to}`);
      if (options.subject) headers.push(`Subject: ${options.subject}`);
      if (options.date) headers.push(`Date: ${options.date}`);
      if (options.messageId) headers.push(`Message-ID: ${options.messageId}`);
      if (options.cc) headers.push(`Cc: ${options.cc}`);
      if (options.bcc) headers.push(`Bcc: ${options.bcc}`);
      if (options.inReplyTo) headers.push(`In-Reply-To: ${options.inReplyTo}`);
      if (options.references) headers.push(`References: ${options.references}`);
      if (options.mimeVersion)
        headers.push(`MIME-Version: ${options.mimeVersion}`);
      if (options.contentType)
        headers.push(`Content-Type: ${options.contentType}`);
      if (options.contentTransferEncoding)
        headers.push(
          `Content-Transfer-Encoding: ${options.contentTransferEncoding}`,
        );
      if (options.extraHeaders) headers.push(...options.extraHeaders);

      const body = options.body || 'Hello, World!';
      return headers.join(le) + le + le + body;
    }

    it('should parse a simple email with From, To, Subject', async () => {
      const raw = buildRawEmail({
        from: 'Alice <alice@example.com>',
        to: 'Bob <bob@example.com>',
        subject: 'Test Email',
        date: 'Thu, 13 Feb 2025 15:30:00 +0000',
        messageId: '<test-001@example.com>',
        mimeVersion: '1.0',
        contentType: 'text/plain; charset=utf-8',
      });

      const metadata = await parser.parse(raw);

      expect(metadata.from.localPart).toBe('alice');
      expect(metadata.from.domain).toBe('example.com');
      expect(metadata.from.displayName).toBe('Alice');
      expect(metadata.from.address).toBe('alice@example.com');

      expect(metadata.to).toHaveLength(1);
      expect(metadata.to[0].localPart).toBe('bob');
      expect(metadata.to[0].domain).toBe('example.com');
      expect(metadata.to[0].displayName).toBe('Bob');

      expect(metadata.subject).toBe('Test Email');
      expect(metadata.messageId).toBe('<test-001@example.com>');
      expect(metadata.mimeVersion).toBe('1.0');
    });

    it('should parse email date correctly', async () => {
      const raw = buildRawEmail({
        from: 'alice@example.com',
        to: 'bob@example.com',
        date: 'Thu, 13 Feb 2025 15:30:00 +0000',
        messageId: '<date-test@example.com>',
      });

      const metadata = await parser.parse(raw);

      expect(metadata.date).toBeInstanceOf(Date);
      expect(metadata.date.getUTCFullYear()).toBe(2025);
      expect(metadata.date.getUTCMonth()).toBe(1); // February
      expect(metadata.date.getUTCDate()).toBe(13);
    });

    it('should parse CC recipients', async () => {
      const raw = buildRawEmail({
        from: 'alice@example.com',
        to: 'bob@example.com',
        cc: 'charlie@example.com, Dave <dave@example.com>',
        messageId: '<cc-test@example.com>',
      });

      const metadata = await parser.parse(raw);

      expect(metadata.cc).toBeDefined();
      expect(metadata.cc!).toHaveLength(2);
      expect(metadata.cc![0].localPart).toBe('charlie');
      expect(metadata.cc![1].localPart).toBe('dave');
      expect(metadata.cc![1].displayName).toBe('Dave');
    });

    it('should parse In-Reply-To and References headers', async () => {
      const raw = buildRawEmail({
        from: 'alice@example.com',
        to: 'bob@example.com',
        messageId: '<reply-001@example.com>',
        inReplyTo: '<original-001@example.com>',
        references: '<root-001@example.com> <original-001@example.com>',
      });

      const metadata = await parser.parse(raw);

      expect(metadata.inReplyTo).toBe('<original-001@example.com>');
      expect(metadata.references).toBeDefined();
      expect(metadata.references!).toHaveLength(2);
      expect(metadata.references![0]).toBe('<root-001@example.com>');
      expect(metadata.references![1]).toBe('<original-001@example.com>');
    });

    it('should parse Content-Type header', async () => {
      const raw = buildRawEmail({
        from: 'alice@example.com',
        to: 'bob@example.com',
        messageId: '<ct-test@example.com>',
        contentType: 'text/html; charset=utf-8',
      });

      const metadata = await parser.parse(raw);

      expect(metadata.contentType.type).toBe('text');
      expect(metadata.contentType.subtype).toBe('html');
      expect(metadata.contentType.parameters.get('charset')).toBe('utf-8');
    });

    it('should handle LF line endings (Requirement 14.5)', async () => {
      const raw = buildRawEmail({
        from: 'alice@example.com',
        to: 'bob@example.com',
        subject: 'LF Test',
        messageId: '<lf-test@example.com>',
        lineEnding: '\n',
      });

      const metadata = await parser.parse(raw);

      expect(metadata.from.localPart).toBe('alice');
      expect(metadata.subject).toBe('LF Test');
    });

    it('should handle CRLF line endings (Requirement 14.5)', async () => {
      const raw = buildRawEmail({
        from: 'alice@example.com',
        to: 'bob@example.com',
        subject: 'CRLF Test',
        messageId: '<crlf-test@example.com>',
        lineEnding: '\r\n',
      });

      const metadata = await parser.parse(raw);

      expect(metadata.from.localPart).toBe('alice');
      expect(metadata.subject).toBe('CRLF Test');
    });

    it('should parse custom/extension headers', async () => {
      const raw = buildRawEmail({
        from: 'alice@example.com',
        to: 'bob@example.com',
        messageId: '<custom-test@example.com>',
        extraHeaders: ['X-Custom-Header: custom-value', 'X-Priority: 1'],
      });

      const metadata = await parser.parse(raw);

      expect(metadata.customHeaders.get('x-custom-header')).toEqual([
        'custom-value',
      ]);
      expect(metadata.customHeaders.get('x-priority')).toEqual(['1']);
    });

    it('should default MIME-Version to 1.0 when not present', async () => {
      const raw = buildRawEmail({
        from: 'alice@example.com',
        to: 'bob@example.com',
        messageId: '<mime-default@example.com>',
      });

      const metadata = await parser.parse(raw);

      expect(metadata.mimeVersion).toBe('1.0');
    });

    it('should set IMessageMetadata fields with defaults', async () => {
      const raw = buildRawEmail({
        from: 'alice@example.com',
        to: 'bob@example.com',
        messageId: '<meta-test@example.com>',
      });

      const metadata = await parser.parse(raw);

      expect(metadata.messageType).toBe('email');
      expect(metadata.senderId).toBe('alice@example.com');
      expect(metadata.recipients).toContain('bob@example.com');
      expect(metadata.isCBL).toBe(false);
      expect(metadata.deliveryReceipts).toBeInstanceOf(Map);
      expect(metadata.readReceipts).toBeInstanceOf(Map);
    });

    it('should accept Uint8Array input', async () => {
      const raw = buildRawEmail({
        from: 'alice@example.com',
        to: 'bob@example.com',
        subject: 'Binary Input',
        messageId: '<binary-test@example.com>',
      });
      const uint8 = new TextEncoder().encode(raw);

      const metadata = await parser.parse(uint8);

      expect(metadata.from.localPart).toBe('alice');
      expect(metadata.subject).toBe('Binary Input');
    });

    it('should throw EmailError for empty string input', async () => {
      await expect(parser.parse('')).rejects.toThrow(EmailError);
      try {
        await parser.parse('');
      } catch (e) {
        expect((e as EmailError).errorType).toBe(EmailErrorType.PARSE_ERROR);
      }
    });

    it('should throw EmailError for empty Uint8Array input', async () => {
      await expect(parser.parse(new Uint8Array(0))).rejects.toThrow(EmailError);
    });

    it('should generate a Message-ID when not present', async () => {
      const raw = buildRawEmail({
        from: 'alice@example.com',
        to: 'bob@example.com',
      });

      const metadata = await parser.parse(raw);

      // Should have some message ID (auto-generated)
      expect(metadata.messageId).toBeDefined();
      expect(metadata.messageId.length).toBeGreaterThan(0);
    });

    it('should parse a multipart email with text and HTML parts', async () => {
      const boundary = '----=_Part_123';
      const raw = [
        'From: alice@example.com',
        'To: bob@example.com',
        'Subject: Multipart Test',
        'Message-ID: <multipart-test@example.com>',
        'MIME-Version: 1.0',
        `Content-Type: multipart/alternative; boundary="${boundary}"`,
        '',
        `--${boundary}`,
        'Content-Type: text/plain; charset=utf-8',
        '',
        'Plain text content',
        `--${boundary}`,
        'Content-Type: text/html; charset=utf-8',
        '',
        '<p>HTML content</p>',
        `--${boundary}--`,
      ].join('\r\n');

      const metadata = await parser.parse(raw);

      expect(metadata.subject).toBe('Multipart Test');
      expect(metadata.parts).toBeDefined();
      expect(metadata.parts!.length).toBeGreaterThanOrEqual(1);

      // Should have text and/or html parts
      const hasTextPart = metadata.parts!.some(
        (p) =>
          p.contentType.type === 'text' && p.contentType.subtype === 'plain',
      );
      const hasHtmlPart = metadata.parts!.some(
        (p) =>
          p.contentType.type === 'text' && p.contentType.subtype === 'html',
      );
      expect(hasTextPart || hasHtmlPart).toBe(true);
    });

    it('should parse an email with an attachment', async () => {
      const boundary = '----=_Part_456';
      const attachmentContent =
        Buffer.from('Hello attachment').toString('base64');
      const raw = [
        'From: alice@example.com',
        'To: bob@example.com',
        'Subject: Attachment Test',
        'Message-ID: <attachment-test@example.com>',
        'MIME-Version: 1.0',
        `Content-Type: multipart/mixed; boundary="${boundary}"`,
        '',
        `--${boundary}`,
        'Content-Type: text/plain; charset=utf-8',
        '',
        'Email body text',
        `--${boundary}`,
        'Content-Type: application/pdf',
        'Content-Disposition: attachment; filename="document.pdf"',
        'Content-Transfer-Encoding: base64',
        '',
        attachmentContent,
        `--${boundary}--`,
      ].join('\r\n');

      const metadata = await parser.parse(raw);

      expect(metadata.subject).toBe('Attachment Test');
      expect(metadata.attachments).toBeDefined();
      expect(metadata.attachments!.length).toBeGreaterThanOrEqual(1);

      const pdfAttachment = metadata.attachments!.find(
        (a) => a.mimeType === 'application/pdf',
      );
      expect(pdfAttachment).toBeDefined();
      expect(pdfAttachment!.filename).toBe('document.pdf');
      expect(pdfAttachment!.size).toBeGreaterThan(0);
    });

    it('should handle email with multiple To recipients', async () => {
      const raw = buildRawEmail({
        from: 'alice@example.com',
        to: 'bob@example.com, charlie@example.com',
        messageId: '<multi-to@example.com>',
      });

      const metadata = await parser.parse(raw);

      expect(metadata.to.length).toBeGreaterThanOrEqual(2);
      const addresses = metadata.to.map((r) => r.address);
      expect(addresses).toContain('bob@example.com');
      expect(addresses).toContain('charlie@example.com');
    });

    it('should set empty cc/bcc/replyTo to undefined', async () => {
      const raw = buildRawEmail({
        from: 'alice@example.com',
        to: 'bob@example.com',
        messageId: '<no-optional@example.com>',
      });

      const metadata = await parser.parse(raw);

      expect(metadata.cc).toBeUndefined();
      expect(metadata.bcc).toBeUndefined();
      expect(metadata.replyTo).toBeUndefined();
    });

    it('should populate recipients array from To addresses', async () => {
      const raw = buildRawEmail({
        from: 'alice@example.com',
        to: 'bob@example.com, charlie@example.com',
        messageId: '<recipients-test@example.com>',
      });

      const metadata = await parser.parse(raw);

      expect(metadata.recipients).toContain('bob@example.com');
      expect(metadata.recipients).toContain('charlie@example.com');
    });

    it('should default Content-Type to text/plain when not specified', async () => {
      const raw = [
        'From: alice@example.com',
        'To: bob@example.com',
        'Message-ID: <no-ct@example.com>',
        '',
        'Plain body',
      ].join('\r\n');

      const metadata = await parser.parse(raw);

      expect(metadata.contentType.type).toBe('text');
      expect(metadata.contentType.subtype).toBe('plain');
    });
  });
});
