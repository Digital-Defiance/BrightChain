import { EmailString, GuidV4, SecureString } from '@digitaldefiance/ecies-lib';
import { BrightChainMember } from '../../brightChainMember';
import { MemberStatusType } from '../../enumerations/memberStatusType';
import { MemberType } from '../../enumerations/memberType';
import { ChecksumUint8Array } from '../../types';

/**
 * Public member data stored in CBL
 */
export interface IPublicMemberData {
  // Identity
  id: GuidV4;
  type: MemberType;
  name: string;
  dateCreated: Date;
  dateUpdated: Date;

  // Public Keys
  publicKey: Buffer;
  votingPublicKey: Buffer;

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
export interface IPrivateMemberData {
  // Identity
  id: GuidV4;
  contactEmail: EmailString;

  // Security
  recoveryData?: Buffer;

  // Network
  trustedPeers: GuidV4[];
  blockedPeers: GuidV4[];

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
export interface IMemberReference {
  id: GuidV4;
  type: MemberType;
  dateVerified: Date;
  publicCBL?: ChecksumUint8Array;
}

/**
 * Member index entry
 */
export interface IMemberIndexEntry {
  id: GuidV4;
  publicCBL: ChecksumUint8Array;
  privateCBL: ChecksumUint8Array;
  type: MemberType;
  status: MemberStatusType;
  lastUpdate: Date;
  region?: string;
  reputation: number;
}

/**
 * Query criteria for member lookups
 */
export interface IMemberQueryCriteria {
  id?: GuidV4;
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
export interface IMemberChanges {
  id: GuidV4;
  publicChanges?: Partial<IPublicMemberData>;
  privateChanges?: Partial<IPrivateMemberData>;
  indexChanges?: Partial<IMemberIndexEntry>;
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
export interface IMemberHydrator {
  // Convert between formats
  referenceToMember(ref: IMemberReference): Promise<BrightChainMember>;
  memberToReference(member: BrightChainMember): IMemberReference;

  // Cache management
  cachePublicData(id: GuidV4, data: IPublicMemberData): void;
  invalidateCache(id: GuidV4): void;
}

/**
 * Member store service
 */
export interface IMemberStore {
  // Basic operations
  createMember(
    data: INewMemberData,
  ): Promise<{ reference: IMemberReference; mnemonic: SecureString }>;
  getMember(id: GuidV4): Promise<BrightChainMember>;
  updateMember(id: GuidV4, changes: IMemberChanges): Promise<void>;
  deleteMember(id: GuidV4): Promise<void>;

  // Index operations
  updateIndex(entry: IMemberIndexEntry): Promise<void>;
  queryIndex(criteria: IMemberQueryCriteria): Promise<IMemberReference[]>;

  // Sync operations
  syncShard(region: string): Promise<void>;
  propagateChanges(changes: IMemberChanges[]): Promise<void>;
}
