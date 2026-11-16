import type { PlatformID } from '@digitaldefiance/node-ecies-lib';
import type {
  IAuthenticatedUser,
  IAuthenticationProvider,
  IServiceContainer,
} from '@digitaldefiance/node-express-suite';
import type {
  IRequestUserDTO,
  ITokenUser,
} from '@digitaldefiance/suite-core-lib';
import { Constants } from '../../constants';
import type { IBrightChainControllerApplication } from '../../interfaces/application';
import type { DefaultBackendIdType } from '../../types/backend-id';

/**
 * Service container backed by a Map. Mirrors the `get`/`has`/`register`
 * surface of IServiceContainer; unknown keys resolve to `undefined`.
 */
class MapServiceContainer implements IServiceContainer {
  private readonly entries: Map<string, unknown>;

  constructor(entries?: ReadonlyMap<string, unknown>) {
    this.entries = new Map(entries);
  }

  register(key: string, factory: () => unknown): void {
    this.entries.set(key, factory());
  }

  get<T>(key: string): T;
  get(key: string): unknown {
    return this.entries.get(key);
  }

  has(key: string): boolean {
    return this.entries.has(key);
  }
}

/**
 * Authentication provider that returns an active user. By default any token
 * is accepted and used as the user id (falling back to `test-user`). Pass
 * `resolveUserId` to map a token to a user id, or to `null` to reject it.
 */
export function createMockAuthProvider<
  TID extends PlatformID = DefaultBackendIdType,
>(
  resolveUserId: (token: string) => string | null = (token) =>
    token || 'test-user',
): IAuthenticationProvider<TID> {
  return {
    async verifyToken<TTokenUser extends ITokenUser = ITokenUser>(
      token: string,
    ): Promise<TTokenUser | null> {
      const userId = resolveUserId(token);
      if (userId === null) {
        return null;
      }
      const tokenUser: ITokenUser = { userId, roles: [] };
      // TTokenUser only ever widens ITokenUser; the mock has no extra fields.
      return tokenUser as TTokenUser;
    },
    async findUserById(
      userId: string,
    ): Promise<IAuthenticatedUser<string, TID>> {
      return {
        id: userId,
        accountStatus: 'Active',
        email: 'test@example.com',
        timezone: 'UTC',
      };
    },
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
        siteLanguage: 'en',
        darkMode: false,
        currency: 'USD',
        directChallenge: false,
      };
    },
  };
}

export interface IMockControllerApplicationOptions<
  TID extends PlatformID = DefaultBackendIdType,
> {
  /** Initial service registrations, keyed by service name. */
  services?: ReadonlyMap<string, unknown>;
  /** Auth provider to expose; omit for an application without one. */
  authProvider?: IAuthenticationProvider<TID>;
}

/**
 * Typed stand-in for the application a BrightChain controller receives.
 * Provides the members of IBrightChainControllerApplication: real BrightChain
 * `Constants`, no database, an optional auth provider and a Map-backed
 * service container.
 */
export function createMockControllerApplication<
  TID extends PlatformID = DefaultBackendIdType,
>(
  options: IMockControllerApplicationOptions<TID> = {},
): IBrightChainControllerApplication<TID> {
  return {
    constants: Constants,
    database: undefined,
    authProvider: options.authProvider,
    services: new MapServiceContainer(options.services),
  };
}
