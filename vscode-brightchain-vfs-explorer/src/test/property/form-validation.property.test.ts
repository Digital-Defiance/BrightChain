/**
 * Feature: brightchain-vfs-explorer, Property 23: Webview form validation rejects invalid inputs
 *
 * For any mnemonic login form submission where the mnemonic field is empty or
 * the username/email fields are both empty, the webview should reject the submission.
 * For any password login form submission where username or password is empty,
 * the same rejection should apply.
 *
 * **Validates: Requirements 12.3**
 */

import * as fc from 'fast-check';
import {
  validateMnemonicForm,
  validatePasswordForm,
} from '../../ui/login-webview';

describe('Property 23: Webview form validation rejects invalid inputs', () => {
  describe('mnemonic form', () => {
    it('should reject when mnemonic is empty', () => {
      fc.assert(
        fc.property(
          fc.constantFrom('', '   ', '\t', '\n'),
          fc.option(fc.string({ minLength: 1 }), { nil: undefined }),
          fc.option(fc.string({ minLength: 1 }), { nil: undefined }),
          (mnemonic, username, email) => {
            const error = validateMnemonicForm(mnemonic, username, email);
            expect(error).not.toBeNull();
          },
        ),
        { numRuns: 100 },
      );
    });

    it('should reject when both username and email are empty', () => {
      fc.assert(
        fc.property(
          fc
            .string({ minLength: 1, maxLength: 200 })
            .filter((s) => s.trim().length > 0),
          fc.constantFrom('', '  ', undefined),
          fc.constantFrom('', '  ', undefined),
          (mnemonic, username, email) => {
            const error = validateMnemonicForm(mnemonic, username, email);
            expect(error).not.toBeNull();
          },
        ),
        { numRuns: 100 },
      );
    });

    it('should accept when mnemonic and at least one identity field are provided', () => {
      fc.assert(
        fc.property(
          fc
            .string({ minLength: 1, maxLength: 200 })
            .filter((s) => s.trim().length > 0),
          fc
            .string({ minLength: 1, maxLength: 50 })
            .filter((s) => s.trim().length > 0),
          (mnemonic, identity) => {
            // Provide username
            const err1 = validateMnemonicForm(mnemonic, identity, undefined);
            expect(err1).toBeNull();

            // Provide email
            const err2 = validateMnemonicForm(mnemonic, undefined, identity);
            expect(err2).toBeNull();
          },
        ),
        { numRuns: 100 },
      );
    });
  });

  describe('password form', () => {
    it('should reject when usernameOrEmail is empty', () => {
      fc.assert(
        fc.property(
          fc.constantFrom('', '   ', '\t'),
          fc.string({ minLength: 1, maxLength: 100 }),
          (usernameOrEmail, password) => {
            const error = validatePasswordForm(usernameOrEmail, password);
            expect(error).not.toBeNull();
          },
        ),
        { numRuns: 100 },
      );
    });

    it('should reject when password is empty', () => {
      fc.assert(
        fc.property(
          fc
            .string({ minLength: 1, maxLength: 100 })
            .filter((s) => s.trim().length > 0),
          fc.constant(''),
          (usernameOrEmail, password) => {
            const error = validatePasswordForm(usernameOrEmail, password);
            expect(error).not.toBeNull();
          },
        ),
        { numRuns: 100 },
      );
    });

    it('should accept when both fields are non-empty', () => {
      fc.assert(
        fc.property(
          fc
            .string({ minLength: 1, maxLength: 100 })
            .filter((s) => s.trim().length > 0),
          fc.string({ minLength: 1, maxLength: 100 }),
          (usernameOrEmail, password) => {
            const error = validatePasswordForm(usernameOrEmail, password);
            expect(error).toBeNull();
          },
        ),
        { numRuns: 100 },
      );
    });
  });
});
