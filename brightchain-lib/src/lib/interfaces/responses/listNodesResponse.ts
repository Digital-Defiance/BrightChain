import { INodeInfo } from '../nodeInfo';

/**
 * List nodes response data
 */
export interface IListNodesResponseData {
  nodes: INodeInfo[];
  total: number;
}
