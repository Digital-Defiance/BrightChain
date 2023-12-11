/**
 * @fileoverview Rehydration utilities for converting stored (serialized)
 * BrightDB documents back into their typed in-memory representations.
 *
 * Each stored document has all IDs as hex strings and all dates as ISO-8601
 * strings. Rehydration converts these back to TID (via IIdProvider.idFromString)
 * and Date objects respectively.
 *
 * The inverse operation (typed → stored) is handled by
 * BrightChainMemberInitService.serializeForStorage().
 */

import type { IIdProvider, PlatformID } from '@digitaldefiance/ecies-lib';
import {
  AccountStatus,
  type IMnemonicBase,
  type IRoleBase,
  type IUserBase,
  type IUserRoleBase,
} from '@digitaldefiance/suite-core-lib';
import type {
  IStoredMnemonic,
  IStoredRole,
  IStoredUser,
  IStoredUserRole,
} from '../interfaces/storage/storedDocumentTypes';

// ─── Roles ───────────────────────────────────────────────────────────────────

/**
 * Rehydrate a stored role document into a typed IRoleBase.
 */
export function rehydrateRole<TID extends PlatformID>(
  stored: IStoredRole,
  idProvider: IIdProvider<TID>,
): IRoleBase<TID, Date, string> {
  return {
    _id: idProvider.idFromString(stored._id),
    name: stored.name,
    admin: stored.admin,
    member: stored.member,
    child: stored.child,
    system: stored.system,
    createdBy: idProvider.idFromString(stored.createdBy),
    updatedBy: idProvider.idFromString(stored.updatedBy),
    createdAt: new Date(stored.createdAt),
    updatedAt: new Date(stored.updatedAt),
    ...(stored.deletedAt !== undefined && {
      deletedAt: new Date(stored.deletedAt),
    }),
    ...(stored.deletedBy !== undefined && {
      deletedBy: idProvider.idFromString(stored.deletedBy),
    }),
  };
}

// ─── Users ───────────────────────────────────────────────────────────────────

/**
 * Rehydrate a stored user document into a typed IUserBase.
 */
export function rehydrateUser<TID extends PlatformID>(
  stored: IStoredUser,
  idProvider: IIdProvider<TID>,
): IUserBase<TID, Date, string, AccountStatus> {
  return {
    _id: idProvider.idFromString(stored._id),
    username: stored.username,
    email: stored.email,
    publicKey: stored.publicKey,
    passwordWrappedPrivateKey: stored.passwordWrappedPrivateKey,
    mnemonicRecovery: stored.mnemonicRecovery,
    ...(stored.mnemonicId !== undefined && {
      mnemonicId: idProvider.idFromString(stored.mnemonicId),
    }),
    backupCodes: stored.backupCodes,
    accountStatus: stored.accountStatus as AccountStatus,
    emailVerified: stored.emailVerified,
    directChallenge: stored.directChallenge,
    timezone: stored.timezone,
    siteLanguage: stored.siteLanguage,
    currency: stored.currency,
    darkMode: stored.darkMode,
    ...(stored.lastLogin !== undefined && {
      lastLogin: new Date(stored.lastLogin),
    }),
    createdBy: idProvider.idFromString(stored.createdBy),
    updatedBy: idProvider.idFromString(stored.updatedBy),
    createdAt: new Date(stored.createdAt),
    updatedAt: new Date(stored.updatedAt),
    ...(stored.deletedAt !== undefined && {
      deletedAt: new Date(stored.deletedAt),
    }),
    ...(stored.deletedBy !== undefined && {
      deletedBy: idProvider.idFromString(stored.deletedBy),
    }),
  };
}

// ─── User Roles ──────────────────────────────────────────────────────────────

/**
 * Rehydrate a stored user-role junction document into a typed IUserRoleBase.
 */
export function rehydrateUserRole<TID extends PlatformID>(
  stored: IStoredUserRole,
  idProvider: IIdProvider<TID>,
): IUserRoleBase<TID, Date> {
  return {
    _id: idProvider.idFromString(stored._id),
    userId: idProvider.idFromString(stored.userId),
    roleId: idProvider.idFromString(stored.roleId),
    createdBy: idProvider.idFromString(stored.createdBy),
    updatedBy: idProvider.idFromString(stored.updatedBy),
    createdAt: new Date(stored.createdAt),
    updatedAt: new Date(stored.updatedAt),
    ...(stored.deletedAt !== undefined && {
      deletedAt: new Date(stored.deletedAt),
    }),
    ...(stored.deletedBy !== undefined && {
      deletedBy: idProvider.idFromString(stored.deletedBy),
    }),
  };
}

// ─── Mnemonics ───────────────────────────────────────────────────────────────

/**
 * Rehydrate a stored mnemonic document into a typed IMnemonicBase.
 */
export function rehydrateMnemonic<TID extends PlatformID>(
  stored: IStoredMnemonic,
  idProvider: IIdProvider<TID>,
): IMnemonicBase<TID> {
  return {
    _id: idProvider.idFromString(stored._id),
    hmac: stored.hmac,
  };
}
