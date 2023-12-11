/**
 * @fileoverview Unit tests for GossipService.sendDeliveryAck()
 *
 * Tests that sendDeliveryAck creates a BlockAnnouncement of type 'ack'
 * with deliveryAck metadata and queues it for batch sending.
 *
 * @see Requirements 4.1, 4.2, 4.3
 */

import {
  BlockAnnouncement,
  DeliveryAckMetadata,
  GossipConfig,
} from '@brightchain/brightchain-lib';
import { GossipService, IPeerProvider } from './gossipService';

/**
 * Mock peer provider for testing
 */
class MockPeerProvider implements IPeerProvider {
  private localNodeId: string;
  private connectedPeers: string[];
  public sentBatches: Array<{
    peerId: string;
    announcements: BlockAnnouncement[];
  }> = [];

  constructor(localNodeId: string, connectedPeers: string[] = []) {
    this.localNodeId = localNodeId;
    this.connectedPeers = connectedPeers;
  }

  getLocalNodeId(): string {
    return this.localNodeId;
  }

  getConnectedPeerIds(): string[] {
    return this.connectedPeers;
  }

  async sendAnnouncementBatch(
    peerId: string,
    announcements: BlockAnnouncement[],
  ): Promise<void> {
    this.sentBatches.push({ peerId, announcements: [...announcements] });
  }

  async getPeerPublicKey(_peerId: string): Promise<Buffer | null> {
    return null;
  }
}

describe('GossipService.sendDeliveryAck()', () => {
  const defaultConfig: GossipConfig = {
    fanout: 3,
    defaultTtl: 3,
    batchIntervalMs: 1000,
    maxBatchSize: 100,
    messagePriority: {
      normal: { fanout: 5, ttl: 5 },
      high: { fanout: 7, ttl: 7 },
    },
  };

  const peers = Array.from({ length: 10 }, (_, i) => `peer-${i}`);

  const deliveredAck: DeliveryAckMetadata = {
    messageId: 'msg-001',
    recipientId: 'recipient-1',
    status: 'delivered',
    originalSenderNode: 'sender-node-1',
  };

  const failedAck: DeliveryAckMetadata = {
    messageId: 'msg-002',
    recipientId: 'recipient-2',
    status: 'failed',
    originalSenderNode: 'sender-node-2',
  };

  const bouncedAck: DeliveryAckMetadata = {
    messageId: 'msg-003',
    recipientId: 'recipient-3',
    status: 'bounced',
    originalSenderNode: 'sender-node-3',
  };

  describe('announcement creation', () => {
    it('should create exactly one BlockAnnouncement', async () => {
      const peerProvider = new MockPeerProvider('local-node', peers);
      const service = new GossipService(peerProvider, defaultConfig);

      await service.sendDeliveryAck(deliveredAck);

      const pending = service.getPendingAnnouncements();
      expect(pending.length).toBe(1);
    });

    it('should set type to "ack"', async () => {
      const peerProvider = new MockPeerProvider('local-node', peers);
      const service = new GossipService(peerProvider, defaultConfig);

      await service.sendDeliveryAck(deliveredAck);

      const pending = service.getPendingAnnouncements();
      expect(pending[0].type).toBe('ack');
    });

    it('should set blockId to ack.messageId', async () => {
      const peerProvider = new MockPeerProvider('local-node', peers);
      const service = new GossipService(peerProvider, defaultConfig);

      await service.sendDeliveryAck(deliveredAck);

      const pending = service.getPendingAnnouncements();
      expect(pending[0].blockId).toBe('msg-001');
    });

    it('should set nodeId from peerProvider.getLocalNodeId()', async () => {
      const peerProvider = new MockPeerProvider('my-ack-node', peers);
      const service = new GossipService(peerProvider, defaultConfig);

      await service.sendDeliveryAck(deliveredAck);

      const pending = service.getPendingAnnouncements();
      expect(pending[0].nodeId).toBe('my-ack-node');
    });

    it('should set timestamp to a Date', async () => {
      const peerProvider = new MockPeerProvider('local-node', peers);
      const service = new GossipService(peerProvider, defaultConfig);

      const before = new Date();
      await service.sendDeliveryAck(deliveredAck);
      const after = new Date();

      const pending = service.getPendingAnnouncements();
      expect(pending[0].timestamp).toBeInstanceOf(Date);
      expect(pending[0].timestamp.getTime()).toBeGreaterThanOrEqual(
        before.getTime(),
      );
      expect(pending[0].timestamp.getTime()).toBeLessThanOrEqual(
        after.getTime(),
      );
    });

    it('should set ttl to config.defaultTtl', async () => {
      const peerProvider = new MockPeerProvider('local-node', peers);
      const service = new GossipService(peerProvider, defaultConfig);

      await service.sendDeliveryAck(deliveredAck);

      const pending = service.getPendingAnnouncements();
      expect(pending[0].ttl).toBe(3);
    });

    it('should use custom defaultTtl from config', async () => {
      const customConfig: GossipConfig = {
        ...defaultConfig,
        defaultTtl: 10,
      };
      const peerProvider = new MockPeerProvider('local-node', peers);
      const service = new GossipService(peerProvider, customConfig);

      await service.sendDeliveryAck(deliveredAck);

      const pending = service.getPendingAnnouncements();
      expect(pending[0].ttl).toBe(10);
    });

    it('should attach the deliveryAck metadata to the announcement', async () => {
      const peerProvider = new MockPeerProvider('local-node', peers);
      const service = new GossipService(peerProvider, defaultConfig);

      await service.sendDeliveryAck(deliveredAck);

      const pending = service.getPendingAnnouncements();
      expect(pending[0].deliveryAck).toBe(deliveredAck);
    });

    it('should not set messageDelivery on the announcement', async () => {
      const peerProvider = new MockPeerProvider('local-node', peers);
      const service = new GossipService(peerProvider, defaultConfig);

      await service.sendDeliveryAck(deliveredAck);

      const pending = service.getPendingAnnouncements();
      expect(pending[0].messageDelivery).toBeUndefined();
    });
  });

  describe('ack status variants', () => {
    it('should handle "delivered" status ack (Req 4.1)', async () => {
      const peerProvider = new MockPeerProvider('local-node', peers);
      const service = new GossipService(peerProvider, defaultConfig);

      await service.sendDeliveryAck(deliveredAck);

      const pending = service.getPendingAnnouncements();
      expect(pending[0].deliveryAck?.status).toBe('delivered');
      expect(pending[0].deliveryAck?.originalSenderNode).toBe('sender-node-1');
    });

    it('should handle "failed" status ack (Req 4.2)', async () => {
      const peerProvider = new MockPeerProvider('local-node', peers);
      const service = new GossipService(peerProvider, defaultConfig);

      await service.sendDeliveryAck(failedAck);

      const pending = service.getPendingAnnouncements();
      expect(pending[0].deliveryAck?.status).toBe('failed');
    });

    it('should handle "bounced" status ack (Req 4.3)', async () => {
      const peerProvider = new MockPeerProvider('local-node', peers);
      const service = new GossipService(peerProvider, defaultConfig);

      await service.sendDeliveryAck(bouncedAck);

      const pending = service.getPendingAnnouncements();
      expect(pending[0].deliveryAck?.status).toBe('bounced');
    });
  });

  describe('queuing behavior', () => {
    it('should queue the ack announcement for batch sending', async () => {
      const peerProvider = new MockPeerProvider('local-node', peers);
      const service = new GossipService(peerProvider, defaultConfig);

      await service.sendDeliveryAck(deliveredAck);
      await service.flushAnnouncements();

      // Should have sent to peers (default fanout = 3 for ack announcements)
      const uniquePeers = new Set(
        peerProvider.sentBatches.map((b) => b.peerId),
      );
      expect(uniquePeers.size).toBe(3);
    });

    it('should allow multiple acks to be queued', async () => {
      const peerProvider = new MockPeerProvider('local-node', peers);
      const service = new GossipService(peerProvider, defaultConfig);

      await service.sendDeliveryAck(deliveredAck);
      await service.sendDeliveryAck(failedAck);
      await service.sendDeliveryAck(bouncedAck);

      const pending = service.getPendingAnnouncements();
      expect(pending.length).toBe(3);
      expect(pending[0].deliveryAck?.status).toBe('delivered');
      expect(pending[1].deliveryAck?.status).toBe('failed');
      expect(pending[2].deliveryAck?.status).toBe('bounced');
    });
  });
});
