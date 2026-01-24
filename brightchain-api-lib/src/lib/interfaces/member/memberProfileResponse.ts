import { MemberStatusType } from '@brightchain/brightchain-lib';

/**
 * Public member profile data for API responses
 */
export interface IMemberPublicProfileResponse {
  [key: string]: unknown;
  id: string;
  status: MemberStatusType;
  reputation: number;
  storageQuota: string; // BigInt as string for JSON serialization
  storageUsed: string; // BigInt as string for JSON serialization
  lastActive: string; // ISO date string
  dateCreated: string; // ISO date string
  dateUpdated: string; // ISO date string
}

/**
 * Private member profile data for API responses (only for authorized users)
 */
export interface IMemberPrivateProfileResponse {
  [key: string]: unknown;
  id: string;
  trustedPeers: string[]; // Array of member IDs
  blockedPeers: string[]; // Array of member IDs
  settings: Record<string, unknown>;
  activityLog: Array<{
    action: string;
    timestamp: string; // ISO date string
    details?: Record<string, unknown>;
  }>;
  dateCreated: string; // ISO date string
  dateUpdated: string; // ISO date string
}

/**
 * Combined member profile response
 */
export interface IMemberProfileResponse {
  [key: string]: unknown;
  publicProfile: IMemberPublicProfileResponse;
  privateProfile?: IMemberPrivateProfileResponse; // Only included for authorized users
}

/**
 * Request to update member profile settings
 */
export interface IMemberProfileUpdateRequest {
  settings?: Record<string, unknown>;
  addTrustedPeer?: string;
  removeTrustedPeer?: string;
  addBlockedPeer?: string;
  removeBlockedPeer?: string;
}
