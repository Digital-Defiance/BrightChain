/**
 * BackupCodeService – Property-Based Tests.
 *
 * Feature: brightchain-user-management
 *
 * Uses fast-check to validate backup-code-related properties for the
 * BackupCodeService. This file covers Properties 4, 5, 6, 7, 8.
 */

import {
  BlockSize,
  EmailString,
  EnergyAccountStore,
  initializeBrightChain,
  MemberStore,
  MemoryBlockStore,
  ServiceLocator,
  ServiceProvider,
} from '@brightchain/brightchain-lib';
import { MemberType } from '@digitaldefiance/ecies-lib';
import * as bcrypt from 'bcrypt';
import * as fc from 'fast-check';
import { IBrightChainApplication } from '../../lib/interfaces/application';
import { AuthService } from '../../lib/services/auth';
import { BackupCodeService } from '../../lib/services/backupCodeService';
import { EmailService } from '../../lib/services/email';

/** Low bcrypt rounds for test speed. */
const TEST_BCRYPT_ROUNDS = 4;

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
 * Create a fresh BackupCodeService with isolated in-memory stores.
 * Returns the BackupCodeService, MemberStore, and AuthService so we can
 * create members and test backup code operations.
 */
function createIsolatedServices(): {
  backupCodeService: BackupCodeService;
  memberStore: MemberStore;
  authService: AuthService;
} {
  initializeBrightChain();
  ServiceLocator.setServiceProvider(ServiceProvider.getInstance());

  const blockStore = new MemoryBlockStore(BlockSize.Small);
  const memberStore = new MemberStore(blockStore);
  const energyStore = new EnergyAccountStore();

  const mockApp = {
    environment: { mongo: { useTransactions: false }, debug: false },
    constants: {},
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

  const authService = new AuthService(
    mockApp,
    memberStore,
    energyStore,
    mockEmailService,
    'test-jwt-secret-for-backup-pbt',
  );

  const backupCodeService = new BackupCodeService(
    memberStore,
    TEST_BCRYPT_ROUNDS,
  );

  return { backupCodeService, memberStore, authService };
}

/**
 * Register a member directly via MemberStore and store a password hash.
 * Returns the raw memberId bytes.
 */
async function createTestMember(
  authService: AuthService,
  memberStore: MemberStore,
  username: string,
  email: string,
  password: string,
): Promise<Uint8Array> {
  const { reference } = await memberStore.createMember({
    type: MemberType.User,
    name: username,
    contactEmail: new EmailString(email),
  });

  const memberId = reference.id as Uint8Array;
  const passwordHash = await bcrypt.hash(password, TEST_BCRYPT_ROUNDS);
  await authService.storePasswordHash(memberId, passwordHash);

  return memberId;
}

// Feature: brightchain-user-management, Property 4: Backup code generation invariant
describe('BackupCodeService Property-Based Tests', () => {
  /**
   * Property 4: Backup code generation invariant
   *
   * For any member, calling `generateCodes(memberId)` should return exactly
   * 10 distinct plaintext codes, and immediately calling `getCodeCount(memberId)`
   * should return 10.
   *
   * **Validates: Requirements 2.1, 2.2**
   */
  describe('Property 4: Backup code generation invariant', () => {
    it('generateCodes returns exactly 10 distinct codes and getCodeCount returns 10', async () => {
      await fc.assert(
        fc.asyncProperty(
          usernameArb,
          emailArb,
          passwordArb,
          async (username, email, password) => {
            const { backupCodeService, memberStore, authService } =
              createIsolatedServices();

            // Create a member
            const memberId = await createTestMember(
              authService,
              memberStore,
              username,
              email,
              password,
            );

            // Generate backup codes
            const codes = await backupCodeService.generateCodes(memberId);

            // Should return exactly 10 codes
            expect(codes).toHaveLength(10);

            // All codes should be distinct
            const uniqueCodes = new Set(codes);
            expect(uniqueCodes.size).toBe(10);

            // getCodeCount should return 10
            const count = await backupCodeService.getCodeCount(memberId);
            expect(count).toBe(10);
          },
        ),
        { numRuns: 100 },
      );
    }, 600_000);
  });

  // Feature: brightchain-user-management, Property 5: Valid backup code authentication succeeds and decrements count
  /**
   * Property 5: Valid backup code authentication succeeds and decrements count
   *
   * For any member with generated backup codes, and any one of those plaintext
   * codes that has not been used, calling `validateCode(memberId, code)` should
   * return `true`, and the subsequent `getCodeCount(memberId)` should return
   * one less than before.
   *
   * **Validates: Requirements 2.3**
   */
  describe('Property 5: Valid backup code authentication succeeds and decrements count', () => {
    it('any unused code validates successfully and count decrements by 1', async () => {
      await fc.assert(
        fc.asyncProperty(
          usernameArb,
          emailArb,
          passwordArb,
          fc.integer({ min: 0, max: 9 }),
          async (username, email, password, codeIndex) => {
            const { backupCodeService, memberStore, authService } =
              createIsolatedServices();

            // Create a member
            const memberId = await createTestMember(
              authService,
              memberStore,
              username,
              email,
              password,
            );

            // Generate backup codes
            const codes = await backupCodeService.generateCodes(memberId);

            // Get count before validation
            const countBefore = await backupCodeService.getCodeCount(memberId);
            expect(countBefore).toBe(10);

            // Pick a random code from the generated set
            const chosenCode = codes[codeIndex];

            // Validate the chosen code
            const result = await backupCodeService.validateCode(
              memberId,
              chosenCode,
            );
            expect(result).toBe(true);

            // Count should have decremented by 1
            const countAfter = await backupCodeService.getCodeCount(memberId);
            expect(countAfter).toBe(countBefore - 1);
          },
        ),
        { numRuns: 100 },
      );
    }, 600_000);
  });

  // Feature: brightchain-user-management, Property 6: Used or invalid backup codes are rejected
  /**
   * Property 6: Used or invalid backup codes are rejected
   *
   * For any member with generated backup codes, and any code that has already
   * been used OR any random string not in the generated set, calling
   * `validateCode(memberId, code)` should return `false`.
   *
   * **Validates: Requirements 2.4**
   */
  describe('Property 6: Used or invalid backup codes are rejected', () => {
    it('a code that has already been used is rejected on second attempt', async () => {
      await fc.assert(
        fc.asyncProperty(
          usernameArb,
          emailArb,
          passwordArb,
          fc.integer({ min: 0, max: 9 }),
          async (username, email, password, codeIndex) => {
            const { backupCodeService, memberStore, authService } =
              createIsolatedServices();

            const memberId = await createTestMember(
              authService,
              memberStore,
              username,
              email,
              password,
            );

            const codes = await backupCodeService.generateCodes(memberId);
            const chosenCode = codes[codeIndex];

            // First use should succeed
            const firstResult = await backupCodeService.validateCode(
              memberId,
              chosenCode,
            );
            expect(firstResult).toBe(true);

            // Second use of the same code should be rejected
            const secondResult = await backupCodeService.validateCode(
              memberId,
              chosenCode,
            );
            expect(secondResult).toBe(false);
          },
        ),
        { numRuns: 100 },
      );
    }, 600_000);

    it('a random hex string not in the generated set is rejected', async () => {
      await fc.assert(
        fc.asyncProperty(
          usernameArb,
          emailArb,
          passwordArb,
          fc.uint8Array({ minLength: 8, maxLength: 8 }).map((bytes) => {
            const hex = Buffer.from(bytes).toString('hex');
            return `${hex.slice(0, 4)}-${hex.slice(4, 8)}-${hex.slice(8, 12)}-${hex.slice(12, 16)}`;
          }),
          async (username, email, password, randomCode) => {
            const { backupCodeService, memberStore, authService } =
              createIsolatedServices();

            const memberId = await createTestMember(
              authService,
              memberStore,
              username,
              email,
              password,
            );

            const codes = await backupCodeService.generateCodes(memberId);

            // Skip if the random code happens to collide with a generated code
            fc.pre(!codes.includes(randomCode));

            // Random code not in the set should be rejected
            const result = await backupCodeService.validateCode(
              memberId,
              randomCode,
            );
            expect(result).toBe(false);
          },
        ),
        { numRuns: 100 },
      );
    }, 600_000);
  });

  // Feature: brightchain-user-management, Property 7: Backup code regeneration invalidates old codes
  /**
   * Property 7: Backup code regeneration invalidates old codes
   *
   * For any member with existing backup codes, calling `regenerateCodes(memberId)`
   * should return 10 new codes, the new count should be 10, and every
   * previously-generated code should now be rejected by `validateCode`.
   *
   * **Validates: Requirements 2.5**
   */
  describe('Property 7: Backup code regeneration invalidates old codes', () => {
    it('after regenerateCodes, old codes are rejected and new count is 10', async () => {
      await fc.assert(
        fc.asyncProperty(
          usernameArb,
          emailArb,
          passwordArb,
          async (username, email, password) => {
            const { backupCodeService, memberStore, authService } =
              createIsolatedServices();

            // Create a member
            const memberId = await createTestMember(
              authService,
              memberStore,
              username,
              email,
              password,
            );

            // Generate initial backup codes
            const oldCodes = await backupCodeService.generateCodes(memberId);
            expect(oldCodes).toHaveLength(10);

            // Regenerate codes — should invalidate old ones
            const newCodes = await backupCodeService.regenerateCodes(memberId);
            expect(newCodes).toHaveLength(10);

            // New count should be 10
            const count = await backupCodeService.getCodeCount(memberId);
            expect(count).toBe(10);

            // Every old code should now be rejected
            for (const oldCode of oldCodes) {
              const result = await backupCodeService.validateCode(
                memberId,
                oldCode,
              );
              expect(result).toBe(false);
            }
          },
        ),
        { numRuns: 100 },
      );
    }, 600_000);
  });

  // Feature: brightchain-user-management, Property 8: Backup codes stored as bcrypt hashes
  /**
   * Property 8: Backup codes stored as bcrypt hashes
   *
   * For any member after `generateCodes(memberId)`, the stored backup code
   * entries in the member's private profile should all have `hash` fields
   * matching the bcrypt pattern `/^\$2[aby]\$/` and none should equal any of
   * the returned plaintext codes.
   *
   * **Validates: Requirements 2.6**
   */
  describe('Property 8: Backup codes stored as bcrypt hashes', () => {
    it('stored backup code hashes match bcrypt pattern and never equal plaintext codes', async () => {
      const bcryptPattern = /^\$2[aby]\$/;

      await fc.assert(
        fc.asyncProperty(
          usernameArb,
          emailArb,
          passwordArb,
          async (username, email, password) => {
            const { backupCodeService, memberStore, authService } =
              createIsolatedServices();

            // Create a member
            const memberId = await createTestMember(
              authService,
              memberStore,
              username,
              email,
              password,
            );

            // Generate backup codes — returns plaintext codes
            const plaintextCodes =
              await backupCodeService.generateCodes(memberId);

            // Read stored backup codes from the member's private profile
            const profile = await memberStore.getMemberProfile(memberId);
            expect(profile.privateProfile).not.toBeNull();

            const storedCodes = profile.privateProfile!.backupCodes ?? [];
            expect(storedCodes).toHaveLength(10);

            for (const entry of storedCodes) {
              // Each hash must match the bcrypt pattern
              expect(entry.hash).toMatch(bcryptPattern);

              // No stored hash should equal any plaintext code
              for (const plaintext of plaintextCodes) {
                expect(entry.hash).not.toBe(plaintext);
              }
            }
          },
        ),
        { numRuns: 100 },
      );
    }, 600_000);
  });
});
