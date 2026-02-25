/**
 * @fileoverview AliasRecord interface.
 *
 * Represents a registered pseudonymous alias that maps back to a member's
 * real identity through the quorum.
 *
 * @see Requirements 15
 */

import { PlatformID, ShortHexGuid } from '@digitaldefiance/ecies-lib';

/**
 * A registered pseudonymous alias record.
 * @template TID - Platform ID type for frontend/backend DTO compatibility
 */
export interface AliasRecord<TID extends PlatformID = Uint8Array> {
  /** Unique pseudonym */
  aliasName: string;
  /** Owner member ID (sealed via identity recovery) */
  ownerMemberId: ShortHexGuid;
  /** Public key for signature verification under this alias */
  aliasPublicKey: Uint8Array;
  /** Link to sealed real identity */
  identityRecoveryRecordId: ShortHexGuid;
  /** Whether the alias is currently active */
  isActive: boolean;
  /** Timestamp of alias registration */
  registeredAt: Date;
  /** Timestamp of deactivation, if applicable */
  deactivatedAt?: Date;
  /** Epoch at registration */
  epochNumber: number;
  /** Generic marker for DTO compatibility */
  _platformId?: TID;
}
