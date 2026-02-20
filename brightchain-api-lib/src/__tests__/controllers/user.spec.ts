/**
 * UserController – Unit Tests for Error Handling.
 *
 * Feature: brightchain-db-init-user-endpoints, Task 9.9
 *
 * Tests three error-handling scenarios:
 * 1. MemberStore failure during registration returns error status (Requirement 3.5)
 * 2. MemberStore profile retrieval failure returns energy data without profile (Requirement 5.4)
 * 3. MemberStore update failure returns 500 (Requirement 6.4)
 */

import {
  BlockSize,
  EnergyAccount,
  EnergyAccountStore,
  initializeBrightChain,
  MemberStore,
  MemoryBlockStore,
  ServiceLocator,
  ServiceProvider,
} from '@brightchain/brightchain-lib';
import { SecureString } from '@digitaldefiance/ecies-lib';
import {
  ApiErrorResponse,
  ApiRequestHandler,
  IApiMessageResponse,
  ServiceContainer,
} from '@digitaldefiance/node-express-suite';
import { UserController } from '../../lib/controllers/api/user';
import { IBrightChainApplication } from '../../lib/interfaces/application';
import { AuthService } from '../../lib/services/auth';
import { EmailService } from '../../lib/services/email';

const JWT_SECRET = 'test-jwt-secret-for-unit';

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

/**
 * Build a minimal request object typed to match the handler's first parameter.
 * The handlers only access req.body and (req as …).user.
 */
/**
 * The handler signature uses the global Request type (via node-express-suite),
 * but the handlers only access `req.body` and `(req as …).user`.
 * We cast through `unknown` once here so every call site stays clean.
 */
function fakeRequest(
  body: Record<string, unknown>,
  user?: { memberId: string; username: string },
): HandlerParams[0] {
  const obj: Record<string, unknown> = { body, headers: {} };
  if (user !== undefined) {
    obj['user'] = user;
  }
  return obj as unknown as HandlerParams[0];
}

/** Stub res — handlers don't use it. */
const stubRes = {} as HandlerParams[1];

/** Stub next — handlers don't call it. */
const stubNext: HandlerParams[2] = () => {
  /* noop */
};

/**
 * Build an isolated set of stores, auth service, and a mock application
 * whose ServiceContainer is wired up the same way the real App does it.
 */
function createTestEnvironment() {
  initializeBrightChain();
  ServiceLocator.setServiceProvider(ServiceProvider.getInstance());

  const blockStore = new MemoryBlockStore(BlockSize.Small);
  const memberStore = new MemberStore(blockStore);
  const energyStore = new EnergyAccountStore();

  const services = new ServiceContainer();

  const mockApp = {
    environment: { mongo: { useTransactions: false }, debug: false },
    constants: {},
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
  } as unknown as EmailService;

  const authService = new AuthService(
    mockApp,
    memberStore,
    energyStore,
    mockEmailService,
    JWT_SECRET,
  );

  services.register('auth', () => authService);
  services.register('memberStore', () => memberStore);
  services.register('energyStore', () => energyStore);

  const controller = new TestableUserController(mockApp);

  return { controller, authService, memberStore, energyStore, services };
}

describe('UserController Error Handling', () => {
  /**
   * Requirement 3.5: IF member creation fails in the MemberStore,
   * THEN THE AuthService SHALL propagate the error and THE UserController
   * SHALL return an error status code with an error message.
   *
   * The current implementation catches all registration errors and returns 400.
   */
  describe('MemberStore failure during registration', () => {
    it('returns 400 with error message when AuthService.register throws', async () => {
      const { controller, services } = createTestEnvironment();

      // Replace the auth service with one whose register method always throws,
      // simulating a MemberStore.createMember failure that propagates up.
      const failingAuthService = {
        register: jest
          .fn()
          .mockRejectedValue(new Error('MemberStore: write failed')),
      };
      services.register('auth', () => failingAuthService, false);

      const req = fakeRequest({
        username: 'testuser',
        email: 'test@example.com',
        password: 'securepassword123',
      });

      const result = await controller.testHandlers.register(
        req,
        stubRes,
        stubNext,
      );

      expect(result.statusCode).toBe(400);
      expect(result.response).toHaveProperty('message');
      expect((result.response as { message: string }).message).toBe(
        'MemberStore: write failed',
      );
    });
  });

  /**
   * Requirement 5.4: IF the MemberStore fails to retrieve the member profile,
   * THEN THE UserController SHALL return the energy account data without the
   * profile section rather than failing entirely.
   */
  describe('MemberStore profile retrieval failure (graceful degradation)', () => {
    it('returns energy data without profile when MemberStore throws', async () => {
      const { controller, memberStore, energyStore } = createTestEnvironment();

      // Register a real user in a separate environment to get a valid member.
      const { authService: isolatedAuth, memberStore: isolatedMemberStore } =
        createTestEnvironment();
      await isolatedAuth.register(
        'profileuser',
        'profile@example.com',
        new SecureString('securepassword123'),
      );

      // Look up the member to get the raw ID bytes, then compute the hex
      // checksum the same way the controller does via Checksum.fromHex.
      const refs = await isolatedMemberStore.queryIndex({
        name: 'profileuser',
      });
      const idBytes = refs[0].id as Uint8Array;
      const memberChecksum =
        ServiceProvider.getInstance().checksumService.calculateChecksum(
          idBytes,
        );
      const memberHex = memberChecksum.toString();

      // Seed the energy store with an account for this member
      const energyAccount =
        EnergyAccount.createWithTrialCredits(memberChecksum);
      await energyStore.set(memberChecksum, energyAccount);

      // Make getMemberProfile and getMember throw to simulate MemberStore failures.
      // The controller has inner try/catch blocks — it should degrade gracefully.
      jest
        .spyOn(memberStore, 'getMemberProfile')
        .mockRejectedValue(new Error('MemberStore: profile read failed'));
      jest
        .spyOn(memberStore, 'getMember')
        .mockRejectedValue(new Error('MemberStore: member read failed'));

      const req = fakeRequest(
        {},
        { memberId: memberHex, username: 'profileuser' },
      );

      const result = await controller.testHandlers.profile(
        req,
        stubRes,
        stubNext,
      );

      // Should succeed with 200, returning energy data
      expect(result.statusCode).toBe(200);

      const response = result.response as {
        message: string;
        data: {
          memberId: string;
          energyBalance: number;
          profile?: unknown;
        };
      };
      expect(response.message).toBe('Profile retrieved');
      expect(response.data.memberId).toBe(memberHex);
      expect(typeof response.data.energyBalance).toBe('number');

      // Profile metadata should NOT be present since getMemberProfile threw
      expect(response.data.profile).toBeUndefined();

      jest.restoreAllMocks();
    });
  });

  /**
   * Requirement 6.4: IF the MemberStore update fails,
   * THEN THE UserController SHALL return a 500 status code with an error message.
   */
  describe('MemberStore update failure', () => {
    it('returns 500 when MemberStore.updateMember throws', async () => {
      const { controller, memberStore, energyStore } = createTestEnvironment();

      // Register a user in a separate environment to get a valid member.
      const { authService: isolatedAuth, memberStore: isolatedMemberStore } =
        createTestEnvironment();
      await isolatedAuth.register(
        'updateuser',
        'update@example.com',
        new SecureString('securepassword123'),
      );

      // Look up the member to get the raw ID bytes, then compute the hex
      // checksum the same way the controller does via Checksum.fromHex.
      const refs = await isolatedMemberStore.queryIndex({
        name: 'updateuser',
      });
      const idBytes = refs[0].id as Uint8Array;
      const memberChecksum =
        ServiceProvider.getInstance().checksumService.calculateChecksum(
          idBytes,
        );
      const memberHex = memberChecksum.toString();

      // Seed the energy store so handleUpdateProfile can retrieve the account
      const energyAccount =
        EnergyAccount.createWithTrialCredits(memberChecksum);
      await energyStore.set(memberChecksum, energyAccount);

      // Make updateMember throw to simulate a MemberStore write failure
      jest
        .spyOn(memberStore, 'updateMember')
        .mockRejectedValue(new Error('MemberStore: update write failed'));

      const req = fakeRequest(
        {
          settings: {
            autoReplication: true,
            minRedundancy: 3,
            preferredRegions: ['us-east'],
          },
        },
        { memberId: memberHex, username: 'updateuser' },
      );

      const result = await controller.testHandlers.updateProfile(
        req,
        stubRes,
        stubNext,
      );

      expect(result.statusCode).toBe(500);
      expect(result.response).toHaveProperty('message');
      expect((result.response as { message: string }).message).toBe(
        'Failed to update profile',
      );

      jest.restoreAllMocks();
    });
  });
});
