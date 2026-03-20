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

import {
  EmailString,
  MemberStatusType,
  MemberStore,
  ServiceProvider,
} from '@brightchain/brightchain-lib';
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
> implements IAuthenticationProvider<TID, TLanguage>
{
  constructor(private readonly application: IBrightChainApplication<TID>) {}

  /** Resolve MemberStore from the service container. */
  private getMemberStore(): MemberStore<TID> {
    return this.application.services.get('memberStore') as MemberStore<TID>;
  }

  async findUserById(
    userId: string,
  ): Promise<IAuthenticatedUser<TLanguage, TID> | null> {
    const memberStore = this.getMemberStore();
    // Deserialize the GUID string back to a typed ID (round-trips with idToString)
    const idProvider = ServiceProvider.getInstance<TID>().idProvider;
    const id = idProvider.idFromString(userId) as unknown as TID;

    try {
      const member = await memberStore.getMember(id);
      const { publicProfile, privateProfile } =
        await memberStore.getMemberProfile(id);

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
        // Carry the full Member object through so the middleware can
        // attach it to req.member without a redundant MemberStore lookup.
        member: member as unknown as Member<TID>,
      };
    } catch {
      // getMember() fails for seeded users (no CBL blocks). Fall back to the
      // DB `users` collection which is always populated by initializeWithRbac.
      return this.findUserByIdFromDb(userId, id);
    }
  }

  /**
   * DB-backed fallback for findUserById.
   * Queries the `users` collection directly — works for seeded users whose
   * CBL blocks are not stored in the block store.
   */
  private async findUserByIdFromDb(
    userId: string,
    id: TID,
  ): Promise<IAuthenticatedUser<TLanguage, TID> | null> {
    try {
      const db =
        this.application.services.get<import('@brightchain/db').BrightDb>('db');
      if (!db) return null;

      const sp = ServiceProvider.getInstance<TID>();
      const idHex = sp.idProvider.toString(id, 'hex');

      const usersCol = db.collection<{
        _id?: string;
        email?: string;
        accountStatus?: string;
        timezone?: string;
        siteLanguage?: string;
        lastLogin?: string;
      }>('users');

      let userDoc = await usersCol.findOne({ _id: idHex } as never);
      if (!userDoc) {
        const dashed = idHex.replace(
          /^([0-9a-f]{8})([0-9a-f]{4})([0-9a-f]{4})([0-9a-f]{4})([0-9a-f]{12})$/i,
          '$1-$2-$3-$4-$5',
        );
        userDoc = await usersCol.findOne({ _id: dashed } as never);
      }
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

  async buildRequestUserDTO(userId: string): Promise<IRequestUserDTO | null> {
    const memberStore = this.getMemberStore();
    // Deserialize the GUID string back to a typed ID (round-trips with idToString)
    const idProvider = ServiceProvider.getInstance<TID>().idProvider;
    const id = idProvider.idFromString(userId) as unknown as TID;

    try {
      const member = await memberStore.getMember(id);
      const { publicProfile, privateProfile } =
        await memberStore.getMemberProfile(id);

      if (publicProfile && publicProfile.status !== MemberStatusType.Active) {
        return null;
      }

      const memberId = userId;
      const rolePrivileges = memberTypeToRolePrivileges(member.type);
      const roleDTO = memberTypeToRoleDTO(member.type, memberId);
      const settings = privateProfile?.settings ?? {};

      // Check the `users` collection for settings overrides persisted by
      // updateSettings (which writes to the DB, not the member store).
      let dbSettings: Record<string, unknown> = {};
      try {
        const db =
          this.application.services.get<import('@brightchain/db').BrightDb>(
            'db',
          );
        if (db) {
          const sp = ServiceProvider.getInstance<TID>();
          const idHex = sp.idProvider.toString(id, 'hex');

          // Check user_settings first
          const settingsCol =
            db.collection<Record<string, unknown>>('user_settings');
          let userDoc = await settingsCol.findOne({ _id: idHex } as never);
          if (!userDoc) {
            const dashed = idHex.replace(
              /^([0-9a-f]{8})([0-9a-f]{4})([0-9a-f]{4})([0-9a-f]{4})([0-9a-f]{12})$/i,
              '$1-$2-$3-$4-$5',
            );
            userDoc = await settingsCol.findOne({ _id: dashed } as never);
          }
          if (userDoc) {
            dbSettings = userDoc;
          }

          // Also check the main users collection for displayName
          if (!dbSettings['displayName']) {
            const usersCol = db.collection<Record<string, unknown>>('users');
            let mainDoc = await usersCol.findOne({ _id: idHex } as never);
            if (!mainDoc) {
              const dashed = idHex.replace(
                /^([0-9a-f]{8})([0-9a-f]{4})([0-9a-f]{4})([0-9a-f]{4})([0-9a-f]{12})$/i,
                '$1-$2-$3-$4-$5',
              );
              mainDoc = await usersCol.findOne({ _id: dashed } as never);
            }
            if (mainDoc?.['displayName']) {
              dbSettings['displayName'] = mainDoc['displayName'];
            }
          }
        }
      } catch {
        // DB lookup is best-effort; fall through to member store settings
      }

      // Attach the full Member object as a non-interface property so the
      // authenticateToken middleware can move it to req.member without a
      // redundant MemberStore lookup.
      const displayNameValue = dbSettings['displayName'] as string | undefined;
      const dto: IRequestUserDTO & { member?: unknown } = {
        id: memberId,
        email: member.email.toString(),
        username: member.name,
        roles: [roleDTO],
        rolePrivileges,
        emailVerified: true, // BrightChain members are verified at creation
        ...(displayNameValue ? { displayName: displayNameValue } : {}),
        timezone:
          (dbSettings['timezone'] as string) ??
          (settings['timezone'] as string) ??
          'UTC',
        siteLanguage:
          (dbSettings['siteLanguage'] as string) ??
          (settings['siteLanguage'] as string) ??
          'en',
        darkMode:
          (dbSettings['darkMode'] as boolean) ??
          (settings['darkMode'] as boolean) ??
          false,
        currency:
          (dbSettings['currency'] as string) ??
          (settings['currency'] as string) ??
          'USD',
        directChallenge:
          (dbSettings['directChallenge'] as boolean) ??
          (settings['directChallenge'] as boolean) ??
          false,
        lastLogin: publicProfile?.lastActive?.toISOString(),
        member,
      };
      return dto;
    } catch {
      // getMember() fails for seeded users (no CBL blocks). Fall back to the
      // DB `users` collection which is always populated by initializeWithRbac.
      return this.buildRequestUserDTOFromDb(userId, id);
    }
  }

  /**
   * DB-backed fallback for buildRequestUserDTO.
   * Queries the `users` collection directly — works for seeded users whose
   * CBL blocks are not stored in the block store.
   */
  private async buildRequestUserDTOFromDb(
    userId: string,
    id: TID,
  ): Promise<IRequestUserDTO | null> {
    try {
      const db =
        this.application.services.get<import('@brightchain/db').BrightDb>('db');
      if (!db) return null;

      const sp = ServiceProvider.getInstance<TID>();
      const idHex = sp.idProvider.toString(id, 'hex');

      const usersCol = db.collection<{
        _id?: string;
        username?: string;
        email?: string;
        displayName?: string;
        accountStatus?: string;
        emailVerified?: boolean;
        directChallenge?: boolean;
        timezone?: string;
        siteLanguage?: string;
        darkMode?: boolean;
        currency?: string;
        lastLogin?: string;
      }>('users');

      // Try short hex (no dashes) first, then dashed UUID form
      let userDoc = await usersCol.findOne({ _id: idHex } as never);
      if (!userDoc) {
        const dashed = idHex.replace(
          /^([0-9a-f]{8})([0-9a-f]{4})([0-9a-f]{4})([0-9a-f]{4})([0-9a-f]{12})$/i,
          '$1-$2-$3-$4-$5',
        );
        userDoc = await usersCol.findOne({ _id: dashed } as never);
      }
      if (!userDoc) return null;

      if (userDoc.accountStatus && userDoc.accountStatus !== 'Active') {
        return null;
      }

      // Determine MemberType from the member_index entry
      const memberStore = this.getMemberStore();
      const results = await memberStore.queryIndex({
        email: userDoc.email,
        limit: 1,
      });
      const memberType = results.length > 0 ? results[0].type : MemberType.User;

      // Look up the actual role from the DB via user_roles → roles join.
      // The role document has the authoritative admin/member/system flags.
      let rolePrivileges = memberTypeToRolePrivileges(memberType);
      let roleDTO = memberTypeToRoleDTO(memberType, userId);
      try {
        const userRolesCol = db.collection<{
          userId?: unknown;
          roleId?: unknown;
        }>('user_roles');
        const rolesCol = db.collection<{
          _id?: string;
          name?: string;
          admin?: boolean;
          member?: boolean;
          system?: boolean;
          child?: boolean;
        }>('roles');

        // Try both hex formats for the user ID lookup
        let userRoleDoc = await userRolesCol.findOne({ userId: id } as never);
        if (!userRoleDoc) {
          userRoleDoc = await userRolesCol.findOne({ userId: idHex } as never);
        }
        if (!userRoleDoc) {
          const dashed = idHex.replace(
            /^([0-9a-f]{8})([0-9a-f]{4})([0-9a-f]{4})([0-9a-f]{4})([0-9a-f]{12})$/i,
            '$1-$2-$3-$4-$5',
          );
          userRoleDoc = await userRolesCol.findOne({ userId: dashed } as never);
        }

        if (userRoleDoc?.roleId) {
          const roleDoc = await rolesCol.findOne({
            _id: userRoleDoc.roleId,
          } as never);
          if (roleDoc) {
            rolePrivileges = {
              admin: roleDoc.admin ?? false,
              member: roleDoc.member ?? false,
              child: roleDoc.child ?? false,
              system: roleDoc.system ?? false,
            };
            const now = new Date().toISOString();
            roleDTO = {
              _id: String(roleDoc._id ?? `role-${userId}`),
              name: roleDoc.name ?? memberType.toString(),
              admin: roleDoc.admin ?? false,
              member: roleDoc.member ?? false,
              child: roleDoc.child ?? false,
              system: roleDoc.system ?? false,
              createdAt: now,
              updatedAt: now,
              createdBy: userId,
              updatedBy: userId,
            };
          }
        }
      } catch {
        // Role lookup is best-effort; fall through to MemberType-derived privileges
      }

      return {
        id: userId,
        email: userDoc.email ?? '',
        username: userDoc.username ?? '',
        ...(userDoc.displayName && { displayName: userDoc.displayName }),
        roles: [roleDTO],
        rolePrivileges,
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

    // Try to hydrate the full member from CBL blocks first.
    // For seeded users (no CBL blocks), fall back to constructing a member
    // from the mnemonic and verifying the derived public key matches the
    // stored public key.
    let member: Member<TID>;
    try {
      member = (await memberStore.getMember(
        reference.id,
      )) as unknown as Member<TID>;

      try {
        member.loadWallet(mnemonic);
      } catch {
        throw new Error('Invalid mnemonic');
      }

      if (!member.hasPrivateKey) {
        throw new Error('Invalid mnemonic');
      }
    } catch (err) {
      // If getMember failed (seeded user without CBL blocks), reconstruct
      // from the mnemonic and verify the public key matches.
      if (err instanceof Error && err.message === 'Invalid mnemonic') {
        throw err;
      }

      // Get the stored public key to verify the mnemonic derives the right key
      const storedPubKeyHex = await memberStore.getMemberPublicKeyHex(
        reference.id,
      );
      if (!storedPubKeyHex) {
        throw new Error('Invalid credentials');
      }

      const sp = ServiceProvider.getInstance<TID>();
      const eciesService =
        sp.eciesService as unknown as import('@digitaldefiance/node-ecies-lib').ECIESService<TID>;
      const { member: reconstructed } = Member.newMember<TID>(
        eciesService,
        reference.type,
        'recovered', // placeholder name — overridden below
        new EmailString(email),
        mnemonic,
      );

      // Verify the derived public key matches the stored one
      const derivedPubKeyHex = Buffer.from(reconstructed.publicKey).toString(
        'hex',
      );
      if (derivedPubKeyHex !== storedPubKeyHex) {
        throw new Error('Invalid mnemonic');
      }

      // Patch the reconstructed member with the correct ID
      Object.defineProperty(reconstructed, 'id', {
        get: () => reference.id,
        configurable: true,
      });

      member = reconstructed as unknown as Member<TID>;
    }

    // Use idToString for proper UUID round-trip (pairs with idFromString)
    const idProvider = ServiceProvider.getInstance<TID>().idProvider;
    const userId = idProvider.idToString(reference.id);

    return {
      userId,
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

    // Retrieve stored password hash from private profile.
    // For seeded users without CBL blocks, getMemberProfile will throw.
    // Fall back to the DB `users` collection for the password hash.
    let storedHash: string | undefined;
    try {
      const { privateProfile } = await memberStore.getMemberProfile(
        reference.id,
      );
      storedHash = privateProfile?.passwordHash;
    } catch {
      // Seeded users — no profile CBL blocks. The password hash is not
      // stored in the users collection by default (only mnemonic-based
      // auth is configured for seeded users), so this will likely fail.
    }

    if (!storedHash) {
      throw new Error('Password authentication not configured for this member');
    }

    const isValid = await bcrypt.compare(password, storedHash);
    if (!isValid) {
      throw new Error('Invalid credentials');
    }

    // Try to hydrate from CBL blocks; fall back to a shell member for seeded users
    let member: Member<TID>;
    try {
      member = (await memberStore.getMember(
        reference.id,
      )) as unknown as Member<TID>;
    } catch {
      // Seeded user without CBL blocks — create a shell member
      const sp = ServiceProvider.getInstance<TID>();
      const eciesService =
        sp.eciesService as unknown as import('@digitaldefiance/node-ecies-lib').ECIESService<TID>;
      const { member: shell } = Member.newMember<TID>(
        eciesService,
        reference.type,
        email, // placeholder
        new EmailString(email),
      );
      Object.defineProperty(shell, 'id', {
        get: () => reference.id,
        configurable: true,
      });
      member = shell as unknown as Member<TID>;
    }

    // Use idToString for proper UUID round-trip (pairs with idFromString)
    const idProvider = ServiceProvider.getInstance<TID>().idProvider;
    const userId = idProvider.idToString(reference.id);

    return {
      userId,
      userMember: member,
    };
  }
}
