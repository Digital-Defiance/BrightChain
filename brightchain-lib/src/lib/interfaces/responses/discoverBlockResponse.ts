/**
 * Discover block response data
 */
export interface IDiscoverBlockResponseData {
  blockId: string;
  found: boolean;
  locations: Array<{
    nodeId: string;
    latencyMs?: number;
    lastSeen: string;
  }>;
  queriedPeers: number;
  duration: number;
}
