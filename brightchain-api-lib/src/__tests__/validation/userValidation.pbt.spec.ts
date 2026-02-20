/**
 * Registration Validation – Property-Based Tests.
 *
 * Feature: brightchain-db-init-user-endpoints
 *
 * Uses fast-check to validate that validateRegistration correctly rejects
 * all invalid inputs with field-specific errors.
 */

import * as fc from 'fast-check';
import {
  IValidationResult,
  validateRegistration,
} from '../../lib/validation/userValidation';

/** Arbitrary that produces valid usernames (alphanumeric, hyphens, underscores, 1-30 chars). */
const validUsername: fc.Arbitrary<string> = fc.stringMatching(
  /^[a-zA-Z0-9_-]{1,30}$/,
);

/** Arbitrary that produces valid email addresses. */
const validEmail: fc.Arbitrary<string> = fc
  .tuple(
    fc.stringMatching(/^[a-z0-9]{1,10}$/),
    fc.stringMatching(/^[a-z]{1,8}$/),
    fc.stringMatching(/^[a-z]{2,4}$/),
  )
  .map(([local, domain, tld]) => `${local}@${domain}.${tld}`);

/** Arbitrary that produces valid passwords (>= 8 chars, printable ASCII). */
const validPassword: fc.Arbitrary<string> =
  fc.stringMatching(/^[\x20-\x7e]{8,64}$/);

/** Arbitrary for a valid registration body. */
const validRegistrationBody = fc
  .tuple(validUsername, validEmail, validPassword)
  .map(([username, email, password]) => ({ username, email, password }));

/**
 * Helper: assert that a validation result is invalid and contains
 * an error referencing the given field name.
 */
function expectInvalidWithField(
  result: IValidationResult,
  field: string,
): void {
  expect(result.valid).toBe(false);
  expect(result.errors.length).toBeGreaterThan(0);
  const fieldErrors = result.errors.filter((e) => e.field === field);
  expect(fieldErrors.length).toBeGreaterThanOrEqual(1);
}

describe('Registration Validation Property-Based Tests', () => {
  /**
   * Property 1: Registration validation rejects all invalid inputs with field-specific errors
   *
   * Feature: brightchain-db-init-user-endpoints, Property 1: Registration validation rejects
   * all invalid inputs with field-specific errors
   *
   * For any registration request body where at least one field is invalid
   * (missing username, invalid email format, password shorter than 8 characters,
   * or missing fields), the validateRegistration function SHALL return
   * { valid: false } with an errors array containing an entry whose field
   * matches the invalid field.
   *
   * **Validates: Requirements 3.2, 9.1, 9.2, 9.3, 9.4**
   */
  describe('Property 1: Registration validation rejects all invalid inputs with field-specific errors', () => {
    it('rejects missing username (undefined)', async () => {
      await fc.assert(
        fc.asyncProperty(validEmail, validPassword, async (email, password) => {
          const result = validateRegistration({ email, password });
          expectInvalidWithField(result, 'username');
        }),
        { numRuns: 100 },
      );
    });

    it('rejects empty string username', async () => {
      await fc.assert(
        fc.asyncProperty(validEmail, validPassword, async (email, password) => {
          const result = validateRegistration({
            username: '',
            email,
            password,
          });
          expectInvalidWithField(result, 'username');
        }),
        { numRuns: 100 },
      );
    });

    it('rejects whitespace-only username', async () => {
      const whitespaceOnly = fc
        .integer({ min: 1, max: 10 })
        .map((n) => ' '.repeat(n));

      await fc.assert(
        fc.asyncProperty(
          whitespaceOnly,
          validEmail,
          validPassword,
          async (username, email, password) => {
            const result = validateRegistration({ username, email, password });
            expectInvalidWithField(result, 'username');
          },
        ),
        { numRuns: 100 },
      );
    });

    it('rejects username with invalid characters (spaces, special chars)', async () => {
      const invalidChar = fc.constantFrom(
        ' ',
        '!',
        '@',
        '#',
        '$',
        '%',
        '^',
        '&',
        '*',
        '(',
        ')',
        '+',
        '=',
        '{',
        '}',
        '[',
        ']',
        '|',
        '\\',
        '/',
        '?',
        '<',
        '>',
        ',',
        '.',
        '~',
        '`',
      );
      const usernameWithInvalidChar = fc
        .tuple(
          fc.stringMatching(/^[a-z]{0,5}$/),
          invalidChar,
          fc.stringMatching(/^[a-z]{0,5}$/),
        )
        .map(([prefix, bad, suffix]) => `${prefix}${bad}${suffix}`);

      await fc.assert(
        fc.asyncProperty(
          usernameWithInvalidChar,
          validEmail,
          validPassword,
          async (username, email, password) => {
            const result = validateRegistration({ username, email, password });
            expectInvalidWithField(result, 'username');
          },
        ),
        { numRuns: 100 },
      );
    });

    it('rejects missing email (undefined)', async () => {
      await fc.assert(
        fc.asyncProperty(
          validUsername,
          validPassword,
          async (username, password) => {
            const result = validateRegistration({ username, password });
            expectInvalidWithField(result, 'email');
          },
        ),
        { numRuns: 100 },
      );
    });

    it('rejects invalid email format (no @ sign)', async () => {
      const noAtEmail = fc.stringMatching(/^[a-z0-9]{1,20}$/);

      await fc.assert(
        fc.asyncProperty(
          validUsername,
          noAtEmail,
          validPassword,
          async (username, email, password) => {
            const result = validateRegistration({ username, email, password });
            expectInvalidWithField(result, 'email');
          },
        ),
        { numRuns: 100 },
      );
    });

    it('rejects missing password (undefined)', async () => {
      await fc.assert(
        fc.asyncProperty(validUsername, validEmail, async (username, email) => {
          const result = validateRegistration({ username, email });
          expectInvalidWithField(result, 'password');
        }),
        { numRuns: 100 },
      );
    });

    it('rejects short password (less than 8 characters)', async () => {
      const shortPassword = fc.stringMatching(/^[\x20-\x7e]{1,7}$/);

      await fc.assert(
        fc.asyncProperty(
          validUsername,
          validEmail,
          shortPassword,
          async (username, email, password) => {
            const result = validateRegistration({ username, email, password });
            expectInvalidWithField(result, 'password');
          },
        ),
        { numRuns: 100 },
      );
    });

    it('rejects completely empty body', () => {
      const result = validateRegistration({});
      expect(result.valid).toBe(false);
      expect(result.errors.length).toBe(3);
      const fields = result.errors.map((e) => e.field).sort();
      expect(fields).toEqual(['email', 'password', 'username']);
    });

    it('accepts valid registration bodies (sanity check)', async () => {
      await fc.assert(
        fc.asyncProperty(validRegistrationBody, async (body) => {
          const result = validateRegistration(body);
          expect(result.valid).toBe(true);
          expect(result.errors).toEqual([]);
        }),
        { numRuns: 100 },
      );
    });
  });
});

/**
 * Login Validation – Property-Based Tests.
 *
 * Feature: brightchain-db-init-user-endpoints
 *
 * Uses fast-check to validate that validateLogin correctly rejects
 * all incomplete login requests with field-specific errors.
 */

import { validateLogin } from '../../lib/validation/userValidation';

/** Arbitrary that produces non-empty, non-whitespace-only strings for valid login fields. */
const validLoginString: fc.Arbitrary<string> = fc.stringMatching(
  /^[a-zA-Z0-9_-]{1,30}$/,
);

/** Arbitrary for a valid login body. */
const validLoginBody = fc
  .tuple(validLoginString, validLoginString)
  .map(([username, password]) => ({ username, password }));

/**
 * Helper: assert that a login validation result is invalid and contains
 * an error referencing the given field name.
 */
function expectLoginInvalidWithField(
  result: IValidationResult,
  field: string,
): void {
  expect(result.valid).toBe(false);
  expect(result.errors.length).toBeGreaterThan(0);
  const fieldErrors = result.errors.filter((e) => e.field === field);
  expect(fieldErrors.length).toBeGreaterThanOrEqual(1);
}

describe('Login Validation Property-Based Tests', () => {
  /**
   * Property 6: Login validation rejects incomplete requests
   *
   * Feature: brightchain-db-init-user-endpoints, Property 6: Login validation
   * rejects incomplete requests
   *
   * For any login request body where username or password is missing or empty,
   * the validateLogin function SHALL return { valid: false } with an errors
   * array referencing the missing field.
   *
   * **Validates: Requirements 4.4**
   */
  describe('Property 6: Login validation rejects incomplete requests', () => {
    it('rejects missing username (undefined)', async () => {
      await fc.assert(
        fc.asyncProperty(validLoginString, async (password) => {
          const result = validateLogin({ password });
          expectLoginInvalidWithField(result, 'username');
        }),
        { numRuns: 100 },
      );
    });

    it('rejects empty string username', async () => {
      await fc.assert(
        fc.asyncProperty(validLoginString, async (password) => {
          const result = validateLogin({ username: '', password });
          expectLoginInvalidWithField(result, 'username');
        }),
        { numRuns: 100 },
      );
    });

    it('rejects whitespace-only username', async () => {
      const whitespaceOnly = fc
        .integer({ min: 1, max: 10 })
        .map((n) => ' '.repeat(n));

      await fc.assert(
        fc.asyncProperty(
          whitespaceOnly,
          validLoginString,
          async (username, password) => {
            const result = validateLogin({ username, password });
            expectLoginInvalidWithField(result, 'username');
          },
        ),
        { numRuns: 100 },
      );
    });

    it('rejects missing password (undefined)', async () => {
      await fc.assert(
        fc.asyncProperty(validLoginString, async (username) => {
          const result = validateLogin({ username });
          expectLoginInvalidWithField(result, 'password');
        }),
        { numRuns: 100 },
      );
    });

    it('rejects empty string password', async () => {
      await fc.assert(
        fc.asyncProperty(validLoginString, async (username) => {
          const result = validateLogin({ username, password: '' });
          expectLoginInvalidWithField(result, 'password');
        }),
        { numRuns: 100 },
      );
    });

    it('rejects non-string username (number)', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.integer(),
          validLoginString,
          async (username, password) => {
            const result = validateLogin({ username, password });
            expectLoginInvalidWithField(result, 'username');
          },
        ),
        { numRuns: 100 },
      );
    });

    it('rejects non-string password (number)', async () => {
      await fc.assert(
        fc.asyncProperty(
          validLoginString,
          fc.integer(),
          async (username, password) => {
            const result = validateLogin({ username, password });
            expectLoginInvalidWithField(result, 'password');
          },
        ),
        { numRuns: 100 },
      );
    });

    it('rejects completely empty body', () => {
      const result = validateLogin({});
      expect(result.valid).toBe(false);
      expect(result.errors.length).toBe(2);
      const fields = result.errors.map((e) => e.field).sort();
      expect(fields).toEqual(['password', 'username']);
    });

    it('rejects body with both fields missing (null values)', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.constant(null),
          fc.constant(null),
          async (username, password) => {
            const result = validateLogin({ username, password });
            expect(result.valid).toBe(false);
            expect(result.errors.length).toBe(2);
          },
        ),
        { numRuns: 100 },
      );
    });

    it('accepts valid login bodies (sanity check)', async () => {
      await fc.assert(
        fc.asyncProperty(validLoginBody, async (body) => {
          const result = validateLogin(body);
          expect(result.valid).toBe(true);
          expect(result.errors).toEqual([]);
        }),
        { numRuns: 100 },
      );
    });
  });
});
