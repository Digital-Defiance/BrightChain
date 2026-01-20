/**
 * WebSocket message interfaces for the Block Availability and Discovery Protocol
 */

import {
  DiscoveryMessageType,
  GossipMessageType,
  HeartbeatMessageType,
  MessagePassingType,
} from '../enumerations/websocketMessageType';

/**
 * Base WebSocket message structure
 */
export interface IWebSocketMessage<T = unknown> {
  type: string;
  payload: T;
  timestamp: string;
  requestId?: string;
}

// ===== Discovery Protocol Messages =====

/**
 * Bloom filter request message
 */
export interface IBloomFilterRequest {
  type: DiscoveryMessageType.BLOOM_FILTER_REQUEST;
  payload: {
    nodeId: string;
  };
  timestamp: string;
  requestId: string;
}

/**
 * Bloom filter response message
 */
export interface IBloomFilterResponse {
  type: DiscoveryMessageType.BLOOM_FILTER_RESPONSE;
  payload: {
    nodeId: string;
    bloomFilter: {
      data: string; // Base64 encoded Uint8Array
      hashCount: number;
      bitCount: number;
      itemCount: number;
    };
  };
  timestamp: string;
  requestId: string;
}

/**
 * Block query message
 */
export interface IBlockQueryMessage {
  type: DiscoveryMessageType.BLOCK_QUERY;
  payload: {
    blockId: string;
    requestingNodeId: string;
  };
  timestamp: string;
  requestId: string;
}

/**
 * Block query response message
 */
export interface IBlockQueryResponse {
  type: DiscoveryMessageType.BLOCK_QUERY_RESPONSE;
  payload: {
    blockId: string;
    hasBlock: boolean;
    nodeId: string;
  };
  timestamp: string;
  requestId: string;
}

/**
 * Manifest request message
 */
export interface IManifestRequest {
  type: DiscoveryMessageType.MANIFEST_REQUEST;
  payload: {
    nodeId: string;
    sinceTimestamp?: string;
  };
  timestamp: string;
  requestId: string;
}

/**
 * Manifest response message
 */
export interface IManifestResponse {
  type: DiscoveryMessageType.MANIFEST_RESPONSE;
  payload: {
    nodeId: string;
    blockIds: string[];
    generatedAt: string;
    checksum: string;
  };
  timestamp: string;
  requestId: string;
}

// ===== Gossip Protocol Messages =====

/**
 * Block announcement message
 */
export interface IBlockAnnouncementMessage {
  type: GossipMessageType.BLOCK_ANNOUNCEMENT;
  payload: {
    blockId: string;
    nodeId: string;
    ttl: number;
  };
  timestamp: string;
}

/**
 * Block removal message
 */
export interface IBlockRemovalMessage {
  type: GossipMessageType.BLOCK_REMOVAL;
  payload: {
    blockId: string;
    nodeId: string;
    ttl: number;
  };
  timestamp: string;
}

/**
 * Announcement batch message
 */
export interface IAnnouncementBatchMessage {
  type: GossipMessageType.ANNOUNCEMENT_BATCH;
  payload: {
    announcements: Array<{
      type: 'add' | 'remove';
      blockId: string;
      nodeId: string;
      ttl: number;
    }>;
  };
  timestamp: string;
}

// ===== Heartbeat Messages =====

/**
 * Ping message
 */
export interface IPingMessage {
  type: HeartbeatMessageType.PING;
  payload: {
    nodeId: string;
  };
  timestamp: string;
  requestId: string;
}

/**
 * Pong message
 */
export interface IPongMessage {
  type: HeartbeatMessageType.PONG;
  payload: {
    nodeId: string;
  };
  timestamp: string;
  requestId: string;
}

// ===== Message Passing Messages =====

/**
 * Message send message
 */
export interface IMessageSendMessage {
  type: MessagePassingType.MESSAGE_SEND;
  payload: {
    messageId: string;
    senderId: string;
    recipients: string[];
  };
  timestamp: string;
  requestId: string;
}

/**
 * Message received message
 */
export interface IMessageReceivedMessage {
  type: MessagePassingType.MESSAGE_RECEIVED;
  payload: {
    messageId: string;
    recipientId: string;
  };
  timestamp: string;
  requestId: string;
}

/**
 * Message acknowledgment message
 */
export interface IMessageAckMessage {
  type: MessagePassingType.MESSAGE_ACK;
  payload: {
    messageId: string;
    recipientId: string;
    status: string;
  };
  timestamp: string;
  requestId: string;
}

/**
 * Message query message
 */
export interface IMessageQueryMessage {
  type: MessagePassingType.MESSAGE_QUERY;
  payload: {
    recipientId?: string;
    senderId?: string;
    messageType?: string;
  };
  timestamp: string;
  requestId: string;
}

/**
 * Event subscribe message
 */
export interface IEventSubscribeMessage {
  type: MessagePassingType.EVENT_SUBSCRIBE;
  payload: {
    types?: string[];
    senderId?: string;
    recipientId?: string;
  };
  timestamp: string;
  requestId: string;
}

/**
 * Union type of all WebSocket messages
 */
export type WebSocketMessage =
  | IBloomFilterRequest
  | IBloomFilterResponse
  | IBlockQueryMessage
  | IBlockQueryResponse
  | IManifestRequest
  | IManifestResponse
  | IBlockAnnouncementMessage
  | IBlockRemovalMessage
  | IAnnouncementBatchMessage
  | IPingMessage
  | IPongMessage
  | IMessageSendMessage
  | IMessageReceivedMessage
  | IMessageAckMessage
  | IMessageQueryMessage
  | IEventSubscribeMessage;
