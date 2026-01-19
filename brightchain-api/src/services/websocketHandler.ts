/* eslint-disable @nx/enforce-module-boundaries */
/**
 * WebSocket message handler for Block Availability and Discovery Protocol
 */

import {
  IAvailabilityService,
  IBlockRegistry,
  IDiscoveryProtocol,
  IGossipService,
  IHeartbeatMonitor,
  IMessageRouter,
} from '@brightchain/brightchain-lib';
import {
  DiscoveryMessageType,
  GossipMessageType,
  HeartbeatMessageType,
  MessagePassingType,
} from '../enumerations/websocketMessageType';
import {
  IAnnouncementBatchMessage,
  IBlockAnnouncementMessage,
  IBlockQueryMessage,
  IBlockQueryResponse,
  IBlockRemovalMessage,
  IBloomFilterRequest,
  IBloomFilterResponse,
  IEventSubscribeMessage,
  IManifestRequest,
  IManifestResponse,
  IMessageAckMessage,
  IMessageQueryMessage,
  IMessageReceivedMessage,
  IMessageSendMessage,
  IPingMessage,
  IPongMessage,
  WebSocketMessage,
} from '../interfaces/websocketMessages';

/**
 * WebSocket connection interface
 * This abstracts the underlying transport (Socket.io, native WebSocket, etc.)
 */
export interface IWebSocketConnection {
  id: string;
  send(message: WebSocketMessage): void;
  on(event: string, handler: (data: unknown) => void): void;
  off(event: string, handler: (data: unknown) => void): void;
}

/**
 * WebSocket handler configuration
 */
export interface IWebSocketHandlerConfig {
  localNodeId: string;
  blockRegistry: IBlockRegistry;
  discoveryProtocol: IDiscoveryProtocol;
  gossipService: IGossipService;
  heartbeatMonitor: IHeartbeatMonitor;
  availabilityService: IAvailabilityService;
  messageRouter?: IMessageRouter;
}

/**
 * WebSocket message handler service
 */
export class WebSocketHandler {
  private readonly localNodeId: string;
  private readonly blockRegistry: IBlockRegistry;
  private readonly discoveryProtocol: IDiscoveryProtocol;
  private readonly gossipService: IGossipService;
  private readonly heartbeatMonitor: IHeartbeatMonitor;
  private readonly availabilityService: IAvailabilityService;
  private readonly messageRouter?: IMessageRouter;
  private readonly connections: Map<string, IWebSocketConnection> = new Map();

  constructor(config: IWebSocketHandlerConfig) {
    this.localNodeId = config.localNodeId;
    this.blockRegistry = config.blockRegistry;
    this.discoveryProtocol = config.discoveryProtocol;
    this.gossipService = config.gossipService;
    this.heartbeatMonitor = config.heartbeatMonitor;
    this.availabilityService = config.availabilityService;
    this.messageRouter = config.messageRouter;
  }

  /**
   * Register a new WebSocket connection
   */
  public registerConnection(connection: IWebSocketConnection): void {
    this.connections.set(connection.id, connection);

    // Set up message handler
    connection.on('message', (data: unknown) => {
      this.handleMessage(connection, data as WebSocketMessage);
    });

    // Clean up on disconnect
    connection.on('disconnect', () => {
      this.connections.delete(connection.id);
    });
  }

  /**
   * Unregister a WebSocket connection
   */
  public unregisterConnection(connectionId: string): void {
    this.connections.delete(connectionId);
  }

  /**
   * Broadcast a message to all connections
   */
  public broadcast(message: WebSocketMessage): void {
    for (const connection of this.connections.values()) {
      connection.send(message);
    }
  }

  /**
   * Send a message to a specific connection
   */
  public sendToConnection(
    connectionId: string,
    message: WebSocketMessage,
  ): void {
    const connection = this.connections.get(connectionId);
    if (connection) {
      connection.send(message);
    }
  }

  /**
   * Handle incoming WebSocket message
   */
  private async handleMessage(
    connection: IWebSocketConnection,
    message: WebSocketMessage,
  ): Promise<void> {
    try {
      switch (message.type) {
        // Discovery protocol messages
        case DiscoveryMessageType.BLOOM_FILTER_REQUEST:
          await this.handleBloomFilterRequest(
            connection,
            message as IBloomFilterRequest,
          );
          break;
        case DiscoveryMessageType.BLOCK_QUERY:
          await this.handleBlockQuery(
            connection,
            message as IBlockQueryMessage,
          );
          break;
        case DiscoveryMessageType.MANIFEST_REQUEST:
          await this.handleManifestRequest(
            connection,
            message as IManifestRequest,
          );
          break;

        // Gossip protocol messages
        case GossipMessageType.BLOCK_ANNOUNCEMENT:
          await this.handleBlockAnnouncement(
            message as IBlockAnnouncementMessage,
          );
          break;
        case GossipMessageType.BLOCK_REMOVAL:
          await this.handleBlockRemoval(message as IBlockRemovalMessage);
          break;
        case GossipMessageType.ANNOUNCEMENT_BATCH:
          await this.handleAnnouncementBatch(
            message as IAnnouncementBatchMessage,
          );
          break;

        // Heartbeat messages
        case HeartbeatMessageType.PING:
          await this.handlePing(connection, message as IPingMessage);
          break;

        // Message passing messages
        case MessagePassingType.MESSAGE_SEND:
          await this.handleMessageSend(
            connection,
            message as IMessageSendMessage,
          );
          break;
        case MessagePassingType.MESSAGE_RECEIVED:
          await this.handleMessageReceived(message as IMessageReceivedMessage);
          break;
        case MessagePassingType.MESSAGE_ACK:
          await this.handleMessageAck(message as IMessageAckMessage);
          break;
        case MessagePassingType.MESSAGE_QUERY:
          await this.handleMessageQuery(
            connection,
            message as IMessageQueryMessage,
          );
          break;
        case MessagePassingType.EVENT_SUBSCRIBE:
          await this.handleEventSubscribe(
            connection,
            message as IEventSubscribeMessage,
          );
          break;

        default:
          console.warn(`Unknown message type: ${message.type}`);
      }
    } catch (error) {
      console.error(`Error handling message ${message.type}:`, error);
    }
  }

  // ===== Discovery Protocol Handlers =====

  /**
   * Handle Bloom filter request
   */
  private async handleBloomFilterRequest(
    connection: IWebSocketConnection,
    message: IBloomFilterRequest,
  ): Promise<void> {
    const bloomFilter = this.blockRegistry.exportBloomFilter();

    const response: IBloomFilterResponse = {
      type: DiscoveryMessageType.BLOOM_FILTER_RESPONSE,
      payload: {
        nodeId: this.localNodeId,
        bloomFilter: {
          data: bloomFilter.data, // Already base64 encoded
          hashCount: bloomFilter.hashCount,
          bitCount: bloomFilter.bitCount,
          itemCount: bloomFilter.itemCount,
        },
      },
      timestamp: new Date().toISOString(),
      requestId: message.requestId,
    };

    connection.send(response);
  }

  /**
   * Handle block query
   */
  private async handleBlockQuery(
    connection: IWebSocketConnection,
    message: IBlockQueryMessage,
  ): Promise<void> {
    const hasBlock = this.blockRegistry.hasLocal(message.payload.blockId);

    const response: IBlockQueryResponse = {
      type: DiscoveryMessageType.BLOCK_QUERY_RESPONSE,
      payload: {
        blockId: message.payload.blockId,
        hasBlock,
        nodeId: this.localNodeId,
      },
      timestamp: new Date().toISOString(),
      requestId: message.requestId,
    };

    connection.send(response);
  }

  /**
   * Handle manifest request
   */
  private async handleManifestRequest(
    connection: IWebSocketConnection,
    message: IManifestRequest,
  ): Promise<void> {
    const manifest = this.blockRegistry.exportManifest();

    const response: IManifestResponse = {
      type: DiscoveryMessageType.MANIFEST_RESPONSE,
      payload: {
        nodeId: manifest.nodeId,
        blockIds: manifest.blockIds,
        generatedAt: manifest.generatedAt.toISOString(),
        checksum: manifest.checksum,
      },
      timestamp: new Date().toISOString(),
      requestId: message.requestId,
    };

    connection.send(response);
  }

  // ===== Gossip Protocol Handlers =====

  /**
   * Handle block announcement
   */
  private async handleBlockAnnouncement(
    message: IBlockAnnouncementMessage,
  ): Promise<void> {
    const { blockId, nodeId } = message.payload;

    // Update location metadata
    await this.availabilityService.updateLocation(blockId, {
      nodeId,
      lastSeen: new Date(message.timestamp),
      isAuthoritative: true,
    });

    // Forward to gossip service for propagation
    await this.gossipService.handleAnnouncement({
      type: 'add',
      blockId,
      nodeId,
      timestamp: new Date(message.timestamp),
      ttl: message.payload.ttl,
    });
  }

  /**
   * Handle block removal
   */
  private async handleBlockRemoval(
    message: IBlockRemovalMessage,
  ): Promise<void> {
    const { blockId, nodeId } = message.payload;

    // Remove location
    await this.availabilityService.removeLocation(blockId, nodeId);

    // Forward to gossip service for propagation
    await this.gossipService.handleAnnouncement({
      type: 'remove',
      blockId,
      nodeId,
      timestamp: new Date(message.timestamp),
      ttl: message.payload.ttl,
    });
  }

  /**
   * Handle announcement batch
   */
  private async handleAnnouncementBatch(
    message: IAnnouncementBatchMessage,
  ): Promise<void> {
    for (const announcement of message.payload.announcements) {
      if (announcement.type === 'add') {
        await this.availabilityService.updateLocation(announcement.blockId, {
          nodeId: announcement.nodeId,
          lastSeen: new Date(message.timestamp),
          isAuthoritative: true,
        });
      } else {
        await this.availabilityService.removeLocation(
          announcement.blockId,
          announcement.nodeId,
        );
      }

      // Forward to gossip service
      await this.gossipService.handleAnnouncement({
        type: announcement.type,
        blockId: announcement.blockId,
        nodeId: announcement.nodeId,
        timestamp: new Date(message.timestamp),
        ttl: announcement.ttl,
      });
    }
  }

  // ===== Heartbeat Handlers =====

  /**
   * Handle ping message
   */
  private async handlePing(
    connection: IWebSocketConnection,
    message: IPingMessage,
  ): Promise<void> {
    const response: IPongMessage = {
      type: HeartbeatMessageType.PONG,
      payload: {
        nodeId: this.localNodeId,
      },
      timestamp: new Date().toISOString(),
      requestId: message.requestId,
    };

    connection.send(response);
  }

  // ===== Message Passing Handlers =====

  private async handleMessageSend(
    _connection: IWebSocketConnection,
    message: IMessageSendMessage,
  ): Promise<void> {
    if (!this.messageRouter) return;
    await this.messageRouter.routeMessage(
      message.payload.messageId,
      message.payload.recipients,
    );
  }

  private async handleMessageReceived(
    message: IMessageReceivedMessage,
  ): Promise<void> {
    if (!this.messageRouter) return;
    await this.messageRouter.handleIncomingMessage(
      message.payload.messageId,
      message.payload.recipientId,
    );
  }

  private async handleMessageAck(_message: IMessageAckMessage): Promise<void> {
    // ACK handled by MessagePassingService
  }

  private async handleMessageQuery(
    _connection: IWebSocketConnection,
    _message: IMessageQueryMessage,
  ): Promise<void> {
    // Query handled by MessagePassingService
  }

  private async handleEventSubscribe(
    _connection: IWebSocketConnection,
    _message: IEventSubscribeMessage,
  ): Promise<void> {
    // Subscription handled by MessageEventsWebSocketHandler
  }
}
