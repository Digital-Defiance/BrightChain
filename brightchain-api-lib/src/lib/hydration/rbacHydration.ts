/**
 * @fileoverview IHydrationSchema implementations for RBAC document types.
 *
 * Each factory function takes an IIdProvider<TID> and returns a hydration
 * schema that converts between the stored (all-string) and typed
 * (GuidV4Buffer IDs, Date objects) representations.
 */

import type { IHydrationSchema } from '@brightchain/brightchain-lib';
import type { IIdProvider, PlatformID } from '@digitaldefiance/ecies-lib';
import type {
  AccountStatus,
  IMnemonicBase,
  IRoleBase,
  IUserBase,
  IUserRoleBase,
} from '@digitaldefiance/suite-core-lib';
import type {
  IStoredMnemonic,
  IStoredRole,
  IStoredUser,
  IStoredUserRole,
} from '../interfaces/storage/storedDocumentTypes';
import {
  rehydrateMnemonic,
  rehydrateRole,
  rehydrateUser,
  rehydrateUserRole,
} from '../utils/rehydration';
import { serializeForStorage } from '../utils/serialization';

// ─── Roles ───────────────────────────────────────────────────────────────────

/**
 * Create a hydration schema for the roles collection.
 */
export function createRoleHydrationSchema<TID extends PlatformID>(
  idProvider: IIdProvider<TID>,
): IHydrationSchema<IStoredRole, IRoleBase<TID, Date, string>> {
  return {
    hydrate: (stored) => rehydrateRole(stored, idProvider),
    dehydrate: (typed) =>
      serializeForStorage<IRoleBase<TID, Date, string>, IStoredRole>(typed),
  };
}

// ─── Users ───────────────────────────────────────────────────────────────────

/**
 * Create a hydration schema for the users collection.
 */
export function createUserHydrationSchema<TID extends PlatformID>(
  idProvider: IIdProvider<TID>,
): IHydrationSchema<IStoredUser, IUserBase<TID, Date, string, AccountStatus>> {
  return {
    hydrate: (stored) => rehydrateUser(stored, idProvider),
    dehydrate: (typed) =>
      serializeForStorage<
        IUserBase<TID, Date, string, AccountStatus>,
        IStoredUser
      >(typed),
  };
}

// ─── User Roles ──────────────────────────────────────────────────────────────

/**
 * Create a hydration schema for the user-roles collection.
 */
export function createUserRoleHydrationSchema<TID extends PlatformID>(
  idProvider: IIdProvider<TID>,
): IHydrationSchema<IStoredUserRole, IUserRoleBase<TID, Date>> {
  return {
    hydrate: (stored) => rehydrateUserRole(stored, idProvider),
    dehydrate: (typed) =>
      serializeForStorage<IUserRoleBase<TID, Date>, IStoredUserRole>(typed),
  };
}

// ─── Mnemonics ───────────────────────────────────────────────────────────────

/**
 * Create a hydration schema for the mnemonics collection.
 */
export function createMnemonicHydrationSchema<TID extends PlatformID>(
  idProvider: IIdProvider<TID>,
): IHydrationSchema<IStoredMnemonic, IMnemonicBase<TID>> {
  return {
    hydrate: (stored) => rehydrateMnemonic(stored, idProvider),
    dehydrate: (typed) =>
      serializeForStorage<IMnemonicBase<TID>, IStoredMnemonic>(typed),
  };
}
