/**
 * @fileoverview Property-based tests for recipient verification utilities.
 *
 * Property 11: Local recipient verification correctly partitions local vs external
 * Property 12: Recipient verification chip state reflects API response
 *
 * Validates: Requirements 8.1, 8.2, 8.3, 8.4
 */

import * as fc from 'fast-check';
import {
  extractLocalPart,
  isLocalDomain,
  verificationResultToChipStatus,
} from './recipientVerification';

// ─── Property 11: Local vs external domain partitioning ─────────────────────

describe('Property 11: Local recipient verification correctly partitions local vs external', () => {
  // Feature: brightmail-composer-enhancements, Property 11

  it('should return true for emails matching the local domain (case-insensitive)', () => {
    fc.assert(
      fc.property(
        fc.stringMatching(/^[a-z]{1,20}$/),
        fc.stringMatching(/^[a-z]{1,10}\.[a-z]{2,4}$/),
        (localPart, domain) => {
          const email = `${localPart}@${domain}`;
          // Same domain → local
          expect(isLocalDomain(email, domain)).toBe(true);
          // Case-insensitive match
          expect(isLocalDomain(email, domain.toUpperCase())).toBe(true);
          expect(
            isLocalDomain(`${localPart}@${domain.toUpperCase()}`, domain),
          ).toBe(true);
        },
      ),
      { numRuns: 100 },
    );
  });

  it('should return false for emails NOT matching the local domain', () => {
    fc.assert(
      fc.property(
        fc.stringMatching(/^[a-z]{1,20}$/),
        fc.stringMatching(/^[a-z]{1,10}\.[a-z]{2,4}$/),
        fc.stringMatching(/^[a-z]{1,10}\.[a-z]{2,4}$/),
        (localPart, emailDomain, configDomain) => {
          // Only test when domains actually differ
          fc.pre(emailDomain.toLowerCase() !== configDomain.toLowerCase());
          const email = `${localPart}@${emailDomain}`;
          expect(isLocalDomain(email, configDomain)).toBe(false);
        },
      ),
      { numRuns: 100 },
    );
  });

  it('should correctly extract the local part from any valid email', () => {
    fc.assert(
      fc.property(
        fc.stringMatching(/^[a-z]{1,20}$/),
        fc.stringMatching(/^[a-z]{1,10}\.[a-z]{2,4}$/),
        (localPart, domain) => {
          const email = `${localPart}@${domain}`;
          expect(extractLocalPart(email)).toBe(localPart);
        },
      ),
      { numRuns: 100 },
    );
  });

  it('should return empty string for malformed emails', () => {
    // No @ sign
    expect(extractLocalPart('nodomain')).toBe('');
    // @ at start
    expect(extractLocalPart('@domain.com')).toBe('');
  });
});

// ─── Property 12: Verification chip state reflects API response ─────────────

describe('Property 12: Recipient verification chip state reflects API response', () => {
  // Feature: brightmail-composer-enhancements, Property 12

  it('should map exists:true to valid and exists:false to warning', () => {
    fc.assert(
      fc.property(fc.boolean(), (exists) => {
        const status = verificationResultToChipStatus(exists);
        if (exists) {
          expect(status).toBe('valid');
        } else {
          expect(status).toBe('warning');
        }
      }),
      { numRuns: 100 },
    );
  });

  it('should always return either valid or warning', () => {
    fc.assert(
      fc.property(fc.boolean(), (exists) => {
        const status = verificationResultToChipStatus(exists);
        expect(['valid', 'warning']).toContain(status);
      }),
      { numRuns: 100 },
    );
  });
});
