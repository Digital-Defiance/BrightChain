import { IApiMessageResponse } from '@digitaldefiance/node-express-suite';
import { IReplicationNodeResult } from '../replicationNodeResult';

/**
 * Replicate block response
 */
export interface IReplicateBlockResponse extends IApiMessageResponse {
  blockId: string;
  replicationResults: IReplicationNodeResult[];
  [key: string]: unknown;
}
