import { IReplicationNodeResult } from '../replicationNodeResult';

/**
 * Replicate block response data
 */
export interface IReplicateBlockResponseData {
  blockId: string;
  replicationResults: IReplicationNodeResult[];
}
