/**
 * Peer connection information for network topology introspection.
 *
 * @see Requirements 3.1, 10.1
 */
export interface IPeerInfo<TID = string> {
  nodeId: TID;
  connected: boolean;
  lastSeen: string; // ISO 8601
  latencyMs?: number;
}

/**
 * Network topology as seen from the local node.
 *
 * @see Requirements 3.1, 10.1
 */
export interface INetworkTopology<TID = string> {
  localNodeId: TID;
  peers: IPeerInfo<TID>[];
  totalConnected: number;
}
