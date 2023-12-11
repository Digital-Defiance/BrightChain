/**
 * @fileoverview Block Fetch Error Types
 *
 * Error hierarchy for remote block fetching operations.
 * BlockFetchError is the base; PoolMismatchError, FetchTimeoutError, and PendingBlockError extend it.
 *
 * @see cross-node-eventual-consistency design, Error Handling section
 */

import { AvailabilityState } from '../enumerations/availabilityState';

/**
 * Base error for block fetch failures.
 * Contains the block ID and details of each node attempted.
 */
export class BlockFetchError extends Error {
  constructor(
    public readonly blockId: string,
    public readonly attemptedNodes: Array<{
      nodeId: string;
      error?: string;
    }>,
    message: string,
  ) {
    super(message);
    this.name = 'BlockFetchError';
  }
}

/**
 * Thrown when a fetched block's pool metadata does not match the requested pool.
 * This indicates either data corruption or misconfiguration on the remote node.
 */
export class PoolMismatchError extends BlockFetchError {
  public readonly expectedPoolId: string;
  public readonly actualPoolId: string;

  constructor(blockId: string, expectedPoolId: string, actualPoolId: string) {
    super(
      blockId,
      [],
      `Pool mismatch for block ${blockId}: expected "${expectedPoolId}", got "${actualPoolId}"`,
    );
    this.name = 'PoolMismatchError';
    this.expectedPoolId = expectedPoolId;
    this.actualPoolId = actualPoolId;
  }
}

/**
 * Thrown when a block fetch exceeds the configured timeout.
 */
export class FetchTimeoutError extends BlockFetchError {
  public readonly timeoutMs: number;

  constructor(blockId: string, timeoutMs: number) {
    super(
      blockId,
      [],
      `Fetch for block ${blockId} timed out after ${timeoutMs}ms`,
    );
    this.name = 'FetchTimeoutError';
    this.timeoutMs = timeoutMs;
  }
}

/**
 * Thrown when a block is known to exist remotely but has not yet been fetched locally.
 * Used with Available read concern to indicate a pending remote fetch.
 */
export class PendingBlockError extends Error {
  constructor(
    public readonly blockId: string,
    public readonly state: AvailabilityState,
    public readonly knownLocations: string[],
  ) {
    super(`Block ${blockId} is pending remote fetch (state: ${state})`);
    this.name = 'PendingBlockError';
  }
}
