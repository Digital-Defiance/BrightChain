/**
 * @fileoverview Unit tests for GossipService.handleAnnouncement()
 *
 * Tests the extended handleAnnouncement() method which differentiates between:
 * - Message delivery announcements (with messageDelivery metadata)
 * - Delivery ack announcements (type 'ack')
 * - Plain block announcements (backward compatible)
 *
 * @see Requirements 3.4, 3.5, 3.6, 4.4
 */

import {
  BlockAnnouncement,
  DeliveryAckMetadata,
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

describe('GossipService.handleAnnouncement()', () => {
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

  const makeMessageDeliveryAnnouncement = (
    overrides: Partial<BlockAnnouncement> = {},
    metadataOverrides: Partial<MessageDeliveryMetadata> = {},
  ): BlockAnnouncement => ({
    type: 'add',
    blockId: 'block-001',
    nodeId: 'sender-node',
    timestamp: new Date(),
    ttl: 5,
    messageDelivery: {
      messageId: 'msg-001',
      recipientIds: ['user-1', 'user-2'],
      priority: 'normal',
      blockIds: ['block-001', 'block-002'],
      cblBlockId: 'cbl-001',
      ackRequired: true,
      ...metadataOverrides,
    },
    ...overrides,
  });

  const makeAckAnnouncement = (
    overrides: Partial<BlockAnnouncement> = {},
    ackOverrides: Partial<DeliveryAckMetadata> = {},
  ): BlockAnnouncement => ({
    type: 'ack',
    blockId: 'msg-001',
    nodeId: 'recipient-node',
    timestamp: new Date(),
    ttl: 3,
    deliveryAck: {
      messageId: 'msg-001',
      recipientId: 'user-1',
      status: 'delivered',
      originalSenderNode: 'sender-node',
      ...ackOverrides,
    },
    ...overrides,
  });

  const makePlainAnnouncement = (
    overrides: Partial<BlockAnnouncement> = {},
  ): BlockAnnouncement => ({
    type: 'add',
    blockId: 'plain-block-001',
    nodeId: 'some-node',
    timestamp: new Date(),
    ttl: 3,
    ...overrides,
  });

  describe('message delivery announcements with matching local recipients', () => {
    it('should trigger message delivery handlers when recipientIds match local users', async () => {
      const localUsers = new Set(['user-1', 'user-3']);
      const peerProvider = new MockPeerProvider('local-node', peers);
      const service = new GossipService(
        peerProvider,
        defaultConfig,
        localUsers,
      );

      const receivedAnnouncements: BlockAnnouncement[] = [];
      service.onMessageDelivery((ann) => receivedAnnouncements.push(ann));

      const announcement = makeMessageDeliveryAnnouncement();
      await service.handleAnnouncement(announcement);

      expect(receivedAnnouncements.length).toBe(1);
      expect(receivedAnnouncements[0]).toBe(announcement);
    });

    it('should NOT trigger general announcement handlers for message delivery', async () => {
      const localUsers = new Set(['user-1']);
      const peerProvider = new MockPeerProvider('local-node', peers);
      const service = new GossipService(
        peerProvider,
        defaultConfig,
        localUsers,
      );

      const generalReceived: BlockAnnouncement[] = [];
      service.onAnnouncement((ann) => generalReceived.push(ann));

      await service.handleAnnouncement(makeMessageDeliveryAnnouncement());

      expect(generalReceived.length).toBe(0);
    });

    it('should NOT forward the announcement when local recipients match', async () => {
      const localUsers = new Set(['user-1']);
      const peerProvider = new MockPeerProvider('local-node', peers);
      const service = new GossipService(
        peerProvider,
        defaultConfig,
        localUsers,
      );

      await service.handleAnnouncement(makeMessageDeliveryAnnouncement());

      // No forwarded announcements should be pending
      const pending = service.getPendingAnnouncements();
      // Only ack announcements should be pending (from auto-ack), not forwarded copies
      for (const ann of pending) {
        expect(ann.type).toBe('ack');
      }
    });

    it('should auto-send delivery ack when ackRequired is true and local recipients match', async () => {
      const localUsers = new Set(['user-1', 'user-2']);
      const peerProvider = new MockPeerProvider('local-node', peers);
      const service = new GossipService(
        peerProvider,
        defaultConfig,
        localUsers,
      );

      const announcement = makeMessageDeliveryAnnouncement();
      await service.handleAnnouncement(announcement);

      // Should have queued ack announcements for each matching local recipient
      const pending = service.getPendingAnnouncements();
      const ackAnnouncements = pending.filter((a) => a.type === 'ack');
      expect(ackAnnouncements.length).toBe(2);

      // Verify ack metadata
      const ack1 = ackAnnouncements[0].deliveryAck!;
      expect(ack1.messageId).toBe('msg-001');
      expect(ack1.status).toBe('delivered');
      expect(ack1.originalSenderNode).toBe('sender-node');

      const recipientIds = ackAnnouncements.map(
        (a) => a.deliveryAck!.recipientId,
      );
      expect(recipientIds).toContain('user-1');
      expect(recipientIds).toContain('user-2');
    });

    it('should only auto-ack for matching local recipients, not all recipientIds', async () => {
      const localUsers = new Set(['user-1']); // Only user-1 is local
      const peerProvider = new MockPeerProvider('local-node', peers);
      const service = new GossipService(
        peerProvider,
        defaultConfig,
        localUsers,
      );

      // Announcement targets user-1 and user-2
      const announcement = makeMessageDeliveryAnnouncement();
      await service.handleAnnouncement(announcement);

      const pending = service.getPendingAnnouncements();
      const ackAnnouncements = pending.filter((a) => a.type === 'ack');
      expect(ackAnnouncements.length).toBe(1);
      expect(ackAnnouncements[0].deliveryAck!.recipientId).toBe('user-1');
    });

    it('should NOT auto-send ack when ackRequired is false', async () => {
      const localUsers = new Set(['user-1']);
      const peerProvider = new MockPeerProvider('local-node', peers);
      const service = new GossipService(
        peerProvider,
        defaultConfig,
        localUsers,
      );

      const announcement = makeMessageDeliveryAnnouncement(
        {},
        { ackRequired: false },
      );
      await service.handleAnnouncement(announcement);

      const pending = service.getPendingAnnouncements();
      expect(pending.length).toBe(0);
    });

    it('should call multiple message delivery handlers', async () => {
      const localUsers = new Set(['user-1']);
      const peerProvider = new MockPeerProvider('local-node', peers);
      const service = new GossipService(
        peerProvider,
        defaultConfig,
        localUsers,
      );

      let handler1Called = false;
      let handler2Called = false;
      service.onMessageDelivery(() => {
        handler1Called = true;
      });
      service.onMessageDelivery(() => {
        handler2Called = true;
      });

      await service.handleAnnouncement(makeMessageDeliveryAnnouncement());

      expect(handler1Called).toBe(true);
      expect(handler2Called).toBe(true);
    });

    it('should continue calling handlers even if one throws', async () => {
      const localUsers = new Set(['user-1']);
      const peerProvider = new MockPeerProvider('local-node', peers);
      const service = new GossipService(
        peerProvider,
        defaultConfig,
        localUsers,
      );

      let handler2Called = false;
      service.onMessageDelivery(() => {
        throw new Error('handler error');
      });
      service.onMessageDelivery(() => {
        handler2Called = true;
      });

      await service.handleAnnouncement(makeMessageDeliveryAnnouncement());

      expect(handler2Called).toBe(true);
    });
  });

  describe('message delivery announcements with no matching local recipients', () => {
    it('should forward normally when recipientIds do not match any local users', async () => {
      const localUsers = new Set(['user-99']); // No match
      const peerProvider = new MockPeerProvider('local-node', peers);
      const service = new GossipService(
        peerProvider,
        defaultConfig,
        localUsers,
      );

      const announcement = makeMessageDeliveryAnnouncement(
        {},
        { recipientIds: ['user-1', 'user-2'] },
      );
      await service.handleAnnouncement(announcement);

      const pending = service.getPendingAnnouncements();
      expect(pending.length).toBe(1);
      expect(pending[0].type).toBe('add');
      expect(pending[0].ttl).toBe(announcement.ttl - 1);
      expect(pending[0].messageDelivery).toBeDefined();
    });

    it('should NOT trigger message delivery handlers when no local recipients match', async () => {
      const localUsers = new Set(['user-99']);
      const peerProvider = new MockPeerProvider('local-node', peers);
      const service = new GossipService(
        peerProvider,
        defaultConfig,
        localUsers,
      );

      const received: BlockAnnouncement[] = [];
      service.onMessageDelivery((ann) => received.push(ann));

      await service.handleAnnouncement(makeMessageDeliveryAnnouncement());

      expect(received.length).toBe(0);
    });

    it('should NOT send any ack when no local recipients match', async () => {
      const localUsers = new Set(['user-99']);
      const peerProvider = new MockPeerProvider('local-node', peers);
      const service = new GossipService(
        peerProvider,
        defaultConfig,
        localUsers,
      );

      await service.handleAnnouncement(makeMessageDeliveryAnnouncement());

      const pending = service.getPendingAnnouncements();
      const acks = pending.filter((a) => a.type === 'ack');
      expect(acks.length).toBe(0);
    });

    it('should not forward when TTL is 0', async () => {
      const localUsers = new Set(['user-99']);
      const peerProvider = new MockPeerProvider('local-node', peers);
      const service = new GossipService(
        peerProvider,
        defaultConfig,
        localUsers,
      );

      const announcement = makeMessageDeliveryAnnouncement({ ttl: 0 });
      await service.handleAnnouncement(announcement);

      const pending = service.getPendingAnnouncements();
      expect(pending.length).toBe(0);
    });

    it('should forward with empty localUserIds set', async () => {
      const peerProvider = new MockPeerProvider('local-node', peers);
      const service = new GossipService(peerProvider, defaultConfig); // No localUserIds

      await service.handleAnnouncement(makeMessageDeliveryAnnouncement());

      const pending = service.getPendingAnnouncements();
      expect(pending.length).toBe(1);
      expect(pending[0].ttl).toBe(4); // decremented from 5
    });
  });

  describe('ack type announcements', () => {
    it('should dispatch to delivery ack handlers', async () => {
      const peerProvider = new MockPeerProvider('local-node', peers);
      const service = new GossipService(peerProvider, defaultConfig);

      const received: BlockAnnouncement[] = [];
      service.onDeliveryAck((ann) => received.push(ann));

      const ackAnnouncement = makeAckAnnouncement();
      await service.handleAnnouncement(ackAnnouncement);

      expect(received.length).toBe(1);
      expect(received[0]).toBe(ackAnnouncement);
    });

    it('should NOT dispatch to general announcement handlers', async () => {
      const peerProvider = new MockPeerProvider('local-node', peers);
      const service = new GossipService(peerProvider, defaultConfig);

      const generalReceived: BlockAnnouncement[] = [];
      service.onAnnouncement((ann) => generalReceived.push(ann));

      await service.handleAnnouncement(makeAckAnnouncement());

      expect(generalReceived.length).toBe(0);
    });

    it('should NOT dispatch to message delivery handlers', async () => {
      const peerProvider = new MockPeerProvider('local-node', peers);
      const service = new GossipService(peerProvider, defaultConfig);

      const msgReceived: BlockAnnouncement[] = [];
      service.onMessageDelivery((ann) => msgReceived.push(ann));

      await service.handleAnnouncement(makeAckAnnouncement());

      expect(msgReceived.length).toBe(0);
    });

    it('should forward ack with decremented TTL', async () => {
      const peerProvider = new MockPeerProvider('local-node', peers);
      const service = new GossipService(peerProvider, defaultConfig);

      await service.handleAnnouncement(makeAckAnnouncement({ ttl: 3 }));

      const pending = service.getPendingAnnouncements();
      expect(pending.length).toBe(1);
      expect(pending[0].type).toBe('ack');
      expect(pending[0].ttl).toBe(2);
    });

    it('should not forward ack when TTL is 0', async () => {
      const peerProvider = new MockPeerProvider('local-node', peers);
      const service = new GossipService(peerProvider, defaultConfig);

      await service.handleAnnouncement(makeAckAnnouncement({ ttl: 0 }));

      const pending = service.getPendingAnnouncements();
      expect(pending.length).toBe(0);
    });

    it('should call multiple delivery ack handlers', async () => {
      const peerProvider = new MockPeerProvider('local-node', peers);
      const service = new GossipService(peerProvider, defaultConfig);

      let handler1Called = false;
      let handler2Called = false;
      service.onDeliveryAck(() => {
        handler1Called = true;
      });
      service.onDeliveryAck(() => {
        handler2Called = true;
      });

      await service.handleAnnouncement(makeAckAnnouncement());

      expect(handler1Called).toBe(true);
      expect(handler2Called).toBe(true);
    });

    it('should continue calling ack handlers even if one throws', async () => {
      const peerProvider = new MockPeerProvider('local-node', peers);
      const service = new GossipService(peerProvider, defaultConfig);

      let handler2Called = false;
      service.onDeliveryAck(() => {
        throw new Error('handler error');
      });
      service.onDeliveryAck(() => {
        handler2Called = true;
      });

      await service.handleAnnouncement(makeAckAnnouncement());

      expect(handler2Called).toBe(true);
    });
  });

  describe('plain block announcements (backward compatibility)', () => {
    it('should notify general announcement handlers for plain add announcements', async () => {
      const peerProvider = new MockPeerProvider('local-node', peers);
      const service = new GossipService(peerProvider, defaultConfig);

      const received: BlockAnnouncement[] = [];
      service.onAnnouncement((ann) => received.push(ann));

      const announcement = makePlainAnnouncement();
      await service.handleAnnouncement(announcement);

      expect(received.length).toBe(1);
      expect(received[0]).toBe(announcement);
    });

    it('should notify general announcement handlers for remove announcements', async () => {
      const peerProvider = new MockPeerProvider('local-node', peers);
      const service = new GossipService(peerProvider, defaultConfig);

      const received: BlockAnnouncement[] = [];
      service.onAnnouncement((ann) => received.push(ann));

      const announcement = makePlainAnnouncement({ type: 'remove' });
      await service.handleAnnouncement(announcement);

      expect(received.length).toBe(1);
      expect(received[0].type).toBe('remove');
    });

    it('should forward plain announcements with decremented TTL', async () => {
      const peerProvider = new MockPeerProvider('local-node', peers);
      const service = new GossipService(peerProvider, defaultConfig);

      await service.handleAnnouncement(makePlainAnnouncement({ ttl: 3 }));

      const pending = service.getPendingAnnouncements();
      expect(pending.length).toBe(1);
      expect(pending[0].ttl).toBe(2);
    });

    it('should not forward plain announcements when TTL is 0', async () => {
      const peerProvider = new MockPeerProvider('local-node', peers);
      const service = new GossipService(peerProvider, defaultConfig);

      await service.handleAnnouncement(makePlainAnnouncement({ ttl: 0 }));

      const pending = service.getPendingAnnouncements();
      expect(pending.length).toBe(0);
    });

    it('should NOT trigger message delivery handlers for plain announcements', async () => {
      const peerProvider = new MockPeerProvider('local-node', peers);
      const service = new GossipService(peerProvider, defaultConfig);

      const msgReceived: BlockAnnouncement[] = [];
      service.onMessageDelivery((ann) => msgReceived.push(ann));

      await service.handleAnnouncement(makePlainAnnouncement());

      expect(msgReceived.length).toBe(0);
    });

    it('should NOT trigger delivery ack handlers for plain announcements', async () => {
      const peerProvider = new MockPeerProvider('local-node', peers);
      const service = new GossipService(peerProvider, defaultConfig);

      const ackReceived: BlockAnnouncement[] = [];
      service.onDeliveryAck((ann) => ackReceived.push(ann));

      await service.handleAnnouncement(makePlainAnnouncement());

      expect(ackReceived.length).toBe(0);
    });
  });

  describe('onMessageDelivery / offMessageDelivery registration', () => {
    it('should register a handler that receives message delivery announcements', async () => {
      const localUsers = new Set(['user-1']);
      const peerProvider = new MockPeerProvider('local-node', peers);
      const service = new GossipService(
        peerProvider,
        defaultConfig,
        localUsers,
      );

      const received: BlockAnnouncement[] = [];
      const handler = (ann: BlockAnnouncement) => received.push(ann);
      service.onMessageDelivery(handler);

      await service.handleAnnouncement(makeMessageDeliveryAnnouncement());

      expect(received.length).toBe(1);
    });

    it('should remove a handler via offMessageDelivery', async () => {
      const localUsers = new Set(['user-1']);
      const peerProvider = new MockPeerProvider('local-node', peers);
      const service = new GossipService(
        peerProvider,
        defaultConfig,
        localUsers,
      );

      const received: BlockAnnouncement[] = [];
      const handler = (ann: BlockAnnouncement) => received.push(ann);
      service.onMessageDelivery(handler);
      service.offMessageDelivery(handler);

      await service.handleAnnouncement(makeMessageDeliveryAnnouncement());

      expect(received.length).toBe(0);
    });

    it('should not add duplicate handlers', async () => {
      const localUsers = new Set(['user-1']);
      const peerProvider = new MockPeerProvider('local-node', peers);
      const service = new GossipService(
        peerProvider,
        defaultConfig,
        localUsers,
      );

      let callCount = 0;
      const handler = () => {
        callCount++;
      };
      service.onMessageDelivery(handler);
      service.onMessageDelivery(handler); // duplicate

      await service.handleAnnouncement(makeMessageDeliveryAnnouncement());

      expect(callCount).toBe(1); // Set prevents duplicates
    });
  });

  describe('onDeliveryAck / offDeliveryAck registration', () => {
    it('should register a handler that receives ack announcements', async () => {
      const peerProvider = new MockPeerProvider('local-node', peers);
      const service = new GossipService(peerProvider, defaultConfig);

      const received: BlockAnnouncement[] = [];
      const handler = (ann: BlockAnnouncement) => received.push(ann);
      service.onDeliveryAck(handler);

      await service.handleAnnouncement(makeAckAnnouncement());

      expect(received.length).toBe(1);
    });

    it('should remove a handler via offDeliveryAck', async () => {
      const peerProvider = new MockPeerProvider('local-node', peers);
      const service = new GossipService(peerProvider, defaultConfig);

      const received: BlockAnnouncement[] = [];
      const handler = (ann: BlockAnnouncement) => received.push(ann);
      service.onDeliveryAck(handler);
      service.offDeliveryAck(handler);

      await service.handleAnnouncement(makeAckAnnouncement());

      expect(received.length).toBe(0);
    });

    it('should not add duplicate handlers', async () => {
      const peerProvider = new MockPeerProvider('local-node', peers);
      const service = new GossipService(peerProvider, defaultConfig);

      let callCount = 0;
      const handler = () => {
        callCount++;
      };
      service.onDeliveryAck(handler);
      service.onDeliveryAck(handler); // duplicate

      await service.handleAnnouncement(makeAckAnnouncement());

      expect(callCount).toBe(1); // Set prevents duplicates
    });
  });
});
