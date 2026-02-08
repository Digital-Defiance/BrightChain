import { NodeStatus } from '../enumerations';

/**
 * Node information response
 */
export interface INodeInfo {
  nodeId: string;
  publicKey?: string;
  status: NodeStatus;
  capabilities: string[];
  lastSeen: string;
  latencyMs?: number;
}
