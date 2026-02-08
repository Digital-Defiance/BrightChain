import { IApiMessageResponse } from '@digitaldefiance/node-express-suite';
import { INodeInfo } from '../nodeInfo';

/**
 * List nodes response
 */
export interface IListNodesResponse extends IApiMessageResponse {
  nodes: INodeInfo[];
  total: number;
  [key: string]: unknown;
}
