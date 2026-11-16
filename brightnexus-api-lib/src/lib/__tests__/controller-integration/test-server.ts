import { I18nEngine, LanguageRegistry } from '@digitaldefiance/i18n-lib';
import {
  createExpressConstants,
  type IAuthenticatedUser,
  type IAuthenticationProvider,
  type IControllerApplication,
} from '@digitaldefiance/node-express-suite';
import type {
  IRequestUserDTO,
  ITokenUser,
} from '@digitaldefiance/suite-core-lib';
import express, { Express, Router } from 'express';
import { registerBrightNexusRoutesOnRouter } from '../../controllers/register-routes';
import { createBrightNexusDeps } from '../../wiring/create-brightnexus-deps';
import {
  createBrightNexusTestDb,
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

/** Treats the bearer token as the user id and accepts every token. */
class StubAuthProvider implements IAuthenticationProvider<string> {
  async verifyToken<TTokenUser extends ITokenUser = ITokenUser>(
    token: string,
  ): Promise<TTokenUser | null> {
    const tokenUser: ITokenUser = { userId: token, roles: [] };
    // TTokenUser only ever widens ITokenUser; the stub has no extra fields.
    return tokenUser as TTokenUser;
  }

  async findUserById(
    userId: string,
  ): Promise<IAuthenticatedUser<string, string>> {
    return {
      id: userId,
      accountStatus: 'Active',
      email: 'test@example.com',
      timezone: 'UTC',
    };
  }

  async buildRequestUserDTO(userId: string): Promise<IRequestUserDTO> {
    return {
      id: userId,
      username: userId,
      email: 'test@example.com',
      roles: [],
      rolePrivileges: {
        admin: false,
        member: true,
        child: false,
        system: false,
      },
      emailVerified: true,
      timezone: 'UTC',
      siteLanguage: 'en-US',
      darkMode: false,
      currency: 'USD',
      directChallenge: false,
    };
  }
}

function createStubApplication(): IControllerApplication<string> {
  return {
    authProvider: new StubAuthProvider(),
    constants: createExpressConstants(),
    database: undefined,
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
    application,
    deps,
    '/brightnexus/location',
  );
  app.use(router);

  return { app, nexusDb };
}
