/**
 * @fileoverview Property-based tests for OutboundDeliveryStatus state transitions
 *
 * **Feature: email-gateway**
 *
 * This test suite verifies:
 * - Property 1: OutboundDeliveryStatus valid transitions
 *
 * **Validates: Requirements 3.1, 3.4, 3.5**
 */

import fc from 'fast-check';
import {
  OUTBOUND_VALID_TRANSITIONS,
  OutboundDeliveryStatus,
  validateOutboundTransition,
} from './outboundDeliveryStatus';

/**
 * All OutboundDeliveryStatus enum values
 */
const allStatuses = Object.values(OutboundDeliveryStatus);

/**
 * Arbitrary that generates any OutboundDeliveryStatus value
 */
const arbStatus = fc.constantFrom(...allStatuses);

/**
 * Terminal states: states with no valid outgoing transitions
 */
const terminalStatuses = [
  OutboundDeliveryStatus.Delivered,
  OutboundDeliveryStatus.PermanentFailure,
  OutboundDeliveryStatus.Expired,
];

/**
 * Build an array of all valid (from, to) transition pairs
 */
const validTransitionPairs: [OutboundDeliveryStatus, OutboundDeliveryStatus][] =
  [];
for (const from of allStatuses) {
  for (const to of OUTBOUND_VALID_TRANSITIONS[from]) {
    validTransitionPairs.push([from, to]);
  }
}

/**
 * Build an array of all invalid (from, to) transition pairs
 */
const invalidTransitionPairs: [
  OutboundDeliveryStatus,
  OutboundDeliveryStatus,
][] = [];
for (const from of allStatuses) {
  const validTargets = OUTBOUND_VALID_TRANSITIONS[from];
  for (const to of allStatuses) {
    if (!validTargets.includes(to)) {
      invalidTransitionPairs.push([from, to]);
    }
  }
}

describe('OutboundDeliveryStatus State Transition Property Tests', () => {
  describe('Property 1: OutboundDeliveryStatus valid transitions', () => {
    /**
     * **Feature: email-gateway, Property 1: OutboundDeliveryStatus valid transitions**
     *
     * *For any* valid transition pair (from → to where to is in OUTBOUND_VALID_TRANSITIONS[from]),
     * validateOutboundTransition returns true.
     *
     * **Validates: Requirements 3.1, 3.4, 3.5**
     */
    it('should return true for all valid transitions', () => {
      fc.assert(
        fc.property(fc.constantFrom(...validTransitionPairs), ([from, to]) => {
          expect(validateOutboundTransition(from, to)).toBe(true);
        }),
        { numRuns: 100 },
      );
    });

    /**
     * *For any* invalid transition pair (from → to where to is NOT in OUTBOUND_VALID_TRANSITIONS[from]),
     * validateOutboundTransition returns false.
     *
     * **Validates: Requirements 3.1, 3.4, 3.5**
     */
    it('should return false for all invalid transitions', () => {
      fc.assert(
        fc.property(
          fc.constantFrom(...invalidTransitionPairs),
          ([from, to]) => {
            expect(validateOutboundTransition(from, to)).toBe(false);
          },
        ),
        { numRuns: 200 },
      );
    });

    /**
     * Terminal states (Delivered, PermanentFailure, Expired) have no valid transitions.
     *
     * **Validates: Requirements 3.4, 3.5**
     */
    it('should have no valid transitions from terminal states', () => {
      fc.assert(
        fc.property(
          fc.constantFrom(...terminalStatuses),
          arbStatus,
          (terminalState, anyTarget) => {
            expect(validateOutboundTransition(terminalState, anyTarget)).toBe(
              false,
            );
            expect(OUTBOUND_VALID_TRANSITIONS[terminalState]).toHaveLength(0);
          },
        ),
        { numRuns: 100 },
      );
    });

    /**
     * The transition map covers every enum value — no status is missing from the map.
     *
     * **Validates: Requirements 3.1**
     */
    it('should have a transition entry for every OutboundDeliveryStatus value', () => {
      fc.assert(
        fc.property(arbStatus, (status) => {
          expect(OUTBOUND_VALID_TRANSITIONS[status]).toBeDefined();
          expect(Array.isArray(OUTBOUND_VALID_TRANSITIONS[status])).toBe(true);
        }),
        { numRuns: 100 },
      );
    });
  });
});
