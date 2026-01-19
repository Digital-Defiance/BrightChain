import { beforeEach, describe, expect, it } from '@jest/globals';
import { BlockSize } from '../../enumerations/blockSize';
import { DurabilityLevel } from '../../enumerations/durabilityLevel';
import { MessageDeliveryStatus } from '../../enumerations/messaging/messageDeliveryStatus';
import { MessageEncryptionScheme } from '../../enumerations/messaging/messageEncryptionScheme';
import { MessagePriority } from '../../enumerations/messaging/messagePriority';
import { RoutingStrategy } from '../../enumerations/messaging/routingStrategy';
import { ReplicationStatus } from '../../enumerations/replicationStatus';
import { MemoryMessageMetadataStore } from '../../stores/messaging/memoryMessageMetadataStore';
import { MessageRouter } from './messageRouter';

describe('MessageRouter', () => {
  let router: MessageRouter;
  let metadataStore: MemoryMessageMetadataStore;
  const localNodeId = 'local-node-123';

  beforeEach(() => {
    metadataStore = new MemoryMessageMetadataStore();
    router = new MessageRouter(metadataStore, localNodeId);
  });

  describe('determineStrategy', () => {
    it('should return GOSSIP for empty recipients', () => {
      const strategy = router.determineStrategy([]);
      expect(strategy).toBe(RoutingStrategy.GOSSIP);
    });

    it('should return DIRECT for non-empty recipients', () => {
      const strategy = router.determineStrategy(['recipient1']);
      expect(strategy).toBe(RoutingStrategy.DIRECT);
    });

    it('should return DIRECT for multiple recipients', () => {
      const strategy = router.determineStrategy([
        'recipient1',
        'recipient2',
        'recipient3',
      ]);
      expect(strategy).toBe(RoutingStrategy.DIRECT);
    });
  });

  describe('routeMessage', () => {
    it('should route message to recipients', async () => {
      const messageId = 'msg-123';
      const recipients = ['recipient1', 'recipient2'];

      // Store metadata first
      await metadataStore.storeMessageMetadata({
        blockId: messageId,
        size: BlockSize.Small,
        createdAt: new Date(),
        expiresAt: null,
        durabilityLevel: DurabilityLevel.Standard,
        parityBlockIds: [],
        accessCount: 0,
        lastAccessedAt: new Date(),
        replicationStatus: ReplicationStatus.Pending,
        targetReplicationFactor: 0,
        replicaNodeIds: [],
        checksum: messageId,
        messageType: 'test',
        senderId: 'sender',
        recipients,
        priority: MessagePriority.NORMAL,
        deliveryStatus: new Map(
          recipients.map((r) => [r, MessageDeliveryStatus.PENDING]),
        ),
        acknowledgments: new Map(),
        encryptionScheme: MessageEncryptionScheme.NONE,
        isCBL: true,
        cblBlockIds: [],
      });

      const result = await router.routeMessage(messageId, recipients);

      expect(result.strategy).toBe(RoutingStrategy.DIRECT);
      expect(result.successfulRecipients).toEqual(recipients);
      expect(result.failedRecipients).toEqual([]);
      expect(result.errors.size).toBe(0);
    });

    it('should handle empty recipients (broadcast)', async () => {
      const messageId = 'msg-broadcast';
      const recipients: string[] = [];

      await metadataStore.storeMessageMetadata({
        blockId: messageId,
        size: BlockSize.Small,
        createdAt: new Date(),
        expiresAt: null,
        durabilityLevel: DurabilityLevel.Standard,
        parityBlockIds: [],
        accessCount: 0,
        lastAccessedAt: new Date(),
        replicationStatus: ReplicationStatus.Pending,
        targetReplicationFactor: 0,
        replicaNodeIds: [],
        checksum: messageId,
        messageType: 'broadcast',
        senderId: 'sender',
        recipients,
        priority: MessagePriority.NORMAL,
        deliveryStatus: new Map(),
        acknowledgments: new Map(),
        encryptionScheme: MessageEncryptionScheme.NONE,
        isCBL: true,
        cblBlockIds: [],
      });

      const result = await router.routeMessage(messageId, recipients);

      expect(result.strategy).toBe(RoutingStrategy.GOSSIP);
      expect(result.successfulRecipients).toEqual([]);
      expect(result.failedRecipients).toEqual([]);
    });
  });

  describe('handleIncomingMessage', () => {
    it('should handle incoming message', async () => {
      const messageId = 'msg-incoming';
      const senderId = 'sender-node';

      await metadataStore.storeMessageMetadata({
        blockId: messageId,
        size: BlockSize.Small,
        createdAt: new Date(),
        expiresAt: null,
        durabilityLevel: DurabilityLevel.Standard,
        parityBlockIds: [],
        accessCount: 0,
        lastAccessedAt: new Date(),
        replicationStatus: ReplicationStatus.Pending,
        targetReplicationFactor: 0,
        replicaNodeIds: [],
        checksum: messageId,
        messageType: 'test',
        senderId,
        recipients: [localNodeId],
        priority: MessagePriority.NORMAL,
        deliveryStatus: new Map([[localNodeId, MessageDeliveryStatus.PENDING]]),
        acknowledgments: new Map(),
        encryptionScheme: MessageEncryptionScheme.NONE,
        isCBL: true,
        cblBlockIds: [],
      });

      await expect(
        router.handleIncomingMessage(messageId, senderId),
      ).resolves.toBeUndefined();
    });

    it('should throw error for non-existent message', async () => {
      await expect(
        router.handleIncomingMessage('non-existent', 'sender'),
      ).rejects.toThrow('Message non-existent not found');
    });
  });

  describe('forwardMessage', () => {
    it('should forward message with updated path', async () => {
      const messageId = 'msg-forward';
      const recipients = ['recipient1'];

      await metadataStore.storeMessageMetadata({
        blockId: messageId,
        size: BlockSize.Small,
        createdAt: new Date(),
        expiresAt: null,
        durabilityLevel: DurabilityLevel.Standard,
        parityBlockIds: [],
        accessCount: 0,
        lastAccessedAt: new Date(),
        replicationStatus: ReplicationStatus.Pending,
        targetReplicationFactor: 0,
        replicaNodeIds: [],
        checksum: messageId,
        messageType: 'test',
        senderId: 'sender',
        recipients,
        priority: MessagePriority.NORMAL,
        deliveryStatus: new Map([
          [recipients[0], MessageDeliveryStatus.PENDING],
        ]),
        acknowledgments: new Map(),
        encryptionScheme: MessageEncryptionScheme.NONE,
        isCBL: true,
        cblBlockIds: [],
      });

      const result = await router.forwardMessage(messageId, recipients, [
        'node1',
        'node2',
      ]);

      expect(result.successfulRecipients).toEqual(recipients);
      expect(result.failedRecipients).toEqual([]);
    });

    it('should detect forwarding loops', async () => {
      const messageId = 'msg-loop';
      const recipients = ['recipient1'];

      const result = await router.forwardMessage(messageId, recipients, [
        'node1',
        localNodeId,
      ]);

      expect(result.successfulRecipients).toEqual([]);
      expect(result.failedRecipients).toEqual(recipients);
      expect(result.errors.get('recipient1')).toBe('Forwarding loop detected');
    });
  });
});
