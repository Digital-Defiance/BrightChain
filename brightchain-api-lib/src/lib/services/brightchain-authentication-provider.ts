/**
 * @fileoverview BrightChain block-store-backed implementation of IAuthenticationProvider.
 * Delegates user lookup to MemberStore, credential verification to bcrypt/mnemonic,
 * and JWT operations to jsonwebtoken — fully decoupled from Mongoose.
 *
 * Follows the same structural pattern as MongoAuthenticationProvider:
 *   - findUserById      → MemberStore.getMember + getMemberProfile
 *   - buildRequestUserDTO → MemberStore + MemberType-based role mapping
 *   - verifyToken        → jwt.verify (no Mongoose JwtService)
 *   - authenticateWith*  → MemberStore + bcrypt / Member.fromMnemonic
 *
 * @module services/brightchain-authentication-provider
 */

import { MemberStatusType, MemberStore } from '@brightchain/brightchain-lib';
import type { SecureString } from '@digitaldefiance/ecies-lib';
import { MemberType } from '@digitaldefiance/ecies-lib';
import type { PlatformID } from '@digitaldefiance/node-ecies-lib';
import { Member } from '@digitaldefiance/node-ecies-lib';
import type {
  IAuthenticatedUser,
  IAuthenticationProvider,
  ICryptoAuthResult,
} from '@digitaldefiance/node-express-suite';
import type {
  ICombinedRolePrivileges,
  IRequestUserDTO,
  IRoleDTO,
  ITokenUser,
} from '@digitaldefiance/suite-core-lib';
import * as bcrypt from 'bcrypt';
import { verify } from 'jsonwebtoken';
import { IBrightChainApplication } from '../interfaces';
import type { ITokenPayload } from '../interfaces/token-payload';

// ── Helpers ──────────────────────────────────────────────────────────

/**
 * Map MemberStatusType → AccountStatus-compatible string.
 */
function memberStatusToAccountStatus(status: MemberStatusType): string {
  switch (status) {
    case MemberStatusType.Active:
      return 'Active';
    case MemberStatusType.Suspended:
      return 'AdminLock';
    case MemberStatusType.Inactive:
    default:
      return 'PendingEmailVerification';
  }
}

/**
 * Derive combined role privileges from a MemberType.
 * BrightChain has no separate Role collection — MemberType is the role.
 */
function memberTypeToRolePrivileges(type: MemberType): ICombinedRolePrivileges {
  return {
    admin: type === MemberType.Admin,
    member: type === MemberType.User,
    child: false,
    system: type === MemberType.System,
  };
}

/**
 * Build a minimal IRoleDTO from a MemberType.
 */
function memberTypeToRoleDTO(type: MemberType, memberId: string): IRoleDTO {
  const now = new Date().toISOString();
  return {
    _id: `role-${memberId}`,
    name: type.toString(),
    admin: type === MemberType.Admin,
    member: type === MemberType.User,
    child: false,
    system: type === MemberType.System,
    createdAt: now,
    updatedAt: now,
    createdBy: memberId,
    updatedBy: memberId,
  };
}

// ── Provider ─────────────────────────────────────────────────────────

/**
 * BrightChain block-store-backed authentication provider.
 * Uses MemberStore for user lookup, bcrypt for password verification,
 * and jwt.verify for token validation — no Mongoose dependency.
 */
export class BrightChainAuthenticationProvider<
  TID extends PlatformID = Buffer,
  TLanguage extends string = string,
> implements IAuthenticationProvider<TID, TLanguage> {
  constructor(private readonly application: IBrightChainApplication<TID>) {}

  /** Resolve MemberStore from the service container. */
  private getMemberStore(): MemberStore {
    return this.application.services.get('memberStore') as MemberStore;
  }

  async findUserById(
    userId: string,
  ): Promise<IAuthenticatedUser<TLanguage> | null> {
    const memberStore = this.getMemberStore();
    const idBytes = Buffer.from(userId, 'hex') as unknown as Uint8Array;

    try {
      const member = await memberStore.getMember(idBytes);
      const { publicProfile, privateProfile } =
        await memberStore.getMemberProfile(idBytes);

      const accountStatus = publicProfile
        ? memberStatusToAccountStatus(publicProfile.status)
        : 'Active';

      const settings = privateProfile?.settings ?? {};

      return {
        id: userId,
        accountStatus,
        email: member.email.toString(),
        siteLanguage: settings['siteLanguage'] as TLanguage | undefined,
        timezone: (settings['timezone'] as string) ?? 'UTC',
        lastLogin: publicProfile?.lastActive?.toISOString(),
      };
    } catch {
      // MemberNotFound or other retrieval failure
      return null;
    }
  }

  async buildRequestUserDTO(userId: string): Promise<IRequestUserDTO | null> {
    const memberStore = this.getMemberStore();
    const idBytes = Buffer.from(userId, 'hex') as unknown as Uint8Array;

    try {
      const member = await memberStore.getMember(idBytes);
      const { publicProfile, privateProfile } =
        await memberStore.getMemberProfile(idBytes);

      if (publicProfile && publicProfile.status !== MemberStatusType.Active) {
        return null;
      }

      const memberId = userId;
      const rolePrivileges = memberTypeToRolePrivileges(member.type);
      const roleDTO = memberTypeToRoleDTO(member.type, memberId);
      const settings = privateProfile?.settings ?? {};

      return {
        id: memberId,
        email: member.email.toString(),
        username: member.name,
        roles: [roleDTO],
        rolePrivileges,
        emailVerified: true, // BrightChain members are verified at creation
        timezone: (settings['timezone'] as string) ?? 'UTC',
        siteLanguage: (settings['siteLanguage'] as string) ?? 'en',
        darkMode: (settings['darkMode'] as boolean) ?? false,
        currency: (settings['currency'] as string) ?? 'USD',
        directChallenge: (settings['directChallenge'] as boolean) ?? false,
        lastLogin: publicProfile?.lastActive?.toISOString(),
      };
    } catch {
      return null;
    }
  }

  async verifyToken<TTokenUser extends ITokenUser = ITokenUser>(
    token: string,
  ): Promise<TTokenUser | null> {
    try {
      const decoded = verify(
        token,
        this.application.environment.jwtSecret,
      ) as ITokenPayload;

      // Map ITokenPayload → ITokenUser shape expected by middleware
      return {
        userId: decoded.memberId,
        roles: [] as ITokenUser['roles'],
      } as ITokenUser as TTokenUser;
    } catch {
      return null;
    }
  }

  async authenticateWithMnemonic(
    email: string,
    mnemonic: SecureString,
  ): Promise<ICryptoAuthResult<TID>> {
    const memberStore = this.getMemberStore();

    // Look up member by email
    const results = await memberStore.queryIndex({ email, limit: 1 });
    if (results.length === 0) {
      throw new Error('Invalid credentials');
    }

    const reference = results[0];

    // Hydrate the full member, then load the wallet from the mnemonic
    // to make the private key available.
    const member = (await memberStore.getMember(
      reference.id,
    )) as unknown as Member<TID>;
    member.loadWallet(mnemonic);

    if (!member.hasPrivateKey) {
      throw new Error('Invalid mnemonic');
    }

    return {
      userId: member.getIdString(),
      userMember: member,
    };
  }

  async authenticateWithPassword(
    email: string,
    password: string,
  ): Promise<ICryptoAuthResult<TID>> {
    const memberStore = this.getMemberStore();

    // Look up member by email
    const results = await memberStore.queryIndex({ email, limit: 1 });
    if (results.length === 0) {
      throw new Error('Invalid credentials');
    }

    const reference = results[0];

    // Retrieve stored password hash from private profile
    const { privateProfile } = await memberStore.getMemberProfile(reference.id);
    const storedHash = privateProfile?.passwordHash;
    if (!storedHash) {
      throw new Error('Password authentication not configured for this member');
    }

    const isValid = await bcrypt.compare(password, storedHash);
    if (!isValid) {
      throw new Error('Invalid credentials');
    }

    const member = (await memberStore.getMember(
      reference.id,
    )) as unknown as Member<TID>;

    return {
      userId: member.getIdString(),
      userMember: member,
    };
  }
}
