import fc from 'fast-check';
import {
  DeliveryStatus,
  VALID_TRANSITIONS,
  validateTransition,
} from '../../enumerations/messaging/deliveryStatus';

/**
 * Property tests for DeliveryStatus state machine
 *
 * **Validates: Requirements 2.2, 2.3**
 *
 * Property 4: Delivery Status State Machine
 * For any pair of DeliveryStatus values (from, to), calling validateTransition(from, to)
 * must return true if and only if the pair is in the set of valid transitions:
 * {(Pending, Announced), (Announced, Delivered), (Announced, Failed), (Announced, Bounced),
 *  (Delivered, Read), (Delivered, Failed)}. All other pairs must return false.
 */
describe('Feature: unified-gossip-delivery, Property 4: Delivery Status State Machine', () => {
  // All DeliveryStatus values for generating arbitrary pairs
  const allStatuses = Object.values(DeliveryStatus);

  // The exhaustive set of valid transitions as defined by Requirements 2.2
  const validTransitionSet: ReadonlySet<string> = new Set([
    `${DeliveryStatus.Pending}->${DeliveryStatus.Announced}`,
    `${DeliveryStatus.Announced}->${DeliveryStatus.Delivered}`,
    `${DeliveryStatus.Announced}->${DeliveryStatus.Failed}`,
    `${DeliveryStatus.Announced}->${DeliveryStatus.Bounced}`,
    `${DeliveryStatus.Delivered}->${DeliveryStatus.Read}`,
    `${DeliveryStatus.Delivered}->${DeliveryStatus.Failed}`,
  ]);

  // Smart generator: produces an arbitrary DeliveryStatus value
  const deliveryStatusArb = fc.constantFrom(...allStatuses);

  /**
   * Property 4: For any pair (from, to) of DeliveryStatus values,
   * validateTransition(from, to) returns true iff the pair is in the valid transition set.
   *
   * **Validates: Requirements 2.2, 2.3**
   */
  it('Property 4: validateTransition returns true iff (from, to) is a valid transition', () => {
    fc.assert(
      fc.property(
        deliveryStatusArb,
        deliveryStatusArb,
        (from: DeliveryStatus, to: DeliveryStatus) => {
          const result = validateTransition(from, to);
          const key = `${from}->${to}`;
          const expectedValid = validTransitionSet.has(key);

          expect(result).toBe(expectedValid);
        },
      ),
      { numRuns: 200 },
    );
  });

  /**
   * Property 4a: All explicitly valid transitions must be accepted.
   * Generates only pairs from the valid transition set to confirm they all return true.
   *
   * **Validates: Requirements 2.2**
   */
  it('Property 4a: all valid transitions are accepted', () => {
    const validPairs: [DeliveryStatus, DeliveryStatus][] = [
      [DeliveryStatus.Pending, DeliveryStatus.Announced],
      [DeliveryStatus.Announced, DeliveryStatus.Delivered],
      [DeliveryStatus.Announced, DeliveryStatus.Failed],
      [DeliveryStatus.Announced, DeliveryStatus.Bounced],
      [DeliveryStatus.Delivered, DeliveryStatus.Read],
      [DeliveryStatus.Delivered, DeliveryStatus.Failed],
    ];

    const validPairArb = fc.constantFrom(...validPairs);

    fc.assert(
      fc.property(validPairArb, ([from, to]) => {
        expect(validateTransition(from, to)).toBe(true);
      }),
      { numRuns: 100 },
    );
  });

  /**
   * Property 4b: All invalid transitions must be rejected.
   * Generates arbitrary (from, to) pairs and filters to only invalid ones.
   *
   * **Validates: Requirements 2.3**
   */
  it('Property 4b: all invalid transitions are rejected', () => {
    fc.assert(
      fc.property(
        deliveryStatusArb,
        deliveryStatusArb,
        (from: DeliveryStatus, to: DeliveryStatus) => {
          const key = `${from}->${to}`;
          // Only test pairs that are NOT in the valid set
          fc.pre(!validTransitionSet.has(key));

          expect(validateTransition(from, to)).toBe(false);
        },
      ),
      { numRuns: 200 },
    );
  });

  /**
   * Property 4c: Terminal states (Read, Failed, Bounced) have no outgoing transitions.
   * For any target status, validateTransition from a terminal state must return false.
   *
   * **Validates: Requirements 2.2, 2.3**
   */
  it('Property 4c: terminal states have no valid outgoing transitions', () => {
    const terminalStatuses = fc.constantFrom(
      DeliveryStatus.Read,
      DeliveryStatus.Failed,
      DeliveryStatus.Bounced,
    );

    fc.assert(
      fc.property(terminalStatuses, deliveryStatusArb, (from, to) => {
        expect(validateTransition(from, to)).toBe(false);
      }),
      { numRuns: 100 },
    );
  });

  /**
   * Property 4d: Self-transitions are never valid.
   * For any DeliveryStatus value, validateTransition(s, s) must return false.
   *
   * **Validates: Requirements 2.2, 2.3**
   */
  it('Property 4d: self-transitions are never valid', () => {
    fc.assert(
      fc.property(deliveryStatusArb, (status: DeliveryStatus) => {
        expect(validateTransition(status, status)).toBe(false);
      }),
      { numRuns: 100 },
    );
  });

  /**
   * Property 4e: VALID_TRANSITIONS map is consistent with validateTransition.
   * For any status, the entries in VALID_TRANSITIONS[status] are exactly the
   * statuses for which validateTransition returns true.
   *
   * **Validates: Requirements 2.2, 2.3**
   */
  it('Property 4e: VALID_TRANSITIONS map is consistent with validateTransition', () => {
    fc.assert(
      fc.property(deliveryStatusArb, (from: DeliveryStatus) => {
        for (const to of allStatuses) {
          const inMap = VALID_TRANSITIONS[from].includes(to);
          const fnResult = validateTransition(from, to);
          expect(fnResult).toBe(inMap);
        }
      }),
      { numRuns: 100 },
    );
  });
});
