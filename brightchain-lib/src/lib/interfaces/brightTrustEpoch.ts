/**
 * @fileoverview BrightTrustEpoch interface.
 *
 * A versioned configuration snapshot of the BrightTrust membership and threshold parameters.
 * Each membership change increments the epoch.
 *
 * @see Requirements 10, 12
 */

import { PlatformID } from '@digitaldefiance/ecies-lib';
import { BrightTrustOperationalMode } from '../enumerations/brightTrustOperationalMode';

/**
 * Represents a versioned snapshot of BrightTrust membership and threshold configuration.
 * @template TID - Platform ID type for frontend/backend DTO compatibility
 */
export interface BrightTrustEpoch<TID extends PlatformID = Uint8Array> {
  /** Monotonically increasing epoch number, starts at 1 */
  epochNumber: number;
  /** Active member IDs in this epoch */
  memberIds: TID[];
  /** Shares required to unseal */
  threshold: number;
  /** Current operational mode */
  mode: BrightTrustOperationalMode;
  /** Timestamp of epoch creation */
  createdAt: Date;
  /** Previous epoch number for audit trail */
  previousEpochNumber?: number;
  /** Optional subset of members for routine ops when members > 20 (Req 12.2) */
  innerBrightTrustMemberIds?: TID[];
}
