/**
 * @fileoverview Unit tests for GossipService.announceMessage()
 *
 * Tests that announceMessage creates BlockAnnouncements with correct
 * priority-based TTL and messageDelivery metadata, and that
 * flushAnnouncements uses priority-based fanout grouping.
 *
 * @see Requirements 3.1, 3.2, 3.3
 */

import {
  BlockAnnouncement,
  GossipConfig,
  MessageDeliveryMetadata,
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

describe('GossipService.announceMessage()', () => {
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

  // Generate enough peers to test fanout differences
  const manyPeers = Array.from({ length: 10 }, (_, i) => `peer-${i}`);

  const normalMetadata: MessageDeliveryMetadata = {
    messageId: 'msg-001',
    recipientIds: ['recipient-1', 'recipient-2'],
    priority: 'normal',
    blockIds: ['block-a', 'block-b'],
    cblBlockId: 'cbl-001',
    ackRequired: true,
  };

  const highMetadata: MessageDeliveryMetadata = {
    messageId: 'msg-002',
    recipientIds: ['recipient-3'],
    priority: 'high',
    blockIds: ['block-c'],
    cblBlockId: 'cbl-002',
    ackRequired: false,
  };

  describe('announcement creation', () => {
    it('should create one BlockAnnouncement per blockId', async () => {
      const peerProvider = new MockPeerProvider('local-node', manyPeers);
      const service = new GossipService(peerProvider, defaultConfig);

      await service.announceMessage(
        ['block-1', 'block-2', 'block-3'],
        normalMetadata,
      );

      const pending = service.getPendingAnnouncements();
      expect(pending.length).toBe(3);
    });

    it('should set type to "add" on all announcements', async () => {
      const peerProvider = new MockPeerProvider('local-node', manyPeers);
      const service = new GossipService(peerProvider, defaultConfig);

      await service.announceMessage(['block-1', 'block-2'], normalMetadata);

      const pending = service.getPendingAnnouncements();
      for (const announcement of pending) {
        expect(announcement.type).toBe('add');
      }
    });

    it('should set nodeId from peerProvider.getLocalNodeId()', async () => {
      const peerProvider = new MockPeerProvider('my-node-id', manyPeers);
      const service = new GossipService(peerProvider, defaultConfig);

      await service.announceMessage(['block-1'], normalMetadata);

      const pending = service.getPendingAnnouncements();
      expect(pending[0].nodeId).toBe('my-node-id');
    });

    it('should set blockId to the corresponding block ID', async () => {
      const peerProvider = new MockPeerProvider('local-node', manyPeers);
      const service = new GossipService(peerProvider, defaultConfig);

      await service.announceMessage(['block-a', 'block-b'], normalMetadata);

      const pending = service.getPendingAnnouncements();
      expect(pending[0].blockId).toBe('block-a');
      expect(pending[1].blockId).toBe('block-b');
    });

    it('should set timestamp to a Date', async () => {
      const peerProvider = new MockPeerProvider('local-node', manyPeers);
      const service = new GossipService(peerProvider, defaultConfig);

      const before = new Date();
      await service.announceMessage(['block-1'], normalMetadata);
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

    it('should attach the messageDelivery metadata to each announcement', async () => {
      const peerProvider = new MockPeerProvider('local-node', manyPeers);
      const service = new GossipService(peerProvider, defaultConfig);

      await service.announceMessage(['block-1', 'block-2'], normalMetadata);

      const pending = service.getPendingAnnouncements();
      for (const announcement of pending) {
        expect(announcement.messageDelivery).toBe(normalMetadata);
      }
    });

    it('should handle empty blockIds array (no announcements created)', async () => {
      const peerProvider = new MockPeerProvider('local-node', manyPeers);
      const service = new GossipService(peerProvider, defaultConfig);

      await service.announceMessage([], normalMetadata);

      const pending = service.getPendingAnnouncements();
      expect(pending.length).toBe(0);
    });
  });

  describe('priority-based TTL', () => {
    it('should use normal priority TTL (5) for normal-priority messages', async () => {
      const peerProvider = new MockPeerProvider('local-node', manyPeers);
      const service = new GossipService(peerProvider, defaultConfig);

      await service.announceMessage(['block-1'], normalMetadata);

      const pending = service.getPendingAnnouncements();
      expect(pending[0].ttl).toBe(5);
    });

    it('should use high priority TTL (7) for high-priority messages', async () => {
      const peerProvider = new MockPeerProvider('local-node', manyPeers);
      const service = new GossipService(peerProvider, defaultConfig);

      await service.announceMessage(['block-1'], highMetadata);

      const pending = service.getPendingAnnouncements();
      expect(pending[0].ttl).toBe(7);
    });

    it('should use custom TTL values from config', async () => {
      const customConfig: GossipConfig = {
        ...defaultConfig,
        messagePriority: {
          normal: { fanout: 4, ttl: 10 },
          high: { fanout: 8, ttl: 15 },
        },
      };
      const peerProvider = new MockPeerProvider('local-node', manyPeers);
      const service = new GossipService(peerProvider, customConfig);

      await service.announceMessage(['block-1'], normalMetadata);
      await service.announceMessage(['block-2'], highMetadata);

      const pending = service.getPendingAnnouncements();
      expect(pending[0].ttl).toBe(10); // normal custom TTL
      expect(pending[1].ttl).toBe(15); // high custom TTL
    });
  });

  describe('priority-based fanout in flushAnnouncements', () => {
    it('should use normal priority fanout (5) for normal-priority message announcements', async () => {
      const peerProvider = new MockPeerProvider('local-node', manyPeers);
      const service = new GossipService(peerProvider, defaultConfig);

      await service.announceMessage(['block-1'], normalMetadata);
      await service.flushAnnouncements();

      // Should have sent to 5 peers (normal fanout)
      const uniquePeers = new Set(
        peerProvider.sentBatches.map((b) => b.peerId),
      );
      expect(uniquePeers.size).toBe(5);
    });

    it('should use high priority fanout (7) for high-priority message announcements', async () => {
      const peerProvider = new MockPeerProvider('local-node', manyPeers);
      const service = new GossipService(peerProvider, defaultConfig);

      await service.announceMessage(['block-1'], highMetadata);
      await service.flushAnnouncements();

      // Should have sent to 7 peers (high fanout)
      const uniquePeers = new Set(
        peerProvider.sentBatches.map((b) => b.peerId),
      );
      expect(uniquePeers.size).toBe(7);
    });

    it('should use default fanout (3) for non-message announcements', async () => {
      const peerProvider = new MockPeerProvider('local-node', manyPeers);
      const service = new GossipService(peerProvider, defaultConfig);

      await service.announceBlock('block-1');
      await service.flushAnnouncements();

      // Should have sent to 3 peers (default fanout)
      const uniquePeers = new Set(
        peerProvider.sentBatches.map((b) => b.peerId),
      );
      expect(uniquePeers.size).toBe(3);
    });

    it('should group announcements by fanout and send each group separately', async () => {
      const peerProvider = new MockPeerProvider('local-node', manyPeers);
      const service = new GossipService(peerProvider, defaultConfig);

      // Queue a mix of announcement types
      await service.announceBlock('plain-block'); // default fanout=3
      await service.announceMessage(['msg-block'], normalMetadata); // normal fanout=5
      await service.announceMessage(['high-block'], highMetadata); // high fanout=7

      await service.flushAnnouncements();

      // Collect which announcements went to which peers
      const plainBlockPeers = new Set<string>();
      const normalMsgPeers = new Set<string>();
      const highMsgPeers = new Set<string>();

      for (const batch of peerProvider.sentBatches) {
        for (const ann of batch.announcements) {
          if (ann.blockId === 'plain-block') {
            plainBlockPeers.add(batch.peerId);
          } else if (ann.blockId === 'msg-block') {
            normalMsgPeers.add(batch.peerId);
          } else if (ann.blockId === 'high-block') {
            highMsgPeers.add(batch.peerId);
          }
        }
      }

      // Each group should have been sent to its respective fanout count
      expect(plainBlockPeers.size).toBe(3); // default fanout
      expect(normalMsgPeers.size).toBe(5); // normal priority fanout
      expect(highMsgPeers.size).toBe(7); // high priority fanout
    });

    it('should handle mixed announcements with same priority in one group', async () => {
      const peerProvider = new MockPeerProvider('local-node', manyPeers);
      const service = new GossipService(peerProvider, defaultConfig);

      // Two normal-priority message announcements should be grouped together
      await service.announceMessage(['block-a', 'block-b'], normalMetadata);

      await service.flushAnnouncements();

      // Both blocks should go to the same set of 5 peers
      const uniquePeers = new Set(
        peerProvider.sentBatches.map((b) => b.peerId),
      );
      expect(uniquePeers.size).toBe(5);

      // Each peer should receive both announcements in one batch
      for (const batch of peerProvider.sentBatches) {
        expect(batch.announcements.length).toBe(2);
      }
    });
  });
});
