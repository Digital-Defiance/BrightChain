import type { BlockId } from '../branded/primitives/blockId';
import { IReplicationNodeResult } from '../replicationNodeResult';

/**
 * Replicate block response data
 */
export interface IReplicateBlockResponseData {
  blockId: BlockId;
  replicationResults: IReplicationNodeResult[];
}
