import type { BrightDb } from '@brightchain/db';
import type { SecureString } from '@digitaldefiance/ecies-lib';
import type { PlatformID } from '@digitaldefiance/node-ecies-lib';
import type {
  IAuthenticatedUser,
  IAuthenticationProvider,
  ICryptoAuthResult,
} from '@digitaldefiance/node-express-suite';
import type {
  IRequestUserDTO,
  ITokenUser,
} from '@digitaldefiance/suite-core-lib';
import { verify } from 'jsonwebtoken';

/**
 * Generic BrightDB-backed authentication provider.
 *
 * Provides basic user lookup from BrightDB `users` collection and JWT
 * token verification. Domain-specific auth (MemberStore, mnemonic auth,
 * password auth) is added by subclasses.
 */
export class BrightDbAuthenticationProvider<
  TID extends PlatformID = Buffer,
  TLanguage extends string = string,
> implements IAuthenticationProvider<TID, TLanguage>
{
  constructor(
    protected readonly db: BrightDb,
    protected readonly jwtSecret: string,
  ) {}

  /**
   * Find a user by ID from the `users` collection.
   * Subclasses override to try MemberStore first.
   */
  async findUserById(
    userId: string,
  ): Promise<IAuthenticatedUser<TLanguage, TID> | null> {
    try {
      const usersCol = this.db.collection<{
        _id?: string;
        email?: string;
        accountStatus?: string;
        timezone?: string;
        siteLanguage?: string;
        lastLogin?: string;
      }>('users');

      const userDoc = await usersCol.findOne({ _id: userId } as never);
      if (!userDoc) return null;

      return {
        id: userId,
        accountStatus: userDoc.accountStatus ?? 'Active',
        email: userDoc.email ?? '',
        siteLanguage: userDoc.siteLanguage as TLanguage | undefined,
        timezone: userDoc.timezone ?? 'UTC',
        lastLogin: userDoc.lastLogin,
      };
    } catch {
      return null;
    }
  }

  /**
   * Build a request user DTO from the `users` collection.
   * Subclasses override to try MemberStore first.
   */
  async buildRequestUserDTO(userId: string): Promise<IRequestUserDTO | null> {
    try {
      const usersCol = this.db.collection<{
        _id?: string;
        username?: string;
        email?: string;
        displayName?: string;
        accountStatus?: string;
        emailVerified?: boolean;
        timezone?: string;
        siteLanguage?: string;
        darkMode?: boolean;
        currency?: string;
        directChallenge?: boolean;
        lastLogin?: string;
      }>('users');

      const userDoc = await usersCol.findOne({ _id: userId } as never);
      if (!userDoc) return null;

      if (userDoc.accountStatus && userDoc.accountStatus !== 'Active') {
        return null;
      }

      return {
        id: userId,
        email: userDoc.email ?? '',
        username: userDoc.username ?? '',
        ...(userDoc.displayName && { displayName: userDoc.displayName }),
        roles: [],
        rolePrivileges: {
          admin: false,
          member: true,
          child: false,
          system: false,
        },
        emailVerified: userDoc.emailVerified ?? true,
        timezone: userDoc.timezone ?? 'UTC',
        siteLanguage: userDoc.siteLanguage ?? 'en',
        darkMode: userDoc.darkMode ?? false,
        currency: userDoc.currency ?? 'USD',
        directChallenge: userDoc.directChallenge ?? false,
        lastLogin: userDoc.lastLogin,
      };
    } catch {
      return null;
    }
  }

  /**
   * Verify a JWT token and return the decoded user.
   */
  async verifyToken<TTokenUser extends ITokenUser = ITokenUser>(
    token: string,
  ): Promise<TTokenUser | null> {
    try {
      const decoded = verify(token, this.jwtSecret) as Record<string, unknown>;
      return {
        userId: (decoded['memberId'] ??
          decoded['userId'] ??
          decoded['sub']) as string,
        roles: (decoded['roles'] ?? []) as ITokenUser['roles'],
      } as ITokenUser as TTokenUser;
    } catch {
      return null;
    }
  }

  /**
   * Authenticate with a mnemonic and return the crypto result.
   * Base implementation throws — subclasses (e.g. BrightChainAuthenticationProvider)
   * override with MemberStore-backed mnemonic verification.
   */
  async authenticateWithMnemonic(
    _email: string,
    _mnemonic: SecureString,
  ): Promise<ICryptoAuthResult<TID>> {
    throw new Error('Mnemonic authentication not implemented in base provider');
  }

  /**
   * Authenticate with a password and return the crypto result.
   * Base implementation throws — subclasses override with real password verification.
   */
  async authenticateWithPassword(
    _email: string,
    _password: string,
  ): Promise<ICryptoAuthResult<TID>> {
    throw new Error('Password authentication not implemented in base provider');
  }
}
