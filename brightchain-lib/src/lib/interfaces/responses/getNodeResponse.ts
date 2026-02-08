import { IApiMessageResponse } from '@digitaldefiance/node-express-suite';
import { INodeInfo } from '../nodeInfo';

/**
 * Get node response
 */
export interface IGetNodeResponse extends IApiMessageResponse {
  node: INodeInfo;
  [key: string]: unknown;
}
