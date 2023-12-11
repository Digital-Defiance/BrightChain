/**
 * Property-Based Tests: Uniqueness collision detection
 *
 * Feature: user-provided-mnemonic-brightchain, Property 5: Uniqueness collision detection
 *
 * Tests that registering with a mnemonic whose HMAC already exists in the
 * mnemonic collection is rejected with an error containing
 * `validation_mnemonicInUse`.
 *
 * **Validates: Requirements 3.2**
 */

import type {
  EnergyAccountStore,
  MemberStore,
} from '@brightchain/brightchain-lib';
import {
  Constants as BaseConstants,
  SecureString,
} from '@digitaldefiance/ecies-lib';
import { createHmac } from 'crypto';
import * as fc from 'fast-check';
import type { IBrightDbApplication } from '../lib/interfaces/bright-db-application';
import { BrightDbAuthService } from '../lib/services/auth';

// ─── Constants ──────────────────────────────────────────────────────────────

/** A fixed 32-byte hex HMAC secret for deterministic testing */
const TEST_HMAC_SECRET_HEX =
  'abcdef0123456789abcdef0123456789abcdef0123456789abcdef0123456789';

/** Valid BIP39 word counts */
const VALID_WORD_COUNTS = [12, 15, 18, 21, 24];

// ─── Generators ─────────────────────────────────────────────────────────────

/** Generate a single lowercase word (mimics BIP39 wordlist words) */
const wordArb = fc.stringMatching(/^[a-z]{3,8}$/);

/**
 * Generate a valid mnemonic: exactly N words separated by single spaces,
 * where N is one of 12, 15, 18, 21, or 24.
 */
const validMnemonicArb = fc
  .constantFrom(...VALID_WORD_COUNTS)
  .chain((count) => fc.array(wordArb, { minLength: count, maxLength: count }))
  .map((words) => words.join(' '));

// ─── Mock Helpers ───────────────────────────────────────────────────────────

/**
 * Build a mock QueryBuilder that resolves to the given value.
 * Matches the DocumentCollection.findOne return type (thenable + exec).
 */
function mockQueryBuilder<T>(resolvedValue: T | null) {
  const builder: Record<string, unknown> = {};
  // Make it thenable (Promise-like)
  builder.exec = () => Promise.resolve(resolvedValue);
  builder.then = (
    onFulfilled?: ((v: T | null) => unknown) | null,
    onRejected?: ((r: unknown) => unknown) | null,
  ) => Promise.resolve(resolvedValue).then(onFulfilled, onRejected);
  // Chain methods return self
  for (const method of [
    'select',
    'populate',
    'sort',
    'limit',
    'skip',
    'lean',
    'collation',
    'session',
    'where',
    'distinct',
  ]) {
    builder[method] = jest.fn().mockReturnValue(builder);
  }
  return builder;
}

/**
 * Build a minimal mock application that provides:
 * - environment.get('MNEMONIC_HMAC_SECRET') → the test HMAC secret
 * - db.collection('mnemonics').findOne → resolves to a truthy doc (collision)
 */
function buildMockApplication(
  findOneResult: unknown,
): IBrightDbApplication<Buffer> {
  const mockCollection = {
    findOne: jest.fn().mockReturnValue(mockQueryBuilder(findOneResult)),
    create: jest.fn().mockResolvedValue({}),
    find: jest.fn().mockReturnValue(mockQueryBuilder([])),
    findById: jest.fn().mockReturnValue(mockQueryBuilder(null)),
    findOneAndUpdate: jest.fn().mockReturnValue(mockQueryBuilder(null)),
    findOneAndDelete: jest.fn().mockReturnValue(mockQueryBuilder(null)),
    findByIdAndUpdate: jest.fn().mockReturnValue(mockQueryBuilder(null)),
    findByIdAndDelete: jest.fn().mockReturnValue(mockQueryBuilder(null)),
    insertMany: jest.fn().mockResolvedValue([]),
    updateOne: jest
      .fn()
      .mockResolvedValue({ modifiedCount: 0, matchedCount: 0 }),
    updateMany: jest
      .fn()
      .mockResolvedValue({ modifiedCount: 0, matchedCount: 0 }),
    replaceOne: jest
      .fn()
      .mockResolvedValue({ modifiedCount: 0, matchedCount: 0 }),
    deleteOne: jest.fn().mockResolvedValue({ deletedCount: 0 }),
    deleteMany: jest.fn().mockResolvedValue({ deletedCount: 0 }),
    countDocuments: jest.fn().mockResolvedValue(0),
    estimatedDocumentCount: jest.fn().mockResolvedValue(0),
    aggregate: jest.fn().mockReturnValue(mockQueryBuilder([])),
    distinct: jest.fn().mockReturnValue(mockQueryBuilder([])),
    exists: jest.fn().mockResolvedValue(null),
  };

  return {
    environment: {
      get: jest.fn((key: string) => {
        if (key === 'MNEMONIC_HMAC_SECRET') return TEST_HMAC_SECRET_HEX;
        return undefined;
      }),
    },
    db: {
      collection: jest.fn().mockReturnValue(mockCollection),
    },
    constants: {},
    getModel: jest.fn().mockReturnValue(mockCollection),
  } as unknown as IBrightDbApplication<Buffer>;
}

/**
 * Build a minimal mock MemberStore — queryIndex returns [] (no duplicate email).
 */
function buildMockMemberStore(): MemberStore {
  return {
    queryIndex: jest.fn().mockResolvedValue([]),
  } as unknown as MemberStore;
}

/**
 * Build a minimal mock EnergyAccountStore.
 */
function buildMockEnergyStore(): EnergyAccountStore {
  return {
    set: jest.fn().mockResolvedValue(undefined),
  } as unknown as EnergyAccountStore;
}

// ─── Test Suite ─────────────────────────────────────────────────────────────

describe('Property 5: Uniqueness collision detection', () => {
  jest.setTimeout(120_000);

  /**
   * Property: For any valid mnemonic whose HMAC already exists in the
   * mnemonic collection, calling register() with that mnemonic should
   * throw an error whose message contains 'validation_mnemonicInUse'.
   *
   * The mock application's mnemonics collection findOne returns a truthy
   * document (simulating an existing HMAC entry). The register method
   * should detect the collision and throw before reaching Member.newMember.
   *
   * **Validates: Requirements 3.2**
   */
  it('rejects registration when mnemonic HMAC already exists with validation_mnemonicInUse', async () => {
    await fc.assert(
      fc.asyncProperty(validMnemonicArb, async (mnemonic) => {
        // Sanity: generated mnemonic matches MnemonicRegex
        expect(BaseConstants.MnemonicRegex.test(mnemonic)).toBe(true);

        // Compute expected HMAC for the collision document
        const expectedHmac = createHmac(
          'sha256',
          Buffer.from(TEST_HMAC_SECRET_HEX, 'hex'),
        )
          .update(Buffer.from(mnemonic, 'utf-8'))
          .digest('hex');

        // Build mocks: findOne returns a truthy document → collision
        const existingHmacDoc = {
          _id: 'existing-doc-id',
          hmac: expectedHmac,
        };
        const mockApp = buildMockApplication(existingHmacDoc);
        const mockMemberStore = buildMockMemberStore();
        const mockEnergyStore = buildMockEnergyStore();

        const authService = new BrightDbAuthService(
          mockApp,
          mockMemberStore,
          mockEnergyStore,
          'test-jwt-secret',
        );

        // Attempt registration with the mnemonic — should throw collision error
        await expect(
          authService.register(
            'testuser',
            'test@example.com',
            new SecureString('Passw0rd!'),
            new SecureString(mnemonic),
          ),
        ).rejects.toThrow(
          /validation_mnemonicInUse|mnemonic is already in use/i,
        );
      }),
      { numRuns: 100 },
    );
  });
});
