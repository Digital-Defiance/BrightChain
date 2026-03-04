/**
 * IdentityExpirationScheduler — Periodic background task that purges expired
 * IdentityRecoveryRecord entries, implementing the digital statute of limitations.
 *
 * Runs in brightchain-api-lib as a Node.js-specific service.
 *
 * @see Requirements 17
 * @see Design: Expiration Scheduler Design
 */

import {
  AuditEventType,
  AuditLogService,
  DEFAULT_STATUTE_FALLBACK_DURATION_MS,
  ExpirationResult,
  ExpirationSchedulerConfig,
  IExpirationScheduler,
  IQuorumDatabase,
  QuorumAuditLogEntry,
  ServiceProvider,
  StatuteOfLimitationsConfig,
} from '@brightchain/brightchain-lib';
import { HexString, IIdProvider, PlatformID } from '@digitaldefiance/ecies-lib';

/** Default interval: 24 hours in milliseconds */
const DEFAULT_INTERVAL_MS = 86400000;

/** Default batch size for processing expired records */
const DEFAULT_BATCH_SIZE = 100;

/**
 * IdentityExpirationScheduler periodically purges expired IdentityRecoveryRecord
 * entries from the quorum database.
 *
 * For each expired record:
 * 1. Deletes the identity recovery shards from the database
 * 2. Appends a chained audit log entry (identity_shards_expired)
 * 3. Does NOT modify the associated content in the block store
 *
 * @template TID - Platform ID type for frontend/backend DTO compatibility
 */
export class IdentityExpirationScheduler<TID extends PlatformID = Uint8Array>
  implements IExpirationScheduler
{
  private readonly intervalMs: number;
  private readonly batchSize: number;
  private timer: ReturnType<typeof setInterval> | null = null;
  private running = false;

  private readonly idProvider: IIdProvider<TID>;

  constructor(
    private readonly db: IQuorumDatabase<TID>,
    private readonly auditLogService?: AuditLogService<TID>,
    config?: Partial<ExpirationSchedulerConfig>,
    idProvider?: IIdProvider<TID>,
  ) {
    this.intervalMs = config?.intervalMs ?? DEFAULT_INTERVAL_MS;
    this.batchSize = config?.batchSize ?? DEFAULT_BATCH_SIZE;
    this.idProvider =
      idProvider ?? ServiceProvider.getInstance<TID>().idProvider;
  }

  /**
   * Start the periodic expiration check.
   * Uses the configured interval from ExpirationSchedulerConfig.
   */
  start(): void {
    if (this.running) {
      return;
    }
    this.running = true;
    this.timer = setInterval(() => {
      void this.runOnce();
    }, this.intervalMs);
  }

  /**
   * Stop the periodic expiration check.
   */
  stop(): void {
    if (this.timer) {
      clearInterval(this.timer);
      this.timer = null;
    }
    this.running = false;
  }

  /**
   * Whether the scheduler is currently running.
   */
  get isRunning(): boolean {
    return this.running;
  }

  /**
   * Run a single expiration check immediately.
   *
   * 1. Query expired records via listExpiredIdentityRecords(now, page=0, batchSize)
   * 2. For each expired record:
   *    a. Delete the identity recovery shards from the database
   *    b. Append a chained audit log entry (identity_shards_expired)
   *    c. Do NOT modify the associated content in the block store
   * 3. If the batch was full (count === batchSize), set nextBatchAvailable = true
   * 4. Return { deletedCount, failedIds, nextBatchAvailable }
   */
  async runOnce(): Promise<ExpirationResult> {
    const now = new Date();
    const expiredRecords = await this.db.listExpiredIdentityRecords(
      now,
      0,
      this.batchSize,
    );

    let deletedCount = 0;
    const failedIds: HexString[] = [];

    for (const record of expiredRecords) {
      try {
        // Delete the identity recovery shards
        await this.db.deleteIdentityRecord(record.id);

        // Append chained audit log entry
        await this.emitAuditEntry('identity_shards_expired', {
          identityRecordId: record.id,
          contentId: record.contentId,
          contentType: record.contentType,
          expiresAt: record.expiresAt.toISOString(),
          epochNumber: record.epochNumber,
        });

        deletedCount++;
      } catch {
        failedIds.push(this.idProvider.idToString(record.id) as HexString);
      }
    }

    const nextBatchAvailable = expiredRecords.length === this.batchSize;

    return {
      deletedCount,
      failedIds,
      nextBatchAvailable,
    };
  }

  /**
   * Load the statute of limitations configuration from the database.
   * Returns the stored config, or a default config with the 7-year fallback.
   */
  async loadStatuteConfig(): Promise<StatuteOfLimitationsConfig> {
    const config = await this.db.getStatuteConfig();
    if (config) {
      return config;
    }
    return {
      defaultDurations: new Map<string, number>(),
      fallbackDurationMs: DEFAULT_STATUTE_FALLBACK_DURATION_MS,
    };
  }

  /**
   * Compute the expiration date for a new IdentityRecoveryRecord.
   *
   * Uses the statute of limitations configuration to determine the duration
   * based on content type, falling back to the default duration.
   *
   * @param contentType - The content type (e.g., 'post', 'message', 'financial_record')
   * @param createdAt - The creation timestamp of the record
   * @returns The computed expiration date
   */
  async computeExpirationDate(
    contentType: string,
    createdAt: Date,
  ): Promise<Date> {
    const config = await this.loadStatuteConfig();
    const durationMs =
      config.defaultDurations.get(contentType) ?? config.fallbackDurationMs;
    return new Date(createdAt.getTime() + durationMs);
  }

  /**
   * Emit an audit log entry via the AuditLogService or directly to the database.
   */
  private async emitAuditEntry(
    eventType: AuditEventType,
    details: Record<string, unknown>,
  ): Promise<void> {
    const entry: QuorumAuditLogEntry<TID> = {
      id: this.idProvider.fromBytes(this.idProvider.generate()),
      eventType,
      details,
      timestamp: new Date(),
    };

    if (this.auditLogService) {
      await this.auditLogService.appendEntry(entry);
    } else {
      await this.db.appendAuditEntry(entry);
    }
  }
}
