/**
 * WebSocket message types for the Block Availability and Discovery Protocol
 */

/**
 * Discovery protocol message types
 */
export enum DiscoveryMessageType {
  BLOOM_FILTER_REQUEST = 'discovery:bloom_filter_request',
  BLOOM_FILTER_RESPONSE = 'discovery:bloom_filter_response',
  BLOCK_QUERY = 'discovery:block_query',
  BLOCK_QUERY_RESPONSE = 'discovery:block_query_response',
  MANIFEST_REQUEST = 'discovery:manifest_request',
  MANIFEST_RESPONSE = 'discovery:manifest_response',
}

/**
 * Gossip protocol message types
 */
export enum GossipMessageType {
  BLOCK_ANNOUNCEMENT = 'gossip:block_announcement',
  BLOCK_REMOVAL = 'gossip:block_removal',
  ANNOUNCEMENT_BATCH = 'gossip:announcement_batch',
}

/**
 * Heartbeat message types
 */
export enum HeartbeatMessageType {
  PING = 'heartbeat:ping',
  PONG = 'heartbeat:pong',
}

/**
 * All WebSocket message types
 */
export type WebSocketMessageType =
  | DiscoveryMessageType
  | GossipMessageType
  | HeartbeatMessageType;
