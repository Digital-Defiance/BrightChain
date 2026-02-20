/**
 * AuthService – Property-Based Tests.
 *
 * Feature: brightchain-db-init-user-endpoints
 *
 * Uses fast-check to validate password hashing and auth flow correctness properties.
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
import { SecureString } from '@digitaldefiance/ecies-lib';
import * as bcrypt from 'bcrypt';
import * as fc from 'fast-check';
import * as jwt from 'jsonwebtoken';
import { IBrightChainApplication } from '../../lib/interfaces/application';
import { IAuthCredentials } from '../../lib/interfaces/auth-credentials';
import { AuthService } from '../../lib/services/auth';
import { EmailService } from '../../lib/services/email';

/**
 * Arbitrary that produces non-empty printable ASCII strings (0x21–0x7e)
 * suitable as passwords. Range excludes space (0x20) to ensure non-whitespace.
 */
const printableAsciiPassword: fc.Arbitrary<string> = fc
  .array(fc.integer({ min: 0x21, max: 0x7e }), { minLength: 1, maxLength: 72 })
  .map((codes) => String.fromCharCode(...codes));

/**
 * Use a low bcrypt cost factor (4) for test performance.
 * The round-trip property (hash then compare returns true) is independent
 * of the number of rounds — rounds only affect computational cost.
 */
const TEST_BCRYPT_ROUNDS = 4;

describe('AuthService Property-Based Tests', () => {
  /**
   * Property 2: Password hashing round-trip
   *
   * Feature: brightchain-db-init-user-endpoints, Property 2: Password hashing round-trip
   *
   * For any non-empty password string, hashing it with bcrypt and then
   * comparing the original password against the hash using bcrypt.compare
   * SHALL return true.
   *
   * **Validates: Requirements 3.3**
   */
  describe('Property 2: Password hashing round-trip', () => {
    it('bcrypt.hash followed by bcrypt.compare returns true for any password', async () => {
      await fc.assert(
        fc.asyncProperty(printableAsciiPassword, async (password) => {
          const hash = await bcrypt.hash(password, TEST_BCRYPT_ROUNDS);
          const matches = await bcrypt.compare(password, hash);
          expect(matches).toBe(true);
        }),
        { numRuns: 100 },
      );
    }, 120_000);

    it('bcrypt.compare returns false for a different password', async () => {
      await fc.assert(
        fc.asyncProperty(
          printableAsciiPassword,
          printableAsciiPassword,
          async (password, otherPassword) => {
            fc.pre(password !== otherPassword);
            const hash = await bcrypt.hash(password, TEST_BCRYPT_ROUNDS);
            const matches = await bcrypt.compare(otherPassword, hash);
            expect(matches).toBe(false);
          },
        ),
        { numRuns: 100 },
      );
    }, 120_000);
  });

  /**
   * Property 3: Duplicate email rejection
   *
   * Feature: brightchain-db-init-user-endpoints, Property 3: Duplicate email rejection
   *
   * For any valid registration data, registering a member and then attempting
   * to register a second member with the same email SHALL result in a conflict
   * error on the second attempt.
   *
   * **Validates: Requirements 3.4**
   */
  describe('Property 3: Duplicate email rejection', () => {
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
     * Create a fresh AuthService with isolated in-memory stores for each
     * property test iteration, preventing cross-contamination.
     */
    function createIsolatedAuthService(): AuthService {
      initializeBrightChain();
      ServiceLocator.setServiceProvider(ServiceProvider.getInstance());

      const blockStore = new MemoryBlockStore(BlockSize.Small);
      const memberStore = new MemberStore(blockStore);
      const energyStore = new EnergyAccountStore();

      // Minimal mock application — AuthService only stores it via BaseService
      // and does not access its properties during register/login flows.
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

      // Mock EmailService — sendEmail is a no-op
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
        'test-jwt-secret-for-pbt',
      );
    }

    it('second registration with the same email throws a conflict error', async () => {
      await fc.assert(
        fc.asyncProperty(
          usernameArb,
          usernameArb,
          emailArb,
          passwordArb,
          passwordArb,
          async (username1, username2Raw, email, password1, password2) => {
            // Ensure the two usernames are distinct so the second registration
            // can only fail because of the duplicate email, not a duplicate name.
            const username2 =
              username2Raw === username1 ? username2Raw + '_dup' : username2Raw;

            const authService = createIsolatedAuthService();

            // First registration should succeed
            await authService.register(
              username1,
              email,
              new SecureString(password1),
            );

            // Second registration with the same email must throw
            await expect(
              authService.register(
                username2,
                email,
                new SecureString(password2),
              ),
            ).rejects.toThrow('Email already registered');
          },
        ),
        { numRuns: 30 },
      );
    }, 300_000);
  });

  /**
   * Property 4: Register-then-login round-trip
   *
   * Feature: brightchain-db-init-user-endpoints, Property 4: Register-then-login round-trip
   *
   * For any valid registration data (username, email, password), after
   * successfully registering, logging in with the same username and password
   * SHALL succeed and return a valid JWT token containing the same member ID.
   *
   * **Validates: Requirements 3.1, 4.1**
   */
  describe('Property 4: Register-then-login round-trip', () => {
    const usernameArb: fc.Arbitrary<string> =
      fc.stringMatching(/^[a-z0-9_-]{3,20}$/);

    const emailArb: fc.Arbitrary<string> = fc
      .tuple(
        fc.stringMatching(/^[a-z0-9]{3,12}$/),
        fc.stringMatching(/^[a-z]{3,8}$/),
      )
      .map(([local, domain]) => `${local}@${domain}.com`);

    const passwordArb: fc.Arbitrary<string> = fc
      .array(fc.integer({ min: 0x21, max: 0x7e }), {
        minLength: 8,
        maxLength: 32,
      })
      .map((codes) => String.fromCharCode(...codes));

    const JWT_SECRET = 'test-jwt-secret-for-pbt';

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

    it('login after registration returns a JWT with the same memberId', async () => {
      await fc.assert(
        fc.asyncProperty(
          usernameArb,
          emailArb,
          passwordArb,
          async (username, email, password) => {
            const authService = createIsolatedAuthService();

            // Register
            const registerResult = await authService.register(
              username,
              email,
              new SecureString(password),
            );

            // Login with the same credentials
            const credentials: IAuthCredentials = {
              username,
              password: new SecureString(password),
            };
            const loginResult = await authService.login(credentials);

            // Both should return the same memberId
            expect(loginResult.memberId).toBe(registerResult.memberId);

            // The login JWT should contain the same memberId
            const decoded = jwt.verify(
              loginResult.token,
              JWT_SECRET,
            ) as jwt.JwtPayload;
            expect(decoded['memberId']).toBe(registerResult.memberId);

            // The login token should be a valid non-empty string
            expect(typeof loginResult.token).toBe('string');
            expect(loginResult.token.length).toBeGreaterThan(0);
          },
        ),
        { numRuns: 30 },
      );
    }, 300_000);
  });

  /**
   * Property 5: Invalid credentials rejection
   *
   * Feature: brightchain-db-init-user-endpoints, Property 5: Invalid credentials rejection
   *
   * For any registered user and for any password that differs from the
   * registered password, OR for any username not present in the MemberStore,
   * calling login SHALL throw an "Invalid credentials" error.
   *
   * **Validates: Requirements 4.2, 4.3**
   */
  describe('Property 5: Invalid credentials rejection', () => {
    const usernameArb: fc.Arbitrary<string> =
      fc.stringMatching(/^[a-z0-9_-]{3,20}$/);

    const emailArb: fc.Arbitrary<string> = fc
      .tuple(
        fc.stringMatching(/^[a-z0-9]{3,12}$/),
        fc.stringMatching(/^[a-z]{3,8}$/),
      )
      .map(([local, domain]) => `${local}@${domain}.com`);

    const passwordArb: fc.Arbitrary<string> = fc
      .array(fc.integer({ min: 0x21, max: 0x7e }), {
        minLength: 8,
        maxLength: 32,
      })
      .map((codes) => String.fromCharCode(...codes));

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
        'test-jwt-secret-for-pbt',
      );
    }

    it('login with wrong password throws "Invalid credentials"', async () => {
      await fc.assert(
        fc.asyncProperty(
          usernameArb,
          emailArb,
          passwordArb,
          passwordArb,
          async (username, email, password, wrongPassword) => {
            fc.pre(password !== wrongPassword);

            const authService = createIsolatedAuthService();

            // Register with the correct password
            await authService.register(
              username,
              email,
              new SecureString(password),
            );

            // Attempt login with a different password
            const credentials: IAuthCredentials = {
              username,
              password: new SecureString(wrongPassword),
            };
            await expect(authService.login(credentials)).rejects.toThrow(
              'Invalid credentials',
            );
          },
        ),
        { numRuns: 30 },
      );
    }, 300_000);

    it('login with non-existent username throws "Invalid credentials"', async () => {
      await fc.assert(
        fc.asyncProperty(
          usernameArb,
          passwordArb,
          async (username, password) => {
            const authService = createIsolatedAuthService();

            // Do NOT register — the username does not exist
            const credentials: IAuthCredentials = {
              username,
              password: new SecureString(password),
            };
            await expect(authService.login(credentials)).rejects.toThrow(
              'Invalid credentials',
            );
          },
        ),
        { numRuns: 30 },
      );
    }, 300_000);
  });
});
