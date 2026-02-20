/**
 * @fileoverview Property-based tests for opaque type definitions
 *
 * // Feature: branded-dto-integration, Property 4: Opaque values hide underlying data
 * // Feature: branded-dto-integration, Property 5: Opaque unwrap rejects non-wrapped values
 *
 * Property 4: For any opaque type definition (AuthToken, PasswordHash, MnemonicPhrase)
 * and any non-empty string value, wrapping the value and passing the opaque result to
 * JSON.stringify() produces a string that does NOT contain the original value. Similarly,
 * template literal interpolation does not reveal the original value.
 *
 * Property 5: For any opaque type definition and any value NOT created by that type's
 * wrap() function (plain objects, strings, nulls, opaque values from a different type),
 * calling unwrap() throws an error.
 *
 * **Validates: Requirements 4.4, 4.5, 4.6**
 */

import type { OpaqueValue } from '@digitaldefiance/branded-interface';
import { describe, expect, it } from '@jest/globals';
import fc from 'fast-check';

import { AuthToken } from './authToken';
import { MnemonicPhrase } from './mnemonicPhrase';
import { PasswordHash } from './passwordHash';

jest.setTimeout(60000);

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/** All three opaque type definitions under test */
const opaqueTypes = [
  { name: 'AuthToken', def: AuthToken },
  { name: 'PasswordHash', def: PasswordHash },
  { name: 'MnemonicPhrase', def: MnemonicPhrase },
] as const;

/** Arbitrary: non-empty string (the sensitive value to wrap) */
const nonEmptyStringArb = fc.string({ minLength: 1, maxLength: 80 });

// ===========================================================================
// Property 4: Opaque values hide underlying data
// **Validates: Requirements 4.4, 4.5**
// ===========================================================================

describe('Property 4: Opaque values hide underlying data', () => {
  for (const { name, def } of opaqueTypes) {
    // -----------------------------------------------------------------------
    // Requirement 4.4: JSON.stringify produces an empty object — no enumerable
    // properties means the underlying value is never serialized.
    // -----------------------------------------------------------------------
    it(`${name}: JSON.stringify of wrapped value produces an empty object (no data leakage) (Req 4.4)`, () => {
      fc.assert(
        fc.property(nonEmptyStringArb, (secret) => {
          const wrapped = def.wrap(secret);
          // All properties are non-enumerable, so JSON.stringify yields "{}"
          const serialized = JSON.stringify(wrapped);
          expect(serialized).toBe('{}');
        }),
        { numRuns: 100 },
      );
    });

    // -----------------------------------------------------------------------
    // Requirement 4.5: Template literal interpolation does not reveal the value.
    // The opaque object has a null prototype (Object.create(null)), so it has
    // no toString() method. String coercion either throws or produces a generic
    // representation — neither reveals the underlying secret.
    // -----------------------------------------------------------------------
    it(`${name}: template literal interpolation of wrapped value does not reveal the original string (Req 4.5)`, () => {
      fc.assert(
        fc.property(nonEmptyStringArb, (secret) => {
          const wrapped = def.wrap(secret);
          // Coercion on a null-prototype object throws TypeError — that's fine,
          // it means the value is definitely not revealed. We catch it and
          // verify the secret is not present in any string representation.
          let interpolated: string;
          try {
            interpolated = `${wrapped}`;
          } catch {
            // TypeError: Cannot convert object to primitive value
            // The secret is not revealed — property holds.
            return;
          }
          expect(interpolated).not.toContain(secret);
        }),
        { numRuns: 100 },
      );
    });
  }

  // -----------------------------------------------------------------------
  // Sanity: wrap then unwrap recovers the original value
  // -----------------------------------------------------------------------
  it('AuthToken: wrap then unwrap recovers the original value', () => {
    fc.assert(
      fc.property(nonEmptyStringArb, (secret) => {
        const wrapped = AuthToken.wrap(secret);
        expect(AuthToken.unwrap(wrapped)).toBe(secret);
      }),
      { numRuns: 100 },
    );
  });

  it('PasswordHash: wrap then unwrap recovers the original value', () => {
    fc.assert(
      fc.property(nonEmptyStringArb, (secret) => {
        const wrapped = PasswordHash.wrap(secret);
        expect(PasswordHash.unwrap(wrapped)).toBe(secret);
      }),
      { numRuns: 100 },
    );
  });

  it('MnemonicPhrase: wrap then unwrap recovers the original value', () => {
    fc.assert(
      fc.property(nonEmptyStringArb, (secret) => {
        const wrapped = MnemonicPhrase.wrap(secret);
        expect(MnemonicPhrase.unwrap(wrapped)).toBe(secret);
      }),
      { numRuns: 100 },
    );
  });
});

// ===========================================================================
// Property 5: Opaque unwrap rejects non-wrapped values
// **Validates: Requirement 4.6**
// ===========================================================================

describe('Property 5: Opaque unwrap rejects non-wrapped values', () => {
  // -----------------------------------------------------------------------
  // Plain strings passed directly to unwrap() must throw
  // -----------------------------------------------------------------------
  it('AuthToken: unwrap() throws for plain strings (Req 4.6)', () => {
    fc.assert(
      fc.property(fc.string(), (value) => {
        expect(() =>
          AuthToken.unwrap(value as unknown as OpaqueValue<string>),
        ).toThrow();
      }),
      { numRuns: 100 },
    );
  });

  it('PasswordHash: unwrap() throws for plain strings (Req 4.6)', () => {
    fc.assert(
      fc.property(fc.string(), (value) => {
        expect(() =>
          PasswordHash.unwrap(value as unknown as OpaqueValue<string>),
        ).toThrow();
      }),
      { numRuns: 100 },
    );
  });

  it('MnemonicPhrase: unwrap() throws for plain strings (Req 4.6)', () => {
    fc.assert(
      fc.property(fc.string(), (value) => {
        expect(() =>
          MnemonicPhrase.unwrap(value as unknown as OpaqueValue<string>),
        ).toThrow();
      }),
      { numRuns: 100 },
    );
  });

  // -----------------------------------------------------------------------
  // Plain objects (no OPAQUE_ID symbol) must throw
  // -----------------------------------------------------------------------
  it('AuthToken: unwrap() throws for plain objects (Req 4.6)', () => {
    const plainObjectArb = fc.dictionary(
      fc.string({ minLength: 1, maxLength: 10 }),
      fc.string(),
    );
    fc.assert(
      fc.property(plainObjectArb, (obj) => {
        expect(() =>
          AuthToken.unwrap(obj as unknown as OpaqueValue<string>),
        ).toThrow();
      }),
      { numRuns: 100 },
    );
  });

  it('PasswordHash: unwrap() throws for plain objects (Req 4.6)', () => {
    const plainObjectArb = fc.dictionary(
      fc.string({ minLength: 1, maxLength: 10 }),
      fc.string(),
    );
    fc.assert(
      fc.property(plainObjectArb, (obj) => {
        expect(() =>
          PasswordHash.unwrap(obj as unknown as OpaqueValue<string>),
        ).toThrow();
      }),
      { numRuns: 100 },
    );
  });

  it('MnemonicPhrase: unwrap() throws for plain objects (Req 4.6)', () => {
    const plainObjectArb = fc.dictionary(
      fc.string({ minLength: 1, maxLength: 10 }),
      fc.string(),
    );
    fc.assert(
      fc.property(plainObjectArb, (obj) => {
        expect(() =>
          MnemonicPhrase.unwrap(obj as unknown as OpaqueValue<string>),
        ).toThrow();
      }),
      { numRuns: 100 },
    );
  });

  // -----------------------------------------------------------------------
  // null must throw
  // -----------------------------------------------------------------------
  it('AuthToken: unwrap() throws for null (Req 4.6)', () => {
    expect(() =>
      AuthToken.unwrap(null as unknown as OpaqueValue<string>),
    ).toThrow();
  });

  it('PasswordHash: unwrap() throws for null (Req 4.6)', () => {
    expect(() =>
      PasswordHash.unwrap(null as unknown as OpaqueValue<string>),
    ).toThrow();
  });

  it('MnemonicPhrase: unwrap() throws for null (Req 4.6)', () => {
    expect(() =>
      MnemonicPhrase.unwrap(null as unknown as OpaqueValue<string>),
    ).toThrow();
  });

  // -----------------------------------------------------------------------
  // Opaque value from a DIFFERENT type must throw
  // -----------------------------------------------------------------------
  it('AuthToken: unwrap() throws for a PasswordHash-wrapped value (Req 4.6)', () => {
    fc.assert(
      fc.property(nonEmptyStringArb, (secret) => {
        const wrongOpaque = PasswordHash.wrap(secret);
        expect(() =>
          AuthToken.unwrap(wrongOpaque as unknown as OpaqueValue<string>),
        ).toThrow();
      }),
      { numRuns: 100 },
    );
  });

  it('AuthToken: unwrap() throws for a MnemonicPhrase-wrapped value (Req 4.6)', () => {
    fc.assert(
      fc.property(nonEmptyStringArb, (secret) => {
        const wrongOpaque = MnemonicPhrase.wrap(secret);
        expect(() =>
          AuthToken.unwrap(wrongOpaque as unknown as OpaqueValue<string>),
        ).toThrow();
      }),
      { numRuns: 100 },
    );
  });

  it('PasswordHash: unwrap() throws for an AuthToken-wrapped value (Req 4.6)', () => {
    fc.assert(
      fc.property(nonEmptyStringArb, (secret) => {
        const wrongOpaque = AuthToken.wrap(secret);
        expect(() =>
          PasswordHash.unwrap(wrongOpaque as unknown as OpaqueValue<string>),
        ).toThrow();
      }),
      { numRuns: 100 },
    );
  });

  it('MnemonicPhrase: unwrap() throws for an AuthToken-wrapped value (Req 4.6)', () => {
    fc.assert(
      fc.property(nonEmptyStringArb, (secret) => {
        const wrongOpaque = AuthToken.wrap(secret);
        expect(() =>
          MnemonicPhrase.unwrap(wrongOpaque as unknown as OpaqueValue<string>),
        ).toThrow();
      }),
      { numRuns: 100 },
    );
  });

  // -----------------------------------------------------------------------
  // Numbers and booleans must throw
  // -----------------------------------------------------------------------
  it('AuthToken: unwrap() throws for numbers and booleans (Req 4.6)', () => {
    const primitiveArb = fc.oneof(
      fc.integer(),
      fc.float({ noNaN: true }),
      fc.boolean(),
    );
    fc.assert(
      fc.property(primitiveArb, (value) => {
        expect(() =>
          AuthToken.unwrap(value as unknown as OpaqueValue<string>),
        ).toThrow();
      }),
      { numRuns: 100 },
    );
  });
});
