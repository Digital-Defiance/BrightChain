import {
  GuidV4Uint8Array,
  MemberType,
  PlatformID,
} from '@digitaldefiance/ecies-lib';

/**
 * Per-user credential bundle for RBAC initialization consumers.
 * Groups identity and plaintext credentials for a single user.
 * Used by printUserCredentials(), formatDotEnv(), and buildServerInitResult().
 *
 * @template TID - Platform ID type (GuidV4Uint8Array on backend, string on frontend)
 */
export interface IBrightChainUserCredentials<
  TID extends PlatformID = GuidV4Uint8Array,
> {
  /** Short ID (same as IBrightChainMemberEntry.id) */
  id: TID;
  /** Full GuidV4Buffer ID */
  fullId: TID;
  /** Member type (System, User) */
  type: MemberType;
  /** Plaintext username */
  username: string;
  /** Plaintext email */
  email: string;
  /** Plaintext mnemonic (sensitive — for initial provisioning only) */
  mnemonic: string;
  /** Plaintext password (sensitive — for initial provisioning only) */
  password: string;
  /** Plaintext backup codes (sensitive — for initial provisioning only) */
  backupCodes: Array<string>;
  /** Hex-encoded public key */
  publicKeyHex?: string;
  /** Role document _id */
  roleId?: TID;
  /** User-role junction document _id */
  userRoleId?: TID;
}
