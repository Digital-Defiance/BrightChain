/**
 * @fileoverview IQuorumDatabase interface.
 *
 * Abstraction over BrightChainDb with a dedicated "quorum-system" pool.
 * Provides full CRUD for epochs, members, documents, proposals, votes,
 * identity records, aliases, audit log, redistribution journal,
 * statute config, operational state, transactions, and health check.
 *
 * @see Requirements 9, 10
 */

import { PlatformID, ShortHexGuid } from '@digitaldefiance/ecies-lib';
import { QuorumDataRecord } from '../../quorumDataRecord';
import { AliasRecord } from '../aliasRecord';
import { QuorumAuditLogEntry } from '../auditLogEntry';
import { ChainedAuditLogEntry } from '../chainedAuditLogEntry';
import { IdentityRecoveryRecord } from '../identityRecoveryRecord';
import { OperationalState } from '../operationalState';
import { Proposal } from '../proposal';
import { QuorumEpoch } from '../quorumEpoch';
import { RedistributionJournalEntry } from '../redistributionJournalEntry';
import { StatuteOfLimitationsConfig } from '../statuteConfig';
import { Vote } from '../vote';
import { IQuorumMember } from './quorumService';

/**
 * Abstraction over BrightChainDb with a dedicated "quorum-system" pool.
 *
 * Implementations live in brightchain-api-lib (QuorumDatabaseAdapter).
 * All quorum data is routed through the PooledStoreAdapter for isolation.
 *
 * @template TID - Platform ID type for frontend/backend DTO compatibility
 */
export interface IQuorumDatabase<TID extends PlatformID = Uint8Array> {
  // === Epoch Management ===

  /**
   * Persist an epoch record.
   * @param epoch - The epoch to save
   */
  saveEpoch(epoch: QuorumEpoch<TID>): Promise<void>;

  /**
   * Retrieve an epoch by its number.
   * @param epochNumber - The epoch number
   * @returns The epoch, or null if not found
   */
  getEpoch(epochNumber: number): Promise<QuorumEpoch<TID> | null>;

  /**
   * Get the current (latest) epoch.
   * @returns The current epoch
   */
  getCurrentEpoch(): Promise<QuorumEpoch<TID>>;

  // === Member Management ===

  /**
   * Persist a quorum member record.
   * @param member - The member to save
   */
  saveMember(member: IQuorumMember<TID>): Promise<void>;

  /**
   * Retrieve a member by their ID.
   * @param memberId - The member ID
   * @returns The member, or null if not found
   */
  getMember(memberId: ShortHexGuid): Promise<IQuorumMember<TID> | null>;

  /**
   * List all active members in the quorum.
   * @returns Array of active quorum members
   */
  listActiveMembers(): Promise<IQuorumMember<TID>[]>;

  // === Sealed Documents ===

  /**
   * Persist a sealed document.
   * @param doc - The document to save
   */
  saveDocument(doc: QuorumDataRecord<TID>): Promise<void>;

  /**
   * Retrieve a sealed document by its ID.
   * @param docId - The document ID
   * @returns The document, or null if not found
   */
  getDocument(docId: ShortHexGuid): Promise<QuorumDataRecord<TID> | null>;

  /**
   * List documents sealed under a specific epoch with pagination.
   * @param epochNumber - The epoch number to filter by
   * @param page - Zero-based page number
   * @param pageSize - Number of documents per page
   * @returns Array of documents for the given epoch and page
   */
  listDocumentsByEpoch(
    epochNumber: number,
    page: number,
    pageSize: number,
  ): Promise<QuorumDataRecord<TID>[]>;

  // === Proposals and Votes ===

  /**
   * Persist a proposal.
   * @param proposal - The proposal to save
   */
  saveProposal(proposal: Proposal<TID>): Promise<void>;

  /**
   * Retrieve a proposal by its ID.
   * @param proposalId - The proposal ID
   * @returns The proposal, or null if not found
   */
  getProposal(proposalId: ShortHexGuid): Promise<Proposal<TID> | null>;

  /**
   * Persist a vote.
   * @param vote - The vote to save
   */
  saveVote(vote: Vote<TID>): Promise<void>;

  /**
   * Get all votes for a specific proposal.
   * @param proposalId - The proposal ID
   * @returns Array of votes for the proposal
   */
  getVotesForProposal(proposalId: ShortHexGuid): Promise<Vote<TID>[]>;

  // === Identity Recovery Records ===

  /**
   * Persist an identity recovery record.
   * @param record - The record to save
   */
  saveIdentityRecord(record: IdentityRecoveryRecord<TID>): Promise<void>;

  /**
   * Retrieve an identity recovery record by its ID.
   * @param recordId - The record ID
   * @returns The record, or null if not found
   */
  getIdentityRecord(
    recordId: ShortHexGuid,
  ): Promise<IdentityRecoveryRecord<TID> | null>;

  /**
   * Delete an identity recovery record (used by expiration scheduler).
   * @param recordId - The record ID to delete
   */
  deleteIdentityRecord(recordId: ShortHexGuid): Promise<void>;

  /**
   * List expired identity recovery records with pagination.
   * @param before - Records with expiresAt before this date are considered expired
   * @param page - Zero-based page number
   * @param pageSize - Number of records per page
   * @returns Array of expired identity recovery records
   */
  listExpiredIdentityRecords(
    before: Date,
    page: number,
    pageSize: number,
  ): Promise<IdentityRecoveryRecord<TID>[]>;

  // === Alias Registry ===

  /**
   * Persist an alias record.
   * @param alias - The alias record to save
   */
  saveAlias(alias: AliasRecord<TID>): Promise<void>;

  /**
   * Retrieve an alias record by name.
   * @param aliasName - The alias name
   * @returns The alias record, or null if not found
   */
  getAlias(aliasName: string): Promise<AliasRecord<TID> | null>;

  /**
   * Check if an alias name is available for registration.
   * @param aliasName - The alias name to check
   * @returns True if the alias is available
   */
  isAliasAvailable(aliasName: string): Promise<boolean>;

  // === Audit Log ===

  /**
   * Append an audit log entry.
   * @param entry - The audit log entry to append
   */
  appendAuditEntry(entry: QuorumAuditLogEntry): Promise<void>;

  /**
   * Get the latest chained audit log entry (needed for chain linking).
   * @returns The latest chained entry, or null if the log is empty
   */
  getLatestAuditEntry(): Promise<ChainedAuditLogEntry | null>;

  // === Redistribution Journal ===

  /**
   * Save a redistribution journal entry for rollback support.
   * @param entry - The journal entry to save
   */
  saveJournalEntry(entry: RedistributionJournalEntry): Promise<void>;

  /**
   * Get all journal entries for a specific epoch.
   * @param epochNumber - The epoch number
   * @returns Array of journal entries for the epoch
   */
  getJournalEntries(epochNumber: number): Promise<RedistributionJournalEntry[]>;

  /**
   * Delete all journal entries for a specific epoch.
   * @param epochNumber - The epoch number
   */
  deleteJournalEntries(epochNumber: number): Promise<void>;

  // === Statute of Limitations Configuration ===

  /**
   * Persist statute of limitations configuration.
   * @param config - The configuration to save
   */
  saveStatuteConfig(config: StatuteOfLimitationsConfig): Promise<void>;

  /**
   * Get the current statute of limitations configuration.
   * @returns The configuration, or null if not configured
   */
  getStatuteConfig(): Promise<StatuteOfLimitationsConfig | null>;

  // === Operational State ===

  /**
   * Persist the operational state (mode and current epoch).
   * @param state - The operational state to save
   */
  saveOperationalState(state: OperationalState): Promise<void>;

  /**
   * Get the persisted operational state.
   * @returns The operational state, or null if not yet initialized
   */
  getOperationalState(): Promise<OperationalState | null>;

  // === Transactions ===

  /**
   * Execute a function within a database transaction.
   * If the function throws, the transaction is rolled back.
   * @param fn - The function to execute within the transaction
   * @returns The result of the function
   */
  withTransaction<R>(fn: () => Promise<R>): Promise<R>;

  // === Health Check ===

  /**
   * Check if the quorum database pool is available.
   * Detects pool deletion/corruption on startup.
   * @returns True if the database is available and healthy
   */
  isAvailable(): Promise<boolean>;
}
