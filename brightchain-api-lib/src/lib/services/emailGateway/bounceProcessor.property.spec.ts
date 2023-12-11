/**
 * @fileoverview Property-based tests for BounceProcessor DSN correlation
 *
 * **Feature: email-gateway**
 *
 * This test suite verifies:
 * - Property 8: DSN messages are correctly correlated to original outbound messages via Message-ID
 *
 * **Validates: Requirements 5.4**
 */

import fc from 'fast-check';

import { BounceProcessor } from './bounceProcessor';

// ─── Generators ─────────────────────────────────────────────────────────────

/**
 * Arbitrary that generates valid email local parts (alphanumeric + hyphens/dots).
 * Avoids leading/trailing dots and consecutive dots per RFC 5321.
 */
const arbLocalPart: fc.Arbitrary<string> = fc
  .array(
    fc.constantFrom(...'abcdefghijklmnopqrstuvwxyz0123456789-'.split('')),
    {
      minLength: 1,
      maxLength: 20,
    },
  )
  .map((chars) => chars.join(''));

/**
 * Arbitrary that generates valid domain labels (alphanumeric + hyphens, no leading/trailing hyphen).
 */
const arbDomainLabel: fc.Arbitrary<string> = fc
  .tuple(
    fc.constantFrom(...'abcdefghijklmnopqrstuvwxyz'.split('')),
    fc.array(
      fc.constantFrom(...'abcdefghijklmnopqrstuvwxyz0123456789'.split('')),
      {
        minLength: 0,
        maxLength: 10,
      },
    ),
  )
  .map(([first, rest]) => first + rest.join(''));

/**
 * Arbitrary that generates valid domain names (e.g. "example.com").
 */
const arbDomain: fc.Arbitrary<string> = fc
  .tuple(arbDomainLabel, arbDomainLabel)
  .map(([sub, tld]) => `${sub}.${tld}`);

/**
 * Arbitrary that generates a valid Message-ID in angle-bracket format.
 * Format: <local@domain>
 */
const arbMessageId: fc.Arbitrary<string> = fc
  .tuple(arbLocalPart, arbDomain)
  .map(([local, domain]) => `<${local}@${domain}>`);

/**
 * Arbitrary that generates a canonical domain for VERP testing.
 */
const arbCanonicalDomain: fc.Arbitrary<string> = arbDomain;

// ─── Property Tests ─────────────────────────────────────────────────────────

describe('BounceProcessor DSN Correlation Property Tests', () => {
  describe('Property 8: DSN messages are correctly correlated to original outbound messages via Message-ID', () => {
    /**
     * **Feature: email-gateway, Property 8**
     *
     * *For any* valid Message-ID, constructing a DSN with that Message-ID
     * as Original-Message-ID and parsing it back via parseDsnMessage
     * yields the same Message-ID.
     *
     * **Validates: Requirements 5.4**
     */
    it('parseDsnMessage round-trips Original-Message-ID correctly', () => {
      fc.assert(
        fc.property(arbMessageId, (messageId: string) => {
          const dsnText = [
            'From: mailer-daemon@example.com',
            'To: sender@brightchain.org',
            'Subject: Delivery Status Notification (Failure)',
            'Content-Type: multipart/report; report-type=delivery-status',
            '',
            'This is a delivery status notification.',
            '',
            `Original-Message-ID: ${messageId}`,
            'Final-Recipient: rfc822; recipient@external.com',
            'Action: failed',
            'Status: 5.1.1',
            'Diagnostic-Code: smtp; 550 5.1.1 User unknown',
          ].join('\r\n');

          const parsed = BounceProcessor.parseDsnMessage(dsnText);

          expect(parsed.originalMessageId).toBe(messageId);
        }),
        { numRuns: 200 },
      );
    });

    /**
     * *For any* valid VERP-encoded address with a known canonical domain,
     * parseVerpAddress correctly extracts the original message ID.
     *
     * VERP format: bounces+<local>=<domain>@<canonical>
     * Expected result: <local@domain>
     *
     * **Validates: Requirements 5.4**
     */
    it('parseVerpAddress extracts original message ID from VERP-encoded address', () => {
      fc.assert(
        fc.property(
          arbLocalPart,
          arbDomain,
          arbCanonicalDomain,
          (msgIdLocal: string, msgIdDomain: string, canonical: string) => {
            const verpAddress = `bounces+${msgIdLocal}=${msgIdDomain}@${canonical}`;
            const result = BounceProcessor.parseVerpAddress(
              verpAddress,
              canonical,
            );

            expect(result).toBe(`<${msgIdLocal}@${msgIdDomain}>`);
          },
        ),
        { numRuns: 200 },
      );
    });

    /**
     * Round-trip: for any message-id local part and domain, encoding as
     * VERP then parsing back via parseVerpAddress yields the original
     * message ID in angle-bracket format.
     *
     * This tests the full encode → parse cycle:
     * 1. Start with local + domain
     * 2. Encode as VERP: bounces+<local>=<domain>@<canonical>
     * 3. Parse with parseVerpAddress
     * 4. Result should be <local@domain>
     *
     * **Validates: Requirements 5.4**
     */
    it('VERP encode then parse round-trips to original message ID', () => {
      fc.assert(
        fc.property(
          arbLocalPart,
          arbDomain,
          arbCanonicalDomain,
          (msgIdLocal: string, msgIdDomain: string, canonical: string) => {
            // Encode as VERP
            const verpAddress = `bounces+${msgIdLocal}=${msgIdDomain}@${canonical}`;

            // Parse back
            const result = BounceProcessor.parseVerpAddress(
              verpAddress,
              canonical,
            );

            // Should reconstruct the original message ID
            const expectedMessageId = `<${msgIdLocal}@${msgIdDomain}>`;
            expect(result).toBe(expectedMessageId);
          },
        ),
        { numRuns: 200 },
      );
    });

    /**
     * Negative property: parseVerpAddress returns undefined when the
     * bounce address domain does not match the canonical domain.
     *
     * **Validates: Requirements 5.4**
     */
    it('parseVerpAddress returns undefined for non-matching canonical domain', () => {
      fc.assert(
        fc.property(
          arbLocalPart,
          arbDomain,
          arbCanonicalDomain,
          arbCanonicalDomain,
          (
            msgIdLocal: string,
            msgIdDomain: string,
            canonical: string,
            otherDomain: string,
          ) => {
            // Only test when domains actually differ
            fc.pre(canonical.toLowerCase() !== otherDomain.toLowerCase());

            const verpAddress = `bounces+${msgIdLocal}=${msgIdDomain}@${otherDomain}`;
            const result = BounceProcessor.parseVerpAddress(
              verpAddress,
              canonical,
            );

            expect(result).toBeUndefined();
          },
        ),
        { numRuns: 200 },
      );
    });
  });
});
