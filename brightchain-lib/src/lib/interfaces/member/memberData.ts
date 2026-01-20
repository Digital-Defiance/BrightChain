import {
  EmailString,
  Member,
  MemberType,
  PlatformID,
  SecureString,
} from '@digitaldefiance/ecies-lib';
import { MemberStatusType } from '../../enumerations/memberStatusType';
import { Checksum } from '../../types/checksum';

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
  type: MemberType;
  status: MemberStatusType;
  lastUpdate: Date;
  region?: string;
  reputation: number;
}

/**
 * Query criteria for member lookups
 */
export interface IMemberQueryCriteria<TID extends PlatformID = Uint8Array> {
  id?: TID;
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
