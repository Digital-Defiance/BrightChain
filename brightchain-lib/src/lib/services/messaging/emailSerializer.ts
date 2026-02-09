/**
 * RFC 5322/MIME Compliant Email Serializer
 *
 * Serializes IEmailMetadata objects into RFC 5322 compliant email format.
 * Provides methods for serializing individual email components (headers,
 * addresses, Message-IDs, dates, content types).
 *
 * Wraps the `mimetext` library for full email serialization.
 *
 * @see RFC 5322 - Internet Message Format
 * @see RFC 2045 - MIME Part One: Format of Internet Message Bodies
 * @see RFC 2046 - MIME Part Two: Media Types
 *
 * @remarks
 * Requirements: 14.1, 14.2, 14.3
 */

import {
  type IAddress,
  type IAddressGroup,
  type IMailbox,
  formatAddressGroup,
  formatMailbox,
  isAddressGroup,
  isMailbox,
} from '../../interfaces/messaging/emailAddress';
import type { IEmailMetadata } from '../../interfaces/messaging/emailMetadata';
import {
  type IContentType,
  type IMimePart,
  ContentTransferEncoding,
} from '../../interfaces/messaging/mimePart';

/** CRLF line ending per RFC 5322 */
const CRLF = '\r\n';

/** Default maximum header line length per RFC 5322 Section 2.2.3 */
const DEFAULT_MAX_LINE_LENGTH = 78;

/**
 * RFC 5322/MIME compliant email serializer.
 *
 * Provides methods for serializing email headers, addresses, Message-IDs,
 * dates, and content types. The main `serialize()` method (Task 5.7) will
 * use `mimetext` for full email serialization.
 *
 * @see Design Document: EmailSerializer Class
 */
export class EmailSerializer {
  /**
   * Serializes all headers from an IEmailMetadata object into an RFC 5322
   * compliant header section string.
   *
   * Produces headers with proper CRLF line endings and folds long lines
   * at 78 characters per RFC 5322 Section 2.2.3. The header section is
   * terminated with a blank line (CRLF CRLF) to separate it from the body.
   *
   * @param email - The email metadata to serialize headers from
   * @returns The serialized header section string with CRLF line endings,
   *          terminated by a blank line (CRLF CRLF)
   *
   * @see RFC 5322 Section 2.2 - Header Fields
   * @see Requirement 14.1 - RFC 5322 compliant output with proper CRLF line endings
   * @see Requirement 14.2 - Fold header lines exceeding 78 characters
   * @see Requirement 14.3 - Separate header section from body with blank line
   *
   * @example
   * ```typescript
   * const serializer = new EmailSerializer();
   * const headers = serializer.serializeHeaders(emailMetadata);
   * // "From: sender@example.com\r\nTo: recipient@example.com\r\n..."
   * ```
   */
  serializeHeaders(email: IEmailMetadata): string {
    const headerLines: string[] = [];

    // Date (required, RFC 5322 Section 3.6.1)
    headerLines.push(`Date: ${this.serializeDate(email.date)}`);

    // From (required, RFC 5322 Section 3.6.2)
    headerLines.push(`From: ${this.serializeMailbox(email.from)}`);

    // Sender (optional, RFC 5322 Section 3.6.2)
    if (email.sender) {
      headerLines.push(`Sender: ${this.serializeMailbox(email.sender)}`);
    }

    // Reply-To (optional, RFC 5322 Section 3.6.2)
    if (email.replyTo && email.replyTo.length > 0) {
      headerLines.push(`Reply-To: ${this.serializeAddressList(email.replyTo)}`);
    }

    // To (RFC 5322 Section 3.6.3)
    if (email.to && email.to.length > 0) {
      headerLines.push(`To: ${this.serializeAddressList(email.to)}`);
    }

    // Cc (optional, RFC 5322 Section 3.6.3)
    if (email.cc && email.cc.length > 0) {
      headerLines.push(`Cc: ${this.serializeAddressList(email.cc)}`);
    }

    // Bcc (optional, RFC 5322 Section 3.6.3)
    if (email.bcc && email.bcc.length > 0) {
      headerLines.push(`Bcc: ${this.serializeAddressList(email.bcc)}`);
    }

    // Message-ID (required, RFC 5322 Section 3.6.4)
    headerLines.push(`Message-ID: ${this.serializeMessageId(email.messageId)}`);

    // In-Reply-To (optional, RFC 5322 Section 3.6.4)
    if (email.inReplyTo) {
      headerLines.push(
        `In-Reply-To: ${this.serializeMessageId(email.inReplyTo)}`,
      );
    }

    // References (optional, RFC 5322 Section 3.6.4)
    if (email.references && email.references.length > 0) {
      const refs = email.references
        .map((ref) => this.serializeMessageId(ref))
        .join(' ');
      headerLines.push(`References: ${refs}`);
    }

    // Subject (optional, RFC 5322 Section 3.6.5)
    if (email.subject !== undefined && email.subject !== null) {
      headerLines.push(`Subject: ${email.subject}`);
    }

    // Comments (optional, RFC 5322 Section 3.6.5, may appear multiple times)
    if (email.comments) {
      for (const comment of email.comments) {
        headerLines.push(`Comments: ${comment}`);
      }
    }

    // Keywords (optional, RFC 5322 Section 3.6.5)
    if (email.keywords && email.keywords.length > 0) {
      headerLines.push(`Keywords: ${email.keywords.join(', ')}`);
    }

    // MIME-Version (RFC 2045)
    headerLines.push(`MIME-Version: ${email.mimeVersion || '1.0'}`);

    // Content-Type (RFC 2045)
    headerLines.push(
      `Content-Type: ${this.serializeContentType(email.contentType)}`,
    );

    // Content-Transfer-Encoding (optional, RFC 2045)
    if (email.contentTransferEncoding) {
      headerLines.push(
        `Content-Transfer-Encoding: ${email.contentTransferEncoding}`,
      );
    }

    // Custom headers (X-* and other extension headers)
    if (email.customHeaders && email.customHeaders.size > 0) {
      for (const [name, values] of email.customHeaders) {
        for (const value of values) {
          headerLines.push(`${name}: ${value}`);
        }
      }
    }

    // Fold each header line and join with CRLF
    const foldedHeaders = headerLines
      .map((line) => this.foldHeader(line))
      .join(CRLF);

    // Terminate with blank line (CRLF CRLF) per Requirement 14.3
    return foldedHeaders + CRLF + CRLF;
  }

  /**
   * Serializes a single IMailbox into an RFC 5322 compliant mailbox string.
   *
   * If a display name is present, formats as name-addr: `"Display Name" <local@domain>`
   * Otherwise, formats as addr-spec: `local@domain`
   *
   * @param mailbox - The mailbox to serialize
   * @returns RFC 5322 formatted mailbox string
   *
   * @see RFC 5322 Section 3.4 - Address Specification
   *
   * @example
   * ```typescript
   * const serializer = new EmailSerializer();
   * serializer.serializeMailbox({ localPart: 'john', domain: 'example.com', displayName: 'John Doe', address: 'john@example.com' });
   * // => '"John Doe" <john@example.com>'
   *
   * serializer.serializeMailbox({ localPart: 'john', domain: 'example.com', address: 'john@example.com' });
   * // => 'john@example.com'
   * ```
   */
  serializeMailbox(mailbox: IMailbox): string {
    return formatMailbox(mailbox);
  }

  /**
   * Serializes an array of IAddress objects into a comma-separated
   * RFC 5322 address list string.
   *
   * Supports both individual mailboxes and group addresses.
   *
   * @param addresses - Array of addresses to serialize
   * @returns Comma-separated RFC 5322 formatted address list string
   *
   * @see RFC 5322 Section 3.4 - Address Specification
   *
   * @example
   * ```typescript
   * const serializer = new EmailSerializer();
   * serializer.serializeAddressList([mailbox1, mailbox2]);
   * // => '"Alice" <alice@example.com>, bob@example.com'
   * ```
   */
  serializeAddressList(addresses: IAddress[]): string {
    if (!addresses || addresses.length === 0) {
      return '';
    }

    return addresses
      .map((addr) => {
        if (isMailbox(addr)) {
          return this.serializeMailbox(addr);
        }
        if (isAddressGroup(addr)) {
          return formatAddressGroup(addr as IAddressGroup);
        }
        return '';
      })
      .filter((s) => s.length > 0)
      .join(', ');
  }

  /**
   * Serializes a Message-ID string, ensuring it is enclosed in angle brackets.
   *
   * If the Message-ID is already enclosed in angle brackets, it is returned as-is.
   * Otherwise, angle brackets are added.
   *
   * @param messageId - The Message-ID string to serialize
   * @returns The Message-ID enclosed in angle brackets
   *
   * @see RFC 5322 Section 3.6.4 - Identification Fields
   *
   * @example
   * ```typescript
   * const serializer = new EmailSerializer();
   * serializer.serializeMessageId('<unique-id@example.com>');
   * // => '<unique-id@example.com>'
   *
   * serializer.serializeMessageId('unique-id@example.com');
   * // => '<unique-id@example.com>'
   * ```
   */
  serializeMessageId(messageId: string): string {
    if (!messageId) {
      return '';
    }

    const trimmed = messageId.trim();

    // If already enclosed in angle brackets, return as-is
    if (trimmed.startsWith('<') && trimmed.endsWith('>')) {
      return trimmed;
    }

    // Add angle brackets
    return `<${trimmed}>`;
  }

  /**
   * Serializes a Date object into an RFC 5322 compliant date-time string.
   *
   * Produces format: "day-of-week, DD Mon YYYY HH:MM:SS +0000"
   * Example: "Thu, 13 Feb 2025 15:30:00 +0000"
   *
   * @param date - The Date object to serialize
   * @returns RFC 5322 formatted date-time string
   *
   * @see RFC 5322 Section 3.3 - Date and Time Specification
   *
   * @example
   * ```typescript
   * const serializer = new EmailSerializer();
   * serializer.serializeDate(new Date('2025-02-13T15:30:00Z'));
   * // => 'Thu, 13 Feb 2025 15:30:00 +0000'
   * ```
   */
  serializeDate(date: Date): string {
    if (!date || isNaN(date.getTime())) {
      return new Date().toUTCString().replace('GMT', '+0000');
    }

    const days = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
    const months = [
      'Jan',
      'Feb',
      'Mar',
      'Apr',
      'May',
      'Jun',
      'Jul',
      'Aug',
      'Sep',
      'Oct',
      'Nov',
      'Dec',
    ];

    const dayOfWeek = days[date.getUTCDay()];
    const day = date.getUTCDate().toString().padStart(2, '0');
    const month = months[date.getUTCMonth()];
    const year = date.getUTCFullYear();
    const hours = date.getUTCHours().toString().padStart(2, '0');
    const minutes = date.getUTCMinutes().toString().padStart(2, '0');
    const seconds = date.getUTCSeconds().toString().padStart(2, '0');

    return `${dayOfWeek}, ${day} ${month} ${year} ${hours}:${minutes}:${seconds} +0000`;
  }

  /**
   * Serializes an IContentType object into an RFC 2045 Content-Type header value.
   *
   * Produces format: "type/subtype; param1=value1; param2=value2"
   * Parameter values containing special characters are quoted.
   *
   * @param contentType - The content type to serialize
   * @returns RFC 2045 formatted Content-Type header value
   *
   * @see RFC 2045 Section 5 - Content-Type Header Field
   *
   * @example
   * ```typescript
   * const serializer = new EmailSerializer();
   * serializer.serializeContentType(createContentType('text', 'plain', new Map([['charset', 'utf-8']])));
   * // => 'text/plain; charset=utf-8'
   *
   * serializer.serializeContentType(createContentType('multipart', 'mixed', new Map([['boundary', '----=_Part_123']])));
   * // => 'multipart/mixed; boundary="----=_Part_123"'
   * ```
   */
  serializeContentType(contentType: IContentType): string {
    let result = contentType.mediaType;

    if (contentType.parameters && contentType.parameters.size > 0) {
      for (const [key, value] of contentType.parameters) {
        // Quote parameter values that contain special characters per RFC 2045
        if (this.needsQuoting(value)) {
          result += `; ${key}="${this.escapeQuotedString(value)}"`;
        } else {
          result += `; ${key}=${value}`;
        }
      }
    }

    return result;
  }

  /**
   * Serializes an array of IMimePart objects into a multipart body with
   * proper boundary delimiters per RFC 2046 Section 5.1.1.
   *
   * Each part is formatted with its MIME headers (Content-Type,
   * Content-Transfer-Encoding, Content-Disposition, Content-ID,
   * Content-Description) followed by a blank line and the encoded body.
   * Parts are separated by "--boundary" delimiters and the message is
   * terminated with "--boundary--".
   *
   * Handles nested multipart parts recursively.
   *
   * @param parts - Array of IMimePart objects to serialize
   * @param boundary - The boundary string to use as delimiter
   * @returns The serialized multipart body as Uint8Array
   *
   * @see RFC 2046 Section 5.1.1 - Common Syntax
   * @see Requirement 6.5 - Generate unique boundary string
   * @see Requirement 6.6 - Format multipart with proper boundary delimiters
   *
   * @example
   * ```typescript
   * const serializer = new EmailSerializer();
   * const parts: IMimePart[] = [
   *   { contentType: createContentType('text', 'plain'), body: new TextEncoder().encode('Hello'), size: 5 },
   *   { contentType: createContentType('text', 'html'), body: new TextEncoder().encode('<p>Hello</p>'), size: 12 },
   * ];
   * const boundary = serializer.generateBoundary();
   * const result = serializer.serializeMultipart(parts, boundary);
   * ```
   */
  serializeMultipart(parts: IMimePart[], boundary: string): Uint8Array {
    const sections: string[] = [];

    for (const part of parts) {
      // Start with boundary delimiter
      sections.push(`--${boundary}${CRLF}`);

      // Build part headers
      const partHeaders: string[] = [];

      // Content-Type (always present)
      partHeaders.push(
        `Content-Type: ${this.serializeContentType(part.contentType)}`,
      );

      // Content-Transfer-Encoding (if specified)
      if (part.contentTransferEncoding) {
        partHeaders.push(
          `Content-Transfer-Encoding: ${part.contentTransferEncoding}`,
        );
      }

      // Content-Disposition (if specified)
      if (part.contentDisposition) {
        let dispositionValue = part.contentDisposition.type;
        if (part.contentDisposition.filename) {
          if (this.needsQuoting(part.contentDisposition.filename)) {
            dispositionValue += `; filename="${this.escapeQuotedString(part.contentDisposition.filename)}"`;
          } else {
            dispositionValue += `; filename=${part.contentDisposition.filename}`;
          }
        }
        if (part.contentDisposition.size !== undefined) {
          dispositionValue += `; size=${part.contentDisposition.size}`;
        }
        partHeaders.push(`Content-Disposition: ${dispositionValue}`);
      }

      // Content-ID (if specified)
      if (part.contentId) {
        partHeaders.push(`Content-ID: ${part.contentId}`);
      }

      // Content-Description (if specified)
      if (part.contentDescription) {
        partHeaders.push(`Content-Description: ${part.contentDescription}`);
      }

      // Add headers followed by blank line
      sections.push(partHeaders.join(CRLF) + CRLF + CRLF);

      // Add body content
      if (
        part.contentType.type === 'multipart' &&
        part.parts &&
        part.parts.length > 0
      ) {
        // Nested multipart - serialize recursively
        const nestedBoundary = part.contentType.parameters.get('boundary');
        if (nestedBoundary) {
          const nestedBody = this.serializeMultipart(
            part.parts,
            nestedBoundary,
          );
          sections.push(new TextDecoder().decode(nestedBody));
        }
      } else if (part.body) {
        // Encode body based on Content-Transfer-Encoding
        const encodedBody = this.encodePartBody(
          part.body,
          part.contentTransferEncoding,
        );
        sections.push(new TextDecoder().decode(encodedBody));
      }

      // Add CRLF after body content
      sections.push(CRLF);
    }

    // Closing boundary delimiter
    sections.push(`--${boundary}--${CRLF}`);

    return new TextEncoder().encode(sections.join(''));
  }

  /**
   * Serializes the body of an email message based on its content type.
   *
   * For multipart content types (multipart/*), delegates to serializeMultipart()
   * using the boundary parameter from the content type.
   * For single-part content, encodes the first part's body directly based on
   * its Content-Transfer-Encoding.
   *
   * @param parts - Array of IMimePart objects representing the message body
   * @param contentType - The top-level Content-Type of the message
   * @returns The serialized body as Uint8Array
   *
   * @see Requirement 6.5 - Generate unique boundary for multipart messages
   * @see Requirement 6.6 - Format multipart with proper boundary delimiters
   *
   * @example
   * ```typescript
   * const serializer = new EmailSerializer();
   * // Single part
   * const textPart: IMimePart = {
   *   contentType: createContentType('text', 'plain'),
   *   body: new TextEncoder().encode('Hello'),
   *   size: 5,
   * };
   * const body = serializer.serializeBody([textPart], textPart.contentType);
   * ```
   */
  serializeBody(parts: IMimePart[], contentType: IContentType): Uint8Array {
    if (contentType.type === 'multipart') {
      // Multipart message - use boundary from content type parameters
      let boundary = contentType.parameters.get('boundary');
      if (!boundary) {
        // Generate a boundary if not provided
        boundary = this.generateBoundary();
      }
      return this.serializeMultipart(parts, boundary);
    }

    // Single part - encode the body directly
    if (parts.length > 0 && parts[0].body) {
      return this.encodePartBody(
        parts[0].body,
        parts[0].contentTransferEncoding,
      );
    }

    return new Uint8Array(0);
  }

  /**
   * Encodes a part's body content based on its Content-Transfer-Encoding.
   *
   * @param body - The raw body content
   * @param encoding - The Content-Transfer-Encoding to apply
   * @returns The encoded body as Uint8Array
   */
  private encodePartBody(
    body: Uint8Array,
    encoding?: ContentTransferEncoding,
  ): Uint8Array {
    if (!encoding) {
      return body;
    }

    switch (encoding) {
      case ContentTransferEncoding.Base64:
        return this.encodeBase64(body);
      case ContentTransferEncoding.QuotedPrintable:
        return this.encodeQuotedPrintable(body);
      case ContentTransferEncoding.SevenBit:
      case ContentTransferEncoding.EightBit:
      case ContentTransferEncoding.Binary:
        return body;
      default:
        return body;
    }
  }

  /**
   * Folds a header line at the specified maximum length per RFC 5322 Section 2.2.3.
   *
   * Long header lines are broken at appropriate whitespace boundaries by
   * inserting CRLF followed by a space (folding whitespace). The fold point
   * is chosen at the last whitespace boundary before the maximum length.
   *
   * If no whitespace boundary is found before the maximum length, the line
   * is folded at the first whitespace boundary after the maximum length.
   *
   * @param headerLine - The header line to fold
   * @param maxLength - Maximum line length before folding (default: 78)
   * @returns The folded header line with CRLF + space at fold points
   *
   * @see RFC 5322 Section 2.2.3 - Long Header Fields
   * @see Requirement 14.2 - Fold header lines exceeding 78 characters
   *
   * @example
   * ```typescript
   * const serializer = new EmailSerializer();
   * const long = 'Subject: ' + 'a'.repeat(80);
   * const folded = serializer.foldHeader(long);
   * // Lines are broken at whitespace boundaries, each <= 78 chars
   * ```
   */
  foldHeader(
    headerLine: string,
    maxLength: number = DEFAULT_MAX_LINE_LENGTH,
  ): string {
    // If the line is already within the limit, return as-is
    if (headerLine.length <= maxLength) {
      return headerLine;
    }

    const result: string[] = [];
    let remaining = headerLine;

    while (remaining.length > maxLength) {
      // Find the last whitespace boundary before maxLength
      let foldAt = -1;
      // Start searching from maxLength backwards
      // On continuation lines, the leading space counts toward the length
      for (let i = maxLength - 1; i > 0; i--) {
        if (remaining[i] === ' ' || remaining[i] === '\t') {
          foldAt = i;
          break;
        }
      }

      if (foldAt <= 0) {
        // No whitespace found before maxLength - find the first whitespace after
        for (let i = maxLength; i < remaining.length; i++) {
          if (remaining[i] === ' ' || remaining[i] === '\t') {
            foldAt = i;
            break;
          }
        }
      }

      if (foldAt <= 0) {
        // No whitespace found at all - can't fold, emit the rest
        break;
      }

      // Add the portion before the fold point
      result.push(remaining.substring(0, foldAt));
      // Skip the whitespace at the fold point; the continuation line
      // will start with a space (folding whitespace)
      remaining = remaining.substring(foldAt);
      // If the remaining starts with whitespace, keep it as the folding WSP
      // Otherwise, prepend a space
      if (remaining[0] !== ' ' && remaining[0] !== '\t') {
        remaining = ' ' + remaining;
      }
    }

    // Add the remaining portion
    if (remaining.length > 0) {
      result.push(remaining);
    }

    return result.join(CRLF);
  }

  /**
   * Generates a unique boundary string for multipart messages.
   *
   * The boundary is designed to be unique and unlikely to appear in
   * any message content. Uses a combination of a fixed prefix,
   * timestamp, and random characters.
   *
   * @returns A unique boundary string
   *
   * @see RFC 2046 Section 5.1.1 - Common Syntax
   *
   * @example
   * ```typescript
   * const serializer = new EmailSerializer();
   * const boundary = serializer.generateBoundary();
   * // => '----=_Part_1707836400000_abc123def456'
   * ```
   */
  generateBoundary(): string {
    const timestamp = Date.now();
    const random = Math.random().toString(36).substring(2, 14);
    const random2 = Math.random().toString(36).substring(2, 8);
    return `----=_Part_${timestamp}_${random}${random2}`;
  }

  /**
   * Encodes a string as an RFC 2047 encoded-word.
   *
   * Encoded-words have the format: =?charset?encoding?encoded-text?=
   * where encoding is either "B" (base64) or "Q" (quoted-printable).
   *
   * For 'B' encoding, the text bytes are base64 encoded.
   * For 'Q' encoding, the text bytes are quoted-printable encoded with
   * underscore for space per RFC 2047 Section 4.2.
   *
   * @param text - The text string to encode
   * @param charset - The character set (e.g., 'UTF-8', 'ISO-8859-1')
   * @param encoding - The encoding type: 'B' for base64, 'Q' for quoted-printable
   * @returns The RFC 2047 encoded-word string
   *
   * @see RFC 2047 - MIME Part Three: Message Header Extensions for Non-ASCII Text
   * @see Requirement 4.2 - Encode non-ASCII subject characters using RFC 2047 encoded-words
   * @see Requirement 4.3 - Support both Base64 (B) and Quoted-Printable (Q) encoding
   *
   * @example
   * ```typescript
   * const serializer = new EmailSerializer();
   * serializer.encodeEncodedWord('Hello World', 'UTF-8', 'B');
   * // => '=?UTF-8?B?SGVsbG8gV29ybGQ=?='
   *
   * serializer.encodeEncodedWord('Hello World', 'UTF-8', 'Q');
   * // => '=?UTF-8?Q?Hello_World?='
   * ```
   */
  encodeEncodedWord(
    text: string,
    charset: string,
    encoding: 'B' | 'Q',
  ): string {
    if (!text) {
      return '';
    }

    // Convert text to bytes using the specified charset
    const textBytes = Buffer.from(text, 'utf-8');

    let encodedText: string;

    if (encoding === 'B') {
      // Base64 encoding
      encodedText = textBytes.toString('base64');
    } else {
      // Quoted-printable encoding for encoded-words (RFC 2047 Section 4.2)
      // In Q encoding:
      // - Underscore represents space
      // - Printable ASCII (33-126) except '=', '?', '_' are literal
      // - Everything else is encoded as =XX
      const result: string[] = [];
      for (let i = 0; i < textBytes.length; i++) {
        const byte = textBytes[i];
        if (byte === 0x20) {
          // Space -> underscore per RFC 2047 Section 4.2
          result.push('_');
        } else if (
          byte >= 33 &&
          byte <= 126 &&
          byte !== 0x3d && // '='
          byte !== 0x3f && // '?'
          byte !== 0x5f // '_'
        ) {
          // Printable ASCII (except =, ?, _) - literal
          result.push(String.fromCharCode(byte));
        } else {
          // Encode as =XX
          result.push('=' + byte.toString(16).toUpperCase().padStart(2, '0'));
        }
      }
      encodedText = result.join('');
    }

    return `=?${charset}?${encoding}?${encodedText}?=`;
  }

  /**
   * Encodes binary data as quoted-printable per RFC 2045 Section 6.7.
   *
   * Rules:
   * - Bytes in the printable ASCII range (33-126, except '=') are literal
   * - All other bytes are encoded as =XX (uppercase hex)
   * - Lines are limited to 76 characters max; soft line breaks (=\r\n) are
   *   inserted when needed
   * - Spaces and tabs before line breaks are encoded
   * - Tab (0x09) and space (0x20) are allowed as literals within a line
   *
   * @param data - The binary data to encode as Uint8Array
   * @returns The quoted-printable encoded data as Uint8Array
   *
   * @see RFC 2045 Section 6.7 - Quoted-Printable Content-Transfer-Encoding
   * @see Requirement 7.7 - Use quoted-printable for text with special characters
   * @see Requirement 14.8 - Encode body according to Content-Transfer-Encoding header
   *
   * @example
   * ```typescript
   * const serializer = new EmailSerializer();
   * const data = new TextEncoder().encode('Hello World!');
   * const encoded = serializer.encodeQuotedPrintable(data);
   * // encoded contains bytes for 'Hello World!'
   *
   * const nonAscii = new Uint8Array([0xC3, 0xA9]); // UTF-8 'é'
   * const encodedNonAscii = serializer.encodeQuotedPrintable(nonAscii);
   * // encoded contains bytes for '=C3=A9'
   * ```
   */
  encodeQuotedPrintable(data: Uint8Array): Uint8Array {
    const MAX_LINE_LENGTH = 76;
    const lines: string[] = [];
    let currentLine = '';

    for (let i = 0; i < data.length; i++) {
      const byte = data[i];
      let encoded: string;

      // Check for CRLF line breaks - pass through as-is
      if (byte === 0x0d && i + 1 < data.length && data[i + 1] === 0x0a) {
        // Before emitting the line break, encode trailing whitespace
        if (currentLine.length > 0) {
          const lastChar = currentLine[currentLine.length - 1];
          if (lastChar === ' ' || lastChar === '\t') {
            // Encode the trailing whitespace
            const wsCode = lastChar.charCodeAt(0);
            currentLine =
              currentLine.substring(0, currentLine.length - 1) +
              '=' +
              wsCode.toString(16).toUpperCase().padStart(2, '0');
          }
        }
        lines.push(currentLine);
        currentLine = '';
        i++; // Skip the LF
        continue;
      }

      // Check for bare LF line break
      if (byte === 0x0a) {
        if (currentLine.length > 0) {
          const lastChar = currentLine[currentLine.length - 1];
          if (lastChar === ' ' || lastChar === '\t') {
            const wsCode = lastChar.charCodeAt(0);
            currentLine =
              currentLine.substring(0, currentLine.length - 1) +
              '=' +
              wsCode.toString(16).toUpperCase().padStart(2, '0');
          }
        }
        lines.push(currentLine);
        currentLine = '';
        continue;
      }

      // Determine encoding for this byte
      if (byte === 0x09 || byte === 0x20) {
        // Tab and space are allowed as literals within a line
        encoded = String.fromCharCode(byte);
      } else if (byte >= 33 && byte <= 126 && byte !== 0x3d) {
        // Printable ASCII (33-126) except '=' (0x3d) - literal
        encoded = String.fromCharCode(byte);
      } else {
        // Encode as =XX
        encoded = '=' + byte.toString(16).toUpperCase().padStart(2, '0');
      }

      // Check if adding this encoded character would exceed line length
      // Need room for soft line break (=) at end if we need to wrap
      if (currentLine.length + encoded.length > MAX_LINE_LENGTH - 1) {
        // Emit soft line break: current line + '='
        lines.push(currentLine + '=');
        currentLine = encoded;
      } else {
        currentLine += encoded;
      }
    }

    // Handle trailing whitespace on the last line
    if (currentLine.length > 0) {
      const lastChar = currentLine[currentLine.length - 1];
      if (lastChar === ' ' || lastChar === '\t') {
        const wsCode = lastChar.charCodeAt(0);
        currentLine =
          currentLine.substring(0, currentLine.length - 1) +
          '=' +
          wsCode.toString(16).toUpperCase().padStart(2, '0');
      }
    }

    // Add the last line
    lines.push(currentLine);

    // Join lines with CRLF
    const result = lines.join('\r\n');
    return new TextEncoder().encode(result);
  }

  /**
   * Encodes binary data as base64 per RFC 2045 Section 6.8.
   *
   * Produces standard base64 encoding with line breaks inserted every
   * 76 characters per RFC 2045.
   *
   * @param data - The binary data to encode as Uint8Array
   * @returns The base64 encoded data as Uint8Array
   *
   * @see RFC 2045 Section 6.8 - Base64 Content-Transfer-Encoding
   * @see Requirement 7.6 - Use base64 for binary content
   * @see Requirement 14.8 - Encode body according to Content-Transfer-Encoding header
   *
   * @example
   * ```typescript
   * const serializer = new EmailSerializer();
   * const data = new TextEncoder().encode('Hello World');
   * const encoded = serializer.encodeBase64(data);
   * // encoded contains bytes for 'SGVsbG8gV29ybGQ='
   * ```
   */
  encodeBase64(data: Uint8Array): Uint8Array {
    const MAX_LINE_LENGTH = 76;

    // Encode to base64 string
    const base64String = Buffer.from(data).toString('base64');

    // Insert CRLF line breaks every 76 characters per RFC 2045
    const lines: string[] = [];
    for (let i = 0; i < base64String.length; i += MAX_LINE_LENGTH) {
      lines.push(base64String.substring(i, i + MAX_LINE_LENGTH));
    }

    const result = lines.join('\r\n');
    return new TextEncoder().encode(result);
  }

  /**
   * Determines if a parameter value needs to be quoted per RFC 2045.
   *
   * Values containing special characters (spaces, semicolons, equals signs,
   * quotes, backslashes, parentheses, angle brackets, at signs, commas,
   * or non-printable characters) must be quoted.
   *
   * @param value - The parameter value to check
   * @returns true if the value needs quoting
   */
  private needsQuoting(value: string): boolean {
    // RFC 2045 tspecials: ()<>@,;:\"/[]?=
    // Also quote if contains spaces or non-printable characters
    return /[()<>@,;:\\"/[\]?=\s]/.test(value);
  }

  /**
   * Escapes special characters in a quoted string per RFC 2045.
   *
   * Backslashes and double quotes are escaped with a preceding backslash.
   *
   * @param value - The string to escape
   * @returns The escaped string (without surrounding quotes)
   */
  private escapeQuotedString(value: string): string {
    return value.replace(/\\/g, '\\\\').replace(/"/g, '\\"');
  }

  /**
   * Serializes a complete IEmailMetadata object into an RFC 5322 compliant
   * email message as a Uint8Array.
   *
   * Composes the existing `serializeHeaders()` and `serializeBody()` methods
   * to produce a complete email message with proper CRLF line endings.
   * The header section is separated from the body by a blank line (CRLF CRLF),
   * which is already included by `serializeHeaders()`.
   *
   * Handles both single-part and multipart emails by delegating to
   * `serializeBody()` which selects the appropriate serialization strategy
   * based on the content type.
   *
   * @param email - The email metadata to serialize
   * @returns The complete RFC 5322 email message as Uint8Array
   *
   * @see RFC 5322 - Internet Message Format
   * @see Requirement 14.1 - RFC 5322 compliant output with proper CRLF line endings
   *
   * @example
   * ```typescript
   * const serializer = new EmailSerializer();
   * const rawEmail = serializer.serialize(emailMetadata);
   * // rawEmail is a Uint8Array containing the full RFC 5322 message
   * ```
   */
  serialize(email: IEmailMetadata): Uint8Array {
    // 1. Serialize headers (already includes trailing CRLF CRLF)
    const headerSection = this.serializeHeaders(email);

    // 2. Serialize body based on content type and parts
    const bodySection =
      email.parts && email.parts.length > 0
        ? this.serializeBody(email.parts, email.contentType)
        : new Uint8Array(0);

    // 3. Combine header and body sections
    const headerBytes = new TextEncoder().encode(headerSection);
    const result = new Uint8Array(headerBytes.length + bodySection.length);
    result.set(headerBytes, 0);
    result.set(bodySection, headerBytes.length);

    return result;
  }
}
