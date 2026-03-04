/**
 * AuthService Password – Property-Based Tests.
 *
 * Feature: brightchain-user-management
 *
 * Uses fast-check to validate password-related properties for the
 * AuthService and password validation functions.
 */

import {
  BlockSize,
  EnergyAccountStore,
  initializeBrightChain,
  MemberStore,
  MemoryBlockStore,
  ServiceLocator,
  ServiceProvider,
} from '@brightchain/brightchain-lib';
import { EmailString, MemberType, SecureString } from '@digitaldefiance/ecies-lib';
import { ECIESService, Member } from '@digitaldefiance/node-ecies-lib';
import { SystemUserService } from '@digitaldefiance/node-express-suite';
import * as bcrypt from 'bcrypt';
import * as fc from 'fast-check';
import { IBrightChainApplication } from '../../lib/interfaces/application';
import { AuthService } from '../../lib/services/auth';
import { EmailService } from '../../lib/services/email';
import {
  IValidationResult,
  validatePasswordChange,
} from '../../lib/validation/userValidation';
import { AppConstants } from '../../lib/appConstants';

/** Arbitrary that produces valid passwords (>= 8 chars, printable ASCII). */
const validPassword: fc.Arbitrary<string> =
  fc.stringMatching(/^[\x20-\x7e]{8,64}$/);

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

/** Arbitrary: alphanumeric username (3–20 chars) */
const usernameArb: fc.Arbitrary<string> =
  fc.stringMatching(/^[a-z0-9_-]{3,20}$/);

/** Arbitrary: simple valid email built from random local + domain parts */
const emailArb: fc.Arbitrary<string> = fc
  .tuple(
    fc.stringMatching(/^[a-z0-9]{3,12}$/),
    fc.stringMatching(/^[a-z]{3,8}$/),
  )
  .map(([local, domain]) => `${local}@${domain}.com`);

/** Arbitrary: password meeting minimum 8-char requirement (printable non-space ASCII) */
const passwordArb: fc.Arbitrary<string> = fc
  .array(fc.integer({ min: 0x21, max: 0x7e }), {
    minLength: 8,
    maxLength: 32,
  })
  .map((codes) => String.fromCharCode(...codes));

/**
 * Create a fresh AuthService with isolated in-memory stores.
 * Returns both the AuthService and the MemberStore so we can
 * query member IDs for changePassword / getPasswordHash calls.
 */
function createIsolatedAuthServiceAndStore(): {
  authService: AuthService;
  memberStore: MemberStore;
} {
  initializeBrightChain();
  ServiceLocator.setServiceProvider(ServiceProvider.getInstance());

  const blockStore = new MemoryBlockStore(BlockSize.Small);
  const memberStore = new MemberStore(blockStore);
  const energyStore = new EnergyAccountStore();

  const mockApp = {
    environment: { mongo: { useTransactions: false }, debug: false },
    constants: AppConstants,
    ready: true,
    services: {},
    plugins: {},
    db: { connection: { readyState: 1 } },
    getModel: () => {
      throw new Error('not implemented');
    },
    getController: () => {
      throw new Error('not implemented');
    },
    setController: () => {
      /* noop */
    },
    start: async () => {
      /* noop */
    },
  } as unknown as IBrightChainApplication;

  const mockEmailService = {
    sendEmail: async () => {
      /* noop */
    },
  } as unknown as EmailService;

  // Pre-populate the SystemUserService singleton
  (SystemUserService as any)['systemUser'] = null;
  const ecies = ServiceProvider.getInstance().eciesService as unknown as ECIESService;
  const { member: sysUser } = Member.newMember(
    ecies,
    MemberType.System,
    AppConstants.SystemUser,
    new EmailString(AppConstants.SystemEmail),
  );
  SystemUserService.setSystemUser(sysUser, AppConstants);

  const authService = new AuthService(
    mockApp,
    memberStore,
    energyStore,
    mockEmailService,
    'test-jwt-secret-for-pbt',
  );

  return { authService, memberStore };
}

describe('AuthService Password Property-Based Tests', () => {
  // Feature: brightchain-user-management, Property 1: Password change round-trip
  /**
   * Property 1: Password change round-trip
   *
   * For any valid new password, after `changePassword`,
   * `bcrypt.compare(newPassword, getPasswordHash(memberId))` returns `true`.
   *
   * **Validates: Requirements 1.1**
   */
  describe('Property 1: Password change round-trip', () => {
    it('after changePassword, bcrypt.compare(newPassword, storedHash) returns true', async () => {
      await fc.assert(
        fc.asyncProperty(
          usernameArb,
          emailArb,
          passwordArb,
          passwordArb,
          async (username, email, originalPassword, newPassword) => {
            // Ensure original and new passwords differ
            fc.pre(originalPassword !== newPassword);

            const { authService, memberStore } =
              createIsolatedAuthServiceAndStore();

            // Register a user to get a member with a stored password hash
            await authService.register(
              username,
              email,
              new SecureString(originalPassword),
            );

            // Look up the member to get the raw ID bytes
            const refs = await memberStore.queryIndex({ name: username });
            expect(refs.length).toBe(1);
            const memberId = refs[0].id as Uint8Array;

            // Change the password
            await authService.changePassword(
              memberId,
              originalPassword,
              newPassword,
            );

            // Verify the new password matches the stored hash
            const storedHash = await authService.getPasswordHash(memberId);
            const matches = await bcrypt.compare(newPassword, storedHash);
            expect(matches).toBe(true);
          },
        ),
        { numRuns: 100 },
      );
    }, 600_000);
  });

  // Feature: brightchain-user-management, Property 2: Wrong password preserves stored hash
  /**
   * Property 2: Wrong password preserves stored hash
   *
   * For any incorrect current password, `changePassword` throws
   * "Invalid credentials" and the stored hash remains identical to
   * the hash before the call.
   *
   * **Validates: Requirements 1.2**
   */
  describe('Property 2: Wrong password preserves stored hash', () => {
    it('throws "Invalid credentials" and does not modify the stored hash when given a wrong current password', async () => {
      await fc.assert(
        fc.asyncProperty(
          usernameArb,
          emailArb,
          passwordArb,
          passwordArb,
          passwordArb,
          async (
            username,
            email,
            originalPassword,
            wrongPassword,
            newPassword,
          ) => {
            // Ensure the wrong password is actually different from the original
            fc.pre(wrongPassword !== originalPassword);

            const { authService, memberStore } =
              createIsolatedAuthServiceAndStore();

            // Register a user
            await authService.register(
              username,
              email,
              new SecureString(originalPassword),
            );

            // Look up the member to get the raw ID bytes
            const refs = await memberStore.queryIndex({ name: username });
            expect(refs.length).toBe(1);
            const memberId = refs[0].id as Uint8Array;

            // Capture the stored hash before the failed attempt
            const hashBefore = await authService.getPasswordHash(memberId);

            // Attempt changePassword with the wrong current password
            await expect(
              authService.changePassword(memberId, wrongPassword, newPassword),
            ).rejects.toThrow('Invalid credentials');

            // Verify the stored hash is unchanged
            const hashAfter = await authService.getPasswordHash(memberId);
            expect(hashAfter).toBe(hashBefore);
          },
        ),
        { numRuns: 100 },
      );
    }, 600_000);
  });

  // Feature: brightchain-user-management, Property 3: Password policy validation rejects short passwords
  /**
   * Property 3: Password policy validation rejects short passwords
   *
   * For any string with length < 8, `validatePasswordChange` should return
   * `{ valid: false }` with an error on the `newPassword` field.
   *
   * **Validates: Requirements 1.3**
   */
  describe('Property 3: Password policy validation rejects short passwords', () => {
    it('rejects newPassword strings shorter than 8 characters', async () => {
      const shortPassword: fc.Arbitrary<string> =
        fc.stringMatching(/^[\x20-\x7e]{1,7}$/);

      await fc.assert(
        fc.asyncProperty(
          validPassword,
          shortPassword,
          async (currentPassword, newPassword) => {
            const result = validatePasswordChange({
              currentPassword,
              newPassword,
            });
            expectInvalidWithField(result, 'newPassword');
          },
        ),
        { numRuns: 100 },
      );
    });

    it('rejects empty string newPassword', async () => {
      await fc.assert(
        fc.asyncProperty(validPassword, async (currentPassword) => {
          const result = validatePasswordChange({
            currentPassword,
            newPassword: '',
          });
          expectInvalidWithField(result, 'newPassword');
        }),
        { numRuns: 100 },
      );
    });

    it('rejects missing newPassword (undefined)', async () => {
      await fc.assert(
        fc.asyncProperty(validPassword, async (currentPassword) => {
          const result = validatePasswordChange({ currentPassword });
          expectInvalidWithField(result, 'newPassword');
        }),
        { numRuns: 100 },
      );
    });

    it('accepts valid newPassword of exactly 8 characters (boundary)', async () => {
      const exactly8: fc.Arbitrary<string> =
        fc.stringMatching(/^[\x20-\x7e]{8}$/);

      await fc.assert(
        fc.asyncProperty(
          validPassword,
          exactly8,
          async (currentPassword, newPassword) => {
            const result = validatePasswordChange({
              currentPassword,
              newPassword,
            });
            // Should not have an error on newPassword field
            const newPasswordErrors = result.errors.filter(
              (e) => e.field === 'newPassword',
            );
            expect(newPasswordErrors).toEqual([]);
          },
        ),
        { numRuns: 100 },
      );
    });
  });
});
