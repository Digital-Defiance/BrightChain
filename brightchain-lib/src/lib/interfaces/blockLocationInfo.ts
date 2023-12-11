/**
 * Block location info
 */
export interface IBlockLocationInfo {
  nodeId: string;
  lastSeen: string;
  latencyMs?: number;
  isAuthoritative?: boolean;
}
