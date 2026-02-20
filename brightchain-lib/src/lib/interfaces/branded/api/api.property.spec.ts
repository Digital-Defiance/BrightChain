/**
 * @fileoverview Property-based tests for safeParseInterface on API types
 *
 * // Feature: branded-dto-integration, Property 3: safeParseInterface rejects invalid data
 *
 * Property 3 (continued): For any branded interface definition and any plain object
 * that violates the schema (missing required field, wrong type, or invalid
 * branded-primitive ref), safeParseInterface() returns a failure result with a
 * non-empty error message.
 *
 * Also covers the positive case (valid data passes) for completeness.
 *
 * **Validates: Requirements 3.2, 3.3, 3.4**
 */

import { describe, expect, it } from '@jest/globals';
import fc from 'fast-check';

// Import primitives first — they must be registered before definitions that ref them
import '../primitives/blockId';
import '../primitives/emailString';
import '../primitives/iso8601Timestamp';
import '../primitives/poolId';
import '../primitives/shortHexGuid';

import {
  AuthResponseDef,
  LoginRequestDef,
  RegistrationRequestDef,
} from './index';

jest.setTimeout(60000);

// ---------------------------------------------------------------------------
// Arbitraries — valid field values
// ---------------------------------------------------------------------------

// nonEmptyStringArb must produce strings with at least one non-whitespace character,
// since username validation uses v.trim().length > 0
const nonEmptyStringArb = fc
  .string({ minLength: 1, maxLength: 40 })
  .filter((s) => s.trim().length > 0);
const numberArb = fc.float({
  min: 0,
  max: 1e9,
  noNaN: true,
  noDefaultInfinity: true,
});

// Valid email: local@domain.tld — matches /^[^\s@]+@[^\s@]+\.[^\s@]+$/
const validEmailArb = fc
  .tuple(
    fc.stringMatching(/^[a-z0-9]{1,10}$/),
    fc.stringMatching(/^[a-z0-9]{1,10}$/),
    fc.stringMatching(/^[a-z]{2,4}$/),
  )
  .map(([local, domain, tld]) => `${local}@${domain}.${tld}`);

// Invalid email: strings that do NOT match the email regex
const invalidEmailArb = fc
  .string({ minLength: 0, maxLength: 30 })
  .filter((s) => !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(s));

// ---------------------------------------------------------------------------
// Arbitraries — valid data objects per schema
// ---------------------------------------------------------------------------

const validRegistrationRequestArb = fc.record({
  username: nonEmptyStringArb,
  email: validEmailArb,
  password: nonEmptyStringArb,
});

const validLoginRequestArb = fc.record({
  username: nonEmptyStringArb,
  password: nonEmptyStringArb,
});

const validAuthResponseArb = fc.record({
  token: nonEmptyStringArb,
  memberId: nonEmptyStringArb,
  energyBalance: numberArb,
});

// ===========================================================================
// Positive cases: valid data passes
// ===========================================================================

describe('API types: valid data passes safeParseInterface', () => {
  it('RegistrationRequestDef: validate() accepts valid data and create() preserves fields', () => {
    fc.assert(
      fc.property(validRegistrationRequestArb, (data) => {
        expect(RegistrationRequestDef.validate(data)).toBe(true);
        if (RegistrationRequestDef.validate(data)) {
          const instance = RegistrationRequestDef.create(data);
          expect(instance.username).toBe(data.username);
          expect(instance.email).toBe(data.email);
          expect(instance.password).toBe(data.password);
        }
      }),
      { numRuns: 100 },
    );
  });

  it('LoginRequestDef: validate() accepts valid data and create() preserves fields', () => {
    fc.assert(
      fc.property(validLoginRequestArb, (data) => {
        expect(LoginRequestDef.validate(data)).toBe(true);
        if (LoginRequestDef.validate(data)) {
          const instance = LoginRequestDef.create(data);
          expect(instance.username).toBe(data.username);
          expect(instance.password).toBe(data.password);
        }
      }),
      { numRuns: 100 },
    );
  });

  it('AuthResponseDef: validate() accepts valid data and create() preserves fields', () => {
    fc.assert(
      fc.property(validAuthResponseArb, (data) => {
        expect(AuthResponseDef.validate(data)).toBe(true);
        if (AuthResponseDef.validate(data)) {
          const instance = AuthResponseDef.create(data);
          expect(instance.token).toBe(data.token);
          expect(instance.memberId).toBe(data.memberId);
          expect(instance.energyBalance).toBe(data.energyBalance);
        }
      }),
      { numRuns: 100 },
    );
  });
});

// ===========================================================================
// Property 3: safeParseInterface rejects invalid data
// ===========================================================================

describe('Property 3: safeParseInterface rejects invalid data — API types', () => {
  // -------------------------------------------------------------------------
  // Requirement 3.2: IRegistrationRequest rejects invalid emails
  // -------------------------------------------------------------------------

  it('RegistrationRequestDef: validate() returns false when email fails EmailString validation (Req 3.2)', () => {
    fc.assert(
      fc.property(
        validRegistrationRequestArb,
        invalidEmailArb,
        (data, badEmail) => {
          const mutated: Record<string, unknown> = { ...data, email: badEmail };
          expect(RegistrationRequestDef.validate(mutated)).toBe(false);
        },
      ),
      { numRuns: 100 },
    );
  });

  it('RegistrationRequestDef: validate() returns false when username is empty (Req 3.2)', () => {
    fc.assert(
      fc.property(validRegistrationRequestArb, (data) => {
        const mutated: Record<string, unknown> = { ...data, username: '' };
        expect(RegistrationRequestDef.validate(mutated)).toBe(false);
      }),
      { numRuns: 50 },
    );
  });

  it('RegistrationRequestDef: validate() returns false when password is empty (Req 3.2)', () => {
    fc.assert(
      fc.property(validRegistrationRequestArb, (data) => {
        const mutated: Record<string, unknown> = { ...data, password: '' };
        expect(RegistrationRequestDef.validate(mutated)).toBe(false);
      }),
      { numRuns: 50 },
    );
  });

  it('RegistrationRequestDef: validate() returns false when a required field is missing (Req 3.2)', () => {
    const fields = ['username', 'email', 'password'] as const;
    fc.assert(
      fc.property(
        validRegistrationRequestArb,
        fc.constantFrom(...fields),
        (data, field) => {
          const mutated: Record<string, unknown> = { ...data };
          delete mutated[field];
          expect(RegistrationRequestDef.validate(mutated)).toBe(false);
        },
      ),
      { numRuns: 100 },
    );
  });

  // -------------------------------------------------------------------------
  // Requirement 3.3: ILoginRequest rejects empty username/password
  // -------------------------------------------------------------------------

  it('LoginRequestDef: validate() returns false when username is empty (Req 3.3)', () => {
    fc.assert(
      fc.property(validLoginRequestArb, (data) => {
        const mutated: Record<string, unknown> = { ...data, username: '' };
        expect(LoginRequestDef.validate(mutated)).toBe(false);
      }),
      { numRuns: 100 },
    );
  });

  it('LoginRequestDef: validate() returns false when password is empty (Req 3.3)', () => {
    fc.assert(
      fc.property(validLoginRequestArb, (data) => {
        const mutated: Record<string, unknown> = { ...data, password: '' };
        expect(LoginRequestDef.validate(mutated)).toBe(false);
      }),
      { numRuns: 100 },
    );
  });

  it('LoginRequestDef: validate() returns false when username is whitespace-only (Req 3.3)', () => {
    const whitespaceArb = fc
      .string({ minLength: 1, maxLength: 10 })
      .map((s) => s.replace(/./g, ' '));
    fc.assert(
      fc.property(validLoginRequestArb, whitespaceArb, (data, ws) => {
        const mutated: Record<string, unknown> = { ...data, username: ws };
        expect(LoginRequestDef.validate(mutated)).toBe(false);
      }),
      { numRuns: 100 },
    );
  });

  it('LoginRequestDef: validate() returns false when a required field is missing (Req 3.3)', () => {
    const fields = ['username', 'password'] as const;
    fc.assert(
      fc.property(
        validLoginRequestArb,
        fc.constantFrom(...fields),
        (data, field) => {
          const mutated: Record<string, unknown> = { ...data };
          delete mutated[field];
          expect(LoginRequestDef.validate(mutated)).toBe(false);
        },
      ),
      { numRuns: 100 },
    );
  });

  it('LoginRequestDef: validate() returns false when username receives a number (Req 3.3)', () => {
    fc.assert(
      fc.property(validLoginRequestArb, numberArb, (data, wrongValue) => {
        const mutated: Record<string, unknown> = {
          ...data,
          username: wrongValue,
        };
        expect(LoginRequestDef.validate(mutated)).toBe(false);
      }),
      { numRuns: 100 },
    );
  });

  it('LoginRequestDef: validate() returns false when password receives a number (Req 3.3)', () => {
    fc.assert(
      fc.property(validLoginRequestArb, numberArb, (data, wrongValue) => {
        const mutated: Record<string, unknown> = {
          ...data,
          password: wrongValue,
        };
        expect(LoginRequestDef.validate(mutated)).toBe(false);
      }),
      { numRuns: 100 },
    );
  });

  // -------------------------------------------------------------------------
  // Requirement 3.4: IAuthResponse rejects empty token
  // -------------------------------------------------------------------------

  it('AuthResponseDef: validate() returns false when token is empty (Req 3.4)', () => {
    fc.assert(
      fc.property(validAuthResponseArb, (data) => {
        const mutated: Record<string, unknown> = { ...data, token: '' };
        expect(AuthResponseDef.validate(mutated)).toBe(false);
      }),
      { numRuns: 100 },
    );
  });

  it('AuthResponseDef: validate() returns false when memberId is empty (Req 3.4)', () => {
    fc.assert(
      fc.property(validAuthResponseArb, (data) => {
        const mutated: Record<string, unknown> = { ...data, memberId: '' };
        expect(AuthResponseDef.validate(mutated)).toBe(false);
      }),
      { numRuns: 100 },
    );
  });

  it('AuthResponseDef: validate() returns false when a required field is missing (Req 3.4)', () => {
    const fields = ['token', 'memberId', 'energyBalance'] as const;
    fc.assert(
      fc.property(
        validAuthResponseArb,
        fc.constantFrom(...fields),
        (data, field) => {
          const mutated: Record<string, unknown> = { ...data };
          delete mutated[field];
          expect(AuthResponseDef.validate(mutated)).toBe(false);
        },
      ),
      { numRuns: 100 },
    );
  });

  it('AuthResponseDef: validate() returns false when token receives a number (Req 3.4)', () => {
    fc.assert(
      fc.property(validAuthResponseArb, numberArb, (data, wrongValue) => {
        const mutated: Record<string, unknown> = { ...data, token: wrongValue };
        expect(AuthResponseDef.validate(mutated)).toBe(false);
      }),
      { numRuns: 100 },
    );
  });

  // -------------------------------------------------------------------------
  // Non-object inputs
  // -------------------------------------------------------------------------

  it('RegistrationRequestDef: validate() returns false for non-object inputs', () => {
    const nonObjectArb = fc.oneof(
      fc.string(),
      fc.integer(),
      fc.boolean(),
      fc.constant(null),
    );
    fc.assert(
      fc.property(nonObjectArb, (value) => {
        expect(RegistrationRequestDef.validate(value)).toBe(false);
      }),
      { numRuns: 100 },
    );
  });

  it('LoginRequestDef: validate() returns false for non-object inputs', () => {
    const nonObjectArb = fc.oneof(
      fc.string(),
      fc.integer(),
      fc.boolean(),
      fc.constant(null),
    );
    fc.assert(
      fc.property(nonObjectArb, (value) => {
        expect(LoginRequestDef.validate(value)).toBe(false);
      }),
      { numRuns: 100 },
    );
  });

  it('AuthResponseDef: validate() returns false for non-object inputs', () => {
    const nonObjectArb = fc.oneof(
      fc.string(),
      fc.integer(),
      fc.boolean(),
      fc.constant(null),
    );
    fc.assert(
      fc.property(nonObjectArb, (value) => {
        expect(AuthResponseDef.validate(value)).toBe(false);
      }),
      { numRuns: 100 },
    );
  });
});
