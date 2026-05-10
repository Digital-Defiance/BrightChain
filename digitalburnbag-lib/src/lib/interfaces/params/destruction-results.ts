import { PlatformID } from '@digitaldefiance/ecies-lib';

/**
 * Result of a batch destruction operation.
 */
export interface IBatchDestructionResult<TID extends PlatformID> {
  destroyed: TID[];
  failed: { fileId: TID; error: string }[];
  aggregateProofHash?: Uint8Array;
}
