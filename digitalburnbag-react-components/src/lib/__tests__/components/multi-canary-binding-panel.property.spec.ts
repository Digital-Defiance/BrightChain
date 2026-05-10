/**
 * Property-based tests for MultiCanaryBindingPanel pure functions.
 *
 * Feature: canary-provider-expansion
 *
 * Property 20: Multi-canary binding display completeness
 *
 * Validates: Requirements 9.6, 14.4
 */

import * as fc from 'fast-check';
import {
  getBindingDisplayInfo,
  IBindingDisplayInfo,
  IMultiCanaryBinding,
  IMultiCanaryTarget,
  RedundancyPolicy,
} from '../../components/MultiCanaryBindingPanel';
import { IApiProviderConnectionDTO } from '../../services/burnbag-api-client';

// ---------------------------------------------------------------------------
// Arbitraries
// ---------------------------------------------------------------------------

const redundancyPolicyArb: fc.Arbitrary<RedundancyPolicy> = fc.constantFrom(
  'all_must_fail',
  'majority_must_fail',
  'any_fails',
  'weighted_consensus',
);

const aggregateStatusArb = fc.constantFrom(
  'all_present',
  'partial_absence',
  'threshold_met',
  'triggered',
  'check_failed',
);

const signalArb = fc.constantFrom('presence', 'absence', 'check_failed', 'duress', 'unknown');

const conditionArb = fc.constantFrom('ABSENCE' as const, 'DURESS' as const);

const targetTypeArb = fc.constantFrom('vault' as const, 'file' as const, 'folder' as const);

const validDateStringArb = fc
  .integer({ min: 946684800000, max: 1893456000000 })
  .map((ts) => new Date(ts).toISOString());

/** Arbitrary for a multi-canary target. */
const targetArb: fc.Arbitrary<IMultiCanaryTarget> = fc.record({
  id: fc.uuid(),
  name: fc.string({ minLength: 1, maxLength: 50 }),
  type: targetTypeArb,
});

/** Arbitrary for a provider connection DTO. */
const connectionArb: fc.Arbitrary<IApiProviderConnectionDTO> = fc.record({
  id: fc.uuid(),
  userId: fc.uuid(),
  providerId: fc.string({ minLength: 1, maxLength: 20 }),
  status: fc.constantFrom('connected', 'expired', 'error', 'paused', 'pending'),
  providerUserId: fc.option(fc.string({ minLength: 1 }), { nil: undefined }),
  providerUsername: fc.option(fc.string({ minLength: 1, maxLength: 30 }), { nil: undefined }),
  providerDisplayName: fc.option(fc.string({ minLength: 1, maxLength: 40 }), { nil: undefined }),
  providerAvatarUrl: fc.option(fc.webUrl(), { nil: undefined }),
  connectedAt: fc.option(validDateStringArb, { nil: undefined }),
  lastValidatedAt: fc.option(validDateStringArb, { nil: undefined }),
  lastCheckedAt: fc.option(validDateStringArb, { nil: undefined }),
  lastCheckResult: fc.option(
    fc.constantFrom('presence' as const, 'absence' as const, 'duress' as const, 'error' as const),
    { nil: undefined },
  ),
  errorMessage: fc.option(fc.string(), { nil: undefined }),
  tokenExpiresAt: fc.option(validDateStringArb, { nil: undefined }),
  isEnabled: fc.boolean(),
  checkIntervalMs: fc.option(fc.nat({ max: 86400000 }), { nil: undefined }),
  createdAt: validDateStringArb,
  updatedAt: validDateStringArb,
});

/**
 * Generate a binding with matching connections and targets.
 * Ensures providerConnectionIds reference actual connection IDs and
 * providerSignals map to those same IDs.
 */
function bindingWithContextArb(): fc.Arbitrary<{
  binding: IMultiCanaryBinding;
  connections: IApiProviderConnectionDTO[];
  targets: IMultiCanaryTarget[];
  boundTargetIds: string[];
}> {
  return fc
    .tuple(
      fc.array(connectionArb, { minLength: 2, maxLength: 10 }),
      fc.array(targetArb, { minLength: 1, maxLength: 5 }),
      redundancyPolicyArb,
      aggregateStatusArb,
      conditionArb,
      fc.string({ minLength: 1, maxLength: 40 }),
    )
    .chain(([connections, targets, policy, status, condition, name]) => {
      const connIds = connections.map((c) => c.id);
      const targetIds = targets.map((t) => t.id);

      // Generate per-provider signals for each connection
      const signalsArb = fc.record(
        Object.fromEntries(connIds.map((id) => [id, signalArb])) as Record<
          string,
          fc.Arbitrary<string>
        >,
      );

      // Select a subset of target IDs to bind
      const boundTargetIdsArb = fc
        .shuffledSubarray(targetIds, { minLength: 1, maxLength: targetIds.length })
        .map((ids) => ids as string[]);

      return fc.tuple(signalsArb, boundTargetIdsArb).map(([signals, boundIds]) => {
        const binding: IMultiCanaryBinding = {
          id: `binding-${name}`,
          name,
          providerConnectionIds: connIds,
          redundancyPolicy: policy,
          protocolAction: 'notify',
          canaryCondition: condition,
          absenceThresholdHours: 24,
          aggregateStatus: status,
          providerSignals: signals,
        };

        return {
          binding,
          connections,
          targets,
          boundTargetIds: boundIds,
        };
      });
    });
}

// ---------------------------------------------------------------------------
// Property 20: Multi-canary binding display completeness
// ---------------------------------------------------------------------------

describe('Feature: canary-provider-expansion, Property 20: Multi-canary binding display completeness', () => {
  /**
   * **Validates: Requirements 9.6, 14.4**
   *
   * For any binding, rendered display includes: target names (not IDs),
   * bound provider count, aggregate status, per-provider signal indicators.
   */
  it('display info includes target names (not IDs) for all bound targets', () => {
    fc.assert(
      fc.property(bindingWithContextArb(), ({ binding, connections, targets, boundTargetIds }) => {
        const info: IBindingDisplayInfo = getBindingDisplayInfo(
          binding,
          connections,
          targets,
          boundTargetIds,
        );

        // All returned target names should be actual names from the targets list
        const allTargetNames = targets.map((t) => t.name);
        for (const name of info.targetNames) {
          expect(allTargetNames).toContain(name);
        }

        // No IDs should appear in target names — names come from target objects
        const allTargetIds = targets.map((t) => t.id);
        for (const name of info.targetNames) {
          // A target name should not be a raw UUID (unless the user named it that way,
          // but we verify it was resolved from the targets array)
          const matchingTarget = targets.find((t) => t.name === name);
          expect(matchingTarget).toBeDefined();
        }

        // Every bound target ID that exists in the targets array should have its name resolved
        const expectedNames = boundTargetIds
          .map((id) => targets.find((t) => t.id === id)?.name)
          .filter((n): n is string => n !== undefined);
        expect(info.targetNames).toEqual(expectedNames);
      }),
      { numRuns: 100 },
    );
  });

  it('display info includes correct bound provider count', () => {
    fc.assert(
      fc.property(bindingWithContextArb(), ({ binding, connections, targets, boundTargetIds }) => {
        const info: IBindingDisplayInfo = getBindingDisplayInfo(
          binding,
          connections,
          targets,
          boundTargetIds,
        );

        // Provider count must equal the number of provider connection IDs in the binding
        expect(info.providerCount).toBe(binding.providerConnectionIds.length);
      }),
      { numRuns: 100 },
    );
  });

  it('display info includes aggregate status', () => {
    fc.assert(
      fc.property(bindingWithContextArb(), ({ binding, connections, targets, boundTargetIds }) => {
        const info: IBindingDisplayInfo = getBindingDisplayInfo(
          binding,
          connections,
          targets,
          boundTargetIds,
        );

        // Aggregate status must be present and match the binding's aggregate status
        expect(info.aggregateStatus).toBeDefined();
        expect(typeof info.aggregateStatus).toBe('string');
        expect(info.aggregateStatus.length).toBeGreaterThan(0);
        expect(info.aggregateStatus).toBe(binding.aggregateStatus);
      }),
      { numRuns: 100 },
    );
  });

  it('display info includes per-provider signal indicators for every bound provider', () => {
    fc.assert(
      fc.property(bindingWithContextArb(), ({ binding, connections, targets, boundTargetIds }) => {
        const info: IBindingDisplayInfo = getBindingDisplayInfo(
          binding,
          connections,
          targets,
          boundTargetIds,
        );

        // Must have one signal indicator per provider in the binding
        expect(info.perProviderSignals.length).toBe(binding.providerConnectionIds.length);

        // Each signal indicator must have a name (not an ID) and a signal value
        for (const indicator of info.perProviderSignals) {
          expect(indicator.name).toBeDefined();
          expect(typeof indicator.name).toBe('string');
          expect(indicator.name.length).toBeGreaterThan(0);
          expect(indicator.signal).toBeDefined();
          expect(typeof indicator.signal).toBe('string');
        }
      }),
      { numRuns: 100 },
    );
  });

  it('per-provider signal names resolve to display names (not raw connection IDs) when available', () => {
    fc.assert(
      fc.property(bindingWithContextArb(), ({ binding, connections, targets, boundTargetIds }) => {
        const info: IBindingDisplayInfo = getBindingDisplayInfo(
          binding,
          connections,
          targets,
          boundTargetIds,
        );

        // For each provider signal indicator, verify name resolution
        for (let i = 0; i < info.perProviderSignals.length; i++) {
          const connId = binding.providerConnectionIds[i];
          const conn = connections.find((c) => c.id === connId);
          const indicator = info.perProviderSignals[i];

          if (conn) {
            // Name should be resolved from connection display info, not the raw ID
            const expectedName =
              conn.providerDisplayName ?? conn.providerUsername ?? conn.providerId ?? connId;
            expect(indicator.name).toBe(expectedName);
          }
        }
      }),
      { numRuns: 100 },
    );
  });

  it('per-provider signals match the binding providerSignals map', () => {
    fc.assert(
      fc.property(bindingWithContextArb(), ({ binding, connections, targets, boundTargetIds }) => {
        const info: IBindingDisplayInfo = getBindingDisplayInfo(
          binding,
          connections,
          targets,
          boundTargetIds,
        );

        // Each signal value should match what's in the binding's providerSignals
        for (let i = 0; i < info.perProviderSignals.length; i++) {
          const connId = binding.providerConnectionIds[i];
          const expectedSignal = binding.providerSignals?.[connId] ?? 'unknown';
          expect(info.perProviderSignals[i].signal).toBe(expectedSignal);
        }
      }),
      { numRuns: 100 },
    );
  });

  it('display info with no bound target IDs returns empty target names', () => {
    fc.assert(
      fc.property(bindingWithContextArb(), ({ binding, connections, targets }) => {
        // Call without boundTargetIds
        const info: IBindingDisplayInfo = getBindingDisplayInfo(binding, connections, targets);

        // Should return empty target names when no IDs provided
        expect(info.targetNames).toEqual([]);
        // But other fields should still be populated
        expect(info.providerCount).toBe(binding.providerConnectionIds.length);
        expect(info.aggregateStatus).toBe(binding.aggregateStatus);
        expect(info.perProviderSignals.length).toBe(binding.providerConnectionIds.length);
      }),
      { numRuns: 100 },
    );
  });

  it('display info with undefined aggregate status returns "unknown"', () => {
    fc.assert(
      fc.property(
        fc.array(connectionArb, { minLength: 2, maxLength: 5 }),
        fc.array(targetArb, { minLength: 1, maxLength: 3 }),
        (connections, targets) => {
          const connIds = connections.map((c) => c.id);
          const binding: IMultiCanaryBinding = {
            id: 'test-binding',
            name: 'Test',
            providerConnectionIds: connIds,
            redundancyPolicy: 'all_must_fail',
            protocolAction: 'notify',
            canaryCondition: 'ABSENCE',
            absenceThresholdHours: 24,
            // aggregateStatus intentionally omitted (undefined)
          };

          const info = getBindingDisplayInfo(binding, connections, targets, []);
          expect(info.aggregateStatus).toBe('unknown');
        },
      ),
      { numRuns: 100 },
    );
  });
});
