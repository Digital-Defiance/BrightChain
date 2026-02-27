/**
 * @fileoverview AuditLogEntry interface.
 *
 * Defines the structure of audit log entries for all auditable quorum events.
 *
 * @see Requirements 13.6, 13.7
 */

import { PlatformID } from '@digitaldefiance/ecies-lib';

/**
 * Union of all auditable event types in the quorum system.
 */
export type AuditEventType =
  | 'identity_disclosure_proposed'
  | 'identity_disclosure_approved'
  | 'identity_disclosure_rejected'
  | 'identity_disclosure_expired'
  | 'identity_shards_expired'
  | 'alias_registered'
  | 'alias_deregistered'
  | 'epoch_created'
  | 'member_added'
  | 'member_removed'
  | 'transition_ceremony_started'
  | 'transition_ceremony_completed'
  | 'transition_ceremony_failed'
  | 'proposal_created'
  | 'proposal_approved'
  | 'proposal_rejected'
  | 'proposal_expired'
  | 'vote_cast'
  | 'share_redistribution_started'
  | 'share_redistribution_completed'
  | 'share_redistribution_failed';

/**
 * An entry in the quorum audit log.
 * @template TID - Platform ID type for frontend/backend DTO compatibility
 */
export interface QuorumAuditLogEntry<TID extends PlatformID = Uint8Array> {
  /** Unique entry identifier */
  id: TID;
  /** The type of auditable event */
  eventType: AuditEventType;
  /** Related proposal ID, if applicable */
  proposalId?: TID;
  /** Target member ID, if applicable */
  targetMemberId?: TID;
  /** Proposer member ID, if applicable */
  proposerMemberId?: TID;
  /** Attached CBL ID, if applicable */
  attachmentCblId?: string;
  /** Additional event-specific details */
  details: Record<string, unknown>;
  /** Timestamp of the event */
  timestamp: Date;
}
