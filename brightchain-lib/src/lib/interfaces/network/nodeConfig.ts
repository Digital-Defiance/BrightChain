/**
 * Node configuration
 */
export interface NodeConfig {
  httpPort: number;
  wsPort: number;
  upnpEnabled: boolean;
  discoveryInterval: number;
  syncInterval: number;
  maxConnections: number;
  minStorageSpace: number;
  bootstrapNodes: string[];
}
