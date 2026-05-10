import { VaultContainerState } from '../enumerations/vault-container-state';
import { InvalidStateTransitionError } from '../errors';

/**
 * Allowed state transitions for vault containers.
 *
 * Each key is a source state; the value is the set of target states
 * reachable from that source under normal (non-admin) operation.
 *
 * Special cases:
 * - `Destroyed` is terminal — no transitions out.
 * - `Disowned` is terminal for non-admin users. Only `burnbag:admin`
 *   may transition `Disowned → Destroyed`.
 */
const ALLOWED_TRANSITIONS: ReadonlyMap<
  VaultContainerState,
  ReadonlySet<VaultContainerState>
> = new Map([
  [
    VaultContainerState.Active,
    new Set([
      VaultContainerState.Destroyed,
      VaultContainerState.PendingDeletion,
      VaultContainerState.Disowned,
      VaultContainerState.Sealed,
      VaultContainerState.Locked,
    ]),
  ],
  [
    VaultContainerState.Sealed,
    new Set([
      VaultContainerState.Destroyed,
      VaultContainerState.PendingDeletion,
      VaultContainerState.Disowned,
    ]),
  ],
  [
    VaultContainerState.Locked,
    new Set([
      VaultContainerState.Destroyed,
      VaultContainerState.PendingDeletion,
      VaultContainerState.Disowned,
    ]),
  ],
  [
    VaultContainerState.PendingDeletion,
    new Set([
      VaultContainerState.Destroyed,
      VaultContainerState.Active,
      VaultContainerState.Sealed,
      VaultContainerState.Locked,
    ]),
  ],
  [VaultContainerState.Destroyed, new Set()],
  [VaultContainerState.Disowned, new Set()],
]);

/**
 * Admin-only transitions that are not available to regular users.
 *
 * Currently only `Disowned → Destroyed` is admin-gated.
 */
const ADMIN_TRANSITIONS: ReadonlyMap<
  VaultContainerState,
  ReadonlySet<VaultContainerState>
> = new Map([
  [VaultContainerState.Disowned, new Set([VaultContainerState.Destroyed])],
]);

/**
 * Check whether a state transition is allowed.
 *
 * @param currentState  - The vault container's current state.
 * @param targetState   - The desired target state.
 * @param isAdmin       - Whether the caller holds `burnbag:admin` scope.
 *                        Defaults to `false`.
 * @returns `true` if the transition is permitted, `false` otherwise.
 */
export function isValidTransition(
  currentState: VaultContainerState,
  targetState: VaultContainerState,
  isAdmin = false,
): boolean {
  const allowed = ALLOWED_TRANSITIONS.get(currentState);
  if (allowed?.has(targetState)) {
    return true;
  }

  if (isAdmin) {
    const adminAllowed = ADMIN_TRANSITIONS.get(currentState);
    if (adminAllowed?.has(targetState)) {
      return true;
    }
  }

  return false;
}

/**
 * Assert that a state transition is allowed, throwing if it is not.
 *
 * @param currentState  - The vault container's current state.
 * @param targetState   - The desired target state.
 * @param isAdmin       - Whether the caller holds `burnbag:admin` scope.
 *                        Defaults to `false`.
 * @throws {InvalidStateTransitionError} when the transition is not permitted.
 */
export function assertValidTransition(
  currentState: VaultContainerState,
  targetState: VaultContainerState,
  isAdmin = false,
): void {
  if (!isValidTransition(currentState, targetState, isAdmin)) {
    throw new InvalidStateTransitionError(currentState, targetState);
  }
}
