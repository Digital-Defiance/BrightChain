/**
 * Feature: user-provided-mnemonic-brightchain, Property 1: Branded schema accepts optional mnemonic correctly
 *
 * For any registration payload with valid username, email, and password,
 * the RegistrationRequestDef branded schema should accept the payload when
 * the mnemonic field is absent or is a non-empty string, and should reject
 * the payload when mnemonic is present but is an empty string.
 *
 * **Validates: Requirements 1.1, 1.2, 1.3**
 */
import { describe, expect, it } from '@jest/globals';
import fc from 'fast-check';

// Import primitives first — they must be registered before definitions that ref them
import '../lib/interfaces/branded/primitives/emailString';

import { RegistrationRequestDef } from '../lib/interfaces/branded/api/registrationRequest.branded';

jest.setTimeout(60_000);

// ---------------------------------------------------------------------------
// Generators
// ---------------------------------------------------------------------------

/** Non-empty, non-whitespace-only string for username/password */
const nonEmptyStringArb = fc
  .string({ minLength: 1, maxLength: 40 })
  .filter((s) => s.trim().length > 0);

/** Valid email matching /^[^\s@]+@[^\s@]+\.[^\s@]+$/ */
const validEmailArb = fc
  .tuple(
    fc.stringMatching(/^[a-z0-9]{1,10}$/),
    fc.stringMatching(/^[a-z0-9]{1,10}$/),
    fc.stringMatching(/^[a-z]{2,4}$/),
  )
  .map(([local, domain, tld]) => `${local}@${domain}.${tld}`);

/** Base valid registration payload (without mnemonic) */
const validBasePayloadArb = fc.record({
  username: nonEmptyStringArb,
  email: validEmailArb,
  password: nonEmptyStringArb,
});

/** Non-empty string suitable as a mnemonic value (content doesn't need to be BIP39 — schema only checks non-empty) */
const nonEmptyMnemonicArb = fc
  .string({ minLength: 1, maxLength: 100 })
  .filter((s) => s.trim().length > 0);

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('Feature: user-provided-mnemonic-brightchain, Property 1: Branded schema accepts optional mnemonic correctly', () => {
  it('accepts payloads without a mnemonic field (Req 1.1, 1.2)', () => {
    fc.assert(
      fc.property(validBasePayloadArb, (payload) => {
        expect(RegistrationRequestDef.validate(payload)).toBe(true);
      }),
      { numRuns: 100 },
    );
  });

  it('accepts payloads with a non-empty string mnemonic (Req 1.1, 1.3)', () => {
    fc.assert(
      fc.property(
        validBasePayloadArb,
        nonEmptyMnemonicArb,
        (base, mnemonic) => {
          const payload = { ...base, mnemonic };
          expect(RegistrationRequestDef.validate(payload)).toBe(true);
        },
      ),
      { numRuns: 100 },
    );
  });

  it('rejects payloads with an empty string mnemonic (Req 1.3)', () => {
    fc.assert(
      fc.property(validBasePayloadArb, (base) => {
        const payload = { ...base, mnemonic: '' };
        expect(RegistrationRequestDef.validate(payload)).toBe(false);
      }),
      { numRuns: 100 },
    );
  });

  it('rejects payloads with a whitespace-only mnemonic (Req 1.3)', () => {
    const whitespaceOnlyArb = fc
      .array(fc.constantFrom(' ', '\t', '\n', '\r'), {
        minLength: 1,
        maxLength: 10,
      })
      .map((chars) => chars.join(''));

    fc.assert(
      fc.property(validBasePayloadArb, whitespaceOnlyArb, (base, ws) => {
        const payload = { ...base, mnemonic: ws };
        expect(RegistrationRequestDef.validate(payload)).toBe(false);
      }),
      { numRuns: 100 },
    );
  });
});
