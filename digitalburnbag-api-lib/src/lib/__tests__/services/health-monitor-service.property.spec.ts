/**
 * Property-based tests for HealthMonitorService pure helper functions.
 *
 * Feature: canary-provider-system
 */
import type {
  IHeartbeatCheckResult,
  IRateLimitConfig,
  IStatusHistoryEntry,
  IStatusHistoryQueryOptions,
} from '@brightchain/digitalburnbag-lib';
import { HeartbeatSignalType } from '@brightchain/digitalburnbag-lib';
import * as fc from 'fast-check';
import {
  classifySignal,
  createStatusHistoryEntry,
  filterAndSortEntries,
  RateLimiter,
  shouldEmitStatusChange,
  shouldRefreshTokens,
  updateAbsenceCounter,
} from '../../services/health-monitor-service';

// ---------------------------------------------------------------------------
// Arbitraries
// ---------------------------------------------------------------------------

/** Arbitrary for HeartbeatSignalType. */
const arbSignalType: fc.Arbitrary<HeartbeatSignalType> = fc.constantFrom(
  HeartbeatSignalType.PRESENCE,
  HeartbeatSignalType.ABSENCE,
  HeartbeatSignalType.DURESS,
  HeartbeatSignalType.CHECK_FAILED,
  HeartbeatSignalType.INCONCLUSIVE,
);

/** Build a minimal IHeartbeatCheckResult for classification testing. */
function makeCheckResult(overrides: {
  success: boolean;
  eventCount: number;
  duressDetected?: boolean;
  signalType?: HeartbeatSignalType;
  statusCode?: number;
  error?: string;
}): IHeartbeatCheckResult<string> {
  return {
    success: overrides.success,
    checkedAt: new Date(),
    events: [],
    eventCount: overrides.eventCount,
    signalType: overrides.signalType ?? HeartbeatSignalType.INCONCLUSIVE,
    confidence: overrides.success ? 0.8 : 0,
    timeSinceLastActivityMs: null,
    duressDetected: overrides.duressDetected ?? false,
    statusCode: overrides.statusCode,
    error: overrides.error,
  };
}

/** Arbitrary for a failed check result (HTTP error / timeout / auth failure). */
const arbFailedResult: fc.Arbitrary<IHeartbeatCheckResult<string>> = fc
  .record({
    statusCode: fc.oneof(
      fc.constant(undefined),
      fc.integer({ min: 400, max: 599 }),
    ),
    error: fc.oneof(
      fc.constant('Network timeout'),
      fc.constant('Authentication failure'),
      fc.constant('HTTP 500'),
      fc.string({ minLength: 1, maxLength: 50 }),
    ),
    eventCount: fc.nat({ max: 100 }),
  })
  .map(({ statusCode, error, eventCount }) =>
    makeCheckResult({
      success: false,
      eventCount,
      statusCode,
      error,
    }),
  );

/** Arbitrary for a successful check result with no activity. */
const arbSuccessNoActivity: fc.Arbitrary<IHeartbeatCheckResult<string>> = fc
  .record({
    statusCode: fc.constant(200),
  })
  .map(({ statusCode }) =>
    makeCheckResult({
      success: true,
      eventCount: 0,
      statusCode,
    }),
  );

/** Arbitrary for a successful check result with activity. */
const arbSuccessWithActivity: fc.Arbitrary<IHeartbeatCheckResult<string>> = fc
  .record({
    eventCount: fc.integer({ min: 1, max: 1000 }),
    statusCode: fc.constant(200),
  })
  .map(({ eventCount, statusCode }) =>
    makeCheckResult({
      success: true,
      eventCount,
      statusCode,
    }),
  );

// ---------------------------------------------------------------------------
// Property 5: Heartbeat signal classification correctness
// Tag: Feature: canary-provider-system, Property 5: Heartbeat signal classification
// Validates: Requirements 3.1, 3.2, 3.3
// ---------------------------------------------------------------------------

describe('Feature: canary-provider-system, Property 5: Heartbeat signal classification', () => {
  it('HTTP failure → CHECK_FAILED', () => {
    /**
     * **Validates: Requirements 3.1, 3.2, 3.3**
     *
     * For any failed check result, classifySignal returns CHECK_FAILED.
     */
    fc.assert(
      fc.property(arbFailedResult, (result) => {
        return classifySignal(result) === HeartbeatSignalType.CHECK_FAILED;
      }),
      { numRuns: 100 },
    );
  });

  it('success + no activity → ABSENCE', () => {
    /**
     * **Validates: Requirements 3.1, 3.2, 3.3**
     *
     * For any successful check with zero events, classifySignal returns ABSENCE.
     */
    fc.assert(
      fc.property(arbSuccessNoActivity, (result) => {
        return classifySignal(result) === HeartbeatSignalType.ABSENCE;
      }),
      { numRuns: 100 },
    );
  });

  it('success + activity → PRESENCE', () => {
    /**
     * **Validates: Requirements 3.1, 3.2, 3.3**
     *
     * For any successful check with ≥1 events, classifySignal returns PRESENCE.
     */
    fc.assert(
      fc.property(arbSuccessWithActivity, (result) => {
        return classifySignal(result) === HeartbeatSignalType.PRESENCE;
      }),
      { numRuns: 100 },
    );
  });

  it('signal is NEVER ABSENCE when API call failed', () => {
    /**
     * **Validates: Requirements 3.1, 3.2, 3.3**
     *
     * For any check result where success=false, the classified signal
     * is never ABSENCE.
     */
    fc.assert(
      fc.property(arbFailedResult, (result) => {
        return classifySignal(result) !== HeartbeatSignalType.ABSENCE;
      }),
      { numRuns: 100 },
    );
  });
});

// ---------------------------------------------------------------------------
// Property 6: CHECK_FAILED does not increment absence counter
// Tag: Feature: canary-provider-system, Property 6: CHECK_FAILED does not increment absence counter
// Validates: Requirements 3.5
// ---------------------------------------------------------------------------

describe('Feature: canary-provider-system, Property 6: CHECK_FAILED does not increment absence counter', () => {
  it('absence counter only increments on ABSENCE, unchanged on CHECK_FAILED', () => {
    /**
     * **Validates: Requirements 3.5**
     *
     * For any sequence of signal types, the absence counter only increments
     * on ABSENCE and remains unchanged on CHECK_FAILED.
     */
    fc.assert(
      fc.property(
        fc.array(arbSignalType, { minLength: 1, maxLength: 50 }),
        (signals) => {
          let counter = 0;
          for (const signal of signals) {
            const prevCounter = counter;
            counter = updateAbsenceCounter(counter, signal);

            if (signal === HeartbeatSignalType.ABSENCE) {
              // Must increment by exactly 1
              if (counter !== prevCounter + 1) return false;
            } else if (signal === HeartbeatSignalType.CHECK_FAILED) {
              // Must remain unchanged
              if (counter !== prevCounter) return false;
            }
            // PRESENCE/DURESS/INCONCLUSIVE reset to 0 — that's fine
          }
          return true;
        },
      ),
      { numRuns: 100 },
    );
  });
});

// ---------------------------------------------------------------------------
// Property 11: Status change events on signal type transitions
// Tag: Feature: canary-provider-system, Property 11: Status change events on signal type transitions
// Validates: Requirements 6.3
// ---------------------------------------------------------------------------

describe('Feature: canary-provider-system, Property 11: Status change events on signal type transitions', () => {
  it('event emitted iff current signal differs from previous', () => {
    /**
     * **Validates: Requirements 6.3**
     *
     * For any sequence of signal types, a status change event is emitted
     * iff the current signal type differs from the previous one.
     */
    fc.assert(
      fc.property(
        fc.array(arbSignalType, { minLength: 1, maxLength: 50 }),
        (signals) => {
          let previous: HeartbeatSignalType | undefined;
          for (const current of signals) {
            const shouldEmit = shouldEmitStatusChange(previous, current);
            const expectedEmit = previous === undefined || previous !== current;
            if (shouldEmit !== expectedEmit) return false;
            previous = current;
          }
          return true;
        },
      ),
      { numRuns: 100 },
    );
  });
});

// ---------------------------------------------------------------------------
// Property 12: Rate limit compliance
// Tag: Feature: canary-provider-system, Property 12: Rate limit compliance
// Validates: Requirements 6.4
// ---------------------------------------------------------------------------

describe('Feature: canary-provider-system, Property 12: Rate limit compliance', () => {
  it('requests within any sliding window do not exceed maxRequests, and delay between consecutive requests ≥ minDelayMs', () => {
    /**
     * **Validates: Requirements 6.4**
     *
     * For any rate limit config and any sequence of check attempts,
     * the rate limiter ensures compliance.
     */
    fc.assert(
      fc.property(
        // Rate limit config
        fc.record({
          maxRequests: fc.integer({ min: 1, max: 20 }),
          windowMs: fc.integer({ min: 100, max: 10_000 }),
          minDelayMs: fc.integer({ min: 10, max: 1_000 }),
        }),
        // Number of requests to simulate
        fc.integer({ min: 1, max: 50 }),
        (config, requestCount) => {
          const limiter = new RateLimiter(config as IRateLimitConfig);
          const actualTimestamps: number[] = [];
          let currentTime = 1_000_000; // start at some base time

          for (let i = 0; i < requestCount; i++) {
            const delay = limiter.getDelayMs(currentTime);
            currentTime += delay; // wait the required delay
            limiter.recordRequest(currentTime);
            actualTimestamps.push(currentTime);
          }

          // Verify: delay between consecutive requests ≥ minDelayMs
          for (let i = 1; i < actualTimestamps.length; i++) {
            const gap = actualTimestamps[i] - actualTimestamps[i - 1];
            if (gap < config.minDelayMs) return false;
          }

          // Verify: requests within any sliding window of windowMs ≤ maxRequests
          // Window is half-open: [start, start + windowMs)
          for (let i = 0; i < actualTimestamps.length; i++) {
            const windowStart = actualTimestamps[i];
            const windowEnd = windowStart + config.windowMs;
            let count = 0;
            for (let j = i; j < actualTimestamps.length; j++) {
              if (actualTimestamps[j] < windowEnd) {
                count++;
              } else {
                break;
              }
            }
            if (count > config.maxRequests) return false;
          }

          return true;
        },
      ),
      { numRuns: 100 },
    );
  });
});

// ---------------------------------------------------------------------------
// Property 13: Token refresh timing
// Tag: Feature: canary-provider-system, Property 13: Token refresh timing
// Validates: Requirements 6.5
// ---------------------------------------------------------------------------

describe('Feature: canary-provider-system, Property 13: Token refresh timing', () => {
  it('refresh attempted iff expiry - now ≤ 10 min and > 0', () => {
    /**
     * **Validates: Requirements 6.5**
     *
     * For any token expiry time and current time, shouldRefreshTokens
     * returns true iff the remaining time is in (0, 600_000] ms.
     */
    fc.assert(
      fc.property(
        // now as a base timestamp
        fc.integer({ min: 1_000_000, max: 100_000_000 }),
        // offset from now for token expiry (can be negative = expired)
        fc.integer({ min: -1_000_000, max: 2_000_000 }),
        (nowMs, offsetMs) => {
          const now = new Date(nowMs);
          const expiresAt = new Date(nowMs + offsetMs);
          const result = shouldRefreshTokens(expiresAt, now);

          const remainingMs = offsetMs;
          const expected = remainingMs > 0 && remainingMs <= 600_000;

          return result === expected;
        },
      ),
      { numRuns: 100 },
    );
  });

  it('returns false when tokenExpiresAt is undefined', () => {
    /**
     * **Validates: Requirements 6.5**
     */
    fc.assert(
      fc.property(fc.integer({ min: 1_000_000, max: 100_000_000 }), (nowMs) => {
        return shouldRefreshTokens(undefined, new Date(nowMs)) === false;
      }),
      { numRuns: 100 },
    );
  });
});

// ---------------------------------------------------------------------------
// Property 14: Status history entry completeness
// Tag: Feature: canary-provider-system, Property 14: Status history entry completeness
// Validates: Requirements 7.1
// ---------------------------------------------------------------------------

describe('Feature: canary-provider-system, Property 14: Status history entry completeness', () => {
  it('entry contains all required fields for any IHeartbeatCheckResult', () => {
    /**
     * **Validates: Requirements 7.1**
     *
     * For any IHeartbeatCheckResult, the corresponding IStatusHistoryEntry
     * contains: connectionId, timestamp, signalType, eventCount, confidence,
     * timeSinceLastActivityMs, and httpStatusCode when applicable.
     */
    fc.assert(
      fc.property(
        fc.string({ minLength: 1, maxLength: 20 }), // connectionId
        fc.string({ minLength: 1, maxLength: 20 }), // userId
        arbSignalType,
        fc.nat({ max: 1000 }), // eventCount
        fc.double({ min: 0, max: 1, noNaN: true }), // confidence
        fc.oneof(fc.constant(null), fc.integer({ min: 0, max: 1_000_000 })), // timeSinceLastActivityMs
        fc.oneof(fc.constant(undefined), fc.integer({ min: 100, max: 599 })), // statusCode
        fc.oneof(
          fc.constant(undefined),
          fc.string({ minLength: 1, maxLength: 50 }),
        ), // error
        (
          connId,
          userId,
          signalType,
          eventCount,
          confidence,
          timeSince,
          statusCode,
          error,
        ) => {
          const result: IHeartbeatCheckResult<string> = {
            success: signalType !== HeartbeatSignalType.CHECK_FAILED,
            checkedAt: new Date(),
            events: [],
            eventCount,
            signalType,
            confidence,
            timeSinceLastActivityMs: timeSince,
            duressDetected: false,
            statusCode,
            error,
          };

          const entry = createStatusHistoryEntry(
            connId,
            userId,
            result,
            signalType,
          );

          // All required fields must be present and defined
          if (entry.connectionId !== connId) return false;
          if (entry.userId !== userId) return false;
          if (!(entry.timestamp instanceof Date)) return false;
          if (entry.signalType !== signalType) return false;
          if (entry.eventCount !== eventCount) return false;
          if (entry.confidence !== confidence) return false;
          if (entry.timeSinceLastActivityMs !== timeSince) return false;
          // httpStatusCode should match when applicable
          if (statusCode !== undefined && entry.httpStatusCode !== statusCode)
            return false;
          if (!(entry.createdAt instanceof Date)) return false;
          if (!entry.id) return false;

          return true;
        },
      ),
      { numRuns: 100 },
    );
  });
});

// ---------------------------------------------------------------------------
// Property 15: Status history filtering and ordering
// Tag: Feature: canary-provider-system, Property 15: Status history filtering and ordering
// Validates: Requirements 7.2
// ---------------------------------------------------------------------------

describe('Feature: canary-provider-system, Property 15: Status history filtering and ordering', () => {
  /** Arbitrary for a status history entry with a controllable timestamp. */
  const arbEntry: fc.Arbitrary<IStatusHistoryEntry<string>> = fc
    .record({
      id: fc.string({ minLength: 1, maxLength: 10 }),
      connectionId: fc.constant('conn-1'),
      userId: fc.constant('user-1'),
      timestampMs: fc.integer({ min: 1_000_000, max: 100_000_000 }),
      signalType: arbSignalType,
      eventCount: fc.nat({ max: 100 }),
      confidence: fc.double({ min: 0, max: 1, noNaN: true }),
      timeSinceLastActivityMs: fc.oneof(
        fc.constant(null),
        fc.integer({ min: 0, max: 1_000_000 }),
      ),
    })
    .map((r) => ({
      id: r.id,
      connectionId: r.connectionId,
      userId: r.userId,
      timestamp: new Date(r.timestampMs),
      signalType: r.signalType,
      eventCount: r.eventCount,
      confidence: r.confidence,
      timeSinceLastActivityMs: r.timeSinceLastActivityMs,
      createdAt: new Date(r.timestampMs),
    }));

  it('filtered result contains only matching entries sorted chronologically', () => {
    /**
     * **Validates: Requirements 7.2**
     *
     * For any set of entries and any filter (signal type and/or date range),
     * the result contains only matching entries sorted by timestamp ascending.
     */
    fc.assert(
      fc.property(
        fc.array(arbEntry, { minLength: 0, maxLength: 30 }),
        fc.oneof(
          fc.constant(undefined),
          fc.array(arbSignalType, { minLength: 1, maxLength: 3 }),
        ),
        fc.oneof(
          fc.constant(undefined),
          fc.integer({ min: 1_000_000, max: 50_000_000 }),
        ),
        fc.oneof(
          fc.constant(undefined),
          fc.integer({ min: 50_000_000, max: 100_000_000 }),
        ),
        (entries, signalTypes, sinceMs, untilMs) => {
          const options: IStatusHistoryQueryOptions = {};
          if (signalTypes) options.signalTypes = signalTypes;
          if (sinceMs !== undefined) options.since = new Date(sinceMs);
          if (untilMs !== undefined) options.until = new Date(untilMs);

          const result = filterAndSortEntries(entries, options);

          // All entries in result must match the filter
          for (const entry of result) {
            if (
              signalTypes &&
              signalTypes.length > 0 &&
              !signalTypes.includes(entry.signalType)
            ) {
              return false;
            }
            if (sinceMs !== undefined && entry.timestamp.getTime() < sinceMs) {
              return false;
            }
            if (untilMs !== undefined && entry.timestamp.getTime() > untilMs) {
              return false;
            }
          }

          // Result must be sorted chronologically (ascending)
          for (let i = 1; i < result.length; i++) {
            if (
              result[i].timestamp.getTime() < result[i - 1].timestamp.getTime()
            ) {
              return false;
            }
          }

          // No matching entries should be missing from the result
          const resultSet = new Set(result);
          for (const entry of entries) {
            const matchesSignal =
              !signalTypes ||
              signalTypes.length === 0 ||
              signalTypes.includes(entry.signalType);
            const matchesSince =
              sinceMs === undefined || entry.timestamp.getTime() >= sinceMs;
            const matchesUntil =
              untilMs === undefined || entry.timestamp.getTime() <= untilMs;
            if (matchesSignal && matchesSince && matchesUntil) {
              if (!resultSet.has(entry)) return false;
            }
          }

          return true;
        },
      ),
      { numRuns: 100 },
    );
  });
});
