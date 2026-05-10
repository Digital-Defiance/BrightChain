/* eslint-disable @typescript-eslint/no-explicit-any */
/**
 * Controller integration test server factory — creates a fully wired Express app with
 * stub service implementations for testing controller routing and request/response shapes.
 *
 * NOTE: These are NOT e2e tests. Real e2e tests are in brightchain-api-e2e/ and hit
 * the actual running server with real database and real GuidV4Buffer IDs.
 */
import { I18nEngine, LanguageRegistry } from '@digitaldefiance/i18n-lib';
import express, {
  Express,
  NextFunction,
  Request,
  Response,
  Router,
} from 'express';
import { registerBurnbagRoutesOnRouter } from '../../controllers/register-routes';
import { createStubDeps } from './stub-deps';

// Bootstrap i18n with a default language and engine instance so the
// middleware pipeline (setGlobalContextLanguageFromRequest, handleError)
// doesn't throw "No default language configured" or "instance not found".
const testLang = {
  id: 'en-US',
  code: 'en-US',
  name: 'English (US)',
  nativeName: 'English',
  isDefault: true,
};
if (!LanguageRegistry.has('en-US')) {
  LanguageRegistry.register(testLang);
}
if (!I18nEngine.hasInstance()) {
  new I18nEngine([testLang]);
}

export interface ITestUser {
  id: string;
  username: string;
  email: string;
}

/**
 * Minimal stub IApplication that satisfies BaseController's constructor.
 * Only the pieces actually exercised by the burnbag controllers are filled in;
 * everything else is a no-op / empty object.
 */
function createStubApplication(): any {
  return {
    // BaseController reads authenticationMiddleware / cryptoAuthenticationMiddleware
    authenticationMiddleware: (
      _req: Request,
      _res: Response,
      next: NextFunction,
    ) => next(),
    cryptoAuthenticationMiddleware: (
      _req: Request,
      _res: Response,
      next: NextFunction,
    ) => next(),
    // Some controllers may reference environment or other app-level props
    environment: {
      enabledFeatures: [],
    },
    // authProvider is required by authenticateToken middleware.
    // The bearer token is the user ID itself (set by authenticatedAgent helper),
    // so verifyToken extracts it and the other methods use it dynamically.
    authProvider: {
      verifyToken: async (token: string) => ({ userId: token }),
      findUserById: async (userId: string) => ({
        id: userId,
        accountStatus: 'Active',
        email: 'test@example.com',
        timezone: 'UTC',
      }),
      buildRequestUserDTO: async (userId: string) => ({
        id: userId,
        username: userId,
        email: 'test@example.com',
        roles: [],
        timezone: 'UTC',
        siteLanguage: 'en-US',
      }),
    },
    // constants used by getSuiteCoreTranslation inside authenticateToken
    constants: {},
  };
}

/**
 * Create a test Express app with all routes registered and stub deps.
 */
export function createTestServer(defaultUser?: ITestUser) {
  const deps = createStubDeps();
  const app: Express = express();
  const router = Router();

  app.use(express.json());
  app.use(express.raw({ type: 'application/octet-stream', limit: '64mb' }));

  // Mock auth middleware — injects user from header or default
  app.use((req: Request, _res: Response, next: NextFunction) => {
    const userId = req.headers['x-test-user-id'] as string;
    const username = req.headers['x-test-username'] as string;
    (req as any).user = userId
      ? { id: userId, username: username ?? 'testuser' }
      : defaultUser
        ? { id: defaultUser.id, username: defaultUser.username }
        : { id: 'test-user-1', username: 'testuser' };
    next();
  });

  const application = createStubApplication();
  registerBurnbagRoutesOnRouter(router, application, deps as any, '');

  app.use(router);

  return { app, deps };
}
