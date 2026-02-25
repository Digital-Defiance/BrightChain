/**
 * @fileoverview Shared base data interfaces for Quorum API endpoints.
 *
 * These interfaces carry the core data structures that both frontend
 * and backend can consume. API-specific response wrappers live in
 * brightchain-api-lib.
 *
 * @see Requirements 5, 7, 10, 12, 13, 15
 */

import { ProposalActionType } from '../../enumerations/proposalActionType';
import { ProposalStatus } from '../../enumerations/proposalStatus';
import { QuorumOperationalMode } from '../../enumerations/quorumOperationalMode';
import { QuorumMetrics } from '../quorumMetrics';

/**
 * Base data for submitting a proposal.
 */
export interface ISubmitProposalData {
  description: string;
  actionType: ProposalActionType;
  actionPayload: Record<string, unknown>;
  expiresAt: string; // ISO date string
  attachmentCblId?: string;
}

/**
 * Base data for a proposal response.
 */
export interface IProposalData {
  id: string;
  description: string;
  actionType: ProposalActionType;
  actionPayload: Record<string, unknown>;
  proposerMemberId: string;
  status: ProposalStatus;
  requiredThreshold: number;
  expiresAt: string;
  createdAt: string;
  attachmentCblId?: string;
  epochNumber: number;
}

/**
 * Base data for a vote in a proposal response.
 */
export interface IVoteData {
  proposalId: string;
  voterMemberId: string;
  decision: 'approve' | 'reject';
  comment?: string;
  createdAt: string;
}

/**
 * Base data for a proposal with its votes.
 */
export interface IProposalWithVotesData {
  proposal: IProposalData;
  votes: IVoteData[];
}

/**
 * Base data for quorum metrics response.
 */
export type IQuorumMetricsData = QuorumMetrics;

/**
 * Base data for an epoch response.
 */
export interface IEpochData {
  epochNumber: number;
  memberIds: string[];
  threshold: number;
  mode: QuorumOperationalMode;
  createdAt: string;
  previousEpochNumber?: number;
  innerQuorumMemberIds?: string[];
}

/**
 * Base data for quorum status response.
 */
export interface IQuorumStatusData {
  mode: QuorumOperationalMode;
  epochNumber: number;
  memberCount: number;
  threshold: number;
}

/**
 * Base data for audit chain verification response.
 */
export interface IAuditVerificationData {
  valid: boolean;
  entriesVerified: number;
  error?: string;
}

/**
 * Base data for alias availability check.
 */
export interface IAliasAvailabilityData {
  aliasName: string;
  available: boolean;
}
