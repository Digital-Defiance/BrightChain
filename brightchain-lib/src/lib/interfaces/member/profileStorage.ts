import { MemberStatusType } from '../../enumerations/memberStatusType';
import { IStoredBackupCode } from '../userManagement';
import { IPasswordWrappedPrivateKey } from './passwordWrappedPrivateKey';

/**
 * Storage format for public member profile data - all serializable types
 * This is separate from IMemberStorageData which handles identity/authentication.
 * Profile data contains operational information like status, reputation, and storage metrics.
 */
type HexLike = string | Uint8Array;

export interface IPublicMemberProfileStorageData {
  // Identity reference
  id: HexLike; // hex

  // Network Status
  status: string; // MemberStatusType as string
  lastActive: string; // ISO string
  reputation: number;

  // Storage Metrics
  storageQuota: string; // bigint as string
  storageUsed: string; // bigint as string

  // Timestamps
  dateCreated: string; // ISO string
  dateUpdated: string; // ISO string
}

/**
 * Storage format for private member profile data - all serializable types
 * Contains sensitive operational data like peer lists and settings.
 */
export interface IPrivateMemberProfileStorageData {
  // Identity reference
  id: HexLike; // hex

  // Network
  trustedPeers: HexLike[]; // hex array
  blockedPeers: HexLike[]; // hex array

  // Auth
  /** bcrypt password hash — present only for members with password-based auth */
  passwordHash?: string;

  /** Stored backup codes — encrypted per the upstream Argon2id/AEAD/ECIES scheme (see IStoredBackupCode) */
  backupCodes?: IStoredBackupCode[];

  /** Password-wrapped ECIES private key (AES-256-GCM + PBKDF2) */
  passwordWrappedPrivateKey?: IPasswordWrappedPrivateKey;

  /** Mnemonic encrypted with the system user's ECIES public key (hex-encoded) */
  mnemonicRecovery?: string;

  // Preferences
  settings: {
    autoReplication?: boolean;
    minRedundancy?: number;
    preferredRegions?: string[];
    [key: string]: unknown;
  };

  // History
  activityLog: Array<{
    timestamp: string; // ISO string
    action: string;
    details?: Record<string, unknown>;
    metadata?: Record<string, unknown>;
  }>;

  // Timestamps
  dateCreated: string; // ISO string
  dateUpdated: string; // ISO string
}

/**
 * Hydrated format for public member profile data
 */
export interface IPublicMemberProfileHydratedData<TID = Uint8Array> {
  id: TID;
  status: MemberStatusType;
  lastActive: Date;
  reputation: number;
  storageQuota: bigint;
  storageUsed: bigint;
  dateCreated: Date;
  dateUpdated: Date;
}

/**
 * Hydrated format for private member profile data
 */
export interface IPrivateMemberProfileHydratedData<TID = Uint8Array> {
  id: TID;
  trustedPeers: TID[];
  blockedPeers: TID[];
  /** bcrypt password hash — present only for members with password-based auth */
  passwordHash?: string;
  /** Stored backup codes — encrypted per the upstream Argon2id/AEAD/ECIES scheme (see IStoredBackupCode) */
  backupCodes?: IStoredBackupCode[];
  /** Password-wrapped ECIES private key (AES-256-GCM + PBKDF2) */
  passwordWrappedPrivateKey?: IPasswordWrappedPrivateKey;
  /** Mnemonic encrypted with the system user's ECIES public key (hex-encoded) */
  mnemonicRecovery?: string;
  settings: {
    autoReplication?: boolean;
    minRedundancy?: number;
    preferredRegions?: string[];
    [key: string]: unknown;
  };
  activityLog: Array<{
    timestamp: Date;
    action: string;
    details?: Record<string, unknown>;
    metadata?: Record<string, unknown>;
  }>;
  dateCreated: Date;
  dateUpdated: Date;
}
