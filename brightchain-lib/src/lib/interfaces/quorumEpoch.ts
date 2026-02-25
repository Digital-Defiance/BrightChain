/**
 * @fileoverview QuorumEpoch interface.
 *
 * A versioned configuration snapshot of the quorum membership and threshold parameters.
 * Each membership change increments the epoch.
 *
 * @see Requirements 10, 12
 */

import { PlatformID, ShortHexGuid } from '@digitaldefiance/ecies-lib';
import { QuorumOperationalMode } from '../enumerations/quorumOperationalMode';

/**
 * Represents a versioned snapshot of quorum membership and threshold configuration.
 * @template TID - Platform ID type for frontend/backend DTO compatibility
 */
export interface QuorumEpoch<TID extends PlatformID = Uint8Array> {
  /** Monotonically increasing epoch number, starts at 1 */
  epochNumber: number;
  /** Active member IDs in this epoch */
  memberIds: ShortHexGuid[];
  /** Shares required to unseal */
  threshold: number;
  /** Current operational mode */
  mode: QuorumOperationalMode;
  /** Timestamp of epoch creation */
  createdAt: Date;
  /** Previous epoch number for audit trail */
  previousEpochNumber?: number;
  /** Optional subset of members for routine ops when members > 20 (Req 12.2) */
  innerQuorumMemberIds?: ShortHexGuid[];
  /** Generic marker for DTO compatibility */
  _platformId?: TID;
}
