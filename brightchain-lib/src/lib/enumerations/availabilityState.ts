/**
 * AvailabilityState enumeration
 * Defines the possible availability states for blocks in the distributed storage system.
 *
 * @see Requirements 1.1, 1.2, 1.3, 1.4, 1.5, 1.6
 */
export enum AvailabilityState {
  /**
   * Block is stored locally as the authoritative copy
   */
  Local = 'local',

  /**
   * Block exists on remote nodes but not locally
   */
  Remote = 'remote',

  /**
   * Block is cached locally but authoritative copy is remote
   */
  Cached = 'cached',

  /**
   * Block's source nodes are unreachable
   */
  Orphaned = 'orphaned',

  /**
   * Block location has not been determined
   */
  Unknown = 'unknown',
}

/**
 * Check if a block is accessible locally (either as authoritative or cached copy)
 * @param state - The availability state to check
 * @returns true if the block can be accessed without network requests
 */
export function isLocallyAccessible(state: AvailabilityState): boolean {
  return (
    state === AvailabilityState.Local || state === AvailabilityState.Cached
  );
}

/**
 * Check if a block requires network access to retrieve
 * @param state - The availability state to check
 * @returns true if the block requires network access
 */
export function requiresNetwork(state: AvailabilityState): boolean {
  return (
    state === AvailabilityState.Remote || state === AvailabilityState.Unknown
  );
}
