/**
 * Property-based tests for CanaryLeftMenu pure functions.
 *
 * Feature: canary-provider-expansion
 *
 * Property 23: Overall system health classification
 *
 * Validates: Requirements 14.7
 */

import * as fc from 'fast-check';
import { classifySystemHealth, getAttentionNeededCount } from '../../components/CanaryLeftMenu';
import type { IApiProviderConnectionDTO } from '../../services/burnbag-api-client';

// ---------------------------------------------------------------------------
// Arbitraries
// ---------------------------------------------------------------------------

/** Statuses that are considered "needing attention" by the implementation. */
const ATTENTION_STATUSES = ['error', 'expired', 'paused', 'check_failed', 'absence'] as const;

/** Statuses that are considered healthy (not needing attention). */
const HEALTHY_STATUSES = ['active', 'connected', 'presence', 'ok', 'valid'] as const;

/** lastCheckResult values that need attention. */
const ATTENTION_CHECK_RESULTS = ['error', 'absence'] as const;

/** lastCheckResult values that are healthy. */
const HEALTHY_CHECK_RESULTS = ['presence', 'duress', undefined] as const;

/**
 * Generate a connection that does NOT need attention:
 * - status is NOT in ATTENTION_STATUSES
 * - lastCheckResult is NOT in ATTENTION_STATUSES
 */
const healthyConnectionArb: fc.Arbitrary<IApiProviderConnectionDTO> = fc.record({
  id: fc.uuid(),
  userId: fc.uuid(),
  providerId: fc.string({ minLength: 1, maxLength: 20 }),
  status: fc.constantFrom(...HEALTHY_STATUSES),
  lastCheckResult: fc.constantFrom('presence', 'duress', undefined) as fc.Arbitrary<'presence' | 'absence' | 'duress' | 'error' | undefined>,
  isEnabled: fc.boolean(),
  createdAt: fc.constant('2024-01-01T00:00:00Z'),
  updatedAt: fc.constant('2024-01-01T00:00:00Z'),
});

/**
 * Generate a connection that DOES need attention:
 * - status is in ATTENTION_STATUSES OR lastCheckResult is in ATTENTION_STATUSES
 */
const attentionConnectionArb: fc.Arbitrary<IApiProviderConnectionDTO> = fc.oneof(
  // Case 1: status needs attention (regardless of lastCheckResult)
  fc.record({
    id: fc.uuid(),
    userId: fc.uuid(),
    providerId: fc.string({ minLength: 1, maxLength: 20 }),
    status: fc.constantFrom(...ATTENTION_STATUSES),
    lastCheckResult: fc.constantFrom('presence', 'absence', 'duress', 'error', undefined) as fc.Arbitrary<'presence' | 'absence' | 'duress' | 'error' | undefined>,
    isEnabled: fc.boolean(),
    createdAt: fc.constant('2024-01-01T00:00:00Z'),
    updatedAt: fc.constant('2024-01-01T00:00:00Z'),
  }),
  // Case 2: lastCheckResult needs attention (status is healthy)
  fc.record({
    id: fc.uuid(),
    userId: fc.uuid(),
    providerId: fc.string({ minLength: 1, maxLength: 20 }),
    status: fc.constantFrom(...HEALTHY_STATUSES),
    lastCheckResult: fc.constantFrom(...ATTENTION_CHECK_RESULTS) as fc.Arbitrary<'presence' | 'absence' | 'duress' | 'error' | undefined>,
    isEnabled: fc.boolean(),
    createdAt: fc.constant('2024-01-01T00:00:00Z'),
    updatedAt: fc.constant('2024-01-01T00:00:00Z'),
  }),
);

// ---------------------------------------------------------------------------
// Property 23: Overall system health classification
// ---------------------------------------------------------------------------

describe('Feature: canary-provider-expansion, Property 23: Overall system health classification', () => {
  /**
   * **Validates: Requirements 14.7**
   *
   * "healthy" if all providers show PRESENCE or the set is empty.
   */
  it('returns "healthy" for an empty connections array', () => {
    expect(classifySystemHealth([])).toBe('healthy');
  });

  it('returns "healthy" when all providers are healthy (none need attention)', () => {
    fc.assert(
      fc.property(
        fc.array(healthyConnectionArb, { minLength: 1, maxLength: 30 }),
        (connections) => {
          const result = classifySystemHealth(connections);
          expect(result).toBe('healthy');
        },
      ),
      { numRuns: 100 },
    );
  });

  /**
   * **Validates: Requirements 14.7**
   *
   * "critical" if all providers have status CHECK_FAILED or ABSENCE and total > 0.
   */
  it('returns "critical" when ALL providers need attention and total > 0', () => {
    fc.assert(
      fc.property(
        fc.array(attentionConnectionArb, { minLength: 1, maxLength: 30 }),
        (connections) => {
          const result = classifySystemHealth(connections);
          expect(result).toBe('critical');
        },
      ),
      { numRuns: 100 },
    );
  });

  /**
   * **Validates: Requirements 14.7**
   *
   * "degraded" if any provider has CHECK_FAILED or ABSENCE but not all.
   */
  it('returns "degraded" when some but not all providers need attention', () => {
    fc.assert(
      fc.property(
        fc.array(healthyConnectionArb, { minLength: 1, maxLength: 15 }),
        fc.array(attentionConnectionArb, { minLength: 1, maxLength: 15 }),
        (healthyConns, attentionConns) => {
          // Mix healthy and attention-needing connections
          const connections = [...healthyConns, ...attentionConns];
          const result = classifySystemHealth(connections);
          expect(result).toBe('degraded');
        },
      ),
      { numRuns: 100 },
    );
  });

  /**
   * **Validates: Requirements 14.7**
   *
   * The classification is exhaustive: result is always one of 'healthy', 'degraded', 'critical'.
   */
  it('always returns one of "healthy", "degraded", or "critical" for any input', () => {
    const anyConnectionArb = fc.oneof(healthyConnectionArb, attentionConnectionArb);

    fc.assert(
      fc.property(
        fc.array(anyConnectionArb, { minLength: 0, maxLength: 30 }),
        (connections) => {
          const result = classifySystemHealth(connections);
          expect(['healthy', 'degraded', 'critical']).toContain(result);
        },
      ),
      { numRuns: 100 },
    );
  });

  /**
   * **Validates: Requirements 14.7**
   *
   * Classification is deterministic: same input always produces same output.
   */
  it('is deterministic — same connections always produce the same health classification', () => {
    const anyConnectionArb = fc.oneof(healthyConnectionArb, attentionConnectionArb);

    fc.assert(
      fc.property(
        fc.array(anyConnectionArb, { minLength: 0, maxLength: 30 }),
        (connections) => {
          const result1 = classifySystemHealth(connections);
          const result2 = classifySystemHealth(connections);
          expect(result1).toBe(result2);
        },
      ),
      { numRuns: 100 },
    );
  });
});

// ---------------------------------------------------------------------------
// Property 24: Attention-needed badge count accuracy
// ---------------------------------------------------------------------------

describe('Feature: canary-provider-expansion, Property 24: Attention-needed badge count accuracy', () => {
  /**
   * **Validates: Requirements 14.6**
   *
   * Warning badge count equals number of providers with CHECK_FAILED, ABSENCE,
   * "error", "expired", or "paused" status.
   */

  it('returns 0 for an empty connections array', () => {
    expect(getAttentionNeededCount([])).toBe(0);
  });

  it('returns 0 when all providers are healthy (no attention-needing statuses)', () => {
    fc.assert(
      fc.property(
        fc.array(healthyConnectionArb, { minLength: 1, maxLength: 30 }),
        (connections) => {
          const count = getAttentionNeededCount(connections);
          expect(count).toBe(0);
        },
      ),
      { numRuns: 100 },
    );
  });

  it('returns the total count when ALL providers need attention', () => {
    fc.assert(
      fc.property(
        fc.array(attentionConnectionArb, { minLength: 1, maxLength: 30 }),
        (connections) => {
          const count = getAttentionNeededCount(connections);
          expect(count).toBe(connections.length);
        },
      ),
      { numRuns: 100 },
    );
  });

  it('badge count equals the exact number of providers with attention-needing status or lastCheckResult', () => {
    const anyConnectionArb = fc.oneof(healthyConnectionArb, attentionConnectionArb);

    fc.assert(
      fc.property(
        fc.array(anyConnectionArb, { minLength: 0, maxLength: 30 }),
        (connections) => {
          const attentionStatuses = new Set(['error', 'expired', 'paused', 'check_failed', 'absence']);
          const expectedCount = connections.filter(
            (c) => attentionStatuses.has(c.status) || attentionStatuses.has(c.lastCheckResult ?? ''),
          ).length;
          const actualCount = getAttentionNeededCount(connections);
          expect(actualCount).toBe(expectedCount);
        },
      ),
      { numRuns: 100 },
    );
  });

  it('badge count is always between 0 and connections.length (inclusive)', () => {
    const anyConnectionArb = fc.oneof(healthyConnectionArb, attentionConnectionArb);

    fc.assert(
      fc.property(
        fc.array(anyConnectionArb, { minLength: 0, maxLength: 30 }),
        (connections) => {
          const count = getAttentionNeededCount(connections);
          expect(count).toBeGreaterThanOrEqual(0);
          expect(count).toBeLessThanOrEqual(connections.length);
        },
      ),
      { numRuns: 100 },
    );
  });

  it('adding a provider with attention-needing status increases count by exactly 1', () => {
    const anyConnectionArb = fc.oneof(healthyConnectionArb, attentionConnectionArb);

    fc.assert(
      fc.property(
        fc.array(anyConnectionArb, { minLength: 0, maxLength: 29 }),
        attentionConnectionArb,
        (connections, newAttentionConn) => {
          const countBefore = getAttentionNeededCount(connections);
          const countAfter = getAttentionNeededCount([...connections, newAttentionConn]);
          expect(countAfter).toBe(countBefore + 1);
        },
      ),
      { numRuns: 100 },
    );
  });

  it('adding a healthy provider does not change the attention count', () => {
    const anyConnectionArb = fc.oneof(healthyConnectionArb, attentionConnectionArb);

    fc.assert(
      fc.property(
        fc.array(anyConnectionArb, { minLength: 0, maxLength: 29 }),
        healthyConnectionArb,
        (connections, newHealthyConn) => {
          const countBefore = getAttentionNeededCount(connections);
          const countAfter = getAttentionNeededCount([...connections, newHealthyConn]);
          expect(countAfter).toBe(countBefore);
        },
      ),
      { numRuns: 100 },
    );
  });
});
