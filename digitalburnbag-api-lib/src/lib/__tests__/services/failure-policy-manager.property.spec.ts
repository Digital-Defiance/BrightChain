/**
 * Property-based tests for FailurePolicyManager.
 *
 * Feature: canary-provider-system
 */
import type {
  FailurePolicyAction,
  IProviderConnectionExtended,
} from '@brightchain/digitalburnbag-lib';
import * as fc from 'fast-check';
import {
  FailurePolicyManager,
  isValidFailurePolicyAction,
  resetOnSuccess,
} from '../../services/failure-policy-manager';

// ---------------------------------------------------------------------------
// Helpers / Arbitraries
// ---------------------------------------------------------------------------

const validActions: FailurePolicyAction[] = [
  'pause_and_notify',
  'notify_only',
  'trigger_protocol',
  'ignore',
];

/** Arbitrary that produces a valid FailurePolicyAction. */
const arbFailurePolicyAction: fc.Arbitrary<FailurePolicyAction> =
  fc.constantFrom(...validActions);

/** Arbitrary that produces a minimal IProviderConnectionExtended. */
function arbConnection(overrides?: {
  threshold?: number;
  action?: FailurePolicyAction;
  consecutiveFailures?: number;
  status?: IProviderConnectionExtended['status'];
}): fc.Arbitrary<IProviderConnectionExtended<string>> {
  return fc
    .record({
      threshold:
        overrides?.threshold !== undefined
          ? fc.constant(overrides.threshold)
          : fc.integer({ min: 1, max: 100 }),
      action:
        overrides?.action !== undefined
          ? fc.constant(overrides.action)
          : arbFailurePolicyAction,
      consecutiveFailures:
        overrides?.consecutiveFailures !== undefined
          ? fc.constant(overrides.consecutiveFailures)
          : fc.integer({ min: 0, max: 200 }),
      status:
        overrides?.status !== undefined
          ? fc.constant(overrides.status)
          : fc.constantFrom(
              'connected' as const,
              'expired' as const,
              'error' as const,
              'paused' as const,
              'pending' as const,
            ),
    })
    .map(({ threshold, action, consecutiveFailures, status }) => ({
      id: 'conn-1',
      userId: 'user-1',
      providerId: 'provider-1',
      status,
      isEnabled: true,
      consecutiveFailures,
      failurePolicyConfig: {
        failureThreshold: threshold,
        failurePolicy: action,
      },
      isPaused: false,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    }));
}

// ---------------------------------------------------------------------------
// Property 7: Failure policy validation accepts only valid values
// Tag: Feature: canary-provider-system, Property 7: Failure policy validation
// Validates: Requirements 4.2
// ---------------------------------------------------------------------------

describe('Feature: canary-provider-system, Property 7: Failure policy validation', () => {
  it('accepts exactly the four valid FailurePolicyAction values', () => {
    /**
     * **Validates: Requirements 4.2**
     *
     * For any string, the validator accepts it iff it is one of the four
     * valid FailurePolicyAction values.
     */
    fc.assert(
      fc.property(fc.string(), (value: string) => {
        const isValid = isValidFailurePolicyAction(value);
        const expected = validActions.includes(value as FailurePolicyAction);
        return isValid === expected;
      }),
      { numRuns: 100 },
    );
  });

  it('always accepts each of the four valid actions', () => {
    /**
     * **Validates: Requirements 4.2**
     */
    fc.assert(
      fc.property(arbFailurePolicyAction, (action) => {
        return isValidFailurePolicyAction(action) === true;
      }),
      { numRuns: 100 },
    );
  });
});

// ---------------------------------------------------------------------------
// Property 8: Failure threshold triggers policy at exact count
// Tag: Feature: canary-provider-system, Property 8: Failure threshold triggers at exact count
// Validates: Requirements 4.3
// ---------------------------------------------------------------------------

describe('Feature: canary-provider-system, Property 8: Failure threshold triggers at exact count', () => {
  const manager = new FailurePolicyManager();

  it('does not escalate when failures < threshold, escalates when failures = threshold', async () => {
    /**
     * **Validates: Requirements 4.3**
     *
     * For any threshold N (1–100), evaluateFailure does not escalate when
     * consecutive failures < N, and escalates when failures = N.
     */
    await fc.assert(
      fc.asyncProperty(
        fc.integer({ min: 1, max: 100 }),
        arbFailurePolicyAction,
        async (threshold, action) => {
          const connection: IProviderConnectionExtended<string> = {
            id: 'conn-1',
            userId: 'user-1',
            providerId: 'provider-1',
            status: 'connected',
            isEnabled: true,
            consecutiveFailures: 0,
            failurePolicyConfig: {
              failureThreshold: threshold,
              failurePolicy: action,
            },
            isPaused: false,
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
          };

          // Below threshold: should NOT escalate
          for (let i = 0; i < threshold; i++) {
            const belowResult = await manager.evaluateFailure(connection, i);
            if (belowResult.shouldEscalate) {
              return false; // Failure: escalated too early
            }
          }

          // At threshold: SHOULD escalate
          const atResult = await manager.evaluateFailure(connection, threshold);
          if (!atResult.shouldEscalate) {
            return false; // Failure: did not escalate at threshold
          }
          if (atResult.action !== action) {
            return false; // Failure: wrong action returned
          }

          return true;
        },
      ),
      { numRuns: 100 },
    );
  });
});

// ---------------------------------------------------------------------------
// Property 9: Successful check resets failure counter
// Tag: Feature: canary-provider-system, Property 9: Successful check resets failure counter
// Validates: Requirements 4.4
// ---------------------------------------------------------------------------

describe('Feature: canary-provider-system, Property 9: Successful check resets failure counter', () => {
  it('resets consecutiveFailures to 0 and status to "connected" for any connection with K>=1 failures', () => {
    /**
     * **Validates: Requirements 4.4**
     *
     * For any connection with K≥1 consecutive failures, a PRESENCE or
     * ABSENCE result resets counter to 0 and status to "connected".
     */
    fc.assert(
      fc.property(
        fc.integer({ min: 1, max: 1000 }),
        fc.constantFrom(
          'connected' as const,
          'expired' as const,
          'error' as const,
          'paused' as const,
          'pending' as const,
        ),
        arbFailurePolicyAction,
        (failures, status, action) => {
          const connection: IProviderConnectionExtended<string> = {
            id: 'conn-1',
            userId: 'user-1',
            providerId: 'provider-1',
            status,
            isEnabled: true,
            consecutiveFailures: failures,
            failurePolicyConfig: {
              failureThreshold: 5,
              failurePolicy: action,
            },
            isPaused: false,
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
          };

          const result = resetOnSuccess(connection);

          return (
            result.consecutiveFailures === 0 && result.status === 'connected'
          );
        },
      ),
      { numRuns: 100 },
    );
  });
});
