import { GuidV4Uint8Array, PlatformID } from '@digitaldefiance/ecies-lib';
import type { IStoredBackupCode } from '../userManagement';
import type { IBrightChainMemberEntry } from './brightChainMemberEntry';
import type { IPasswordWrappedPrivateKey } from './passwordWrappedPrivateKey';

/**
 * Full user init entry carrying RBAC data for a single user.
 * Extends IBrightChainMemberEntry with key material, credentials,
 * and role assignments needed by BrightChainMemberInitService.initializeWithRbac().
 * @template TID Platform-specific ID type (defaults to GuidV4Uint8Array)
 */
export interface IBrightChainUserInitEntry<
  TID extends PlatformID = GuidV4Uint8Array,
> extends IBrightChainMemberEntry<TID> {
  fullId: TID;
  username: string;
  email: string;
  /** Hex-encoded ECIES public key */
  publicKeyHex: string;
  /** Password-wrapped ECIES private key (optional for system user) */
  passwordWrappedPrivateKey?: IPasswordWrappedPrivateKey;
  /** Hex-encoded encrypted mnemonic for recovery */
  mnemonicRecovery: string;
  /** HMAC of the mnemonic for uniqueness checks */
  mnemonicHmac: string;
  /** Encrypted backup codes */
  backupCodes: IStoredBackupCode[];
  /** Role document _id */
  roleId: TID;
  /** User-role junction document _id */
  userRoleId: TID;
  /** Mnemonic document _id */
  mnemonicDocId: TID;
  /** Role name (e.g. "System", "Admin", "Member") */
  roleName: string;
  /** Role flags */
  roleAdmin: boolean;
  roleMember: boolean;
  roleSystem: boolean;
  /** Plaintext mnemonic — only present during init, not persisted */
  plaintextMnemonic?: string;
  /** Plaintext password — only present during init, not persisted */
  plaintextPassword?: string;
  /** Plaintext backup codes — only present during init, not persisted */
  plaintextBackupCodes?: Array<string>;
}
