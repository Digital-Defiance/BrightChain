import { IApiMessageResponse } from '@digitaldefiance/node-express-suite';

/**
 * Discover block response
 */
export interface IDiscoverBlockResponse extends IApiMessageResponse {
  blockId: string;
  found: boolean;
  locations: Array<{
    nodeId: string;
    latencyMs?: number;
    lastSeen: string;
  }>;
  queriedPeers: number;
  duration: number;
  [key: string]: unknown;
}
