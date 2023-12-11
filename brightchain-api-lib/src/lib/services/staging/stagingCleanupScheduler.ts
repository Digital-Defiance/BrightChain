/**
 * StagingCleanupScheduler — Periodic background task that purges expired
 * staged files from the staging directory.
 *
 * Follows the ExpirationScheduler / IdentityExpirationScheduler pattern:
 * extends EventEmitter, uses setInterval, exposes start()/stop()/tick().
 *
 * Each tick():
 * 1. Calls stagingService.findExpired()
 * 2. For each expired record, calls stagingService.remove(commitToken)
 * 3. Emits FILE_CLEANED per file and BATCH_CLEANED at the end
 * 4. If a single file deletion fails, emits ERROR and continues
 * 5. Returns count of successfully cleaned files
 *
 * Requirements: 5.1, 5.2, 5.3, 5.4, 5.5, 5.6
 */

import type { IStagedFileRecord } from '@brightchain/brightchain-lib';
import { EventEmitter } from 'events';
import type { StagingService } from './stagingService';

// ─── Events ─────────────────────────────────────────────────────────────────

export enum StagingCleanupEvent {
  /** Emitted when a single expired file is cleaned up */
  FILE_CLEANED = 'staging:file_cleaned',
  /** Emitted when a batch cleanup tick completes */
  BATCH_CLEANED = 'staging:batch_cleaned',
  /** Emitted when an error occurs during cleanup */
  ERROR = 'staging:error',
  /** Emitted when the scheduler starts */
  STARTED = 'staging:started',
  /** Emitted when the scheduler stops */
  STOPPED = 'staging:stopped',
}

// ─── Event Payloads ─────────────────────────────────────────────────────────

export interface IFileCleanedPayload {
  commitToken: string;
  originalFilename: string;
  /** Age of the expired file in milliseconds */
  ageMs: number;
}

export interface IBatchCleanedPayload {
  /** Number of files successfully cleaned */
  cleanedCount: number;
  /** Number of files that failed to clean */
  failedCount: number;
  /** Total expired files found */
  totalExpired: number;
}

export interface ICleanupErrorPayload {
  commitToken: string;
  originalFilename: string;
  error: unknown;
}

// ─── Scheduler ──────────────────────────────────────────────────────────────

export class StagingCleanupScheduler extends EventEmitter {
  private timer: ReturnType<typeof setInterval> | null = null;
  private running = false;

  constructor(
    private readonly stagingService: StagingService,
    private readonly intervalMs: number,
  ) {
    super();
  }

  /**
   * Start the periodic cleanup scheduler.
   * Uses setInterval at the configured interval.
   */
  start(): void {
    if (this.running) {
      return;
    }

    this.running = true;
    this.timer = setInterval(() => {
      void this.tick();
    }, this.intervalMs);

    this.emit(StagingCleanupEvent.STARTED);
  }

  /**
   * Stop the periodic cleanup scheduler.
   */
  stop(): void {
    if (this.timer) {
      clearInterval(this.timer);
      this.timer = null;
    }
    this.running = false;
    this.emit(StagingCleanupEvent.STOPPED);
  }

  /**
   * Whether the scheduler is currently running.
   */
  get isRunning(): boolean {
    return this.running;
  }

  /**
   * Run a single cleanup tick.
   *
   * Finds all expired staged files, removes each one, emits events,
   * and continues on individual failures.
   *
   * @returns The number of files successfully cleaned
   */
  async tick(): Promise<number> {
    let cleanedCount = 0;
    let failedCount = 0;
    let expiredRecords: IStagedFileRecord[] = [];

    try {
      expiredRecords = await this.stagingService.findExpired();
    } catch (error) {
      this.emit(StagingCleanupEvent.ERROR, {
        commitToken: '',
        originalFilename: '',
        error,
      } satisfies ICleanupErrorPayload);
      return 0;
    }

    for (const record of expiredRecords) {
      try {
        await this.stagingService.remove(record.commitToken);

        const ageMs = Date.now() - new Date(record.expiresAt).getTime();

        const payload: IFileCleanedPayload = {
          commitToken: record.commitToken,
          originalFilename: record.originalFilename,
          ageMs,
        };

        this.emit(StagingCleanupEvent.FILE_CLEANED, payload);
        cleanedCount++;
      } catch (error) {
        failedCount++;
        const errorPayload: ICleanupErrorPayload = {
          commitToken: record.commitToken,
          originalFilename: record.originalFilename,
          error,
        };
        this.emit(StagingCleanupEvent.ERROR, errorPayload);
        // Continue processing remaining files (Requirement 5.5)
      }
    }

    const batchPayload: IBatchCleanedPayload = {
      cleanedCount,
      failedCount,
      totalExpired: expiredRecords.length,
    };

    this.emit(StagingCleanupEvent.BATCH_CLEANED, batchPayload);

    return cleanedCount;
  }
}
