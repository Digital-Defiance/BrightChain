/**
 * @fileoverview Read Concern Levels for Block Retrieval
 *
 * Controls how the system handles blocks not available locally
 * during cross-node read operations.
 *
 * @see cross-node-eventual-consistency design, ReadConcern section
 * @see Requirements 2.1
 */

/**
 * Read concern levels for block retrieval.
 * Controls how the system handles blocks not available locally.
 */
export enum ReadConcern {
  /** Return only locally available blocks. Fail for remote/unknown blocks. */
  Local = 'local',
  /** Return local blocks immediately; attempt remote fetch but return pending indicator on timeout. */
  Available = 'available',
  /** Block until the block is fetched or timeout is reached. */
  Consistent = 'consistent',
}
