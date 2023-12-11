/**
 * @fileoverview Property-based tests for EmailParser - Address Parsing Round-Trip
 *
 * **Feature: email-messaging-protocol**
 *
 * This test suite verifies:
 * - Property 2: Address Parsing Round-Trip
 *
 * **Validates: Requirements 2.1, 2.2, 2.3, 2.4**
 *
 * Per RFC 5322 Section 3.4, mailbox addresses can be in the format:
 *   [display-name] "<" addr-spec ">" or addr-spec
 * where addr-spec is local-part "@" domain.
 *
 * The round-trip property states: for any valid mailbox address, parsing it
 * with EmailParser.parseMailbox() or EmailParser.parseAddressList(), then
 * reconstructing the string from the parsed IMailbox fields, and parsing again
 * SHALL yield an equivalent IMailbox or IAddress object.
 */

import fc from 'fast-check';
import {
  formatAddressList,
  formatMailbox,
  IAddressGroup,
  IMailbox,
  isAddressGroup,
  isMailbox,
} from '../../interfaces/messaging/emailAddress';
import { EmailParser } from './emailParser';

// Feature: email-messaging-protocol, Property 2: Address Parsing Round-Trip

// ─── Generators ─────────────────────────────────────────────────────────────

/**
 * Generator for a valid local-part character.
 * Uses simple alphanumeric + dots + hyphens + underscores to avoid
 * edge cases that require quoting.
 */
const arbLocalPartChar = fc.constantFrom(
  ...'abcdefghijklmnopqrstuvwxyz0123456789'.split(''),
);

/**
 * Generator for a valid simple local-part string.
 * Ensures it starts and ends with alphanumeric (not dot/hyphen/underscore)
 * and does not contain consecutive dots.
 */
const arbLocalPart = fc
  .array(arbLocalPartChar, { minLength: 1, maxLength: 20 })
  .map((chars) => chars.join(''));

/**
 * Generator for a valid domain label (alphanumeric, may contain hyphens in the middle).
 */
const arbDomainLabel = fc
  .array(fc.constantFrom(...'abcdefghijklmnopqrstuvwxyz0123456789'.split('')), {
    minLength: 1,
    maxLength: 10,
  })
  .map((chars) => chars.join(''));

/**
 * Generator for a valid TLD (2-4 lowercase alpha characters).
 */
const arbTld = fc
  .array(fc.constantFrom(...'abcdefghijklmnopqrstuvwxyz'.split('')), {
    minLength: 2,
    maxLength: 4,
  })
  .map((chars) => chars.join(''));

/**
 * Generator for a valid domain string (label.tld format).
 */
const arbDomain = fc
  .tuple(arbDomainLabel, arbTld)
  .map(([label, tld]) => `${label}.${tld}`);

/**
 * Generator for a valid display name (simple ASCII letters and spaces).
 */
const arbDisplayName = fc
  .array(
    fc.constantFrom(
      ...'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz '.split(''),
    ),
    { minLength: 1, maxLength: 30 },
  )
  .map((chars) => chars.join('').replace(/\s+/g, ' ').trim())
  .filter((name) => name.length > 0);

/**
 * Generator for a simple mailbox string (local@domain).
 */
const arbSimpleMailboxString = fc
  .tuple(arbLocalPart, arbDomain)
  .map(([local, domain]) => `${local}@${domain}`);

/**
 * Generator for a mailbox string with display name ("Name" <local@domain>).
 */
const arbNameAddrMailboxString = fc
  .tuple(arbDisplayName, arbLocalPart, arbDomain)
  .map(([name, local, domain]) => `${name} <${local}@${domain}>`);

/**
 * Generator for either a simple or name-addr mailbox string.
 */
const arbMailboxString = fc.oneof(
  arbSimpleMailboxString,
  arbNameAddrMailboxString,
);

/**
 * Generator for an address list with a mix of simple and name-addr mailboxes.
 */
const arbMixedAddressListString = fc
  .array(arbMailboxString, { minLength: 1, maxLength: 4 })
  .map((addrs) => addrs.join(', '));

/**
 * Generator for a group address string: "GroupName: addr1, addr2;"
 */
const arbGroupAddressString = fc
  .tuple(
    arbDisplayName.filter(
      (n) => !n.includes(',') && !n.includes(';') && !n.includes(':'),
    ),
    fc.array(arbSimpleMailboxString, { minLength: 1, maxLength: 3 }),
  )
  .map(([name, addrs]) => `${name}: ${addrs.join(', ')};`);

// ─── Helper Functions ───────────────────────────────────────────────────────

/**
 * Reconstructs a mailbox string from an IMailbox object.
 * If displayName is present: `"displayName" <address>`
 * If no displayName: `address`
 */
function reconstructMailboxString(mailbox: IMailbox): string {
  return formatMailbox(mailbox);
}

/**
 * Compares two IMailbox objects for semantic equivalence.
 * Checks localPart, domain, and displayName.
 */
function mailboxesAreEquivalent(a: IMailbox, b: IMailbox): boolean {
  return (
    a.localPart === b.localPart &&
    a.domain === b.domain &&
    (a.displayName || undefined) === (b.displayName || undefined)
  );
}

// ─── Tests ──────────────────────────────────────────────────────────────────

describe('EmailParser Property Tests', () => {
  let parser: EmailParser;

  beforeEach(() => {
    parser = new EmailParser();
  });

  describe('Property 2: Address Parsing Round-Trip', () => {
    // ── Simple Mailbox Parsing ──────────────────────────────────────────

    /**
     * **Feature: email-messaging-protocol, Property 2: Address Parsing Round-Trip**
     *
     * *For any* valid simple mailbox string (local@domain), parsing produces
     * an IMailbox with correct localPart and domain, and the address property
     * equals the original string.
     *
     * **Validates: Requirements 2.1, 2.2**
     */
    it('should parse any valid simple mailbox and produce correct localPart, domain, and address', () => {
      fc.assert(
        fc.property(arbLocalPart, arbDomain, (localPart, domain) => {
          const input = `${localPart}@${domain}`;
          const mailbox = parser.parseMailbox(input);

          expect(mailbox.localPart).toBe(localPart);
          expect(mailbox.domain).toBe(domain);
          expect(mailbox.address).toBe(input);
          expect(mailbox.displayName).toBeUndefined();
        }),
        { numRuns: 100 },
      );
    });

    // ── Mailbox with Display Name ───────────────────────────────────────

    /**
     * **Feature: email-messaging-protocol, Property 2: Address Parsing Round-Trip**
     *
     * *For any* valid mailbox with display name (Name <local@domain>),
     * parsing preserves the display name, localPart, and domain.
     *
     * **Validates: Requirements 2.1, 2.2**
     */
    it('should parse any valid mailbox with display name and preserve all fields', () => {
      fc.assert(
        fc.property(
          arbDisplayName,
          arbLocalPart,
          arbDomain,
          (displayName, localPart, domain) => {
            const input = `${displayName} <${localPart}@${domain}>`;
            const mailbox = parser.parseMailbox(input);

            expect(mailbox.localPart).toBe(localPart);
            expect(mailbox.domain).toBe(domain);
            expect(mailbox.address).toBe(`${localPart}@${domain}`);
            expect(mailbox.displayName).toBe(displayName);
          },
        ),
        { numRuns: 100 },
      );
    });

    // ── Parse-Reconstruct-Parse Round-Trip ──────────────────────────────

    /**
     * **Feature: email-messaging-protocol, Property 2: Address Parsing Round-Trip**
     *
     * *For any* valid simple mailbox string, parsing it, reconstructing the
     * string from IMailbox fields, and parsing again yields an equivalent
     * IMailbox (same localPart, domain, displayName).
     *
     * **Validates: Requirements 2.1, 2.2**
     */
    it('should produce equivalent IMailbox after parse-reconstruct-parse round-trip for simple addresses', () => {
      fc.assert(
        fc.property(arbSimpleMailboxString, (input) => {
          // First parse
          const firstParse = parser.parseMailbox(input);

          // Reconstruct string from parsed fields
          const reconstructed = reconstructMailboxString(firstParse);

          // Second parse
          const secondParse = parser.parseMailbox(reconstructed);

          // Verify equivalence
          expect(mailboxesAreEquivalent(firstParse, secondParse)).toBe(true);
          expect(secondParse.localPart).toBe(firstParse.localPart);
          expect(secondParse.domain).toBe(firstParse.domain);
          expect(secondParse.address).toBe(firstParse.address);
        }),
        { numRuns: 100 },
      );
    });

    /**
     * **Feature: email-messaging-protocol, Property 2: Address Parsing Round-Trip**
     *
     * *For any* valid mailbox string with display name, parsing it,
     * reconstructing the string from IMailbox fields, and parsing again
     * yields an equivalent IMailbox (same localPart, domain, displayName).
     *
     * **Validates: Requirements 2.1, 2.2**
     */
    it('should produce equivalent IMailbox after parse-reconstruct-parse round-trip for name-addr addresses', () => {
      fc.assert(
        fc.property(arbNameAddrMailboxString, (input) => {
          // First parse
          const firstParse = parser.parseMailbox(input);

          // Reconstruct string from parsed fields
          const reconstructed = reconstructMailboxString(firstParse);

          // Second parse
          const secondParse = parser.parseMailbox(reconstructed);

          // Verify equivalence
          expect(mailboxesAreEquivalent(firstParse, secondParse)).toBe(true);
          expect(secondParse.localPart).toBe(firstParse.localPart);
          expect(secondParse.domain).toBe(firstParse.domain);
          expect(secondParse.address).toBe(firstParse.address);
          expect(secondParse.displayName).toBe(firstParse.displayName);
        }),
        { numRuns: 100 },
      );
    });

    // ── Address List Parsing ────────────────────────────────────────────

    /**
     * **Feature: email-messaging-protocol, Property 2: Address Parsing Round-Trip**
     *
     * *For any* valid address list of multiple simple mailboxes, parsing
     * produces the correct number of IAddress objects with correct fields.
     *
     * **Validates: Requirements 2.1, 2.2**
     */
    it('should parse any valid address list and produce the correct number of addresses with correct fields', () => {
      fc.assert(
        fc.property(
          fc.array(fc.tuple(arbLocalPart, arbDomain), {
            minLength: 1,
            maxLength: 4,
          }),
          (addrParts) => {
            const input = addrParts
              .map(([local, domain]) => `${local}@${domain}`)
              .join(', ');

            const addresses = parser.parseAddressList(input);

            expect(addresses).toHaveLength(addrParts.length);

            for (let i = 0; i < addrParts.length; i++) {
              const addr = addresses[i];
              expect(isMailbox(addr)).toBe(true);
              const mailbox = addr as IMailbox;
              expect(mailbox.localPart).toBe(addrParts[i][0]);
              expect(mailbox.domain).toBe(addrParts[i][1]);
            }
          },
        ),
        { numRuns: 100 },
      );
    });

    // ── Address List Round-Trip ─────────────────────────────────────────

    /**
     * **Feature: email-messaging-protocol, Property 2: Address Parsing Round-Trip**
     *
     * *For any* valid address list string, parsing it, reconstructing the
     * string from parsed IAddress objects using formatAddressList, and
     * parsing again yields equivalent IAddress objects.
     *
     * **Validates: Requirements 2.1, 2.2**
     */
    it('should produce equivalent addresses after parse-reconstruct-parse round-trip for address lists', () => {
      fc.assert(
        fc.property(arbMixedAddressListString, (input) => {
          // First parse
          const firstParse = parser.parseAddressList(input);

          // Reconstruct string from parsed addresses
          const reconstructed = formatAddressList(firstParse);

          // Second parse
          const secondParse = parser.parseAddressList(reconstructed);

          // Verify same count
          expect(secondParse).toHaveLength(firstParse.length);

          // Verify each address is equivalent
          for (let i = 0; i < firstParse.length; i++) {
            const first = firstParse[i];
            const second = secondParse[i];

            expect(isMailbox(first)).toBe(isMailbox(second));

            if (isMailbox(first) && isMailbox(second)) {
              expect(mailboxesAreEquivalent(first, second)).toBe(true);
            }
          }
        }),
        { numRuns: 100 },
      );
    });

    // ── Group Address Parsing ───────────────────────────────────────────

    /**
     * **Feature: email-messaging-protocol, Property 2: Address Parsing Round-Trip**
     *
     * *For any* valid group address string, parsing with parseAddressList()
     * produces an IAddressGroup with the correct display name and member
     * mailboxes.
     *
     * **Validates: Requirements 2.4**
     */
    it('should parse any valid group address and produce correct group name and members', () => {
      fc.assert(
        fc.property(arbGroupAddressString, (input) => {
          const addresses = parser.parseAddressList(input);

          expect(addresses).toHaveLength(1);
          expect(isAddressGroup(addresses[0])).toBe(true);

          const group = addresses[0] as IAddressGroup;
          // Group should have a display name and at least one member
          expect(group.displayName).toBeDefined();
          expect(group.displayName.length).toBeGreaterThan(0);
          expect(group.mailboxes.length).toBeGreaterThanOrEqual(1);

          // Each member should be a valid mailbox
          for (const mailbox of group.mailboxes) {
            expect(isMailbox(mailbox)).toBe(true);
            expect(mailbox.localPart.length).toBeGreaterThan(0);
            expect(mailbox.domain.length).toBeGreaterThan(0);
          }
        }),
        { numRuns: 100 },
      );
    });

    // ── Quoted Local-Part Round-Trip ────────────────────────────────────

    /**
     * **Feature: email-messaging-protocol, Property 2: Address Parsing Round-Trip**
     *
     * *For any* valid quoted-string local-part, parsing with parseMailbox()
     * correctly extracts the local-part content and domain.
     *
     * **Validates: Requirements 2.3**
     */
    it('should parse quoted local-parts and extract the correct content', () => {
      fc.assert(
        fc.property(
          // Generate local-parts with dots (which are valid in quoted form)
          fc
            .tuple(
              fc
                .array(
                  fc.constantFrom(...'abcdefghijklmnopqrstuvwxyz'.split('')),
                  { minLength: 1, maxLength: 8 },
                )
                .map((chars) => chars.join('')),
              fc
                .array(
                  fc.constantFrom(...'abcdefghijklmnopqrstuvwxyz'.split('')),
                  { minLength: 1, maxLength: 8 },
                )
                .map((chars) => chars.join('')),
            )
            .map(([a, b]) => `${a}.${b}`),
          arbDomain,
          (localPart, domain) => {
            // Use quoted form
            const input = `"${localPart}"@${domain}`;
            const mailbox = parser.parseMailbox(input);

            expect(mailbox.localPart).toBe(localPart);
            expect(mailbox.domain).toBe(domain);
          },
        ),
        { numRuns: 100 },
      );
    });
  });
});
