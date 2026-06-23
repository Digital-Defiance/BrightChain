import { I18nEngine, LanguageRegistry } from '@digitaldefiance/i18n-lib';
import express, {
  Express,
  NextFunction,
  Request,
  Response,
  Router,
} from 'express';
import { registerBrightNexusRoutesOnRouter } from '../../controllers/register-routes';
import { createBrightNexusDeps } from '../../wiring/create-brightnexus-deps';
import {
  createBrightNexusTestDb,
  ensureTestMemberKeys,
  nextTestId,
  testBrightNexusExternalDeps,
  type IBrightNexusTestDb,
} from '../helpers/brightnexus-db';

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

function createStubApplication() {
  return {
    authenticationMiddleware: (
      req: Request,
      _res: Response,
      next: NextFunction,
    ) => {
      const auth = req.headers.authorization;
      if (typeof auth === 'string' && auth.startsWith('Bearer ')) {
        const userId = auth.slice('Bearer '.length).trim();
        (req as Request & { user?: { id: string } }).user = {
          id: userId,
        } as never;
      }
      next();
    },
    cryptoAuthenticationMiddleware: (
      _req: Request,
      _res: Response,
      next: NextFunction,
    ) => next(),
    environment: { enabledFeatures: [], debug: false },
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
    constants: {},
  };
}

export interface IBrightNexusTestServer {
  app: Express;
  nexusDb: IBrightNexusTestDb;
}

/**
 * Express app with real BrightDB-backed LocationRegistryService.
 */
export function createBrightNexusTestServer(): IBrightNexusTestServer {
  const nexusDb = createBrightNexusTestDb();
  const deps = createBrightNexusDeps(
    nexusDb.db,
    testBrightNexusExternalDeps({
      generateId: () => nextTestId('ann'),
      idToString: (id) => id,
      parseId: (id) => id,
      parseSafeId: (id) => id,
    }),
  );

  const app = express();
  app.use(express.json());

  const router = Router();
  const application = createStubApplication();
  registerBrightNexusRoutesOnRouter(
    router,
    application as never,
    deps,
    '/brightnexus/location',
  );
  app.use(router);

  return { app, nexusDb };
}
