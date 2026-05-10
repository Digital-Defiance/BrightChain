/**
 * Property-based tests for vault container state transition correctness.
 *
 * This test validates that the state transition function correctly accepts
 * all valid transitions and rejects all invalid transitions, using randomly
 * generated (currentState, targetState) pairs across 1000 iterations.
 *
 * **Validates: Requirements 12**
 */

import * as fc from 'fast-check';
import { VaultContainerState } from '../enumerations/vault-container-state';
import { InvalidStateTransitionError } from '../errors';
import {
  assertValidTransition,
  isValidTransition,
} from '../services/state-transition-validator';
import { arbVaultContainerState } from './arbitraries';

/**
 * The complete set of allowed transitions for non-admin callers.
 * This is the ground-truth set derived from Requirement 7.2.
 */
const ALLOWED_TRANSITIONS_SET: ReadonlySet<string> = new Set([
  // From Active
  `${VaultContainerState.Active}->${VaultContainerState.Destroyed}`,
  `${VaultContainerState.Active}->${VaultContainerState.PendingDeletion}`,
  `${VaultContainerState.Active}->${VaultContainerState.Disowned}`,
  `${VaultContainerState.Active}->${VaultContainerState.Sealed}`,
  `${VaultContainerState.Active}->${VaultContainerState.Locked}`,
  // From Sealed
  `${VaultContainerState.Sealed}->${VaultContainerState.Destroyed}`,
  `${VaultContainerState.Sealed}->${VaultContainerState.PendingDeletion}`,
  `${VaultContainerState.Sealed}->${VaultContainerState.Disowned}`,
  // From Locked
  `${VaultContainerState.Locked}->${VaultContainerState.Destroyed}`,
  `${VaultContainerState.Locked}->${VaultContainerState.PendingDeletion}`,
  `${VaultContainerState.Locked}->${VaultContainerState.Disowned}`,
  // From PendingDeletion
  `${VaultContainerState.PendingDeletion}->${VaultContainerState.Destroyed}`,
  `${VaultContainerState.PendingDeletion}->${VaultContainerState.Active}`,
  `${VaultContainerState.PendingDeletion}->${VaultContainerState.Sealed}`,
  `${VaultContainerState.PendingDeletion}->${VaultContainerState.Locked}`,
]);

/**
 * Admin-only transitions (not allowed for non-admin callers).
 */
const ADMIN_ONLY_TRANSITIONS_SET: ReadonlySet<string> = new Set([
  `${VaultContainerState.Disowned}->${VaultContainerState.Destroyed}`,
]);

// Feature: vault-deletion-certificate, Property 5: State transition correctness
describe('Feature: vault-deletion-certificate, Property 5: State transition correctness', () => {
  it('FOR ANY (currentState, targetState) pair, isValidTransition succeeds iff the pair is in the allowed set', () => {
    fc.assert(
      fc.property(
        arbVaultContainerState,
        arbVaultContainerState,
        (currentState, targetState) => {
          const key = `${currentState}->${targetState}`;
          const expectedValid = ALLOWED_TRANSITIONS_SET.has(key);
          const result = isValidTransition(currentState, targetState, false);

          expect(result).toBe(expectedValid);
        },
      ),
      { numRuns: 1000 },
    );
  });

  it('all valid transitions succeed via assertValidTransition without throwing', () => {
    fc.assert(
      fc.property(
        arbVaultContainerState,
        arbVaultContainerState,
        (currentState, targetState) => {
          const key = `${currentState}->${targetState}`;
          const expectedValid = ALLOWED_TRANSITIONS_SET.has(key);

          if (expectedValid) {
            expect(() =>
              assertValidTransition(currentState, targetState, false),
            ).not.toThrow();
          }
        },
      ),
      { numRuns: 1000 },
    );
  });

  it('all invalid transitions are rejected with INVALID_STATE_TRANSITION', () => {
    fc.assert(
      fc.property(
        arbVaultContainerState,
        arbVaultContainerState,
        (currentState, targetState) => {
          const key = `${currentState}->${targetState}`;
          const expectedValid = ALLOWED_TRANSITIONS_SET.has(key);

          if (!expectedValid) {
            expect(() =>
              assertValidTransition(currentState, targetState, false),
            ).toThrow(InvalidStateTransitionError);

            try {
              assertValidTransition(currentState, targetState, false);
            } catch (err) {
              const error = err as InvalidStateTransitionError;
              expect(error.code).toBe('INVALID_STATE_TRANSITION');
              expect(error.message).toContain(currentState);
              expect(error.message).toContain(targetState);
            }
          }
        },
      ),
      { numRuns: 1000 },
    );
  });

  it('transitions from Destroyed to any state are rejected', () => {
    fc.assert(
      fc.property(arbVaultContainerState, (targetState) => {
        const result = isValidTransition(
          VaultContainerState.Destroyed,
          targetState,
          false,
        );
        expect(result).toBe(false);
      }),
      { numRuns: 1000 },
    );
  });

  it('transitions from Disowned to Active or Destroyed (without admin) are rejected', () => {
    fc.assert(
      fc.property(
        fc.constantFrom(VaultContainerState.Active, VaultContainerState.Destroyed),
        (targetState) => {
          const result = isValidTransition(
            VaultContainerState.Disowned,
            targetState,
            false,
          );
          expect(result).toBe(false);
        },
      ),
      { numRuns: 1000 },
    );
  });

  it('admin-only transition Disowned → Destroyed succeeds with isAdmin=true', () => {
    fc.assert(
      fc.property(fc.constant(null), () => {
        const result = isValidTransition(
          VaultContainerState.Disowned,
          VaultContainerState.Destroyed,
          true,
        );
        expect(result).toBe(true);

        // assertValidTransition should not throw
        expect(() =>
          assertValidTransition(
            VaultContainerState.Disowned,
            VaultContainerState.Destroyed,
            true,
          ),
        ).not.toThrow();
      }),
      { numRuns: 1000 },
    );
  });

  it('admin flag does not allow transitions from Destroyed', () => {
    fc.assert(
      fc.property(arbVaultContainerState, (targetState) => {
        const result = isValidTransition(
          VaultContainerState.Destroyed,
          targetState,
          true,
        );
        expect(result).toBe(false);
      }),
      { numRuns: 1000 },
    );
  });

  it('admin flag does not allow Disowned → Active', () => {
    fc.assert(
      fc.property(fc.constant(null), () => {
        const result = isValidTransition(
          VaultContainerState.Disowned,
          VaultContainerState.Active,
          true,
        );
        expect(result).toBe(false);
      }),
      { numRuns: 1000 },
    );
  });
});
