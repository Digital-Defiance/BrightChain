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
  POOL_ANNOUNCEMENT = 'gossip:pool_announcement',
  POOL_REMOVAL = 'gossip:pool_removal',
  POOL_LIST_REQUEST = 'gossip:pool_list_request',
  POOL_LIST_RESPONSE = 'gossip:pool_list_response',
}

/**
 * Heartbeat message types
 */
export enum HeartbeatMessageType {
  PING = 'heartbeat:ping',
  PONG = 'heartbeat:pong',
}

/**
 * Message passing protocol message types
 */
export enum MessagePassingType {
  MESSAGE_SEND = 'message:send',
  MESSAGE_RECEIVED = 'message:received',
  MESSAGE_ACK = 'message:ack',
  MESSAGE_QUERY = 'message:query',
  EVENT_SUBSCRIBE = 'message:event_subscribe',
}

/**
 * All WebSocket message types
 */
export type WebSocketMessageType =
  | DiscoveryMessageType
  | GossipMessageType
  | HeartbeatMessageType
  | MessagePassingType;
