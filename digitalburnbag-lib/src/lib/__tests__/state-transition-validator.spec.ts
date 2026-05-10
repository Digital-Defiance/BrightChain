import { VaultContainerState } from '../enumerations/vault-container-state';
import { InvalidStateTransitionError } from '../errors';
import {
  assertValidTransition,
  isValidTransition,
} from '../services/state-transition-validator';

/**
 * All transitions that MUST be allowed for non-admin callers.
 */
const VALID_TRANSITIONS: [VaultContainerState, VaultContainerState][] = [
  // From Active
  [VaultContainerState.Active, VaultContainerState.Destroyed],
  [VaultContainerState.Active, VaultContainerState.PendingDeletion],
  [VaultContainerState.Active, VaultContainerState.Disowned],
  [VaultContainerState.Active, VaultContainerState.Sealed],
  [VaultContainerState.Active, VaultContainerState.Locked],
  // From Sealed
  [VaultContainerState.Sealed, VaultContainerState.Destroyed],
  [VaultContainerState.Sealed, VaultContainerState.PendingDeletion],
  [VaultContainerState.Sealed, VaultContainerState.Disowned],
  // From Locked
  [VaultContainerState.Locked, VaultContainerState.Destroyed],
  [VaultContainerState.Locked, VaultContainerState.PendingDeletion],
  [VaultContainerState.Locked, VaultContainerState.Disowned],
  // From PendingDeletion
  [VaultContainerState.PendingDeletion, VaultContainerState.Destroyed],
  [VaultContainerState.PendingDeletion, VaultContainerState.Active],
  [VaultContainerState.PendingDeletion, VaultContainerState.Sealed],
  [VaultContainerState.PendingDeletion, VaultContainerState.Locked],
];

/**
 * Transitions that MUST be rejected for non-admin callers.
 */
const INVALID_TRANSITIONS: [VaultContainerState, VaultContainerState][] = [
  // Destroyed is terminal
  [VaultContainerState.Destroyed, VaultContainerState.Active],
  [VaultContainerState.Destroyed, VaultContainerState.Sealed],
  [VaultContainerState.Destroyed, VaultContainerState.Locked],
  [VaultContainerState.Destroyed, VaultContainerState.Disowned],
  [VaultContainerState.Destroyed, VaultContainerState.PendingDeletion],
  // Disowned is terminal for non-admin
  [VaultContainerState.Disowned, VaultContainerState.Active],
  [VaultContainerState.Disowned, VaultContainerState.Destroyed],
  [VaultContainerState.Disowned, VaultContainerState.Sealed],
  [VaultContainerState.Disowned, VaultContainerState.Locked],
  [VaultContainerState.Disowned, VaultContainerState.PendingDeletion],
  // Self-transitions (no-ops) that are not in the allowed set
  [VaultContainerState.Active, VaultContainerState.Active],
  [VaultContainerState.Sealed, VaultContainerState.Sealed],
  [VaultContainerState.Locked, VaultContainerState.Locked],
  [VaultContainerState.Destroyed, VaultContainerState.Destroyed],
  [VaultContainerState.Disowned, VaultContainerState.Disowned],
  [VaultContainerState.PendingDeletion, VaultContainerState.PendingDeletion],
  // Other invalid transitions
  [VaultContainerState.Sealed, VaultContainerState.Active],
  [VaultContainerState.Sealed, VaultContainerState.Locked],
  [VaultContainerState.Locked, VaultContainerState.Active],
  [VaultContainerState.Locked, VaultContainerState.Sealed],
  [VaultContainerState.PendingDeletion, VaultContainerState.Disowned],
];

describe('State Transition Validator', () => {
  describe('isValidTransition', () => {
    describe('valid transitions', () => {
      it.each(VALID_TRANSITIONS)(
        '%s → %s returns true',
        (current, target) => {
          expect(isValidTransition(current, target)).toBe(true);
        },
      );
    });

    describe('invalid transitions', () => {
      it.each(INVALID_TRANSITIONS)(
        '%s → %s returns false',
        (current, target) => {
          expect(isValidTransition(current, target)).toBe(false);
        },
      );
    });

    describe('admin override', () => {
      it('Disowned → Destroyed returns true when isAdmin is true', () => {
        expect(
          isValidTransition(
            VaultContainerState.Disowned,
            VaultContainerState.Destroyed,
            true,
          ),
        ).toBe(true);
      });

      it('Disowned → Destroyed returns false when isAdmin is false', () => {
        expect(
          isValidTransition(
            VaultContainerState.Disowned,
            VaultContainerState.Destroyed,
            false,
          ),
        ).toBe(false);
      });

      it('Disowned → Active returns false even when isAdmin is true', () => {
        expect(
          isValidTransition(
            VaultContainerState.Disowned,
            VaultContainerState.Active,
            true,
          ),
        ).toBe(false);
      });

      it('admin flag does not affect already-valid transitions', () => {
        expect(
          isValidTransition(
            VaultContainerState.Active,
            VaultContainerState.Destroyed,
            true,
          ),
        ).toBe(true);
      });

      it('admin flag does not make Destroyed → Active valid', () => {
        expect(
          isValidTransition(
            VaultContainerState.Destroyed,
            VaultContainerState.Active,
            true,
          ),
        ).toBe(false);
      });
    });

    describe('defaults', () => {
      it('isAdmin defaults to false', () => {
        // Disowned → Destroyed requires admin, so default should reject
        expect(
          isValidTransition(
            VaultContainerState.Disowned,
            VaultContainerState.Destroyed,
          ),
        ).toBe(false);
      });
    });
  });

  describe('assertValidTransition', () => {
    describe('valid transitions do not throw', () => {
      it.each(VALID_TRANSITIONS)(
        '%s → %s does not throw',
        (current, target) => {
          expect(() => assertValidTransition(current, target)).not.toThrow();
        },
      );
    });

    describe('invalid transitions throw InvalidStateTransitionError', () => {
      it.each(INVALID_TRANSITIONS)(
        '%s → %s throws InvalidStateTransitionError',
        (current, target) => {
          expect(() => assertValidTransition(current, target)).toThrow(
            InvalidStateTransitionError,
          );
        },
      );
    });

    describe('error includes current and requested states', () => {
      it('error message contains both states', () => {
        try {
          assertValidTransition(
            VaultContainerState.Destroyed,
            VaultContainerState.Active,
          );
          fail('Expected InvalidStateTransitionError to be thrown');
        } catch (err) {
          expect(err).toBeInstanceOf(InvalidStateTransitionError);
          const error = err as InvalidStateTransitionError;
          expect(error.message).toContain(VaultContainerState.Destroyed);
          expect(error.message).toContain(VaultContainerState.Active);
          expect(error.code).toBe('INVALID_STATE_TRANSITION');
        }
      });

      it('error message for Disowned → Active includes both states', () => {
        try {
          assertValidTransition(
            VaultContainerState.Disowned,
            VaultContainerState.Active,
          );
          fail('Expected InvalidStateTransitionError to be thrown');
        } catch (err) {
          expect(err).toBeInstanceOf(InvalidStateTransitionError);
          const error = err as InvalidStateTransitionError;
          expect(error.message).toContain(VaultContainerState.Disowned);
          expect(error.message).toContain(VaultContainerState.Active);
        }
      });
    });

    describe('admin override', () => {
      it('Disowned → Destroyed does not throw when isAdmin is true', () => {
        expect(() =>
          assertValidTransition(
            VaultContainerState.Disowned,
            VaultContainerState.Destroyed,
            true,
          ),
        ).not.toThrow();
      });

      it('Disowned → Destroyed throws when isAdmin is false', () => {
        expect(() =>
          assertValidTransition(
            VaultContainerState.Disowned,
            VaultContainerState.Destroyed,
            false,
          ),
        ).toThrow(InvalidStateTransitionError);
      });
    });
  });
});
