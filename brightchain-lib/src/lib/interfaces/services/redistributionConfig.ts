/**
 * @fileoverview RedistributionConfig interface.
 *
 * Configuration for batched share redistribution operations.
 *
 * @see Requirements 3, 4, 12.3
 */

import { ShortHexGuid } from '@digitaldefiance/ecies-lib';

/**
 * Configuration for batched share redistribution.
 */
export interface RedistributionConfig {
  /** Number of documents to process per batch. Default: 100 */
  batchSize: number;
  /** Callback for progress reporting */
  onProgress?: (
    processed: number,
    total: number,
    failed: ShortHexGuid[],
  ) => void;
  /** Whether to continue on individual document failure. Default: true */
  continueOnFailure: boolean;
}
