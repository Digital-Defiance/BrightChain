/**
 * @fileoverview Property-based tests for EmailSerializer
 *
 * **Feature: email-messaging-protocol**
 *
 * This test suite verifies:
 * - Property 14: Header Folding/Unfolding Inverse
 * - Property 13: Content-Transfer-Encoding Consistency
 * - Property 4: Multipart Boundary Uniqueness
 *
 * **Validates: Requirements 14.2, 14.4, 7.6, 7.8, 14.8, 14.9, 6.5**
 *
 * Per RFC 5322 Section 2.2.3, long header lines should be folded by inserting
 * CRLF before existing whitespace. Unfolding reverses this by removing CRLF
 * followed by whitespace (WSP). The round-trip property states: for any valid
 * header line, folding it using EmailSerializer.foldHeader() and then unfolding
 * using EmailParser.unfoldHeaders() SHALL produce the original header line.
 *
 * Per RFC 2045, binary content SHALL be encoded using base64 Content-Transfer-Encoding,
 * and the parser SHALL decode it back to the original binary content. Similarly,
 * quoted-printable encoding/decoding SHALL preserve data integrity.
 */

import fc from 'fast-check';
import {
  type IMimePart,
  createContentType,
} from '../../interfaces/messaging/mimePart';
import { EmailParser } from './emailParser';
import { EmailSerializer } from './emailSerializer';

// Feature: email-messaging-protocol, Property 14: Header Folding/Unfolding Inverse

// ─── Generators ─────────────────────────────────────────────────────────────

/**
 * Generator for valid RFC 5322 header field names.
 * Printable US-ASCII characters (33-126) excluding colon (:, char code 58).
 * Reasonable length 1-40 characters.
 */
const arbHeaderName = fc
  .array(
    fc.integer({ min: 33, max: 126 }).filter((code) => code !== 58),
    { minLength: 1, maxLength: 40 },
  )
  .map((codes) => String.fromCharCode(...codes));

/**
 * Generator for header value words (printable ASCII tokens without spaces).
 * These represent individual "words" in a header value.
 */
const arbHeaderWord = fc
  .array(fc.integer({ min: 33, max: 126 }), { minLength: 1, maxLength: 30 })
  .map((codes) => String.fromCharCode(...codes));

/**
 * Generator for a short header value that won't trigger folding.
 * Produces a value with a few words separated by spaces, total < 40 chars.
 */
const arbShortHeaderValue = fc
  .array(arbHeaderWord, { minLength: 1, maxLength: 3 })
  .map((words) => words.join(' '))
  .filter((val) => val.length < 40);

/**
 * Generator for a long header value that will trigger folding.
 * Produces a value with many words separated by spaces, total > 78 chars.
 */
const arbLongHeaderValue = fc
  .array(arbHeaderWord, { minLength: 5, maxLength: 20 })
  .map((words) => words.join(' '))
  .filter((val) => val.length > 60);

/**
 * Generator for header values with multiple consecutive spaces.
 * Tests that folding/unfolding handles multi-space sequences.
 */
const arbValueWithMultipleSpaces = fc
  .array(fc.tuple(arbHeaderWord, fc.constantFrom(' ', '  ', '   ')), {
    minLength: 3,
    maxLength: 10,
  })
  .map((pairs) =>
    pairs
      .map(([word, sep]) => word + sep)
      .join('')
      .trim(),
  );

/**
 * Generator for a complete header line in "Name: Value" format.
 * Combines a valid header name with a value of varying length.
 */
const arbHeaderLine = fc
  .tuple(arbHeaderName, fc.oneof(arbShortHeaderValue, arbLongHeaderValue))
  .map(([name, value]) => `${name}: ${value}`);

/**
 * Generator for a long header line that is guaranteed to exceed 78 chars.
 * This ensures folding will actually occur.
 */
const arbLongHeaderLine = fc
  .tuple(arbHeaderName, arbLongHeaderValue)
  .map(([name, value]) => `${name}: ${value}`)
  .filter((line) => line.length > 78);

/**
 * Generator for a header line with tab characters as whitespace.
 */
const arbHeaderLineWithTabs = fc
  .tuple(
    arbHeaderName,
    fc.array(arbHeaderWord, { minLength: 3, maxLength: 15 }),
  )
  .map(([name, words]) => {
    // Mix spaces and tabs between words
    const value = words
      .map((w, i) => (i > 0 ? (i % 3 === 0 ? '\t' : ' ') : '') + w)
      .join('');
    return `${name}: ${value}`;
  });

// ─── Tests ──────────────────────────────────────────────────────────────────

describe('EmailSerializer Property Tests', () => {
  let serializer: EmailSerializer;
  let parser: EmailParser;

  beforeEach(() => {
    serializer = new EmailSerializer();
    parser = new EmailParser();
  });

  describe('Property 14: Header Folding/Unfolding Inverse', () => {
    // ── Core Round-Trip Property ────────────────────────────────────────

    /**
     * **Feature: email-messaging-protocol, Property 14: Header Folding/Unfolding Inverse**
     *
     * *For any* valid header line, folding it using EmailSerializer.foldHeader()
     * and then unfolding using EmailParser.unfoldHeaders() SHALL produce the
     * original header line.
     *
     * **Validates: Requirements 14.2, 14.4**
     */
    it('should produce the original header line after fold then unfold for any header line', () => {
      fc.assert(
        fc.property(arbHeaderLine, (headerLine) => {
          const folded = serializer.foldHeader(headerLine);
          const unfolded = parser.unfoldHeaders(folded);

          expect(unfolded).toBe(headerLine);
        }),
        { numRuns: 100 },
      );
    });

    // ── Long Lines That Require Folding ─────────────────────────────────

    /**
     * **Feature: email-messaging-protocol, Property 14: Header Folding/Unfolding Inverse**
     *
     * *For any* header line exceeding 78 characters, folding and then unfolding
     * SHALL produce the original header line. This specifically tests lines
     * that are guaranteed to trigger the folding logic.
     *
     * **Validates: Requirements 14.2, 14.4**
     */
    it('should produce the original header line after fold then unfold for long lines that require folding', () => {
      fc.assert(
        fc.property(arbLongHeaderLine, (headerLine) => {
          const folded = serializer.foldHeader(headerLine);
          const unfolded = parser.unfoldHeaders(folded);

          // The folded version should contain CRLF (actual folding occurred)
          expect(folded).toContain('\r\n');
          // Unfolding should recover the original
          expect(unfolded).toBe(headerLine);
        }),
        { numRuns: 100 },
      );
    });

    // ── Short Lines (No Folding Needed) ─────────────────────────────────

    /**
     * **Feature: email-messaging-protocol, Property 14: Header Folding/Unfolding Inverse**
     *
     * *For any* header line within the 78-character limit, folding SHALL
     * return the line unchanged, and unfolding that result SHALL also
     * produce the original line.
     *
     * **Validates: Requirements 14.2, 14.4**
     */
    it('should return short lines unchanged through fold then unfold', () => {
      fc.assert(
        fc.property(
          fc
            .tuple(arbHeaderName, arbShortHeaderValue)
            .map(([name, value]) => `${name}: ${value}`)
            .filter((line) => line.length <= 78),
          (headerLine) => {
            const folded = serializer.foldHeader(headerLine);

            // Short lines should not be folded
            expect(folded).toBe(headerLine);

            // Unfolding should also produce the original
            const unfolded = parser.unfoldHeaders(folded);
            expect(unfolded).toBe(headerLine);
          },
        ),
        { numRuns: 100 },
      );
    });

    // ── Lines with Tab Characters ───────────────────────────────────────

    /**
     * **Feature: email-messaging-protocol, Property 14: Header Folding/Unfolding Inverse**
     *
     * *For any* header line containing tab characters as whitespace,
     * folding and then unfolding SHALL produce the original header line.
     * RFC 5322 allows both spaces and tabs as folding whitespace.
     *
     * **Validates: Requirements 14.2, 14.4**
     */
    it('should produce the original header line after fold then unfold for lines with tabs', () => {
      fc.assert(
        fc.property(arbHeaderLineWithTabs, (headerLine) => {
          const folded = serializer.foldHeader(headerLine);
          const unfolded = parser.unfoldHeaders(folded);

          expect(unfolded).toBe(headerLine);
        }),
        { numRuns: 100 },
      );
    });

    // ── Lines with Multiple Consecutive Spaces ──────────────────────────

    /**
     * **Feature: email-messaging-protocol, Property 14: Header Folding/Unfolding Inverse**
     *
     * *For any* header line containing multiple consecutive spaces in the value,
     * folding and then unfolding SHALL preserve those spaces exactly.
     *
     * **Validates: Requirements 14.2, 14.4**
     */
    it('should preserve multiple consecutive spaces through fold then unfold', () => {
      fc.assert(
        fc.property(
          fc
            .tuple(arbHeaderName, arbValueWithMultipleSpaces)
            .map(([name, value]) => `${name}: ${value}`),
          (headerLine) => {
            const folded = serializer.foldHeader(headerLine);
            const unfolded = parser.unfoldHeaders(folded);

            expect(unfolded).toBe(headerLine);
          },
        ),
        { numRuns: 100 },
      );
    });

    // ── Folded Lines Respect Max Length ──────────────────────────────────

    /**
     * **Feature: email-messaging-protocol, Property 14: Header Folding/Unfolding Inverse**
     *
     * *For any* header line that requires folding, each resulting line segment
     * after folding SHOULD not exceed the max line length (78 chars), unless
     * there is no whitespace boundary to fold at.
     *
     * **Validates: Requirements 14.2, 14.4**
     */
    it('should produce folded lines where each segment respects the max length when possible', () => {
      fc.assert(
        fc.property(arbLongHeaderLine, (headerLine) => {
          const folded = serializer.foldHeader(headerLine);
          const lines = folded.split('\r\n');

          for (const line of lines) {
            // Each line should be <= 78 chars, unless it contains no
            // whitespace to fold at (a single very long token)
            if (line.length > 78) {
              // Verify there's no whitespace to fold at in this segment
              const hasWhitespace = /[ \t]/.test(line.substring(1));
              expect(hasWhitespace).toBe(false);
            }
          }
        }),
        { numRuns: 100 },
      );
    });
  });

  // Feature: email-messaging-protocol, Property 13: Content-Transfer-Encoding Consistency

  // ─── Property 13 Generators ─────────────────────────────────────────────────

  describe('Property 13: Content-Transfer-Encoding Consistency', () => {
    /**
     * Generator for arbitrary binary data of various sizes (0-1000 bytes).
     * Covers the full byte range 0-255.
     */
    const arbBinaryData = fc
      .array(fc.integer({ min: 0, max: 255 }), {
        minLength: 0,
        maxLength: 1000,
      })
      .map((bytes) => new Uint8Array(bytes));

    /**
     * Generator for binary data that specifically contains non-ASCII bytes (> 127).
     * Ensures at least one byte is outside the 7-bit ASCII range.
     */
    const arbNonAsciiBinaryData = fc
      .tuple(
        fc.array(fc.integer({ min: 0, max: 255 }), {
          minLength: 0,
          maxLength: 500,
        }),
        fc.integer({ min: 128, max: 255 }),
        fc.array(fc.integer({ min: 0, max: 255 }), {
          minLength: 0,
          maxLength: 500,
        }),
      )
      .map(
        ([prefix, nonAscii, suffix]) =>
          new Uint8Array([...prefix, nonAscii, ...suffix]),
      );

    /**
     * Generator for pure ASCII data (bytes 0-127 only).
     * Useful for comparison testing.
     */
    const arbPureAsciiData = fc
      .array(fc.integer({ min: 32, max: 126 }), {
        minLength: 1,
        maxLength: 500,
      })
      .map((bytes) => new Uint8Array(bytes));

    /**
     * Generator for mixed ASCII/non-ASCII data.
     * Alternates between ASCII and non-ASCII byte ranges.
     */
    const arbMixedData = fc
      .array(
        fc.oneof(
          fc.integer({ min: 32, max: 126 }), // printable ASCII
          fc.integer({ min: 128, max: 255 }), // non-ASCII
          fc.integer({ min: 0, max: 31 }), // control characters
        ),
        { minLength: 1, maxLength: 800 },
      )
      .map((bytes) => new Uint8Array(bytes));

    // ── Base64 Round-Trip ───────────────────────────────────────────────

    /**
     * **Feature: email-messaging-protocol, Property 13: Content-Transfer-Encoding Consistency**
     *
     * *For any* binary data, encoding it with base64 using EmailSerializer.encodeBase64()
     * and then decoding it with EmailParser.decodeBase64() SHALL produce the
     * original binary data byte-for-byte.
     *
     * **Validates: Requirements 7.6, 7.8, 14.8, 14.9**
     */
    it('should round-trip any binary data through base64 encode then decode', () => {
      fc.assert(
        fc.property(arbBinaryData, (originalData) => {
          const encoded = serializer.encodeBase64(originalData);
          const decoded = parser.decodeBase64(encoded);

          expect(decoded.length).toBe(originalData.length);
          expect(Array.from(decoded)).toEqual(Array.from(originalData));
        }),
        { numRuns: 100 },
      );
    });

    // ── Quoted-Printable Round-Trip ─────────────────────────────────────

    /**
     * **Feature: email-messaging-protocol, Property 13: Content-Transfer-Encoding Consistency**
     *
     * *For any* binary data (without bare CR/LF which QP treats as line breaks),
     * encoding it with quoted-printable using EmailSerializer.encodeQuotedPrintable()
     * and then decoding it with EmailParser.decodeQuotedPrintable() SHALL produce
     * the original binary data byte-for-byte.
     *
     * **Validates: Requirements 7.6, 7.8, 14.8, 14.9**
     */
    it('should round-trip binary data through quoted-printable encode then decode', () => {
      // Filter out bare CR (0x0D) and LF (0x0A) since QP treats them as line breaks
      // and the round-trip semantics differ for line endings
      const arbQpSafeData = fc
        .array(
          fc
            .integer({ min: 0, max: 255 })
            .filter((b) => b !== 0x0a && b !== 0x0d),
          { minLength: 0, maxLength: 500 },
        )
        .map((bytes) => new Uint8Array(bytes));

      fc.assert(
        fc.property(arbQpSafeData, (originalData) => {
          const encoded = serializer.encodeQuotedPrintable(originalData);
          const decoded = parser.decodeQuotedPrintable(encoded);

          expect(decoded.length).toBe(originalData.length);
          expect(Array.from(decoded)).toEqual(Array.from(originalData));
        }),
        { numRuns: 100 },
      );
    });

    // ── Non-ASCII Binary Content Uses Valid Base64 ──────────────────────

    /**
     * **Feature: email-messaging-protocol, Property 13: Content-Transfer-Encoding Consistency**
     *
     * *For any* data containing non-ASCII bytes (bytes > 127), base64 encoding
     * SHALL produce output that contains only valid base64 characters
     * (A-Z, a-z, 0-9, +, /, =) and whitespace (CRLF for line breaks).
     *
     * **Validates: Requirements 7.6, 7.8, 14.8, 14.9**
     */
    it('should produce valid base64 output for data containing non-ASCII bytes', () => {
      fc.assert(
        fc.property(arbNonAsciiBinaryData, (binaryData) => {
          const encoded = serializer.encodeBase64(binaryData);
          const encodedStr = new TextDecoder().decode(encoded);

          // Remove CRLF line breaks (valid in base64 per RFC 2045)
          const base64Content = encodedStr.replace(/\r\n/g, '');

          // All remaining characters must be valid base64 characters
          expect(base64Content).toMatch(/^[A-Za-z0-9+/=]*$/);
        }),
        { numRuns: 100 },
      );
    });

    // ── Base64 Encoding Preserves Data Integrity for All Data Types ─────

    /**
     * **Feature: email-messaging-protocol, Property 13: Content-Transfer-Encoding Consistency**
     *
     * *For any* data (pure ASCII, non-ASCII, or mixed), the decoded data from
     * base64 round-trip SHALL be byte-for-byte identical to the original.
     * This tests across all data categories to ensure encoding preserves
     * data integrity universally.
     *
     * **Validates: Requirements 7.6, 7.8, 14.8, 14.9**
     */
    it('should preserve data integrity through base64 for pure ASCII, non-ASCII, and mixed data', () => {
      const arbAnyData = fc.oneof(
        arbPureAsciiData,
        arbNonAsciiBinaryData,
        arbMixedData,
      );

      fc.assert(
        fc.property(arbAnyData, (originalData) => {
          const encoded = serializer.encodeBase64(originalData);
          const decoded = parser.decodeBase64(encoded);

          // Byte-for-byte identical
          expect(decoded.length).toBe(originalData.length);
          for (let i = 0; i < originalData.length; i++) {
            expect(decoded[i]).toBe(originalData[i]);
          }
        }),
        { numRuns: 100 },
      );
    });
  });

  // Feature: email-messaging-protocol, Property 4: Multipart Boundary Uniqueness

  // ─── Property 4 Generators ──────────────────────────────────────────────────

  describe('Property 4: Multipart Boundary Uniqueness', () => {
    /**
     * Generator for printable ASCII text content of varying lengths.
     * Represents typical text that might appear in MIME part bodies.
     */
    const arbTextContent = fc
      .array(fc.integer({ min: 32, max: 126 }), {
        minLength: 1,
        maxLength: 300,
      })
      .map((codes) => String.fromCharCode(...codes));

    /**
     * Generator for content that deliberately contains boundary-like strings.
     * This stress-tests that the generated boundary does not collide with
     * content that resembles boundary patterns (e.g., strings starting with
     * dashes, containing "Part_", or containing "----=").
     */
    const arbBoundaryLikeContent = fc.oneof(
      // Content with leading dashes (common in boundaries)
      fc
        .tuple(
          fc.constantFrom('--', '----', '------', '----=_'),
          fc.string({ minLength: 1, maxLength: 50 }),
        )
        .map(([prefix, suffix]) => prefix + suffix),
      // Content containing "Part_" substring
      fc
        .tuple(
          fc.string({ minLength: 0, maxLength: 20 }),
          fc.constant('Part_'),
          fc.string({ minLength: 0, maxLength: 30 }),
        )
        .map(([pre, mid, post]) => pre + mid + post),
      // Content containing "----=_Part_" (the actual boundary prefix pattern)
      fc
        .tuple(
          fc.string({ minLength: 0, maxLength: 10 }),
          fc.constant('----=_Part_'),
          fc
            .array(
              fc.constantFrom(
                '0',
                '1',
                '2',
                '3',
                '4',
                '5',
                '6',
                '7',
                '8',
                '9',
                'a',
                'b',
                'c',
              ),
              { minLength: 1, maxLength: 20 },
            )
            .map((chars) => chars.join('')),
        )
        .map(([pre, mid, post]) => pre + mid + post),
    );

    /**
     * Generator for a simple IMimePart with text/plain content.
     * Uses the provided text content as the body.
     */
    const arbMimePart = (
      contentArb: fc.Arbitrary<string>,
    ): fc.Arbitrary<IMimePart> =>
      contentArb.map((text) => ({
        contentType: createContentType(
          'text',
          'plain',
          new Map([['charset', 'utf-8']]),
        ),
        body: new TextEncoder().encode(text),
        size: new TextEncoder().encode(text).length,
      }));

    /**
     * Generator for an array of MIME parts with various text content.
     * Produces 1-5 parts with a mix of normal and boundary-like content.
     */
    const arbMimeParts = fc.array(
      arbMimePart(fc.oneof(arbTextContent, arbBoundaryLikeContent)),
      { minLength: 1, maxLength: 5 },
    );

    // ── Boundary Uniqueness Across Calls ────────────────────────────────

    /**
     * **Feature: email-messaging-protocol, Property 4: Multipart Boundary Uniqueness**
     *
     * *For any* set of generated boundaries, all should be unique.
     * Calling generateBoundary() multiple times SHALL produce distinct
     * boundary strings every time.
     *
     * **Validates: Requirements 6.5**
     */
    it('should generate unique boundaries across multiple calls', () => {
      fc.assert(
        fc.property(fc.integer({ min: 2, max: 20 }), (count) => {
          const boundaries = new Set<string>();
          for (let i = 0; i < count; i++) {
            boundaries.add(serializer.generateBoundary());
          }
          // All generated boundaries must be distinct
          expect(boundaries.size).toBe(count);
        }),
        { numRuns: 100 },
      );
    });

    // ── Boundary Not In Part Content ────────────────────────────────────

    /**
     * **Feature: email-messaging-protocol, Property 4: Multipart Boundary Uniqueness**
     *
     * *For any* multipart email created by EmailSerializer, the generated
     * boundary string SHALL NOT appear anywhere in the content of any
     * MIME part within that email.
     *
     * **Validates: Requirements 6.5**
     */
    it('should generate a boundary that does not appear in any part body content', () => {
      fc.assert(
        fc.property(arbMimeParts, (parts) => {
          const boundary = serializer.generateBoundary();

          // The boundary must not appear in any part's body content
          for (const part of parts) {
            if (part.body) {
              const bodyText = new TextDecoder().decode(part.body);
              expect(bodyText).not.toContain(boundary);
            }
          }

          // Also verify via serialization: serialize the multipart message
          // and confirm the boundary only appears as a delimiter, not in content
          const serialized = serializer.serializeMultipart(parts, boundary);
          const serializedStr = new TextDecoder().decode(serialized);

          // Split by boundary delimiters to extract part bodies
          const delimiterPattern = `--${boundary}`;
          const closingDelimiter = `--${boundary}--`;

          // Verify the closing delimiter appears exactly once
          expect(serializedStr).toContain(closingDelimiter);
          const closingCount = serializedStr.split(closingDelimiter).length - 1;
          expect(closingCount).toBe(1);

          // Count boundary occurrences: should be exactly (parts.length + 1)
          // parts.length opening delimiters + 1 closing delimiter
          const delimiterRegex = new RegExp(
            delimiterPattern.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'),
            'g',
          );
          const matches = serializedStr.match(delimiterRegex);
          // Each part gets one "--boundary" and there's one "--boundary--" at the end
          // The closing delimiter also matches the opening pattern, so total = parts.length + 1
          expect(matches).not.toBeNull();
          expect(matches!.length).toBe(parts.length + 1);
        }),
        { numRuns: 100 },
      );
    });

    // ── Generated Boundaries Are Valid Per RFC 2046 ─────────────────────

    /**
     * **Feature: email-messaging-protocol, Property 4: Multipart Boundary Uniqueness**
     *
     * *For any* generated boundary, it SHALL contain only valid characters
     * per RFC 2046 Section 5.1.1. Valid boundary characters are:
     * digits, letters, and the characters '()+_,-./:=? as well as space
     * (but not trailing space). The boundary must be 1-70 characters long.
     *
     * **Validates: Requirements 6.5**
     */
    it('should generate boundaries with only valid RFC 2046 characters and valid length', () => {
      fc.assert(
        fc.property(fc.constant(null), () => {
          const boundary = serializer.generateBoundary();

          // RFC 2046 boundary length: 1-70 characters
          expect(boundary.length).toBeGreaterThanOrEqual(1);
          expect(boundary.length).toBeLessThanOrEqual(70);

          // RFC 2046 bcharsnospace: DIGIT / ALPHA / "'" / "(" / ")" /
          //   "+" / "_" / "," / "-" / "." / "/" / ":" / "=" / "?"
          // bchars: bcharsnospace / " "
          // Boundary must not end with space
          const validBoundaryChars = /^[A-Za-z0-9'()+_,\-./:=? ]*$/;
          expect(boundary).toMatch(validBoundaryChars);
          expect(boundary).not.toMatch(/ $/); // Must not end with space
        }),
        { numRuns: 100 },
      );
    });
  });
});
