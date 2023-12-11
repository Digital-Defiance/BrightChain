import { Member, PlatformID } from '@digitaldefiance/ecies-lib';
import {
  AccountStatus,
  IRoleBase,
  IUserBase,
  IUserRoleBase,
} from '@digitaldefiance/suite-core-lib';
import { IBrightChainBaseInitResult } from './brightChainBaseInitResult';

/**
 * Full result returned by BrightChainMemberInitService.initializeWithRbac().
 *
 * Extends IBrightChainBaseInitResult (which carries the common fields:
 * alreadyInitialized, insertedCount, skippedCount, db) with all flat
 * credential fields for the three RBAC users (system, admin, member).
 *
 * NOTE: The `db` field is typed as a generic `TDb` (defaulting to `unknown`)
 * rather than importing `BrightDb` directly. This avoids a circular
 * dependency: brightchain-db depends on brightchain-lib, so brightchain-lib
 * must NOT import from brightchain-db. Callers in brightchain-api-lib (which
 * does depend on brightchain-db) can narrow the type by supplying the
 * concrete `BrightDb` type argument:
 *
 *   IBrightChainInitResult<GuidV4Buffer, BrightDb>
 *
 * Document fields use the suite-core-lib base interfaces directly (e.g.
 * `IRoleBase<TID, Date>`) rather than the `BaseDocument` intersection aliases
 * (`RoleDocument`, etc.). The intersection aliases combine `Document<TID> & T`
 * which cannot be naturally constructed — the build methods produce plain data
 * objects that satisfy the base interface, not `Document<TID>` wrapper instances.
 */
export interface IBrightChainInitResult<TID extends PlatformID, TDb = unknown>
  extends IBrightChainBaseInitResult<TDb, TID> {
  adminRole: IRoleBase<TID, Date, string>;
  adminUser: IUserBase<TID, Date, string, AccountStatus>;
  adminUsername: string;
  adminEmail: string;
  adminMnemonic: string;
  adminPassword: string;
  adminBackupCodes: Array<string>;
  adminMember: Member<TID>;
  adminUserRole: IUserRoleBase<TID, Date>;
  memberRole: IRoleBase<TID, Date, string>;
  memberUser: IUserBase<TID, Date, string, AccountStatus>;
  memberUsername: string;
  memberEmail: string;
  memberMnemonic: string;
  memberPassword: string;
  memberBackupCodes: Array<string>;
  memberMember: Member<TID>;
  memberUserRole: IUserRoleBase<TID, Date>;
  systemRole: IRoleBase<TID, Date, string>;
  systemUser: IUserBase<TID, Date, string, AccountStatus>;
  systemUsername: string;
  systemEmail: string;
  systemMnemonic: string;
  systemPassword: string;
  systemBackupCodes: Array<string>;
  systemMember: Member<TID>;
  systemUserRole: IUserRoleBase<TID, Date>;
}
