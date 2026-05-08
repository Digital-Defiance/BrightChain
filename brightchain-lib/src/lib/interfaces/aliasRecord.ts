/**
 * @fileoverview AliasRecord interface.
 *
 * Represents a registered pseudonymous alias that maps back to a member's
 * real identity through the BrightTrust.
 *
 * @see Requirements 15
 */

import { PlatformID } from '@digitaldefiance/ecies-lib';
import type { BrightDateTimestamp } from '../types/brightDateTimestamp';

/**
 * A registered pseudonymous alias record.
 * @template TID - Platform ID type for frontend/backend DTO compatibility
 */
export interface AliasRecord<TID extends PlatformID = Uint8Array> {
  /** Unique pseudonym */
  aliasName: string;
  /** Owner member ID (sealed via identity recovery) */
  ownerMemberId: TID;
  /** Public key for signature verification under this alias */
  aliasPublicKey: Uint8Array;
  /** Link to sealed real identity */
  identityRecoveryRecordId: TID;
  /** Whether the alias is currently active */
  isActive: boolean;
  /** Timestamp of alias registration */
  registeredAt: BrightDateTimestamp;
  /** Timestamp of deactivation, if applicable */
  deactivatedAt?: BrightDateTimestamp;
  /** Epoch at registration */
  epochNumber: number;
}
