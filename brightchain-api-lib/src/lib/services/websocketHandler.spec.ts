/**
 * Unit tests for WebSocket message handler
 */

import {
  IAvailabilityService,
  IBlockRegistry,
  IDiscoveryProtocol,
  IGossipService,
  IHeartbeatMonitor,
} from '@brightchain/brightchain-lib';
import {
  DiscoveryMessageType,
  GossipMessageType,
  HeartbeatMessageType,
} from '../enumerations/websocketMessageType';
import {
  IBlockAnnouncementMessage,
  IBlockQueryMessage,
  IBlockRemovalMessage,
  IBloomFilterRequest,
  IManifestRequest,
  IPingMessage,
} from '../interfaces/websocketMessages';
import { IWebSocketConnection, WebSocketHandler } from './websocketHandler';

describe('WebSocketHandler', () => {
  let handler: WebSocketHandler;
  let mockBlockRegistry: jest.Mocked<IBlockRegistry>;
  let mockDiscoveryProtocol: jest.Mocked<IDiscoveryProtocol>;
  let mockGossipService: jest.Mocked<IGossipService>;
  let mockHeartbeatMonitor: jest.Mocked<IHeartbeatMonitor>;
  let mockAvailabilityService: jest.Mocked<IAvailabilityService>;
  let mockConnection: jest.Mocked<IWebSocketConnection>;

  beforeEach(() => {
    // Create mocks
    mockBlockRegistry = {
      hasLocal: jest.fn(),
      addLocal: jest.fn(),
      removeLocal: jest.fn(),
      getLocalCount: jest.fn(),
      getLocalBlockIds: jest.fn(),
      exportBloomFilter: jest.fn(),
      exportManifest: jest.fn(),
      exportPoolScopedBloomFilter: jest.fn(),
      exportPoolScopedManifest: jest.fn(),
      rebuild: jest.fn(),
    } as jest.Mocked<IBlockRegistry>;

    mockDiscoveryProtocol = {} as jest.Mocked<IDiscoveryProtocol>;

    mockGossipService = {
      handleAnnouncement: jest.fn().mockResolvedValue(undefined),
    } as unknown as jest.Mocked<IGossipService>;

    mockHeartbeatMonitor = {} as jest.Mocked<IHeartbeatMonitor>;

    mockAvailabilityService = {
      updateLocation: jest.fn().mockResolvedValue(undefined),
      removeLocation: jest.fn().mockResolvedValue(undefined),
    } as unknown as jest.Mocked<IAvailabilityService>;

    mockConnection = {
      id: 'test-connection-1',
      send: jest.fn(),
      on: jest.fn(),
      off: jest.fn(),
    } as jest.Mocked<IWebSocketConnection>;

    // Create handler
    handler = new WebSocketHandler({
      localNodeId: 'local-node-1',
      blockRegistry: mockBlockRegistry,
      discoveryProtocol: mockDiscoveryProtocol,
      gossipService: mockGossipService,
      heartbeatMonitor: mockHeartbeatMonitor,
      availabilityService: mockAvailabilityService,
    });
  });

  describe('Connection Management', () => {
    it('should register a connection', () => {
      handler.registerConnection(mockConnection);
      expect(mockConnection.on).toHaveBeenCalledWith(
        'message',
        expect.any(Function),
      );
      expect(mockConnection.on).toHaveBeenCalledWith(
        'disconnect',
        expect.any(Function),
      );
    });

    it('should unregister a connection', () => {
      handler.registerConnection(mockConnection);
      handler.unregisterConnection(mockConnection.id);
      // Connection should be removed from internal map
    });
  });

  describe('Discovery Protocol Handlers', () => {
    beforeEach(() => {
      handler.registerConnection(mockConnection);
    });

    it('should handle Bloom filter request', async () => {
      const bloomFilter = {
        data: Buffer.from([1, 2, 3]).toString('base64'),
        hashCount: 7,
        bitCount: 1024,
        itemCount: 10,
        mightContain: jest.fn(),
      };
      mockBlockRegistry.exportBloomFilter.mockReturnValue(bloomFilter);

      const request: IBloomFilterRequest = {
        type: DiscoveryMessageType.BLOOM_FILTER_REQUEST,
        payload: { nodeId: 'remote-node-1' },
        timestamp: new Date().toISOString(),
        requestId: 'req-1',
      };

      // Simulate message reception
      const messageHandler = (mockConnection.on as jest.Mock).mock.calls.find(
        (call) => call[0] === 'message',
      )?.[1];
      await messageHandler(request);

      expect(mockBlockRegistry.exportBloomFilter).toHaveBeenCalled();
      expect(mockConnection.send).toHaveBeenCalledWith(
        expect.objectContaining({
          type: DiscoveryMessageType.BLOOM_FILTER_RESPONSE,
          requestId: 'req-1',
          payload: expect.objectContaining({
            nodeId: 'local-node-1',
            bloomFilter: expect.objectContaining({
              hashCount: 7,
              bitCount: 1024,
              itemCount: 10,
            }),
          }),
        }),
      );
    });

    it('should handle block query', async () => {
      mockBlockRegistry.hasLocal.mockReturnValue(true);

      const query: IBlockQueryMessage = {
        type: DiscoveryMessageType.BLOCK_QUERY,
        payload: {
          blockId: 'block-123',
          requestingNodeId: 'remote-node-1',
        },
        timestamp: new Date().toISOString(),
        requestId: 'req-2',
      };

      const messageHandler = (mockConnection.on as jest.Mock).mock.calls.find(
        (call) => call[0] === 'message',
      )?.[1];
      await messageHandler(query);

      expect(mockBlockRegistry.hasLocal).toHaveBeenCalledWith('block-123');
      expect(mockConnection.send).toHaveBeenCalledWith(
        expect.objectContaining({
          type: DiscoveryMessageType.BLOCK_QUERY_RESPONSE,
          requestId: 'req-2',
          payload: expect.objectContaining({
            blockId: 'block-123',
            hasBlock: true,
            nodeId: 'local-node-1',
          }),
        }),
      );
    });

    it('should handle manifest request', async () => {
      const manifest = {
        nodeId: 'local-node-1',
        blockIds: ['block-1', 'block-2', 'block-3'],
        generatedAt: new Date(),
        checksum: 'abc123',
      };
      mockBlockRegistry.exportManifest.mockReturnValue(manifest);

      const request: IManifestRequest = {
        type: DiscoveryMessageType.MANIFEST_REQUEST,
        payload: { nodeId: 'remote-node-1' },
        timestamp: new Date().toISOString(),
        requestId: 'req-3',
      };

      const messageHandler = (mockConnection.on as jest.Mock).mock.calls.find(
        (call) => call[0] === 'message',
      )?.[1];
      await messageHandler(request);

      expect(mockBlockRegistry.exportManifest).toHaveBeenCalled();
      expect(mockConnection.send).toHaveBeenCalledWith(
        expect.objectContaining({
          type: DiscoveryMessageType.MANIFEST_RESPONSE,
          requestId: 'req-3',
          payload: expect.objectContaining({
            nodeId: 'local-node-1',
            blockIds: ['block-1', 'block-2', 'block-3'],
            checksum: 'abc123',
          }),
        }),
      );
    });
  });

  describe('Gossip Protocol Handlers', () => {
    beforeEach(() => {
      handler.registerConnection(mockConnection);
    });

    it('should handle block announcement', async () => {
      const announcement: IBlockAnnouncementMessage = {
        type: GossipMessageType.BLOCK_ANNOUNCEMENT,
        payload: {
          blockId: 'block-456',
          nodeId: 'remote-node-2',
          ttl: 3,
        },
        timestamp: new Date().toISOString(),
      };

      const messageHandler = (mockConnection.on as jest.Mock).mock.calls.find(
        (call) => call[0] === 'message',
      )?.[1];
      await messageHandler(announcement);

      expect(mockAvailabilityService.updateLocation).toHaveBeenCalledWith(
        'block-456',
        expect.objectContaining({
          nodeId: 'remote-node-2',
          isAuthoritative: true,
        }),
      );
      expect(mockGossipService.handleAnnouncement).toHaveBeenCalledWith(
        expect.objectContaining({
          type: 'add',
          blockId: 'block-456',
          nodeId: 'remote-node-2',
          ttl: 3,
        }),
      );
    });

    it('should handle block removal', async () => {
      const removal: IBlockRemovalMessage = {
        type: GossipMessageType.BLOCK_REMOVAL,
        payload: {
          blockId: 'block-789',
          nodeId: 'remote-node-3',
          ttl: 2,
        },
        timestamp: new Date().toISOString(),
      };

      const messageHandler = (mockConnection.on as jest.Mock).mock.calls.find(
        (call) => call[0] === 'message',
      )?.[1];
      await messageHandler(removal);

      expect(mockAvailabilityService.removeLocation).toHaveBeenCalledWith(
        'block-789',
        'remote-node-3',
      );
      expect(mockGossipService.handleAnnouncement).toHaveBeenCalledWith(
        expect.objectContaining({
          type: 'remove',
          blockId: 'block-789',
          nodeId: 'remote-node-3',
          ttl: 2,
        }),
      );
    });
  });

  describe('Heartbeat Handlers', () => {
    beforeEach(() => {
      handler.registerConnection(mockConnection);
    });

    it('should handle ping and respond with pong', async () => {
      const ping: IPingMessage = {
        type: HeartbeatMessageType.PING,
        payload: { nodeId: 'remote-node-4' },
        timestamp: new Date().toISOString(),
        requestId: 'req-4',
      };

      const messageHandler = (mockConnection.on as jest.Mock).mock.calls.find(
        (call) => call[0] === 'message',
      )?.[1];
      await messageHandler(ping);

      expect(mockConnection.send).toHaveBeenCalledWith(
        expect.objectContaining({
          type: HeartbeatMessageType.PONG,
          requestId: 'req-4',
          payload: expect.objectContaining({
            nodeId: 'local-node-1',
          }),
        }),
      );
    });
  });

  describe('Ack Forwarding (Requirement 8.4)', () => {
    beforeEach(() => {
      handler.registerConnection(mockConnection);
    });

    it('should forward ack type announcements in batch to gossip service', async () => {
      const batchMessage = {
        type: GossipMessageType.ANNOUNCEMENT_BATCH,
        payload: {
          announcements: [
            {
              type: 'ack' as const,
              blockId: 'block-ack-1',
              nodeId: 'recipient-node-1',
              ttl: 3,
              deliveryAck: {
                messageId: 'msg-123',
                recipientId: 'user-456',
                status: 'delivered' as const,
                originalSenderNode: 'sender-node-1',
              },
            },
          ],
        },
        timestamp: new Date().toISOString(),
      };

      const messageHandler = (mockConnection.on as jest.Mock).mock.calls.find(
        (call) => call[0] === 'message',
      )?.[1];
      await messageHandler(batchMessage);

      // Should forward to gossip service with ack type and deliveryAck metadata
      expect(mockGossipService.handleAnnouncement).toHaveBeenCalledWith(
        expect.objectContaining({
          type: 'ack',
          blockId: 'block-ack-1',
          nodeId: 'recipient-node-1',
          ttl: 3,
          deliveryAck: {
            messageId: 'msg-123',
            recipientId: 'user-456',
            status: 'delivered',
            originalSenderNode: 'sender-node-1',
          },
        }),
      );

      // Should NOT update availability service for ack announcements
      expect(mockAvailabilityService.updateLocation).not.toHaveBeenCalled();
      expect(mockAvailabilityService.removeLocation).not.toHaveBeenCalled();
    });

    it('should handle mixed batch with add, remove, and ack announcements', async () => {
      const batchMessage = {
        type: GossipMessageType.ANNOUNCEMENT_BATCH,
        payload: {
          announcements: [
            {
              type: 'add' as const,
              blockId: 'block-add-1',
              nodeId: 'node-1',
              ttl: 3,
            },
            {
              type: 'ack' as const,
              blockId: 'block-ack-1',
              nodeId: 'recipient-node-1',
              ttl: 3,
              deliveryAck: {
                messageId: 'msg-456',
                recipientId: 'user-789',
                status: 'failed' as const,
                originalSenderNode: 'sender-node-2',
              },
            },
            {
              type: 'remove' as const,
              blockId: 'block-remove-1',
              nodeId: 'node-2',
              ttl: 2,
            },
          ],
        },
        timestamp: new Date().toISOString(),
      };

      const messageHandler = (mockConnection.on as jest.Mock).mock.calls.find(
        (call) => call[0] === 'message',
      )?.[1];
      messageHandler(batchMessage);

      // Wait for all async operations to complete
      await new Promise((resolve) => setTimeout(resolve, 50));

      // All three should be forwarded to gossip service
      expect(mockGossipService.handleAnnouncement).toHaveBeenCalledTimes(3);

      // 'add' should update availability
      expect(mockAvailabilityService.updateLocation).toHaveBeenCalledWith(
        'block-add-1',
        expect.objectContaining({ nodeId: 'node-1' }),
      );

      // 'remove' should remove location
      expect(mockAvailabilityService.removeLocation).toHaveBeenCalledWith(
        'block-remove-1',
        'node-2',
      );

      // 'ack' should be forwarded with deliveryAck metadata
      expect(mockGossipService.handleAnnouncement).toHaveBeenCalledWith(
        expect.objectContaining({
          type: 'ack',
          blockId: 'block-ack-1',
          deliveryAck: expect.objectContaining({
            messageId: 'msg-456',
            status: 'failed',
          }),
        }),
      );
    });
  });

  describe('Broadcasting', () => {
    it('should broadcast message to all connections', () => {
      const connection1 = { ...mockConnection, id: 'conn-1' };
      const connection2 = { ...mockConnection, id: 'conn-2' };

      handler.registerConnection(connection1);
      handler.registerConnection(connection2);

      const message: IPingMessage = {
        type: HeartbeatMessageType.PING,
        payload: { nodeId: 'local-node-1' },
        timestamp: new Date().toISOString(),
        requestId: 'broadcast-1',
      };

      handler.broadcast(message);

      expect(connection1.send).toHaveBeenCalledWith(message);
      expect(connection2.send).toHaveBeenCalledWith(message);
    });
  });
});
