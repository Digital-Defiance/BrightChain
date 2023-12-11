/**
 * Replication result for a single node
 */
export interface IReplicationNodeResult {
  nodeId: string;
  success: boolean;
  error?: string;
}
