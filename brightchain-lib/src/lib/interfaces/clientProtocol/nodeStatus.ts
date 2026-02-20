/**
 * Node status and health information for client introspection.
 *
 * @see Requirements 2.1, 10.1
 */
export interface INodeStatus<TID = string> {
  nodeId: TID;
  healthy: boolean;
  uptime: number; // seconds
  version: string;
  capabilities: string[];
  partitionMode: boolean;
  disconnectedPeers?: TID[]; // only populated for Admin/System
}
