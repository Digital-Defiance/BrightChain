/**
 * @fileoverview Shared base data interfaces for BrightTrust API endpoints.
 *
 * These interfaces carry the core data structures that both frontend
 * and backend can consume. API-specific response wrappers live in
 * brightchain-api-lib.
 *
 * @see Requirements 5, 7, 10, 12, 13, 15
 */

import { BrightTrustOperationalMode } from '../../enumerations/brightTrustOperationalMode';
import { ProposalActionType } from '../../enumerations/proposalActionType';
import { ProposalStatus } from '../../enumerations/proposalStatus';
import { BrightTrustMetrics } from '../brightTrustMetrics';

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
 * Base data for BrightTrust metrics response.
 */
export type IBrightTrustMetricsData = BrightTrustMetrics;

/**
 * Base data for an epoch response.
 */
export interface IEpochData {
  epochNumber: number;
  memberIds: string[];
  threshold: number;
  mode: BrightTrustOperationalMode;
  createdAt: string;
  previousEpochNumber?: number;
  innerBrightTrustMemberIds?: string[];
}

/**
 * Base data for BrightTrust status response.
 */
export interface IBrightTrustStatusData {
  mode: BrightTrustOperationalMode;
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
