/**
 * @fileoverview Ban record interfaces for the network trust system.
 *
 * A BanRecord is created when a BAN_MEMBER proposal is approved by the BrightTrust.
 * It carries the BrightTrust's threshold signatures so any node can independently
 * verify the ban is legitimate.
 *
 * @see Network Trust and Ban Mechanism spec
 */

import { PlatformID } from '@digitaldefiance/ecies-lib';

/**
 * A signed record indicating a member has been banned from the network.
 *
 * @template TID - Platform ID type for frontend/backend DTO compatibility
 */
export interface IBanRecord<TID extends PlatformID = Uint8Array> {
  /** The banned member's ID */
  memberId: TID;

  /** Human-readable reason for the ban */
  reason: string;

  /** The proposal ID that resulted in this ban */
  proposalId: TID;

  /** Epoch number when the ban was enacted */
  epoch: number;

  /** Timestamp when the ban took effect */
  bannedAt: Date;

  /** Optional block IDs referencing evidence (offending content, logs, etc.) */
  evidenceBlockIds?: string[];

  /** BrightTrust signatures approving this ban */
  approvalSignatures: Array<{
    memberId: TID;
    signature: Uint8Array;
  }>;

  /** The minimum number of signatures required for this ban to be valid */
  requiredSignatures: number;
}

/**
 * Lightweight ban list entry for quick lookups.
 * Used by the BanListCache for efficient membership checks.
 *
 * @template TID - Platform ID type
 */
export interface IBanListEntry<TID extends PlatformID = Uint8Array> {
  memberId: TID;
  bannedAt: Date;
  epoch: number;
}
