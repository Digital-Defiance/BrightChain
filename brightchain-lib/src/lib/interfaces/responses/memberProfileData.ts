import { MemberStatusType } from '../../enumerations/memberStatusType';
import type { BrightDateTimestamp } from '../../types/brightDateTimestamp';

/**
 * Platform-agnostic base DTO for public member profile data.
 *
 * Follows the IBaseData<TData> workspace convention so that:
 *   - Frontend uses `IMemberPublicProfileData<string>` (default)
 *   - Backend uses `IMemberPublicProfileData<GuidV4Uint8Array>` or `IMemberPublicProfileData<string>`
 *     after serialization at the API boundary via `idProvider.idToString()`
 *
 * @template TID - ID type. Defaults to `string` for frontend/JSON compatibility.
 */
export interface IMemberPublicProfileData<TID = string> {
  id: TID;
  status: MemberStatusType;
  reputation: number;
  storageQuota: string; // BigInt as string for JSON serialization
  storageUsed: string; // BigInt as string for JSON serialization
  lastActive: BrightDateTimestamp;
  dateCreated: BrightDateTimestamp;
  dateUpdated: BrightDateTimestamp;
}

/**
 * Platform-agnostic base DTO for private member profile data.
 *
 * @template TID - ID type. Defaults to `string` for frontend/JSON compatibility.
 */
export interface IMemberPrivateProfileData<TID = string> {
  id: TID;
  trustedPeers: TID[];
  blockedPeers: TID[];
  settings: Record<string, unknown>;
  activityLog: Array<{
    action: string;
    timestamp: BrightDateTimestamp;
    details?: Record<string, unknown>;
  }>;
  dateCreated: BrightDateTimestamp;
  dateUpdated: BrightDateTimestamp;
}

/**
 * Combined platform-agnostic member profile DTO.
 *
 * @template TID - ID type. Defaults to `string` for frontend/JSON compatibility.
 */
export interface IMemberProfileData<TID = string> {
  publicProfile: IMemberPublicProfileData<TID>;
  privateProfile?: IMemberPrivateProfileData<TID>;
}
