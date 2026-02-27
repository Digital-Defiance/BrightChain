/**
 * @fileoverview IdentityRecoveryRecord interface.
 *
 * A QuorumDataRecord containing the sealed real identity of a content creator,
 * referenced by the anonymized content via a shard record ID.
 *
 * @see Requirements 14, 17
 */

import { PlatformID } from '@digitaldefiance/ecies-lib';
import { IdentityMode } from './contentWithIdentity';

/**
 * Record containing sealed identity shards for a content creator.
 * @template TID - Platform ID type for frontend/backend DTO compatibility
 */
export interface IdentityRecoveryRecord<TID extends PlatformID = Uint8Array> {
  /** Unique record identifier */
  id: TID;
  /** Reference to the content this identity belongs to */
  contentId: TID;
  /** Content type: block, message, post */
  contentType: string;
  /** ECIES-encrypted identity shards per quorum member */
  encryptedShardsByMemberId: Map<TID, Uint8Array>;
  /** Members holding shards */
  memberIds: TID[];
  /** Shares needed to recover the identity */
  threshold: number;
  /** Epoch at creation */
  epochNumber: number;
  /** Statute of limitations expiration timestamp */
  expiresAt: Date;
  /** Timestamp of record creation */
  createdAt: Date;
  /** Identity mode used for this content */
  identityMode: IdentityMode;
  /** Alias name if mode is alias */
  aliasName?: string;
}
