/**
 * Property-based tests for CanaryContextMenu pure functions.
 *
 * Feature: canary-provider-expansion
 *
 * Property 21: Context menu binding count badge accuracy
 *
 * Validates: Requirements 13.5, 13.6
 */

import * as fc from 'fast-check';
import {
  getBindingCountBadge,
  ICanaryBinding,
} from '../../components/CanaryContextMenu';

// ---------------------------------------------------------------------------
// Arbitraries
// ---------------------------------------------------------------------------

const conditionArb = fc.constantFrom('ABSENCE' as const, 'DURESS' as const);

const actionArb = fc.constantFrom('notify', 'destroy', 'release', 'lock');

/** Arbitrary for a single canary binding. */
const canaryBindingArb: fc.Arbitrary<ICanaryBinding> = fc.record({
  id: fc.uuid(),
  providerId: fc.string({ minLength: 1, maxLength: 30 }),
  providerDisplayName: fc.string({ minLength: 1, maxLength: 50 }),
  condition: conditionArb,
  action: actionArb,
  absenceThresholdHours: fc.integer({ min: 1, max: 168 }),
});

// ---------------------------------------------------------------------------
// Property 21: Context menu binding count badge accuracy
// ---------------------------------------------------------------------------

describe('Feature: canary-provider-expansion, Property 21: Context menu binding count badge accuracy', () => {
  /**
   * **Validates: Requirements 13.5, 13.6**
   *
   * For any target with N bindings (N ≥ 0), the count badge displays exactly N.
   */
  it('returns exactly N for any target with N bindings', () => {
    fc.assert(
      fc.property(
        fc.array(canaryBindingArb, { minLength: 0, maxLength: 50 }),
        (bindings) => {
          const badgeCount = getBindingCountBadge(bindings);
          expect(badgeCount).toBe(bindings.length);
        },
      ),
      { numRuns: 100 },
    );
  });

  it('returns 0 when no bindings are attached', () => {
    const badgeCount = getBindingCountBadge([]);
    expect(badgeCount).toBe(0);
  });

  it('badge count equals the exact number of bindings regardless of binding content', () => {
    fc.assert(
      fc.property(
        fc.integer({ min: 0, max: 100 }),
        (n) => {
          // Generate exactly N bindings
          const bindings: ICanaryBinding[] = Array.from({ length: n }, (_, i) => ({
            id: `binding-${i}`,
            providerId: `provider-${i}`,
            providerDisplayName: `Provider ${i}`,
            condition: i % 2 === 0 ? 'ABSENCE' : 'DURESS',
            action: 'notify',
            absenceThresholdHours: 24,
          }));
          const badgeCount = getBindingCountBadge(bindings);
          expect(badgeCount).toBe(n);
        },
      ),
      { numRuns: 100 },
    );
  });

  it('badge count is always non-negative', () => {
    fc.assert(
      fc.property(
        fc.array(canaryBindingArb, { minLength: 0, maxLength: 50 }),
        (bindings) => {
          const badgeCount = getBindingCountBadge(bindings);
          expect(badgeCount).toBeGreaterThanOrEqual(0);
        },
      ),
      { numRuns: 100 },
    );
  });

  it('badge count is an integer for any binding array', () => {
    fc.assert(
      fc.property(
        fc.array(canaryBindingArb, { minLength: 0, maxLength: 50 }),
        (bindings) => {
          const badgeCount = getBindingCountBadge(bindings);
          expect(Number.isInteger(badgeCount)).toBe(true);
        },
      ),
      { numRuns: 100 },
    );
  });
});
