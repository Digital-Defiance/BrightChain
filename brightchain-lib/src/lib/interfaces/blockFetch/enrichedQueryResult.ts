/**
 * @fileoverview Enriched Query Result Interfaces
 *
 * Defines the enriched query result and pending block info interfaces.
 * These are the base data structures for query results with availability
 * metadata, shared between frontend and backend per workspace conventions.
 *
 * @see cross-node-eventual-consistency design, Section 5
 * @see Requirements 3.1, 3.2, 3.3
 */

import { AvailabilityState } from '../../enumerations/availabilityState';
import { ReadConcern } from '../../enumerations/readConcern';

/**
 * Information about a block that could not be retrieved during a query.
 * Provides the block's current availability state and known remote locations
 * so callers can understand why the block is pending and where it might be fetched from.
 */
export interface IPendingBlockInfo {
  /** The block checksum/ID that could not be retrieved */
  blockId: string;
  /** The current availability state of the block */
  state: AvailabilityState;
  /** Node IDs where this block is known to exist */
  knownLocations: string[];
}

/**
 * An enriched query result that includes availability metadata alongside
 * document data. This allows callers to understand which documents are fully
 * available, which are pending remote fetch, and handle partial results.
 *
 * @typeParam TDoc - The document type returned by the query
 */
export interface IEnrichedQueryResult<TDoc> {
  /** Documents that were successfully retrieved */
  documents: TDoc[];
  /** Whether all requested blocks were available */
  isComplete: boolean;
  /** Blocks that could not be retrieved */
  pendingBlocks: IPendingBlockInfo[];
  /** The read concern used for this query */
  readConcern: ReadConcern;
}
