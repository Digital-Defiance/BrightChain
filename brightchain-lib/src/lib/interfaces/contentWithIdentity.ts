/**
 * @fileoverview ContentWithIdentity interface and IdentityMode enum.
 *
 * Defines the identity modes for content publication and the content
 * structure that carries identity information through the sealing pipeline.
 *
 * @see Requirements 14, 16
 */

import { HexString, PlatformID } from '@digitaldefiance/ecies-lib';

/**
 * Identity mode for content publication.
 */
export enum IdentityMode {
  /** Content published under real identity */
  Real = 'real',
  /** Content published under a registered alias */
  Alias = 'alias',
  /** Content published anonymously with membership proof */
  Anonymous = 'anonymous',
}

/**
 * Content structure carrying identity information through the sealing pipeline.
 * @template TID - Platform ID type for frontend/backend DTO compatibility
 */
export interface ContentWithIdentity<TID extends PlatformID = Uint8Array> {
  /** Creator's identity (real ID, alias ID, or Anonymous_ID) */
  creatorId: TID;
  /** Unique content identifier */
  contentId: HexString;
  /** Content type (block, message, post) */
  contentType: string;
  /** Content signature */
  signature: Uint8Array;
  /** Ring signature membership proof (required for anonymous content) */
  membershipProof?: Uint8Array;
  /** Link to identity recovery record after sealing */
  identityRecoveryRecordId?: HexString;
}
