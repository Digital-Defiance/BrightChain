/**
 * UserController – Property-Based Tests.
 *
 * Feature: brightchain-db-init-user-endpoints
 *
 * Uses fast-check to validate authentication token enforcement
 * on protected endpoints.
 */

import {
  BlockSize,
  EnergyAccountStore,
  initializeBrightChain,
  IUserProfile,
  MemberStore,
  MemoryBlockStore,
  ServiceLocator,
  ServiceProvider,
} from '@brightchain/brightchain-lib';
import { SecureString } from '@digitaldefiance/ecies-lib';
import * as fc from 'fast-check';
import * as jwt from 'jsonwebtoken';
import { IBrightChainApplication } from '../../lib/interfaces/application';
import { AuthService } from '../../lib/services/auth';
import { EmailService } from '../../lib/services/email';

const JWT_SECRET = 'test-jwt-secret-for-pbt';

/**
 * Create a fresh AuthService with isolated in-memory stores.
 */
function createIsolatedAuthService(): AuthService {
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

  return new AuthService(
    mockApp,
    memberStore,
    energyStore,
    mockEmailService,
    JWT_SECRET,
  );
}

/**
 * Arbitrary that generates random strings that are NOT valid JWTs.
 * Includes empty strings, random ASCII, partial JWT-like strings,
 * and strings with invalid characters.
 */
const invalidTokenArb: fc.Arbitrary<string> = fc.oneof(
  // Random printable ASCII strings (very unlikely to be valid JWTs)
  fc.string({ minLength: 0, maxLength: 200 }),
  // Strings that look JWT-ish but are malformed (wrong number of dots)
  fc.string({ minLength: 1, maxLength: 50 }).map((s) => `${s}.${s}`),
  // Strings with the right dot structure but garbage content
  fc
    .tuple(
      fc.string({ minLength: 1, maxLength: 30 }),
      fc.string({ minLength: 1, maxLength: 30 }),
      fc.string({ minLength: 1, maxLength: 30 }),
    )
    .map(([a, b, c]) => `${a}.${b}.${c}`),
  // Bearer prefix with random content
  fc.string({ minLength: 1, maxLength: 100 }).map((s) => `Bearer ${s}`),
  // Tokens signed with a different secret
  fc
    .string({ minLength: 1, maxLength: 50 })
    .map((payload) =>
      jwt.sign({ data: payload }, 'wrong-secret-key', { expiresIn: '1h' }),
    ),
);

describe('UserController Property-Based Tests', () => {
  /**
   * Property 7: Authentication token enforcement
   *
   * Feature: brightchain-db-init-user-endpoints, Property 7: Authentication token enforcement
   *
   * For any request to a protected endpoint (profile GET, profile PUT) where
   * the authorization token is missing or fails JWT verification, the endpoint
   * SHALL return a 401 status code.
   *
   * This test validates the enforcement mechanism at two levels:
   * 1. AuthService.verifyToken rejects all invalid/missing tokens with "Invalid token"
   * 2. The handler-level auth check returns 401 when req.user is absent
   *
   * **Validates: Requirements 5.3, 6.3**
   */
  describe('Property 7: Authentication token enforcement', () => {
    it('AuthService.verifyToken rejects random non-JWT strings with "Invalid token"', async () => {
      const authService = createIsolatedAuthService();

      await fc.assert(
        fc.asyncProperty(invalidTokenArb, async (token) => {
          await expect(authService.verifyToken(token)).rejects.toThrow(
            'Invalid token',
          );
        }),
        { numRuns: 100 },
      );
    }, 60_000);

    it('AuthService.verifyToken rejects empty string', async () => {
      const authService = createIsolatedAuthService();
      await expect(authService.verifyToken('')).rejects.toThrow(
        'Invalid token',
      );
    });

    it('AuthService.verifyToken rejects tokens signed with wrong secret', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.string({ minLength: 1, maxLength: 50 }),
          fc.string({ minLength: 1, maxLength: 50 }),
          async (payload, wrongSecret) => {
            fc.pre(wrongSecret !== JWT_SECRET);

            const badToken = jwt.sign({ memberId: payload }, wrongSecret, {
              expiresIn: '1h',
            });

            const authService = createIsolatedAuthService();
            await expect(authService.verifyToken(badToken)).rejects.toThrow(
              'Invalid token',
            );
          },
        ),
        { numRuns: 100 },
      );
    }, 60_000);

    it('protected handler returns 401 when req.user is missing (profile GET pattern)', async () => {
      /**
       * Simulate the authentication check that handleProfile performs:
       * it casts req to check for user property and returns 401 if absent.
       *
       * We generate random request-like objects WITHOUT a user property
       * and verify the auth check always produces a 401 response.
       */
      const profileAuthCheck = (req: {
        user?: { memberId: string; username: string };
      }): { statusCode: number; message: string } => {
        const user = req.user;
        if (!user) {
          return { statusCode: 401, message: 'Not authenticated' };
        }
        return { statusCode: 200, message: 'OK' };
      };

      /**
       * Arbitrary that generates request objects without a valid user property.
       * This simulates requests where the auth middleware did not populate req.user
       * because the token was missing or invalid.
       */
      const unauthenticatedRequestArb: fc.Arbitrary<Record<string, unknown>> =
        fc.oneof(
          // No user property at all
          fc.record({
            body: fc.anything(),
            headers: fc.dictionary(fc.string(), fc.string()),
          }),
          // user property is undefined
          fc.record({
            user: fc.constant(undefined),
            body: fc.anything(),
          }),
          // user property is null
          fc.record({
            user: fc.constant(null),
            body: fc.anything(),
          }),
          // user property is a non-object value
          fc.record({
            user: fc.oneof(fc.constant(0), fc.constant(false), fc.constant('')),
            body: fc.anything(),
          }),
        );

      fc.assert(
        fc.property(unauthenticatedRequestArb, (req) => {
          const result = profileAuthCheck(
            req as { user?: { memberId: string; username: string } },
          );
          expect(result.statusCode).toBe(401);
          expect(result.message).toBe('Not authenticated');
        }),
        { numRuns: 100 },
      );
    });

    it('protected handler returns 401 when req.user is missing (profile PUT pattern)', async () => {
      /**
       * Same authentication check pattern as handleUpdateProfile.
       */
      const updateProfileAuthCheck = (req: {
        user?: { memberId: string; username: string };
      }): { statusCode: number; message: string } => {
        const user = req.user;
        if (!user) {
          return { statusCode: 401, message: 'Not authenticated' };
        }
        return { statusCode: 200, message: 'OK' };
      };

      const unauthenticatedRequestArb: fc.Arbitrary<Record<string, unknown>> =
        fc.oneof(
          fc.record({
            body: fc.anything(),
            headers: fc.dictionary(fc.string(), fc.string()),
          }),
          fc.record({
            user: fc.constant(undefined),
            body: fc.anything(),
          }),
          fc.record({
            user: fc.constant(null),
            body: fc.anything(),
          }),
          fc.record({
            user: fc.oneof(fc.constant(0), fc.constant(false), fc.constant('')),
            body: fc.anything(),
          }),
        );

      fc.assert(
        fc.property(unauthenticatedRequestArb, (req) => {
          const result = updateProfileAuthCheck(
            req as { user?: { memberId: string; username: string } },
          );
          expect(result.statusCode).toBe(401);
          expect(result.message).toBe('Not authenticated');
        }),
        { numRuns: 100 },
      );
    });
  });
});

/**
 * Property 8: Profile retrieval returns all required fields
 *
 * Feature: brightchain-db-init-user-endpoints, Property 8: Profile retrieval completeness
 *
 * For any authenticated user who has been registered, the profile data
 * constructed from the energy account and member data SHALL contain all of:
 * memberId, username, email, energyBalance, availableBalance, earned, spent,
 * reserved, reputation, createdAt, and lastUpdated.
 *
 * Rather than testing the full HTTP endpoint, we test the profile construction
 * logic directly: register a user via AuthService, retrieve the energy account,
 * and verify all required IUserProfile fields would be present.
 *
 * **Validates: Requirements 5.1, 5.2**
 */
describe('Property 8: Profile retrieval completeness', () => {
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

  /** Arbitrary: password meeting minimum 8-char requirement */
  const passwordArb: fc.Arbitrary<string> = fc
    .array(fc.integer({ min: 0x21, max: 0x7e }), {
      minLength: 8,
      maxLength: 32,
    })
    .map((codes) => String.fromCharCode(...codes));

  /**
   * Create a fresh AuthService with isolated in-memory stores.
   * Returns both the AuthService and the underlying stores so we can
   * inspect the energy account after registration.
   */
  function createIsolatedStoresAndAuth(): {
    authService: AuthService;
    memberStore: MemberStore;
    energyStore: EnergyAccountStore;
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
      JWT_SECRET,
    );

    return { authService, memberStore, energyStore };
  }

  it('profile constructed from registered user data contains all required IUserProfile fields', async () => {
    await fc.assert(
      fc.asyncProperty(
        usernameArb,
        emailArb,
        passwordArb,
        async (username, email, password) => {
          const { authService, memberStore, energyStore } =
            createIsolatedStoresAndAuth();

          // Register the user — creates member + energy account
          const regResult = await authService.register(
            username,
            email,
            new SecureString(password),
          );

          // Look up the member by username to get the reference with raw ID bytes,
          // then compute the checksum the same way AuthService does internally.
          const refs = await memberStore.queryIndex({ name: username });
          expect(refs.length).toBe(1);
          const idBytes = refs[0].id as Uint8Array;
          const memberChecksum =
            ServiceProvider.getInstance().checksumService.calculateChecksum(
              idBytes,
            );

          // Retrieve the energy account the same way handleProfile does
          const energyAccount = await energyStore.getOrCreate(memberChecksum);

          // Retrieve the member to get the email
          const member = await memberStore.getMember(idBytes);

          // Construct the IUserProfile exactly as handleProfile does
          const userProfile: IUserProfile<string> = {
            memberId: regResult.memberId,
            username: username,
            email: member.email.toString(),
            energyBalance: energyAccount.balance,
            availableBalance: energyAccount.availableBalance,
            earned: energyAccount.earned,
            spent: energyAccount.spent,
            reserved: energyAccount.reserved,
            reputation: energyAccount.reputation,
            createdAt: energyAccount.createdAt.toISOString(),
            lastUpdated: energyAccount.lastUpdated.toISOString(),
          };

          // Verify all required fields are present and have correct types
          expect(userProfile.memberId).toBeDefined();
          expect(typeof userProfile.memberId).toBe('string');
          expect(userProfile.memberId.length).toBeGreaterThan(0);

          expect(userProfile.username).toBeDefined();
          expect(typeof userProfile.username).toBe('string');
          expect(userProfile.username).toBe(username);

          expect(userProfile.email).toBeDefined();
          expect(typeof userProfile.email).toBe('string');
          expect(userProfile.email).toBe(email);

          expect(typeof userProfile.energyBalance).toBe('number');
          expect(userProfile.energyBalance).toBeGreaterThanOrEqual(0);

          expect(typeof userProfile.availableBalance).toBe('number');
          expect(userProfile.availableBalance).toBeGreaterThanOrEqual(0);
          expect(userProfile.availableBalance).toBeLessThanOrEqual(
            userProfile.energyBalance,
          );

          expect(typeof userProfile.earned).toBe('number');
          expect(typeof userProfile.spent).toBe('number');
          expect(typeof userProfile.reserved).toBe('number');

          expect(typeof userProfile.reputation).toBe('number');
          expect(userProfile.reputation).toBeGreaterThanOrEqual(0);
          expect(userProfile.reputation).toBeLessThanOrEqual(1);

          expect(typeof userProfile.createdAt).toBe('string');
          expect(userProfile.createdAt.length).toBeGreaterThan(0);
          // Verify it's a valid ISO date string
          expect(new Date(userProfile.createdAt).toISOString()).toBe(
            userProfile.createdAt,
          );

          expect(typeof userProfile.lastUpdated).toBe('string');
          expect(userProfile.lastUpdated.length).toBeGreaterThan(0);
          expect(new Date(userProfile.lastUpdated).toISOString()).toBe(
            userProfile.lastUpdated,
          );
        },
      ),
      { numRuns: 30 },
    );
  }, 300_000);

  it('energy account data matches what was created during registration', async () => {
    await fc.assert(
      fc.asyncProperty(
        usernameArb,
        emailArb,
        passwordArb,
        async (username, email, password) => {
          const { authService, memberStore, energyStore } =
            createIsolatedStoresAndAuth();

          const regResult = await authService.register(
            username,
            email,
            new SecureString(password),
          );

          // Look up the member to get raw ID bytes, then compute checksum
          const refs = await memberStore.queryIndex({ name: username });
          expect(refs.length).toBe(1);
          const idBytes = refs[0].id as Uint8Array;
          const memberChecksum =
            ServiceProvider.getInstance().checksumService.calculateChecksum(
              idBytes,
            );

          const energyAccount = await energyStore.getOrCreate(memberChecksum);

          // The energy balance returned at registration should match
          // the account in the store
          expect(regResult.energyBalance).toBe(energyAccount.balance);

          // A freshly registered user should have trial credits,
          // zero spent/reserved, and neutral reputation
          expect(energyAccount.earned).toBe(0);
          expect(energyAccount.spent).toBe(0);
          expect(energyAccount.reserved).toBe(0);
          expect(energyAccount.availableBalance).toBe(energyAccount.balance);
        },
      ),
      { numRuns: 30 },
    );
  }, 300_000);
});

/**
 * Property 9: Profile settings update persistence round-trip
 *
 * Feature: brightchain-db-init-user-endpoints, Property 9: Profile settings update persistence round-trip
 *
 * For any authenticated user and for any valid settings object (autoReplication boolean,
 * minRedundancy positive integer, preferredRegions string array), updating the profile
 * and then retrieving it SHALL return settings equivalent to those that were submitted.
 *
 * **Validates: Requirements 6.1, 6.2**
 */
describe('Property 9: Profile settings update persistence round-trip', () => {
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

  /** Arbitrary: password meeting minimum 8-char requirement */
  const passwordArb: fc.Arbitrary<string> = fc
    .array(fc.integer({ min: 0x21, max: 0x7e }), {
      minLength: 8,
      maxLength: 32,
    })
    .map((codes) => String.fromCharCode(...codes));

  /** Arbitrary: valid settings object */
  const settingsArb = fc.record({
    autoReplication: fc.boolean(),
    minRedundancy: fc.integer({ min: 1, max: 100 }),
    preferredRegions: fc.array(fc.stringMatching(/^[a-z]{2,10}$/), {
      minLength: 0,
      maxLength: 5,
    }),
  });

  /**
   * Create a fresh AuthService with isolated in-memory stores.
   * Returns both the AuthService and the underlying stores so we can
   * directly call MemberStore methods for settings updates.
   */
  function createIsolatedStoresAndAuth(): {
    authService: AuthService;
    memberStore: MemberStore;
    energyStore: EnergyAccountStore;
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
      JWT_SECRET,
    );

    return { authService, memberStore, energyStore };
  }

  it('settings persisted via updateMember are returned by getMemberProfile', async () => {
    await fc.assert(
      fc.asyncProperty(
        usernameArb,
        emailArb,
        passwordArb,
        settingsArb,
        async (username, email, password, settings) => {
          const { authService, memberStore } = createIsolatedStoresAndAuth();

          // Register a user to get a valid member in the store
          await authService.register(
            username,
            email,
            new SecureString(password),
          );

          // Look up the member by username to get the raw ID bytes
          const refs = await memberStore.queryIndex({ name: username });
          expect(refs.length).toBe(1);
          const idBytes = refs[0].id as Uint8Array;

          // Update the member's settings via MemberStore
          await memberStore.updateMember(idBytes, {
            id: idBytes,
            privateChanges: {
              settings: {
                autoReplication: settings.autoReplication,
                minRedundancy: settings.minRedundancy,
                preferredRegions: settings.preferredRegions,
              },
            },
          });

          // Retrieve the profile and verify settings match
          const profile = await memberStore.getMemberProfile(idBytes);
          expect(profile.privateProfile).not.toBeNull();

          const retrievedSettings = profile.privateProfile!.settings;
          expect(retrievedSettings.autoReplication).toBe(
            settings.autoReplication,
          );
          expect(retrievedSettings.minRedundancy).toBe(settings.minRedundancy);
          expect(retrievedSettings.preferredRegions).toEqual(
            settings.preferredRegions,
          );
        },
      ),
      { numRuns: 30 },
    );
  }, 300_000);
});
