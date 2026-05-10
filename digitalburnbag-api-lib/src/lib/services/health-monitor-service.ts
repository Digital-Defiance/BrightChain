/**
 * HealthMonitorService — orchestrates scheduled heartbeat checks, token refresh,
 * failure policy evaluation, and status history persistence.
 *
 * Pure helper functions are exported for direct property-based testing.
 *
 * Feature: canary-provider-system
 * Requirements: 3.1, 3.2, 3.3, 3.5, 3.6, 4.3, 4.4, 6.1, 6.2, 6.3, 6.4, 6.5, 6.6
 */
import type {
  ICanaryProviderRegistry,
  ICredentialService,
  IFailurePolicyManager,
  IHealthMonitorService,
  IHeartbeatCheckResult,
  IProviderConnectionExtended,
  IProviderCredentials,
  IRateLimitConfig,
  IStatusHistoryEntry,
  IStatusHistoryQueryOptions,
} from '@brightchain/digitalburnbag-lib';
import { HeartbeatSignalType } from '@brightchain/digitalburnbag-lib';
import type { PlatformID } from '@digitaldefiance/ecies-lib';

// ---------------------------------------------------------------------------
// Repository interfaces (to be implemented by BrightDB in Task 11)
// ---------------------------------------------------------------------------

/** Repository for persisting status history entries. */
export interface IStatusHistoryRepository<TID extends PlatformID = string> {
  appendEntry(entry: IStatusHistoryEntry<TID>): Promise<void>;
  getEntriesByConnection(
    connectionId: TID,
    options?: IStatusHistoryQueryOptions,
  ): Promise<IStatusHistoryEntry<TID>[]>;
}

/** Repository for reading/updating provider connection state. */
export interface IConnectionRepository<TID extends PlatformID = string> {
  getConnection(
    connectionId: TID,
  ): Promise<IProviderConnectionExtended<TID> | null>;
  updateConnection(
    connectionId: TID,
    updates: Partial<IProviderConnectionExtended<TID>>,
  ): Promise<void>;
}

/** Callback for status change events. */
export type StatusChangeCallback<TID extends PlatformID = string> = (event: {
  connectionId: TID;
  previousSignalType: HeartbeatSignalType | undefined;
  currentSignalType: HeartbeatSignalType;
  timestamp: Date;
}) => void | Promise<void>;

/** Callback for user notifications (token expiry, etc.). */
export type NotificationCallback = (
  connectionId: string,
  message: string,
  details?: Record<string, unknown>,
) => void | Promise<void>;

// ---------------------------------------------------------------------------
// Pure helper functions (exported for property-based testing)
// ---------------------------------------------------------------------------

/**
 * Classify a heartbeat check result into a signal type.
 *
 * - HTTP failure / timeout / auth failure → CHECK_FAILED
 * - Success + no activity → ABSENCE
 * - Success + activity → PRESENCE
 * - Signal is NEVER ABSENCE when the API call itself failed.
 *
 * Requirements: 3.1, 3.2, 3.3
 */
export function classifySignal(
  result: IHeartbeatCheckResult,
): HeartbeatSignalType {
  // If the check was not successful, it's always CHECK_FAILED (Req 3.1)
  if (!result.success) {
    return HeartbeatSignalType.CHECK_FAILED;
  }

  // If the adapter already classified as DURESS, preserve it
  if (
    result.signalType === HeartbeatSignalType.DURESS ||
    result.duressDetected
  ) {
    return HeartbeatSignalType.DURESS;
  }

  // Success + activity → PRESENCE (Req 3.3)
  if (result.eventCount > 0) {
    return HeartbeatSignalType.PRESENCE;
  }

  // Success + no activity → ABSENCE (Req 3.2)
  return HeartbeatSignalType.ABSENCE;
}

/**
 * Decide whether OAuth2 tokens should be refreshed.
 *
 * Refresh iff tokenExpiresAt - now ≤ 10 minutes (600 000 ms) AND > 0.
 * If tokenExpiresAt is undefined or already expired (≤ 0), do NOT refresh.
 *
 * Requirement: 6.5
 */
export function shouldRefreshTokens(
  tokenExpiresAt: Date | undefined,
  now: Date,
): boolean {
  if (!tokenExpiresAt) return false;
  const remainingMs = tokenExpiresAt.getTime() - now.getTime();
  return remainingMs > 0 && remainingMs <= 600_000;
}

/**
 * Create a status history entry from a heartbeat check result.
 *
 * All required fields are populated; no field is null or undefined
 * (except optional ones like httpStatusCode and errorMessage).
 *
 * Requirement: 7.1
 */
export function createStatusHistoryEntry(
  connectionId: string,
  userId: string,
  result: IHeartbeatCheckResult,
  signalType: HeartbeatSignalType,
): IStatusHistoryEntry<string> {
  const now = new Date();
  return {
    id: `sh-${connectionId}-${now.getTime()}`,
    connectionId,
    userId,
    timestamp: result.checkedAt,
    signalType,
    eventCount: result.eventCount,
    confidence: result.confidence,
    timeSinceLastActivityMs: result.timeSinceLastActivityMs,
    httpStatusCode: result.statusCode,
    errorMessage: result.error,
    createdAt: now,
  };
}

/**
 * Filter and sort status history entries.
 *
 * - Filter by signal types (if provided)
 * - Filter by date range (since / until)
 * - Sort chronologically by timestamp (ascending)
 * - Apply limit (if provided)
 *
 * Requirement: 7.2
 */
export function filterAndSortEntries(
  entries: IStatusHistoryEntry<string>[],
  options?: IStatusHistoryQueryOptions,
): IStatusHistoryEntry<string>[] {
  let filtered = [...entries];

  if (options?.signalTypes && options.signalTypes.length > 0) {
    const allowed = new Set(options.signalTypes);
    filtered = filtered.filter((e) => allowed.has(e.signalType));
  }

  if (options?.since) {
    const sinceTime = options.since.getTime();
    filtered = filtered.filter((e) => e.timestamp.getTime() >= sinceTime);
  }

  if (options?.until) {
    const untilTime = options.until.getTime();
    filtered = filtered.filter((e) => e.timestamp.getTime() <= untilTime);
  }

  // Sort chronologically (ascending by timestamp)
  filtered.sort((a, b) => a.timestamp.getTime() - b.timestamp.getTime());

  if (options?.limit !== undefined && options.limit >= 0) {
    filtered = filtered.slice(0, options.limit);
  }

  return filtered;
}

/**
 * Determine whether a status change event should be emitted.
 *
 * Emit iff the current signal type differs from the previous signal type.
 * If there is no previous signal (first check), always emit.
 *
 * Requirement: 6.3
 */
export function shouldEmitStatusChange(
  previousSignal: HeartbeatSignalType | undefined,
  currentSignal: HeartbeatSignalType,
): boolean {
  if (previousSignal === undefined) return true;
  return previousSignal !== currentSignal;
}

/**
 * Update the absence counter based on the signal type.
 *
 * - ABSENCE → increment
 * - CHECK_FAILED → unchanged (Req 3.5)
 * - PRESENCE / DURESS / INCONCLUSIVE → reset to 0
 *
 * Requirement: 3.5
 */
export function updateAbsenceCounter(
  currentCount: number,
  signalType: HeartbeatSignalType,
): number {
  switch (signalType) {
    case HeartbeatSignalType.ABSENCE:
      return currentCount + 1;
    case HeartbeatSignalType.CHECK_FAILED:
      return currentCount; // unchanged
    default:
      return 0; // PRESENCE, DURESS, INCONCLUSIVE reset
  }
}

// ---------------------------------------------------------------------------
// RateLimiter — enforces maxRequests / windowMs / minDelayMs
// ---------------------------------------------------------------------------

/**
 * Simple sliding-window rate limiter.
 *
 * Tracks request timestamps and enforces:
 * - No more than maxRequests within any windowMs sliding window
 * - At least minDelayMs between consecutive requests
 *
 * Requirement: 6.4
 */
export class RateLimiter {
  private readonly timestamps: number[] = [];

  constructor(private readonly config: IRateLimitConfig) {}

  /**
   * Returns the number of milliseconds the caller must wait before the
   * next request is allowed. Returns 0 if the request can proceed now.
   */
  getDelayMs(now: number): number {
    // Purge timestamps outside the current window
    const windowStart = now - this.config.windowMs;
    while (this.timestamps.length > 0 && this.timestamps[0] < windowStart) {
      this.timestamps.shift();
    }

    let delay = 0;

    // Enforce minDelayMs between consecutive requests
    if (this.timestamps.length > 0 && this.config.minDelayMs) {
      const lastTs = this.timestamps[this.timestamps.length - 1];
      const sinceLast = now - lastTs;
      if (sinceLast < this.config.minDelayMs) {
        delay = Math.max(delay, this.config.minDelayMs - sinceLast);
      }
    }

    // Enforce maxRequests within windowMs
    if (this.timestamps.length >= this.config.maxRequests) {
      // Must wait until the oldest request in the window expires (+1 to be strictly outside)
      const oldestInWindow = this.timestamps[0];
      const waitUntil = oldestInWindow + this.config.windowMs + 1;
      const windowDelay = waitUntil - now;
      if (windowDelay > 0) {
        delay = Math.max(delay, windowDelay);
      }
    }

    return delay;
  }

  /**
   * Record that a request was made at the given timestamp.
   */
  recordRequest(now: number): void {
    this.timestamps.push(now);
  }

  /**
   * Check whether a request can proceed right now (delay === 0).
   */
  canProceed(now: number): boolean {
    return this.getDelayMs(now) === 0;
  }

  /**
   * Return a copy of the recorded timestamps (for testing).
   */
  getTimestamps(): number[] {
    return [...this.timestamps];
  }
}

// ---------------------------------------------------------------------------
// HealthMonitorService implementation
// ---------------------------------------------------------------------------

/**
 * Concrete implementation of IHealthMonitorService.
 *
 * Orchestrates scheduled heartbeat checks, token refresh, failure policy
 * evaluation, and status history persistence.
 */
export class HealthMonitorService<TID extends PlatformID = string>
  implements IHealthMonitorService<TID>
{
  /** Active monitoring intervals keyed by connectionId string. */
  private readonly intervals = new Map<
    string,
    ReturnType<typeof setInterval>
  >();
  /** Rate limiters keyed by connectionId string. */
  private readonly rateLimiters = new Map<string, RateLimiter>();

  constructor(
    private readonly registry: ICanaryProviderRegistry<TID>,
    private readonly credentialService: ICredentialService<TID>,
    private readonly failurePolicyManager: IFailurePolicyManager<TID>,
    private readonly statusHistoryRepo: IStatusHistoryRepository<TID>,
    private readonly connectionRepo: IConnectionRepository<TID>,
    private readonly onStatusChange?: StatusChangeCallback<TID>,
    private readonly onNotify?: NotificationCallback,
  ) {}

  // -----------------------------------------------------------------------
  // IHealthMonitorService
  // -----------------------------------------------------------------------

  async startMonitoring(connectionId: TID): Promise<void> {
    const connKey = String(connectionId);

    // Prevent duplicate intervals
    if (this.intervals.has(connKey)) return;

    const connection = await this.connectionRepo.getConnection(connectionId);
    if (!connection) throw new Error(`Connection ${connKey} not found`);

    const adapter = this.registry.getProvider(connection.providerId);
    const intervalMs =
      connection.checkIntervalMs ??
      adapter?.getRecommendedCheckIntervalMs() ??
      300_000; // 5 min default

    // Set up rate limiter if the adapter has rate limit config
    if (adapter) {
      const config = adapter.getConfig();
      if (config.rateLimit) {
        this.rateLimiters.set(connKey, new RateLimiter(config.rateLimit));
      }
    }

    const handle = setInterval(() => {
      void this.executeCheck(connectionId);
    }, intervalMs);

    this.intervals.set(connKey, handle);
  }

  async stopMonitoring(connectionId: TID): Promise<void> {
    const connKey = String(connectionId);
    const handle = this.intervals.get(connKey);
    if (handle) {
      clearInterval(handle);
      this.intervals.delete(connKey);
    }
    this.rateLimiters.delete(connKey);
  }

  async executeCheck(connectionId: TID): Promise<IHeartbeatCheckResult<TID>> {
    const connKey = String(connectionId);
    const connection = await this.connectionRepo.getConnection(connectionId);
    if (!connection) throw new Error(`Connection ${connKey} not found`);

    // Respect rate limits (Req 6.4)
    const limiter = this.rateLimiters.get(connKey);
    if (limiter) {
      const delay = limiter.getDelayMs(Date.now());
      if (delay > 0) {
        await new Promise((resolve) => setTimeout(resolve, delay));
      }
      limiter.recordRequest(Date.now());
    }

    // Attempt token refresh if needed (Req 6.5)
    await this.refreshTokensIfNeeded(connectionId);

    // Decrypt credentials (Req 10.2)
    let credentials: IProviderCredentials<TID>;
    try {
      credentials =
        await this.credentialService.getDecryptedCredentials(connectionId);
    } catch {
      // Credential retrieval failed — treat as CHECK_FAILED
      const failResult = this.buildFailedResult(
        connectionId,
        'Credential retrieval failed',
      );
      await this.processResult(
        connection,
        failResult,
        HeartbeatSignalType.CHECK_FAILED,
      );
      return failResult;
    }

    // Get adapter from registry
    const adapter = this.registry.getProvider(connection.providerId);
    if (!adapter) {
      const failResult = this.buildFailedResult(
        connectionId,
        'Provider adapter not found',
      );
      await this.processResult(
        connection,
        failResult,
        HeartbeatSignalType.CHECK_FAILED,
      );
      return failResult;
    }

    // Execute heartbeat check
    let result: IHeartbeatCheckResult<TID>;
    try {
      const since = new Date(
        Date.now() - (adapter.getConfig().defaultLookbackMs ?? 86_400_000),
      );
      result = await adapter.checkHeartbeat(credentials, since, new Date(), {
        absenceConfig: connection.absenceConfig,
        duressConfig: connection.duressConfig,
      });
    } catch {
      result = this.buildFailedResult(
        connectionId,
        'Heartbeat check threw an exception',
      );
    }

    // Classify signal (Req 3.1, 3.2, 3.3)
    const signal = classifySignal(result as IHeartbeatCheckResult);

    // Process the result
    await this.processResult(connection, result, signal);

    return result;
  }

  async refreshTokensIfNeeded(connectionId: TID): Promise<boolean> {
    const connection = await this.connectionRepo.getConnection(connectionId);
    if (!connection) return false;

    // Determine token expiry from credential freshness
    const freshness =
      await this.credentialService.validateCredentialFreshness(connectionId);
    if (!freshness.expiresInMs) return false;

    const expiresAt = new Date(Date.now() + freshness.expiresInMs);
    const now = new Date();

    if (!shouldRefreshTokens(expiresAt, now)) return false;

    // Attempt refresh
    const adapter = this.registry.getProvider(connection.providerId);
    if (!adapter?.refreshTokens) return false;

    try {
      const credentials =
        await this.credentialService.getDecryptedCredentials(connectionId);
      const refreshed = await adapter.refreshTokens(credentials);
      // Store updated credentials
      await this.credentialService.storeCredentials({
        ...credentials,
        ...refreshed,
      } as IProviderCredentials<TID>);
      return true;
    } catch {
      // Token refresh failed → mark as "expired" and notify (Req 6.6)
      await this.connectionRepo.updateConnection(connectionId, {
        status: 'expired',
      } as Partial<IProviderConnectionExtended<TID>>);
      if (this.onNotify) {
        await this.onNotify(
          String(connectionId),
          'Token refresh failed — please re-authenticate',
          { connectionId: String(connectionId) },
        );
      }
      return false;
    }
  }

  async getStatusHistory(
    connectionId: TID,
    options?: IStatusHistoryQueryOptions,
  ): Promise<IStatusHistoryEntry<TID>[]> {
    return this.statusHistoryRepo.getEntriesByConnection(connectionId, options);
  }

  // -----------------------------------------------------------------------
  // Private helpers
  // -----------------------------------------------------------------------

  private async processResult(
    connection: IProviderConnectionExtended<TID>,
    result: IHeartbeatCheckResult<TID>,
    signal: HeartbeatSignalType,
  ): Promise<void> {
    const connectionId = connection.id;
    const connKey = String(connectionId);

    // Persist status history entry (Req 6.2)
    const entry = createStatusHistoryEntry(
      connKey,
      String(connection.userId),
      result as IHeartbeatCheckResult,
      signal,
    ) as unknown as IStatusHistoryEntry<TID>;
    await this.statusHistoryRepo.appendEntry(entry);

    // Emit status change event if signal type transitioned (Req 6.3)
    const previousSignal = connection.lastCheckSignalType;
    if (shouldEmitStatusChange(previousSignal, signal) && this.onStatusChange) {
      await this.onStatusChange({
        connectionId,
        previousSignalType: previousSignal,
        currentSignalType: signal,
        timestamp: result.checkedAt,
      });
    }

    // Update connection state based on signal
    if (signal === HeartbeatSignalType.CHECK_FAILED) {
      // Increment consecutive failures, do NOT increment absence counter (Req 3.5)
      const newFailures = connection.consecutiveFailures + 1;
      await this.connectionRepo.updateConnection(connectionId, {
        consecutiveFailures: newFailures,
        lastCheckedAt: result.checkedAt,
        lastCheckSignalType: signal,
      } as Partial<IProviderConnectionExtended<TID>>);

      // Evaluate failure policy (Req 4.3)
      const evaluation = await this.failurePolicyManager.evaluateFailure(
        { ...connection, consecutiveFailures: newFailures },
        newFailures,
      );
      if (evaluation.shouldEscalate && evaluation.action) {
        await this.failurePolicyManager.executePolicy(
          { ...connection, consecutiveFailures: newFailures },
          evaluation.action,
        );
      }
    } else {
      // PRESENCE or ABSENCE: reset consecutiveFailures to 0, set status to "connected" (Req 4.4)
      await this.connectionRepo.updateConnection(connectionId, {
        consecutiveFailures: 0,
        status: 'connected',
        lastCheckedAt: result.checkedAt,
        lastCheckSignalType: signal,
        lastActivityAt:
          signal === HeartbeatSignalType.PRESENCE
            ? result.checkedAt
            : connection.lastActivityAt,
      } as Partial<IProviderConnectionExtended<TID>>);
    }
  }

  private buildFailedResult(
    _connectionId: TID,
    error: string,
  ): IHeartbeatCheckResult<TID> {
    return {
      success: false,
      error,
      checkedAt: new Date(),
      events: [],
      eventCount: 0,
      signalType: HeartbeatSignalType.CHECK_FAILED,
      isAlive: undefined,
      confidence: 0,
      timeSinceLastActivityMs: null,
      duressDetected: false,
    };
  }
}
