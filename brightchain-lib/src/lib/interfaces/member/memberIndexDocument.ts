import type { MemberType } from '@digitaldefiance/ecies-lib';
import type { MemberStatusType } from '../../enumerations/memberStatusType';
import type { BsonDocument } from '../storage/documentTypes';

/**
 * Serialisable document shape for the member_index collection in BrightChainDb.
 * All IDs and checksums are stored as strings.
 */
export interface IMemberIndexDocument extends BsonDocument {
  /** Member ID as a hex string (ShortHexGuid). */
  id: string;
  /** CBL magnet URL for the member's public data block. */
  publicCBL: string;
  /** CBL magnet URL for the member's private data block. */
  privateCBL: string;
  /** Optional CBL magnet URL for the member's public profile block. */
  publicProfileCBL?: string;
  /** Optional CBL magnet URL for the member's private profile block. */
  privateProfileCBL?: string;
  /** Pool ID this entry belongs to. */
  poolId: string;
  type: MemberType;
  status: MemberStatusType;
  /** ISO-8601 string. */
  lastUpdate: string;
  region?: string;
  reputation: number;
}
