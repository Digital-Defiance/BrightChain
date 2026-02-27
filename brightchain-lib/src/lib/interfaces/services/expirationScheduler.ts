/**
 * @fileoverview IExpirationScheduler interface with ExpirationSchedulerConfig and ExpirationResult.
 *
 * Periodic background task that purges expired IdentityRecoveryRecord entries,
 * implementing the digital statute of limitations.
 *
 * @see Requirements 17
 */

import { HexString } from '@digitaldefiance/ecies-lib';

/**
 * Configuration for the expiration scheduler.
 */
export interface ExpirationSchedulerConfig {
  /** Interval between expiration checks in milliseconds. Default: 86400000 (24 hours) */
  intervalMs: number;
  /** Number of expired records to process per batch. Default: 100 */
  batchSize: number;
}

/**
 * Result of a single expiration check run.
 */
export interface ExpirationResult {
  /** Number of identity recovery records successfully deleted */
  deletedCount: number;
  /** IDs of records that failed to delete */
  failedIds: HexString[];
  /** True if the batch was full, indicating more expired records may exist */
  nextBatchAvailable: boolean;
}

/**
 * Interface for the expiration scheduler.
 *
 * Runs periodically to purge expired IdentityRecoveryRecord entries,
 * permanently deleting identity recovery shards after the statute of
 * limitations expires. Each deletion is recorded in the chained audit log.
 */
export interface IExpirationScheduler {
  /**
   * Start the periodic expiration check.
   * Uses the configured interval from ExpirationSchedulerConfig.
   */
  start(): void;

  /**
   * Stop the periodic expiration check.
   */
  stop(): void;

  /**
   * Run a single expiration check immediately.
   * Queries expired records, deletes shards, appends audit entries.
   * If the batch was full, sets nextBatchAvailable to true.
   * @returns The result of the expiration check
   */
  runOnce(): Promise<ExpirationResult>;
}
