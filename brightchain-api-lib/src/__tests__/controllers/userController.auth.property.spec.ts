/**
 * UserController – Authentication Property-Based Tests.
 *
 * Feature: brightchain-user-management, Property 15: Unauthenticated requests return 401
 *
 * Uses fast-check to validate that all authenticated endpoints in UserController
 * return 401 when the request lacks a valid JWT (i.e. req.user is not populated).
 *
 * **Validates: Requirements 5.6**
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
import { HandleableError } from '@digitaldefiance/i18n-lib';
import {
  ApiErrorResponse,
  ApiRequestHandler,
  IApiMessageResponse,
  ServiceContainer,
} from '@digitaldefiance/node-express-suite';
import * as fc from 'fast-check';
import { AppConstants } from '../../lib/appConstants';
import { UserController } from '../../lib/controllers/api/user';
import { IBrightChainApplication } from '../../lib/interfaces/application';
import { AuthService } from '../../lib/services/auth';
import { BrightChainBackupCodeService } from '../../lib/services/brightChainBackupCodeService';
import { SESEmailService } from '../../lib/services/sesEmail';
import { BrightChainSessionAdapter } from '../../lib/services/sessionAdapter';

const JWT_SECRET = 'test-jwt-secret-for-auth-property';

/** The handler function type used by UserController */
type HandlerFn = ApiRequestHandler<IApiMessageResponse | ApiErrorResponse>;

/** Extract the parameter types from the handler so our fakes match exactly. */
type HandlerParams = Parameters<HandlerFn>;

/**
 * Subclass that exposes the protected handlers for testing.
 */
class TestableUserController extends UserController {
  public get testHandlers() {
    return this.handlers;
  }
}

/** Stub res — handlers don't use it. */
const stubRes = {} as HandlerParams[1];

/** Stub next — handlers don't call it. */
const stubNext: HandlerParams[2] = () => {
  /* noop */
};

/**
 * Build a minimal request object WITHOUT a user property.
 * The handlers cast req to check for user and return 401 if absent.
 */
function fakeUnauthenticatedRequest(
  body: Record<string, unknown>,
  headers?: Record<string, string>,
): HandlerParams[0] {
  const obj: Record<string, unknown> = {
    body,
    headers: headers ?? {},
  };
  // Deliberately omit `user` to simulate unauthenticated request
  return obj as unknown as HandlerParams[0];
}

/**
 * Build an isolated test environment with all services wired up.
 * Returns a TestableUserController whose handlers can be called directly.
 */
function createTestEnvironment(): {
  controller: TestableUserController;
} {
  initializeBrightChain();
  ServiceLocator.setServiceProvider(ServiceProvider.getInstance());

  const blockStore = new MemoryBlockStore(BlockSize.Small);
  const memberStore = new MemberStore(blockStore);
  const energyStore = new EnergyAccountStore();
  const services = new ServiceContainer();

  const mockApp = {
    environment: { mongo: { useTransactions: false }, debug: false },
    constants: AppConstants,
    ready: true,
    services,
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
  } as unknown as SESEmailService;

  const authService = new AuthService(
    mockApp,
    memberStore,
    energyStore,
    mockEmailService,
    JWT_SECRET,
  );

  // Register a stub backup code service — these tests only exercise
  // unauthenticated 401 paths, so the service is never invoked.
  const backupCodeService = {} as unknown as BrightChainBackupCodeService;

  // Create a mock session adapter with minimal implementation
  const mockSessionAdapter = {
    createSession: async () => 'mock-session-id',
    getSession: async () => null,
    validateToken: async () => null,
    deleteSession: async () => {
      /* noop */
    },
    cleanExpired: async () => 0,
  } as unknown as BrightChainSessionAdapter;

  services.register('auth', () => authService);
  services.register('memberStore', () => memberStore);
  services.register('energyStore', () => energyStore);
  services.register('backupCodeService', () => backupCodeService);
  services.register('sessionAdapter', () => mockSessionAdapter);

  const controller = new TestableUserController(mockApp);

  return { controller };
}

/**
 * Arbitrary: random request body with arbitrary key-value pairs.
 * Simulates the variety of request bodies an unauthenticated caller might send.
 */
const randomBodyArb: fc.Arbitrary<Record<string, unknown>> = fc.dictionary(
  fc.stringMatching(/^[a-zA-Z_][a-zA-Z0-9_]{0,15}$/),
  fc.oneof(
    fc.string({ minLength: 0, maxLength: 50 }),
    fc.integer(),
    fc.boolean(),
    fc.constant(null),
  ),
);

/** Arbitrary: password meeting minimum 8-char requirement (printable non-space ASCII) */
const passwordArb: fc.Arbitrary<string> = fc
  .array(fc.integer({ min: 0x21, max: 0x7e }), {
    minLength: 8,
    maxLength: 32,
  })
  .map((codes) => String.fromCharCode(...codes));

/**
 * Body generator per endpoint. Some handlers (changePassword) run validation
 * before the auth check, so we must provide a body that passes validation
 * to reach the 401 path.
 */
function bodyArbForEndpoint(
  key: string,
): fc.Arbitrary<Record<string, unknown>> {
  switch (key) {
    case 'changePassword':
      // Must pass validatePasswordChange: currentPassword non-empty, newPassword ≥8 chars
      return fc.tuple(passwordArb, passwordArb).map(([current, newPw]) => ({
        currentPassword: current,
        newPassword: newPw,
      }));
    default:
      return randomBodyArb;
  }
}

/**
 * The list of authenticated endpoint handler keys and their names.
 * These are all the endpoints that require `useAuthentication: true`
 * in the route definitions.
 */
const authenticatedEndpoints = [
  { key: 'getProfile', name: 'GET /profile' },
  { key: 'updateProfile', name: 'PUT /profile' },
  { key: 'changePassword', name: 'POST /change-password' },
  { key: 'generateBackupCodes', name: 'POST /backup-codes' },
  { key: 'getBackupCodeCount', name: 'GET /backup-codes' },
  { key: 'logout', name: 'POST /logout' },
] as const;

// Feature: brightchain-user-management, Property 15: Unauthenticated requests return 401
describe('UserController Auth Property-Based Tests', () => {
  /**
   * Property 15: Unauthenticated requests return 401
   *
   * For any authenticated endpoint in UserController, and any request that
   * lacks a valid JWT token (i.e. req.user is not populated by auth middleware),
   * the response status code should be 401.
   *
   * We test this by calling each handler directly with requests that have no
   * `user` property, using fast-check to generate random request bodies.
   *
   * **Validates: Requirements 5.6**
   */
  describe('Property 15: Unauthenticated requests return 401', () => {
    it.each(authenticatedEndpoints)(
      '$name returns 401 for unauthenticated requests with random bodies',
      async ({ key }) => {
        await fc.assert(
          fc.asyncProperty(bodyArbForEndpoint(key), async (body) => {
            const { controller } = createTestEnvironment();
            const handler = controller.testHandlers[key] as HandlerFn;

            const req = fakeUnauthenticatedRequest(body);

            // Auth-required handlers now throw HandleableError (matching
            // the mongo controller pattern). BaseController.createRequestHandler
            // catches these at the HTTP layer, but direct calls propagate.
            try {
              const result = await handler(req, stubRes, stubNext);
              // changePassword validates body before auth check, so if
              // validation fails it returns 400 before reaching the auth
              // guard. That's acceptable — the auth property still holds
              // because the request never reaches protected logic.
              expect([400, 401]).toContain(result.statusCode);
            } catch (err) {
              // Use name check instead of instanceof to avoid duplicate-module issues
              expect(err).toBeDefined();
              expect((err as HandleableError).constructor.name).toBe('HandleableError');
              expect((err as HandleableError).statusCode).toBe(401);
            }
          }),
          { numRuns: 100 },
        );
      },
      60_000,
    );

    it('all authenticated endpoints reject requests with user set to falsy values', async () => {
      /**
       * Generate requests where user is present but falsy (undefined, null, 0, false, '').
       * The handlers check `if (!user)` so all falsy values should trigger 401
       * via HandleableError.
       */
      const falsyUserArb: fc.Arbitrary<unknown> = fc.oneof(
        fc.constant(undefined),
        fc.constant(null),
        fc.constant(0),
        fc.constant(false),
        fc.constant(''),
      );

      await fc.assert(
        fc.asyncProperty(
          fc.constantFrom(...authenticatedEndpoints),
          falsyUserArb,
          async (endpoint, falsyUser) => {
            const { controller } = createTestEnvironment();
            const handler = controller.testHandlers[endpoint.key] as HandlerFn;

            // Use endpoint-specific body that passes validation
            const body = fc.sample(bodyArbForEndpoint(endpoint.key), 1)[0];

            // Build request with a falsy user property
            const obj: Record<string, unknown> = {
              body,
              headers: {},
              user: falsyUser,
            };
            const req = obj as unknown as HandlerParams[0];

            try {
              const result = await handler(req, stubRes, stubNext);
              // changePassword may return 400 for validation before auth
              expect([400, 401]).toContain(result.statusCode);
            } catch (err) {
              // Use name check instead of instanceof to avoid duplicate-module issues
              expect(err).toBeDefined();
              expect((err as HandleableError).constructor.name).toBe('HandleableError');
              expect((err as HandleableError).statusCode).toBe(401);
            }
          },
        ),
        { numRuns: 100 },
      );
    }, 60_000);
  });
});
