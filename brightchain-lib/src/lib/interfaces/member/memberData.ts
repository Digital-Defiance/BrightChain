import {
  EmailString,
  Member,
  MemberType,
  PlatformID,
  SecureString,
} from '@digitaldefiance/ecies-lib';
import { MemberStatusType } from '../../enumerations/memberStatusType';
import { Checksum } from '../../types/checksum';
import { IStoredBackupCode } from '../userManagement';
import { IPasswordWrappedPrivateKey } from './passwordWrappedPrivateKey';

/**
 * Public member data stored in CBL
 */
export interface IPublicMemberData<TID extends PlatformID = Uint8Array> {
  // Identity
  id: TID;
  type: MemberType;
  name: string;
  dateCreated: Date;
  dateUpdated: Date;

  // Public Keys
  publicKey: Uint8Array;
  votingPublicKey: Uint8Array;

  // Network Status
  status: MemberStatusType;
  lastSeen: Date;
  reputation: number;

  // Storage Metrics
  storageContributed: number;
  storageUsed: number;

  // Geographic
  region?: string;
  geographicSpread?: number;
}

/**
 * Private member data stored in CBL
 */
export interface IPrivateMemberData<TID extends PlatformID = Uint8Array> {
  // Identity
  id: TID;
  contactEmail: EmailString;

  // Security
  recoveryData?: Uint8Array;

  // Auth
  /** bcrypt password hash — present only for members with password-based auth */
  passwordHash?: string;

  /** Stored backup codes — encrypted per the upstream Argon2id/AEAD/ECIES scheme (see IStoredBackupCode) */
  backupCodes?: IStoredBackupCode[];

  /** Password-wrapped ECIES private key (AES-256-GCM + PBKDF2) */
  passwordWrappedPrivateKey?: IPasswordWrappedPrivateKey;

  /** Mnemonic encrypted with the system user's ECIES public key (hex-encoded) */
  mnemonicRecovery?: string;

  // Network
  trustedPeers: TID[];
  blockedPeers: TID[];

  // Preferences
  settings: {
    autoReplication: boolean;
    minRedundancy: number;
    preferredRegions: string[];
  };

  // History
  activityLog: Array<{
    timestamp: Date;
    action: string;
    details: Record<string, unknown>;
  }>;
}

/**
 * Member reference for use in documents
 */
export interface IMemberReference<TID extends PlatformID = Uint8Array> {
  id: TID;
  type: MemberType;
  dateVerified: Date;
  publicCBL?: Checksum;
}

/**
 * Member index entry
 */
export interface IMemberIndexEntry<TID extends PlatformID = Uint8Array> {
  id: TID;
  publicCBL: Checksum;
  privateCBL: Checksum;
  publicProfileCBL?: Checksum;
  privateProfileCBL?: Checksum;
  type: MemberType;
  status: MemberStatusType;
  lastUpdate: Date;
  region?: string;
  reputation: number;
  /** Member display name — used to populate the in-memory name→id index. */
  name?: string;
  /** Member contact email — used to populate the in-memory email→id index. */
  email?: string;
}

/**
 * Query criteria for member lookups
 */
export interface IMemberQueryCriteria<TID extends PlatformID = Uint8Array> {
  id?: TID;
  name?: string;
  email?: string;
  type?: MemberType;
  status?: MemberStatusType;
  region?: string;
  minReputation?: number;
  maxReputation?: number;
  limit?: number;
  offset?: number;
}

/**
 * Member changes for updates
 */
export interface IMemberChanges<TID extends PlatformID = Uint8Array> {
  id: TID;
  publicChanges?: Partial<IPublicMemberData<TID>>;
  privateChanges?: Partial<IPrivateMemberData<TID>>;
  indexChanges?: Partial<IMemberIndexEntry<TID>>;
}

/**
 * Data for creating a new member
 */
export interface INewMemberData {
  type: MemberType;
  name: string;
  contactEmail: EmailString;
  region?: string;
  /** When provided, the member keypair is derived from this mnemonic instead of generating a random one. */
  forceMnemonic?: SecureString;
  settings?: {
    autoReplication?: boolean;
    minRedundancy?: number;
    preferredRegions?: string[];
  };
}

/**
 * Member hydration service
 */
export interface IMemberHydrator<TID extends PlatformID = Uint8Array> {
  // Convert between formats
  referenceToMember(ref: IMemberReference): Promise<Member<TID>>;
  memberToReference(member: Member): IMemberReference<TID>;

  // Cache management
  cachePublicData(id: TID, data: IPublicMemberData<TID>): void;
  invalidateCache(id: TID): void;
}

/**
 * Member store service
 */
export interface IMemberStore<TID extends PlatformID = Uint8Array> {
  // Basic operations
  createMember(
    data: INewMemberData,
  ): Promise<{ reference: IMemberReference<TID>; mnemonic: SecureString }>;
  getMember(id: TID): Promise<Member<TID>>;
  /**
   * Returns the hex-encoded public key for a member.
   * Reads from the `users` DB collection when available (fast path for
   * seeded users whose CBL blocks are not stored). Falls back to getMember()
   * for members created via createMember() which do have CBL blocks.
   */
  getMemberPublicKeyHex(id: TID): Promise<string | null>;
  updateMember(id: TID, changes: IMemberChanges<TID>): Promise<void>;
  deleteMember(id: TID): Promise<void>;

  // Index operations
  updateIndex(entry: IMemberIndexEntry<TID>): Promise<void>;
  queryIndex(
    criteria: IMemberQueryCriteria<TID>,
  ): Promise<IMemberReference<TID>[]>;

  // Sync operations
  syncShard(region: string): Promise<void>;
  propagateChanges(changes: IMemberChanges<TID>[]): Promise<void>;
}
