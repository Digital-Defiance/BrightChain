/**
 * RFC 5322/MIME Compliant Email Parser
 *
 * Parses raw email strings and provides methods for parsing individual
 * email components (headers, addresses, Message-IDs, dates, content types).
 *
 * Wraps the `postal-mime` library for full email parsing and the
 * `email-addresses` library for RFC 5322 address grammar parsing.
 *
 * **Platform-specific code (Node.js `Buffer`):**
 * This file uses `Buffer.from()` in `decodeEncodedWord()`, `decodeQuotedPrintable()`,
 * and `decodeBase64()` for base64 decoding, quoted-printable decoding, and charset
 * conversion (e.g. ISO-8859-1 → UTF-8). These usages cannot easily be replaced with
 * pure `Uint8Array` operations because:
 * - `Buffer.from(str, 'base64')` and `Buffer.from(str, 'latin1')` provide charset-aware
 *   decoding that has no single-call equivalent in the Web Crypto API or `TextDecoder`
 *   for all supported charsets.
 * - The `postal-mime` library (used in `parse()`) already handles browser-compatible
 *   parsing, so the Buffer-dependent methods are primarily used for the manual
 *   header/body decoding path.
 *
 * If browser compatibility is needed for this parser, consider replacing the Buffer
 * calls with `TextDecoder` (for charset conversion) and `atob()` (for base64), or
 * moving this file to `brightchain-api-lib`.
 *
 * @platform Node.js — uses `Buffer` for base64/quoted-printable decoding and charset handling
 * @see RFC 5322 - Internet Message Format
 * @see RFC 2045 - MIME Part One: Format of Internet Message Bodies
 * @see RFC 2046 - MIME Part Two: Media Types
 * @see Requirement 18.4 — platform-specific code documented
 *
 * @remarks
 * Requirements: 2.1, 2.2, 2.3, 2.4, 3.4, 3.5, 3.6, 14.4
 */

import * as emailAddresses from 'email-addresses';
import type {
  Address as PostalAddress,
  Attachment as PostalAttachment,
  Email as PostalEmail,
} from 'postal-mime';
import PostalMime from 'postal-mime';
import { DurabilityLevel } from '../../enumerations/durabilityLevel';
import { DeliveryStatus } from '../../enumerations/messaging/deliveryStatus';
import { EmailErrorType } from '../../enumerations/messaging/emailErrorType';
import { MessageEncryptionScheme } from '../../enumerations/messaging/messageEncryptionScheme';
import { MessagePriority } from '../../enumerations/messaging/messagePriority';
import { ReplicationStatus } from '../../enumerations/replicationStatus';
import { EmailError } from '../../errors/messaging/emailError';
import type { IAttachmentMetadata } from '../../interfaces/messaging/attachmentMetadata';
import {
  IAddress,
  IMailbox,
  createAddressGroup,
  createMailbox,
} from '../../interfaces/messaging/emailAddress';
import type { IEmailMetadata } from '../../interfaces/messaging/emailMetadata';
import {
  ContentTransferEncoding,
  IContentDisposition,
  IContentType,
  IMimePart,
  createContentType,
} from '../../interfaces/messaging/mimePart';

/**
 * RFC 5322/MIME compliant email parser.
 *
 * Provides methods for parsing email headers, addresses, Message-IDs,
 * dates, and content types. The main `parse()` method (Task 4.6) will
 * use `postal-mime` for full email parsing.
 *
 * @see Design Document: EmailParser Class
 */
export class EmailParser {
  /**
   * Unfolds multi-line headers by removing CRLF followed by whitespace.
   *
   * Per RFC 5322 Section 2.2.3, long header fields can be split across
   * multiple lines by inserting a CRLF before any whitespace. Unfolding
   * reverses this by removing the CRLF (or LF) that precedes whitespace.
   *
   * Also handles LF followed by whitespace for robustness (Requirement 14.5).
   *
   * @param rawHeaders - The raw header string potentially containing folded lines
   * @returns The unfolded header string
   *
   * @see RFC 5322 Section 2.2.3 - Long Header Fields
   * @see Requirement 14.4 - Unfold multi-line headers
   *
   * @example
   * ```typescript
   * const parser = new EmailParser();
   * parser.unfoldHeaders('Subject: This is\r\n a long subject');
   * // => 'Subject: This is a long subject'
   * ```
   */
  unfoldHeaders(rawHeaders: string): string {
    // Per RFC 5322 Section 2.2.3: remove CRLF followed by at least one WSP (space or tab)
    // Also handle bare LF followed by WSP for robustness
    return rawHeaders.replace(/\r\n([ \t])/g, '$1').replace(/\n([ \t])/g, '$1');
  }

  /**
   * Parses a raw header section string into a Map of header names to values.
   *
   * Handles:
   * - Header unfolding (multi-line headers)
   * - Multiple values for the same header name
   * - Case-insensitive header name storage (lowercased keys)
   *
   * @param headerSection - The raw header section string (headers separated by line breaks)
   * @returns Map of lowercase header names to arrays of values
   *
   * @see RFC 5322 Section 2.2 - Header Fields
   *
   * @example
   * ```typescript
   * const parser = new EmailParser();
   * const headers = parser.parseHeaders('From: alice@example.com\r\nTo: bob@example.com');
   * headers.get('from');  // ['alice@example.com']
   * headers.get('to');    // ['bob@example.com']
   * ```
   */
  parseHeaders(headerSection: string): Map<string, string[]> {
    const result = new Map<string, string[]>();

    if (!headerSection || headerSection.trim().length === 0) {
      return result;
    }

    // First, unfold multi-line headers
    const unfolded = this.unfoldHeaders(headerSection);

    // Split into individual header lines
    // Handle both CRLF and LF line endings
    const lines = unfolded.split(/\r?\n/);

    for (const line of lines) {
      // Skip empty lines
      if (line.trim().length === 0) {
        continue;
      }

      // Parse "name: value" format
      const colonIndex = line.indexOf(':');
      if (colonIndex <= 0) {
        // No colon found or colon at start - skip invalid line
        continue;
      }

      const name = line.substring(0, colonIndex).trim().toLowerCase();
      const value = line.substring(colonIndex + 1).trim();

      const existing = result.get(name);
      if (existing) {
        existing.push(value);
      } else {
        result.set(name, [value]);
      }
    }

    return result;
  }

  /**
   * Parses a single mailbox address string into an IMailbox object.
   *
   * Uses the `email-addresses` library for RFC 5322 compliant parsing.
   * Supports both name-addr format (`"Display Name" <local@domain>`)
   * and addr-spec format (`local@domain`).
   *
   * @param mailboxString - The mailbox string to parse
   * @returns The parsed IMailbox object
   * @throws {EmailError} With INVALID_MAILBOX if parsing fails
   *
   * @see RFC 5322 Section 3.4 - Address Specification
   * @see Requirement 2.1 - Parse mailbox addresses
   * @see Requirement 2.2 - Parse addr-spec as local-part@domain
   * @see Requirement 2.3 - Support quoted-string local-parts
   *
   * @example
   * ```typescript
   * const parser = new EmailParser();
   * const mailbox = parser.parseMailbox('John Doe <john@example.com>');
   * // { displayName: 'John Doe', localPart: 'john', domain: 'example.com' }
   *
   * const simple = parser.parseMailbox('user@example.com');
   * // { localPart: 'user', domain: 'example.com' }
   * ```
   */
  parseMailbox(mailboxString: string): IMailbox {
    if (!mailboxString || mailboxString.trim().length === 0) {
      throw new EmailError(
        EmailErrorType.INVALID_MAILBOX,
        'Mailbox string is empty',
        { input: mailboxString },
      );
    }

    const parsed = emailAddresses.parseOneAddress(mailboxString);

    if (!parsed) {
      throw new EmailError(
        EmailErrorType.INVALID_MAILBOX,
        `Failed to parse mailbox address: ${mailboxString}`,
        { input: mailboxString },
      );
    }

    if (parsed.type === 'group') {
      throw new EmailError(
        EmailErrorType.INVALID_MAILBOX,
        'Expected a mailbox address but got a group address',
        { input: mailboxString },
      );
    }

    // parsed is a ParsedMailbox
    return createMailbox(parsed.local, parsed.domain, parsed.name || undefined);
  }

  /**
   * Parses an address list string into an array of IAddress objects.
   *
   * Uses the `email-addresses` library for RFC 5322 compliant parsing.
   * Supports both individual mailboxes and group addresses.
   *
   * @param addressListString - The comma-separated address list string
   * @returns Array of parsed IAddress objects (IMailbox or IAddressGroup)
   * @throws {EmailError} With INVALID_MAILBOX if parsing fails
   *
   * @see RFC 5322 Section 3.4 - Address Specification
   * @see Requirement 2.1 - Parse mailbox addresses
   * @see Requirement 2.4 - Support group addresses
   *
   * @example
   * ```typescript
   * const parser = new EmailParser();
   * const addresses = parser.parseAddressList('alice@example.com, Bob <bob@example.com>');
   * // [IMailbox, IMailbox]
   *
   * const withGroup = parser.parseAddressList('Team: alice@example.com, bob@example.com;');
   * // [IAddressGroup]
   * ```
   */
  parseAddressList(addressListString: string): IAddress[] {
    if (!addressListString || addressListString.trim().length === 0) {
      throw new EmailError(
        EmailErrorType.INVALID_MAILBOX,
        'Address list string is empty',
        { input: addressListString },
      );
    }

    const parsed = emailAddresses.parseAddressList(addressListString);

    if (!parsed) {
      throw new EmailError(
        EmailErrorType.INVALID_MAILBOX,
        `Failed to parse address list: ${addressListString}`,
        { input: addressListString },
      );
    }

    return parsed.map((entry): IAddress => {
      if (entry.type === 'group') {
        const mailboxes = entry.addresses.map((mb) =>
          createMailbox(mb.local, mb.domain, mb.name || undefined),
        );
        return createAddressGroup(entry.name, mailboxes);
      }

      // entry is a ParsedMailbox
      return createMailbox(entry.local, entry.domain, entry.name || undefined);
    });
  }

  /**
   * Parses a Message-ID string, validating its format.
   *
   * Message-IDs must be enclosed in angle brackets and contain exactly
   * one "@" character per RFC 5322 Section 3.6.4.
   *
   * Also supports extracting multiple Message-IDs from In-Reply-To
   * or References headers when called via parseMessageIdList().
   *
   * @param messageIdString - The Message-ID string to parse (e.g., "<id@domain>")
   * @returns The validated Message-ID string (with angle brackets)
   * @throws {EmailError} With INVALID_MESSAGE_ID if format is invalid
   *
   * @see RFC 5322 Section 3.6.4 - Identification Fields
   * @see Requirement 3.4 - Validate Message-IDs are enclosed in angle brackets
   * @see Requirement 3.5 - Validate Message-IDs contain exactly one "@"
   *
   * @example
   * ```typescript
   * const parser = new EmailParser();
   * parser.parseMessageId('<unique-id@example.com>');
   * // => '<unique-id@example.com>'
   *
   * parser.parseMessageId('no-brackets@example.com');
   * // throws EmailError (INVALID_MESSAGE_ID)
   * ```
   */
  parseMessageId(messageIdString: string): string {
    if (!messageIdString || messageIdString.trim().length === 0) {
      throw new EmailError(
        EmailErrorType.INVALID_MESSAGE_ID,
        'Message-ID string is empty',
        { input: messageIdString },
      );
    }

    const trimmed = messageIdString.trim();

    // Validate angle brackets (Requirement 3.4)
    if (!trimmed.startsWith('<') || !trimmed.endsWith('>')) {
      throw new EmailError(
        EmailErrorType.INVALID_MESSAGE_ID,
        'Message-ID must be enclosed in angle brackets',
        { input: messageIdString },
      );
    }

    // Extract the content between angle brackets
    const content = trimmed.substring(1, trimmed.length - 1);

    // Validate exactly one "@" character (Requirement 3.5)
    const atCount = (content.match(/@/g) || []).length;
    if (atCount !== 1) {
      throw new EmailError(
        EmailErrorType.INVALID_MESSAGE_ID,
        `Message-ID must contain exactly one "@" character, found ${atCount}`,
        { input: messageIdString, atCount },
      );
    }

    return trimmed;
  }

  /**
   * Extracts multiple Message-IDs from In-Reply-To or References header values.
   *
   * These headers can contain multiple Message-IDs separated by whitespace.
   *
   * @param headerValue - The header value containing one or more Message-IDs
   * @returns Array of validated Message-ID strings
   *
   * @see RFC 5322 Section 3.6.4 - Identification Fields
   * @see Requirement 3.6 - Extract multiple Message-IDs separated by whitespace
   *
   * @example
   * ```typescript
   * const parser = new EmailParser();
   * parser.parseMessageIdList('<id1@example.com> <id2@example.com>');
   * // => ['<id1@example.com>', '<id2@example.com>']
   * ```
   */
  parseMessageIdList(headerValue: string): string[] {
    if (!headerValue || headerValue.trim().length === 0) {
      return [];
    }

    // Extract all angle-bracketed Message-IDs from the string
    const messageIdPattern = /<[^>]+>/g;
    const matches = headerValue.match(messageIdPattern);

    if (!matches || matches.length === 0) {
      return [];
    }

    // Validate each extracted Message-ID
    return matches.map((id) => this.parseMessageId(id));
  }

  /**
   * Parses an RFC 5322 date string into a Date object.
   *
   * Handles common RFC 5322 date formats including:
   * - Full format: "Thu, 13 Feb 2025 15:30:00 +0000"
   * - Without day-of-week: "13 Feb 2025 15:30:00 +0000"
   * - Various timezone formats
   *
   * @param dateString - The RFC 5322 date string to parse
   * @returns The parsed Date object
   * @throws {EmailError} With INVALID_DATE if parsing fails
   *
   * @see RFC 5322 Section 3.3 - Date and Time Specification
   *
   * @example
   * ```typescript
   * const parser = new EmailParser();
   * parser.parseDate('Thu, 13 Feb 2025 15:30:00 +0000');
   * // => Date object for 2025-02-13T15:30:00Z
   * ```
   */
  parseDate(dateString: string): Date {
    if (!dateString || dateString.trim().length === 0) {
      throw new EmailError(
        EmailErrorType.INVALID_DATE,
        'Date string is empty',
        { input: dateString },
      );
    }

    const trimmed = dateString.trim();

    // Try parsing with the built-in Date constructor
    // JavaScript's Date.parse handles many RFC 5322 date formats
    const date = new Date(trimmed);

    if (isNaN(date.getTime())) {
      throw new EmailError(
        EmailErrorType.INVALID_DATE,
        `Failed to parse date: ${dateString}`,
        { input: dateString },
      );
    }

    return date;
  }

  /**
   * Parses a Content-Type header string into an IContentType object.
   *
   * Extracts the type, subtype, and parameters from a Content-Type header value.
   * Handles quoted parameter values containing special characters.
   *
   * @param contentTypeString - The Content-Type header value to parse
   * @returns The parsed IContentType object
   * @throws {EmailError} With INVALID_CONTENT_TYPE if parsing fails
   *
   * @see RFC 2045 Section 5 - Content-Type Header Field
   * @see Requirement 5.1 - Content-Type with type/subtype and optional parameters
   * @see Requirement 5.2 - Parse Content-Type parameters
   * @see Requirement 5.3 - Handle quoted parameter values
   *
   * @example
   * ```typescript
   * const parser = new EmailParser();
   * const ct = parser.parseContentType('text/plain; charset=utf-8');
   * // { type: 'text', subtype: 'plain', parameters: Map { 'charset' => 'utf-8' } }
   *
   * const mp = parser.parseContentType('multipart/mixed; boundary="----=_Part_123"');
   * // { type: 'multipart', subtype: 'mixed', parameters: Map { 'boundary' => '----=_Part_123' } }
   * ```
   */
  parseContentType(contentTypeString: string): IContentType {
    if (!contentTypeString || contentTypeString.trim().length === 0) {
      throw new EmailError(
        EmailErrorType.INVALID_CONTENT_TYPE,
        'Content-Type string is empty',
        { input: contentTypeString },
      );
    }

    const trimmed = contentTypeString.trim();

    // Split on first semicolon to separate media type from parameters
    const semicolonIndex = trimmed.indexOf(';');
    const mediaTypePart =
      semicolonIndex >= 0
        ? trimmed.substring(0, semicolonIndex).trim()
        : trimmed;
    const paramsPart =
      semicolonIndex >= 0 ? trimmed.substring(semicolonIndex + 1).trim() : '';

    // Parse type/subtype
    const slashIndex = mediaTypePart.indexOf('/');
    if (slashIndex <= 0) {
      throw new EmailError(
        EmailErrorType.INVALID_CONTENT_TYPE,
        `Invalid Content-Type format, expected type/subtype: ${contentTypeString}`,
        { input: contentTypeString },
      );
    }

    const type = mediaTypePart.substring(0, slashIndex).trim().toLowerCase();
    const subtype = mediaTypePart
      .substring(slashIndex + 1)
      .trim()
      .toLowerCase();

    if (!type || !subtype) {
      throw new EmailError(
        EmailErrorType.INVALID_CONTENT_TYPE,
        `Invalid Content-Type: missing type or subtype: ${contentTypeString}`,
        { input: contentTypeString },
      );
    }

    // Parse parameters
    const parameters = new Map<string, string>();
    if (paramsPart) {
      this.parseContentTypeParameters(paramsPart, parameters);
    }

    return createContentType(type, subtype, parameters);
  }

  /**
   * Parses Content-Type parameters from a parameter string.
   *
   * Handles both quoted and unquoted parameter values.
   *
   * @param paramString - The parameter portion of the Content-Type header
   * @param parameters - Map to populate with parsed parameters
   */
  private parseContentTypeParameters(
    paramString: string,
    parameters: Map<string, string>,
  ): void {
    // Use a state machine approach to handle quoted values with semicolons
    let remaining = paramString.trim();

    while (remaining.length > 0) {
      // Find the parameter name
      const equalsIndex = remaining.indexOf('=');
      if (equalsIndex <= 0) {
        break;
      }

      const name = remaining.substring(0, equalsIndex).trim().toLowerCase();
      remaining = remaining.substring(equalsIndex + 1).trim();

      let value: string;

      if (remaining.startsWith('"')) {
        // Quoted value - find the closing quote (handling escaped quotes)
        let endQuote = 1;
        while (endQuote < remaining.length) {
          if (remaining[endQuote] === '\\' && endQuote + 1 < remaining.length) {
            endQuote += 2; // Skip escaped character
            continue;
          }
          if (remaining[endQuote] === '"') {
            break;
          }
          endQuote++;
        }

        // Extract value without quotes, unescape backslash-escaped characters
        value = remaining.substring(1, endQuote).replace(/\\(.)/g, '$1');
        remaining = remaining.substring(endQuote + 1).trim();

        // Skip the semicolon separator if present
        if (remaining.startsWith(';')) {
          remaining = remaining.substring(1).trim();
        }
      } else {
        // Unquoted value - find the next semicolon
        const nextSemicolon = remaining.indexOf(';');
        if (nextSemicolon >= 0) {
          value = remaining.substring(0, nextSemicolon).trim();
          remaining = remaining.substring(nextSemicolon + 1).trim();
        } else {
          value = remaining.trim();
          remaining = '';
        }
      }

      if (name) {
        parameters.set(name, value);
      }
    }
  }

  /**
   * Decodes an RFC 2047 encoded-word back to a UTF-8 string.
   *
   * Encoded-words have the format: =?charset?encoding?encoded-text?=
   * where encoding is either "B" (base64) or "Q" (quoted-printable).
   *
   * If the input is not an encoded-word, it is returned as-is.
   *
   * @param encodedWord - The string potentially containing an encoded-word
   * @returns The decoded UTF-8 string
   *
   * @see RFC 2047 - MIME Part Three: Message Header Extensions for Non-ASCII Text
   * @see Requirement 4.5 - Decode RFC 2047 encoded-words in subject lines back to UTF-8
   *
   * @example
   * ```typescript
   * const parser = new EmailParser();
   * parser.decodeEncodedWord('=?UTF-8?B?SGVsbG8gV29ybGQ=?=');
   * // => 'Hello World'
   *
   * parser.decodeEncodedWord('=?UTF-8?Q?Hello_World?=');
   * // => 'Hello World'
   *
   * parser.decodeEncodedWord('plain text');
   * // => 'plain text'
   * ```
   */
  decodeEncodedWord(encodedWord: string): string {
    if (!encodedWord) {
      return encodedWord;
    }

    // RFC 2047 encoded-word pattern: =?charset?encoding?encoded-text?=
    const encodedWordPattern = /=\?([^?]+)\?([BbQq])\?([^?]*)\?=/g;

    return encodedWord.replace(
      encodedWordPattern,
      (
        _match: string,
        charset: string,
        encoding: string,
        encodedText: string,
      ): string => {
        const enc = encoding.toUpperCase();

        let decodedBytes: Buffer;

        if (enc === 'B') {
          // Base64 decoding
          decodedBytes = Buffer.from(encodedText, 'base64');
        } else if (enc === 'Q') {
          // Quoted-printable decoding for encoded-words
          // In Q encoding, underscores represent spaces (RFC 2047 Section 4.2)
          const qpText = encodedText.replace(/_/g, ' ');
          // Decode =XX hex sequences
          const decoded = qpText.replace(
            /=([0-9A-Fa-f]{2})/g,
            (_m: string, hex: string) => String.fromCharCode(parseInt(hex, 16)),
          );
          decodedBytes = Buffer.from(decoded, 'binary');
        } else {
          // Unknown encoding, return as-is
          return _match;
        }

        // Convert bytes to string using the specified charset
        // Node.js Buffer supports common charsets
        const normalizedCharset = charset.toLowerCase();
        try {
          if (normalizedCharset === 'utf-8' || normalizedCharset === 'utf8') {
            return decodedBytes.toString('utf-8');
          } else if (
            normalizedCharset === 'iso-8859-1' ||
            normalizedCharset === 'latin1'
          ) {
            return decodedBytes.toString('latin1');
          } else if (
            normalizedCharset === 'us-ascii' ||
            normalizedCharset === 'ascii'
          ) {
            return decodedBytes.toString('ascii');
          } else {
            // For other charsets, attempt UTF-8 decoding as a best effort
            return decodedBytes.toString('utf-8');
          }
        } catch {
          // If charset conversion fails, return the raw decoded bytes as UTF-8
          return decodedBytes.toString('utf-8');
        }
      },
    );
  }

  /**
   * Decodes quoted-printable encoded data per RFC 2045 Section 6.7.
   *
   * Replaces =XX sequences with the corresponding byte value and
   * handles soft line breaks (=\r\n or =\n).
   *
   * @param data - The quoted-printable encoded data as Uint8Array
   * @returns The decoded bytes as Uint8Array
   *
   * @see RFC 2045 Section 6.7 - Quoted-Printable Content-Transfer-Encoding
   * @see Requirement 7.8 - Decode content based on Content-Transfer-Encoding
   * @see Requirement 14.9 - Decode body according to Content-Transfer-Encoding header
   *
   * @example
   * ```typescript
   * const parser = new EmailParser();
   * const encoded = new TextEncoder().encode('Hello=20World');
   * const decoded = parser.decodeQuotedPrintable(encoded);
   * // decoded contains bytes for 'Hello World'
   * ```
   */
  decodeQuotedPrintable(data: Uint8Array): Uint8Array {
    const input = Buffer.from(data);
    const result: number[] = [];
    let i = 0;

    while (i < input.length) {
      if (input[i] === 0x3d) {
        // '=' character
        // Check for soft line break: =\r\n or =\n
        if (
          i + 1 < input.length &&
          input[i + 1] === 0x0d &&
          i + 2 < input.length &&
          input[i + 2] === 0x0a
        ) {
          // =\r\n soft line break - skip all three bytes
          i += 3;
          continue;
        }
        if (i + 1 < input.length && input[i + 1] === 0x0a) {
          // =\n soft line break - skip both bytes
          i += 2;
          continue;
        }
        // Check for =XX hex encoding
        if (i + 2 < input.length) {
          const hex1 = input[i + 1];
          const hex2 = input[i + 2];
          const hexStr = String.fromCharCode(hex1) + String.fromCharCode(hex2);
          if (/^[0-9A-Fa-f]{2}$/.test(hexStr)) {
            result.push(parseInt(hexStr, 16));
            i += 3;
            continue;
          }
        }
        // Not a valid QP sequence, pass through the '=' as-is
        result.push(input[i]);
        i++;
      } else {
        result.push(input[i]);
        i++;
      }
    }

    return new Uint8Array(result);
  }

  /**
   * Decodes base64 encoded data per RFC 2045 Section 6.8.
   *
   * Uses Node.js Buffer for decoding. Ignores whitespace in the input,
   * as line breaks in base64 encoded data are common per RFC 2045.
   *
   * @param data - The base64 encoded data as Uint8Array
   * @returns The decoded bytes as Uint8Array
   *
   * @see RFC 2045 Section 6.8 - Base64 Content-Transfer-Encoding
   * @see Requirement 7.8 - Decode content based on Content-Transfer-Encoding
   * @see Requirement 14.9 - Decode body according to Content-Transfer-Encoding header
   *
   * @example
   * ```typescript
   * const parser = new EmailParser();
   * const encoded = new TextEncoder().encode('SGVsbG8gV29ybGQ=');
   * const decoded = parser.decodeBase64(encoded);
   * // decoded contains bytes for 'Hello World'
   * ```
   */
  decodeBase64(data: Uint8Array): Uint8Array {
    // Convert Uint8Array to string, stripping whitespace (CR, LF, space, tab)
    const base64String = Buffer.from(data)
      .toString('ascii')
      .replace(/[\r\n\s\t]/g, '');

    // Decode using Node.js Buffer
    const decoded = Buffer.from(base64String, 'base64');
    return new Uint8Array(decoded);
  }

  /**
   * Parses (decodes) the body of a MIME part based on its Content-Transfer-Encoding.
   *
   * Dispatches to the appropriate decoder:
   * - '7bit', '8bit', 'binary': returns body as-is (no decoding needed)
   * - 'quoted-printable': calls decodeQuotedPrintable()
   * - 'base64': calls decodeBase64()
   *
   * @param body - The raw body data as Uint8Array
   * @param contentType - The Content-Type of the body (for future use)
   * @param encoding - The Content-Transfer-Encoding to apply
   * @returns The decoded body as Uint8Array
   *
   * @see RFC 2045 Section 6 - Content-Transfer-Encoding Header Field
   * @see Requirement 7.8 - Decode content based on Content-Transfer-Encoding
   * @see Requirement 14.9 - Decode body according to Content-Transfer-Encoding header
   *
   * @example
   * ```typescript
   * const parser = new EmailParser();
   * const ct = createContentType('text', 'plain');
   * const body = new TextEncoder().encode('SGVsbG8=');
   * const decoded = parser.parseBody(body, ct, ContentTransferEncoding.Base64);
   * // decoded contains bytes for 'Hello'
   * ```
   */
  parseBody(
    body: Uint8Array,
    contentType: IContentType,
    encoding: ContentTransferEncoding,
  ): Uint8Array {
    switch (encoding) {
      case ContentTransferEncoding.SevenBit:
      case ContentTransferEncoding.EightBit:
      case ContentTransferEncoding.Binary:
        // No decoding needed for these encodings
        return body;

      case ContentTransferEncoding.QuotedPrintable:
        return this.decodeQuotedPrintable(body);

      case ContentTransferEncoding.Base64:
        return this.decodeBase64(body);

      default:
        // Unknown encoding, return as-is
        return body;
    }
  }

  /**
   * Parses a multipart MIME body into an array of IMimePart objects.
   *
   * Splits the body by the given boundary delimiter, parses each part's
   * headers and body, and recursively handles nested multipart structures.
   * Preamble text (before the first boundary) and epilogue text (after the
   * final boundary) are handled gracefully and ignored per RFC 2046.
   *
   * @param body - The raw multipart body as Uint8Array
   * @param boundary - The boundary string from the Content-Type header
   * @returns Array of parsed IMimePart objects
   * @throws {EmailError} With MALFORMED_MIME if the boundary is missing or body is malformed
   *
   * @see RFC 2046 Section 5.1 - Multipart Media Type
   * @see Requirement 6.7 - Parse nested multipart structures
   * @see Requirement 6.8 - Handle preamble and epilogue text
   *
   * @example
   * ```typescript
   * const parser = new EmailParser();
   * const body = new TextEncoder().encode(
   *   '--boundary\r\nContent-Type: text/plain\r\n\r\nHello\r\n--boundary--'
   * );
   * const parts = parser.parseMultipart(body, 'boundary');
   * // [{ contentType: { type: 'text', subtype: 'plain', ... }, body: ..., size: 5 }]
   * ```
   */
  parseMultipart(body: Uint8Array, boundary: string): IMimePart[] {
    if (!boundary) {
      throw new EmailError(
        EmailErrorType.MALFORMED_MIME,
        'Boundary string is required for multipart parsing',
        { boundary },
      );
    }

    const bodyStr = new TextDecoder().decode(body);

    // Boundary delimiters per RFC 2046 Section 5.1.1
    const dashBoundary = `--${boundary}`;
    const closingBoundary = `--${boundary}--`;

    // Find the first boundary - everything before it is preamble (ignored per RFC 2046)
    const firstBoundaryIndex = bodyStr.indexOf(dashBoundary);
    if (firstBoundaryIndex === -1) {
      // No boundary found - return empty parts array
      return [];
    }

    // Find the closing boundary - everything after it is epilogue (ignored per RFC 2046)
    const closingBoundaryIndex = bodyStr.indexOf(closingBoundary);

    // Extract the content between first boundary and closing boundary
    const contentArea =
      closingBoundaryIndex !== -1
        ? bodyStr.substring(firstBoundaryIndex, closingBoundaryIndex)
        : bodyStr.substring(firstBoundaryIndex);

    // Split by boundary delimiter to get individual parts
    // Each boundary line starts with --boundary and is followed by CRLF or LF
    const parts: IMimePart[] = [];
    const boundaryRegex = new RegExp(
      this.escapeRegExp(dashBoundary) + '[ \\t]*(?:\\r?\\n)',
      'g',
    );

    // Find all boundary positions
    const boundaryPositions: number[] = [];
    let match: RegExpExecArray | null;
    while ((match = boundaryRegex.exec(contentArea)) !== null) {
      boundaryPositions.push(match.index + match[0].length);
    }

    if (boundaryPositions.length === 0) {
      return [];
    }

    // Extract each part between consecutive boundaries
    for (let i = 0; i < boundaryPositions.length; i++) {
      const partStart = boundaryPositions[i];
      let partEnd: number;

      if (i + 1 < boundaryPositions.length) {
        // Find the start of the next boundary line (go back to find the --boundary)
        const nextBoundaryLineStart = contentArea.lastIndexOf(
          dashBoundary,
          boundaryPositions[i + 1],
        );
        // Remove trailing CRLF before the boundary
        partEnd = nextBoundaryLineStart;
        // Strip trailing \r\n or \n before the boundary delimiter
        if (partEnd > 0 && contentArea[partEnd - 1] === '\n') {
          partEnd--;
        }
        if (partEnd > 0 && contentArea[partEnd - 1] === '\r') {
          partEnd--;
        }
      } else {
        // Last part - goes to end of content area
        partEnd = contentArea.length;
        // Strip trailing \r\n or \n
        if (partEnd > 0 && contentArea[partEnd - 1] === '\n') {
          partEnd--;
        }
        if (partEnd > 0 && contentArea[partEnd - 1] === '\r') {
          partEnd--;
        }
      }

      if (partStart > partEnd) {
        continue;
      }

      const partContent = contentArea.substring(partStart, partEnd);
      const mimePart = this.parseSinglePart(partContent);
      parts.push(mimePart);
    }

    return parts;
  }

  /**
   * Parses a single MIME part (headers + body) into an IMimePart object.
   *
   * @param partContent - The raw content of a single MIME part (headers + blank line + body)
   * @returns The parsed IMimePart object
   */
  private parseSinglePart(partContent: string): IMimePart {
    // Split headers from body at the first blank line (CRLF CRLF or LF LF)
    const headerBodySeparator = partContent.match(/\r?\n\r?\n/);

    let headerSection: string;
    let bodyContent: string;

    if (headerBodySeparator && headerBodySeparator.index !== undefined) {
      headerSection = partContent.substring(0, headerBodySeparator.index);
      bodyContent = partContent.substring(
        headerBodySeparator.index + headerBodySeparator[0].length,
      );
    } else {
      // No blank line found - treat entire content as body with default headers
      headerSection = '';
      bodyContent = partContent;
    }

    // Parse headers
    const headers = this.parseHeaders(headerSection);

    // Parse Content-Type (default to text/plain; charset=us-ascii per RFC 2046)
    let contentType: IContentType;
    const contentTypeValues = headers.get('content-type');
    if (contentTypeValues && contentTypeValues.length > 0) {
      try {
        contentType = this.parseContentType(contentTypeValues[0]);
      } catch {
        contentType = createContentType(
          'text',
          'plain',
          new Map([['charset', 'us-ascii']]),
        );
      }
    } else {
      contentType = createContentType(
        'text',
        'plain',
        new Map([['charset', 'us-ascii']]),
      );
    }

    // Parse Content-Transfer-Encoding
    let contentTransferEncoding: ContentTransferEncoding | undefined;
    const cteValues = headers.get('content-transfer-encoding');
    if (cteValues && cteValues.length > 0) {
      const cteStr = cteValues[0].trim().toLowerCase();
      const validEncodings: Record<string, ContentTransferEncoding> = {
        '7bit': ContentTransferEncoding.SevenBit,
        '8bit': ContentTransferEncoding.EightBit,
        binary: ContentTransferEncoding.Binary,
        'quoted-printable': ContentTransferEncoding.QuotedPrintable,
        base64: ContentTransferEncoding.Base64,
      };
      contentTransferEncoding = validEncodings[cteStr];
    }

    // Parse Content-Disposition
    let contentDisposition: IContentDisposition | undefined;
    const cdValues = headers.get('content-disposition');
    if (cdValues && cdValues.length > 0) {
      contentDisposition = this.parseContentDisposition(cdValues[0]);
    }

    // Parse Content-ID
    let contentId: string | undefined;
    const cidValues = headers.get('content-id');
    if (cidValues && cidValues.length > 0) {
      contentId = cidValues[0].trim();
    }

    // Parse Content-Description
    let contentDescription: string | undefined;
    const cdescValues = headers.get('content-description');
    if (cdescValues && cdescValues.length > 0) {
      contentDescription = cdescValues[0].trim();
    }

    // Check if this is a nested multipart
    if (contentType.type === 'multipart') {
      const nestedBoundary = contentType.parameters.get('boundary');
      if (nestedBoundary) {
        const bodyBytes = new TextEncoder().encode(bodyContent);
        const nestedParts = this.parseMultipart(bodyBytes, nestedBoundary);
        return {
          contentType,
          contentTransferEncoding,
          contentDisposition,
          contentId,
          contentDescription,
          parts: nestedParts,
          size: bodyBytes.length,
        };
      }
    }

    // Decode body based on Content-Transfer-Encoding
    const rawBodyBytes = new TextEncoder().encode(bodyContent);
    const decodedBody = contentTransferEncoding
      ? this.parseBody(rawBodyBytes, contentType, contentTransferEncoding)
      : rawBodyBytes;

    return {
      contentType,
      contentTransferEncoding,
      contentDisposition,
      contentId,
      contentDescription,
      body: decodedBody,
      size: decodedBody.length,
    };
  }

  /**
   * Parses a Content-Disposition header value into an IContentDisposition object.
   *
   * @param dispositionString - The Content-Disposition header value
   * @returns The parsed IContentDisposition object
   */
  private parseContentDisposition(
    dispositionString: string,
  ): IContentDisposition {
    const trimmed = dispositionString.trim();

    // Split on first semicolon to separate disposition type from parameters
    const semicolonIndex = trimmed.indexOf(';');
    const typePart =
      semicolonIndex >= 0
        ? trimmed.substring(0, semicolonIndex).trim().toLowerCase()
        : trimmed.toLowerCase();
    const paramsPart =
      semicolonIndex >= 0 ? trimmed.substring(semicolonIndex + 1).trim() : '';

    const dispositionType: 'inline' | 'attachment' =
      typePart === 'inline' ? 'inline' : 'attachment';

    const parameters = new Map<string, string>();
    if (paramsPart) {
      this.parseContentTypeParameters(paramsPart, parameters);
    }

    const result: IContentDisposition = {
      type: dispositionType,
    };

    const filename = parameters.get('filename');
    if (filename) {
      result.filename = filename;
    }

    const creationDate = parameters.get('creation-date');
    if (creationDate) {
      const d = new Date(creationDate);
      if (!isNaN(d.getTime())) {
        result.creationDate = d;
      }
    }

    const modificationDate = parameters.get('modification-date');
    if (modificationDate) {
      const d = new Date(modificationDate);
      if (!isNaN(d.getTime())) {
        result.modificationDate = d;
      }
    }

    const readDate = parameters.get('read-date');
    if (readDate) {
      const d = new Date(readDate);
      if (!isNaN(d.getTime())) {
        result.readDate = d;
      }
    }

    const size = parameters.get('size');
    if (size) {
      const s = parseInt(size, 10);
      if (!isNaN(s)) {
        result.size = s;
      }
    }

    return result;
  }

  /**
   * Escapes special regex characters in a string for use in a RegExp.
   *
   * @param str - The string to escape
   * @returns The escaped string safe for use in RegExp
   */
  private escapeRegExp(str: string): string {
    return str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  }

  /**
   * Parses a raw email (string or Uint8Array) into an IEmailMetadata object.
   *
   * Uses `PostalMime.parse()` as the core parsing engine, then converts
   * postal-mime's Email type to the IEmailMetadata interface. Handles both
   * CRLF and LF line endings (postal-mime handles this internally).
   *
   * @param rawEmail - The raw email as a string or Uint8Array
   * @returns The parsed IEmailMetadata object
   * @throws {EmailError} With PARSE_ERROR if parsing fails
   *
   * @see RFC 5322 - Internet Message Format
   * @see Requirement 14.5 - Handle both CRLF and LF line endings
   *
   * @example
   * ```typescript
   * const parser = new EmailParser();
   * const metadata = await parser.parse(rawEmailString);
   * console.log(metadata.from.address); // "sender@example.com"
   * console.log(metadata.subject);      // "Hello World"
   * ```
   */
  async parse(rawEmail: string | Uint8Array): Promise<IEmailMetadata> {
    if (
      !rawEmail ||
      (typeof rawEmail === 'string' && rawEmail.trim().length === 0) ||
      (rawEmail instanceof Uint8Array && rawEmail.length === 0)
    ) {
      throw new EmailError(
        EmailErrorType.PARSE_ERROR,
        'Raw email input is empty',
        { input: typeof rawEmail },
      );
    }

    let parsed: PostalEmail;
    try {
      parsed = await PostalMime.parse(rawEmail);
    } catch (error) {
      throw new EmailError(
        EmailErrorType.PARSE_ERROR,
        `Failed to parse email: ${error instanceof Error ? error.message : String(error)}`,
        { error: String(error) },
      );
    }

    try {
      return this.convertPostalEmailToMetadata(parsed);
    } catch (error) {
      if (error instanceof EmailError) {
        throw error;
      }
      throw new EmailError(
        EmailErrorType.PARSE_ERROR,
        `Failed to convert parsed email to metadata: ${error instanceof Error ? error.message : String(error)}`,
        { error: String(error) },
      );
    }
  }

  /**
   * Converts a postal-mime Email object to IEmailMetadata.
   *
   * @param email - The postal-mime parsed Email object
   * @returns The converted IEmailMetadata object
   */
  private convertPostalEmailToMetadata(email: PostalEmail): IEmailMetadata {
    // Parse From address (required)
    const from = this.convertPostalAddressToMailbox(email.from);
    if (!from) {
      throw new EmailError(
        EmailErrorType.MISSING_REQUIRED_HEADER,
        'From header is missing or invalid',
        {},
      );
    }

    // Parse Sender (optional)
    const sender = email.sender
      ? this.convertPostalAddressToMailbox(email.sender)
      : undefined;

    // Parse Reply-To (optional)
    const replyTo = email.replyTo
      ? email.replyTo
          .map((addr) => this.convertPostalAddressToMailbox(addr))
          .filter((mb): mb is IMailbox => mb !== undefined)
      : undefined;

    // Parse To (default to empty array)
    const to = email.to
      ? email.to.flatMap((addr) => this.convertPostalAddressToMailboxes(addr))
      : [];

    // Parse Cc (optional)
    const cc = email.cc
      ? email.cc.flatMap((addr) => this.convertPostalAddressToMailboxes(addr))
      : undefined;

    // Parse Bcc (optional)
    const bcc = email.bcc
      ? email.bcc.flatMap((addr) => this.convertPostalAddressToMailboxes(addr))
      : undefined;

    // Parse Message-ID
    const messageId =
      email.messageId ||
      `<${Date.now()}.${Math.random().toString(36).substring(2)}@parsed>`;

    // Parse In-Reply-To (optional)
    const inReplyTo = email.inReplyTo || undefined;

    // Parse References (optional) - postal-mime returns as a single string
    const references = email.references
      ? this.parseMessageIdList(email.references).map((id) => id)
      : undefined;

    // Subject
    const subject = email.subject || undefined;

    // Parse Date
    const date = email.date ? new Date(email.date) : new Date();
    if (isNaN(date.getTime())) {
      // Fallback to current date if parsing fails
      date.setTime(Date.now());
    }

    // Parse Content-Type from headers
    const contentTypeHeader = this.findHeader(email.headers, 'content-type');
    let contentType: IContentType;
    if (contentTypeHeader) {
      try {
        contentType = this.parseContentType(contentTypeHeader);
      } catch {
        contentType = createContentType(
          'text',
          'plain',
          new Map([['charset', 'us-ascii']]),
        );
      }
    } else {
      contentType = createContentType(
        'text',
        'plain',
        new Map([['charset', 'us-ascii']]),
      );
    }

    // Parse Content-Transfer-Encoding from headers
    const cteHeader = this.findHeader(
      email.headers,
      'content-transfer-encoding',
    );
    let contentTransferEncoding: ContentTransferEncoding | undefined;
    if (cteHeader) {
      const cteMap: Record<string, ContentTransferEncoding> = {
        '7bit': ContentTransferEncoding.SevenBit,
        '8bit': ContentTransferEncoding.EightBit,
        binary: ContentTransferEncoding.Binary,
        'quoted-printable': ContentTransferEncoding.QuotedPrintable,
        base64: ContentTransferEncoding.Base64,
      };
      contentTransferEncoding = cteMap[cteHeader.trim().toLowerCase()];
    }

    // Parse MIME-Version from headers (default to "1.0")
    const mimeVersion = this.findHeader(email.headers, 'mime-version') || '1.0';

    // Build custom headers map (non-standard headers)
    const customHeaders = this.extractCustomHeaders(email.headers);

    // Parse Comments from headers (optional, can appear multiple times)
    const commentsHeaders = this.findAllHeaders(email.headers, 'comments');
    const comments = commentsHeaders.length > 0 ? commentsHeaders : undefined;

    // Parse Keywords from headers (optional)
    const keywordsHeaders = this.findAllHeaders(email.headers, 'keywords');
    const keywords =
      keywordsHeaders.length > 0
        ? keywordsHeaders.flatMap((kw) =>
            kw
              .split(',')
              .map((k) => k.trim())
              .filter((k) => k.length > 0),
          )
        : undefined;

    // Build MIME parts from text/html content and attachments
    const parts = this.buildMimeParts(email);

    // Convert attachments to IAttachmentMetadata[]
    const attachments = this.convertAttachments(email.attachments);

    // Build the IEmailMetadata object
    const now = new Date();
    const metadata: IEmailMetadata = {
      // IBlockMetadata fields (defaults for parsed emails)
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

      // IMessageMetadata fields (defaults for parsed emails)
      messageType: 'email',
      senderId: from.address,
      recipients: to.map((r) => r.address),
      priority: MessagePriority.NORMAL,
      deliveryStatus: new Map<string, DeliveryStatus>(),
      acknowledgments: new Map<string, Date>(),
      encryptionScheme: MessageEncryptionScheme.NONE,
      isCBL: false,

      // IEmailMetadata fields
      from,
      sender,
      replyTo: replyTo && replyTo.length > 0 ? replyTo : undefined,
      to,
      cc: cc && cc.length > 0 ? cc : undefined,
      bcc: bcc && bcc.length > 0 ? bcc : undefined,
      messageId,
      inReplyTo,
      references: references && references.length > 0 ? references : undefined,
      subject,
      comments,
      keywords,
      date,
      mimeVersion,
      contentType,
      contentTransferEncoding,
      customHeaders,
      parts: parts.length > 0 ? parts : undefined,
      attachments: attachments.length > 0 ? attachments : undefined,
      deliveryReceipts: new Map(),
      readReceipts: new Map(),
    };

    return metadata;
  }

  /**
   * Converts a postal-mime Address to an IMailbox (single mailbox).
   * Returns undefined if the address cannot be converted.
   */
  private convertPostalAddressToMailbox(
    address: PostalAddress | undefined,
  ): IMailbox | undefined {
    if (!address) {
      return undefined;
    }

    // If it's a group address, return the first mailbox or undefined
    if (address.group) {
      if (address.group.length > 0) {
        return this.convertPostalMailboxToIMailbox(address.group[0]);
      }
      return undefined;
    }

    // It's a regular mailbox
    return this.convertPostalMailboxToIMailbox(
      address as { name: string; address: string },
    );
  }

  /**
   * Converts a postal-mime Address to an array of IMailbox objects.
   * Handles both individual mailboxes and group addresses.
   */
  private convertPostalAddressToMailboxes(address: PostalAddress): IMailbox[] {
    if (address.group) {
      return address.group
        .map((mb) => this.convertPostalMailboxToIMailbox(mb))
        .filter((mb): mb is IMailbox => mb !== undefined);
    }

    const mailbox = this.convertPostalMailboxToIMailbox(
      address as { name: string; address: string },
    );
    return mailbox ? [mailbox] : [];
  }

  /**
   * Converts a postal-mime Mailbox to an IMailbox.
   */
  private convertPostalMailboxToIMailbox(mailbox: {
    name: string;
    address: string;
  }): IMailbox | undefined {
    if (!mailbox.address) {
      return undefined;
    }

    const atIndex = mailbox.address.lastIndexOf('@');
    if (atIndex <= 0) {
      return undefined;
    }

    const localPart = mailbox.address.substring(0, atIndex);
    const domain = mailbox.address.substring(atIndex + 1);

    return createMailbox(localPart, domain, mailbox.name || undefined);
  }

  /**
   * Finds the first header value matching the given key (case-insensitive).
   */
  private findHeader(
    headers: Array<{ key: string; value: string }>,
    key: string,
  ): string | undefined {
    const lowerKey = key.toLowerCase();
    const header = headers.find((h) => h.key.toLowerCase() === lowerKey);
    return header?.value;
  }

  /**
   * Finds all header values matching the given key (case-insensitive).
   */
  private findAllHeaders(
    headers: Array<{ key: string; value: string }>,
    key: string,
  ): string[] {
    const lowerKey = key.toLowerCase();
    return headers
      .filter((h) => h.key.toLowerCase() === lowerKey)
      .map((h) => h.value);
  }

  /**
   * Extracts custom/extension headers (X-* and other non-standard headers).
   * Standard RFC 5322 headers are excluded.
   */
  private extractCustomHeaders(
    headers: Array<{ key: string; value: string }>,
  ): Map<string, string[]> {
    const standardHeaders = new Set([
      'from',
      'sender',
      'reply-to',
      'to',
      'cc',
      'bcc',
      'message-id',
      'in-reply-to',
      'references',
      'subject',
      'comments',
      'keywords',
      'date',
      'mime-version',
      'content-type',
      'content-transfer-encoding',
      'content-disposition',
      'content-id',
      'content-description',
      'received',
      'return-path',
      'delivered-to',
    ]);

    const customHeaders = new Map<string, string[]>();

    for (const header of headers) {
      const lowerKey = header.key.toLowerCase();
      if (!standardHeaders.has(lowerKey)) {
        const existing = customHeaders.get(lowerKey);
        if (existing) {
          existing.push(header.value);
        } else {
          customHeaders.set(lowerKey, [header.value]);
        }
      }
    }

    return customHeaders;
  }

  /**
   * Builds IMimePart[] from postal-mime's parsed email content.
   * Creates parts from text, html, and attachment content.
   */
  private buildMimeParts(email: PostalEmail): IMimePart[] {
    const parts: IMimePart[] = [];

    // Add text part if present
    if (email.text !== undefined && email.text !== null) {
      const textBytes = new TextEncoder().encode(email.text);
      parts.push({
        contentType: createContentType(
          'text',
          'plain',
          new Map([['charset', 'utf-8']]),
        ),
        body: textBytes,
        size: textBytes.length,
      });
    }

    // Add HTML part if present
    if (email.html !== undefined && email.html !== null) {
      const htmlBytes = new TextEncoder().encode(email.html);
      parts.push({
        contentType: createContentType(
          'text',
          'html',
          new Map([['charset', 'utf-8']]),
        ),
        body: htmlBytes,
        size: htmlBytes.length,
      });
    }

    // Add inline attachments as parts
    for (const attachment of email.attachments) {
      if (attachment.disposition === 'inline' || attachment.related) {
        const contentBytes = this.convertAttachmentContent(attachment);
        const ct = this.parseAttachmentContentType(attachment.mimeType);

        const part: IMimePart = {
          contentType: ct,
          body: contentBytes,
          size: contentBytes.length,
          contentId: attachment.contentId || undefined,
          contentDescription: attachment.description || undefined,
          contentDisposition: {
            type: 'inline',
            filename: attachment.filename || undefined,
          },
        };
        parts.push(part);
      }
    }

    return parts;
  }

  /**
   * Converts postal-mime attachments to IAttachmentMetadata[].
   */
  private convertAttachments(
    attachments: PostalAttachment[],
  ): IAttachmentMetadata[] {
    return attachments
      .filter((att) => att.disposition !== 'inline' && !att.related)
      .map((att) => this.convertSingleAttachment(att));
  }

  /**
   * Converts a single postal-mime Attachment to IAttachmentMetadata.
   */
  private convertSingleAttachment(
    attachment: PostalAttachment,
  ): IAttachmentMetadata {
    const contentBytes = this.convertAttachmentContent(attachment);

    return {
      filename: attachment.filename || 'unnamed',
      mimeType: attachment.mimeType,
      size: contentBytes.length,
      contentId: attachment.contentId || undefined,
      cblMagnetUrl: '', // Will be populated when stored in CBL
      blockIds: [], // Will be populated when stored in CBL
      checksum: '', // Will be calculated when stored
    };
  }

  /**
   * Converts postal-mime attachment content to Uint8Array.
   */
  private convertAttachmentContent(attachment: PostalAttachment): Uint8Array {
    if (attachment.content instanceof ArrayBuffer) {
      return new Uint8Array(attachment.content);
    }
    if (typeof attachment.content === 'string') {
      // Content is a string (possibly base64 encoded)
      if (attachment.encoding === 'base64') {
        return new Uint8Array(Buffer.from(attachment.content, 'base64'));
      }
      return new TextEncoder().encode(attachment.content);
    }
    return new Uint8Array(0);
  }

  /**
   * Parses an attachment's MIME type string into an IContentType.
   */
  private parseAttachmentContentType(mimeType: string): IContentType {
    try {
      return this.parseContentType(mimeType);
    } catch {
      return createContentType('application', 'octet-stream');
    }
  }
}
