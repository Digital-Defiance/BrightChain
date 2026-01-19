import * as fc from 'fast-check';
import { DurabilityLevel } from '../../enumerations/durabilityLevel';
import { MessageEncryptionScheme } from '../../enumerations/messaging/messageEncryptionScheme';
import { MessagePriority } from '../../enumerations/messaging/messagePriority';
import { ReplicationStatus } from '../../enumerations/replicationStatus';
import { MemoryMessageMetadataStore } from '../../stores/messaging/memoryMessageMetadataStore';
import { MessageRouter } from './messageRouter';

describe('Property 34: Graceful Degradation with Non-Supporting Nodes', () => {
  it('Property 34a: Routes messages even with failures (50 iterations)', () => {
    fc.assert(
      fc.asyncProperty(
        fc.string({ minLength: 1 }),
        fc.array(fc.string({ minLength: 1 }), { minLength: 1, maxLength: 3 }),
        fc.string({ minLength: 1 }),
        async (messageId, recipients, localNodeId) => {
          const metadataStore = new MemoryMessageMetadataStore();
          const router = new MessageRouter(metadataStore, localNodeId);

          await metadataStore.storeMessageMetadata({
            blockId: messageId,
            senderId: 'sender1',
            recipients,
            createdAt: new Date(),
            messageType: 'direct',
            priority: MessagePriority.NORMAL,
            encryptionScheme: MessageEncryptionScheme.NONE,
            deliveryStatus: new Map(),
            acknowledgments: new Map(),
            isCBL: false,
            cblBlockIds: [],
            expiresAt: null,
            durabilityLevel: DurabilityLevel.Ephemeral,
            parityBlockIds: [],
            accessCount: 0,
            lastAccessedAt: new Date(),
            replicationStatus: ReplicationStatus.Pending,
            targetReplicationFactor: 1,
            replicaNodeIds: [],
            size: 100,
            checksum: '0'.repeat(64),
          });

          const result = await router.routeMessage(messageId, recipients);

          expect(
            result.successfulRecipients.length + result.failedRecipients.length,
          ).toBe(recipients.length);
        },
      ),
      { numRuns: 50 },
    );
  });

  it('Property 34b: Prevents forwarding loops (50 iterations)', () => {
    fc.assert(
      fc.asyncProperty(
        fc.string({ minLength: 1 }),
        fc.array(fc.string({ minLength: 1 }), { minLength: 1, maxLength: 3 }),
        fc.string({ minLength: 1 }),
        async (messageId, recipients, localNodeId) => {
          const metadataStore = new MemoryMessageMetadataStore();
          const router = new MessageRouter(metadataStore, localNodeId);

          await metadataStore.storeMessageMetadata({
            blockId: messageId,
            senderId: 'sender1',
            recipients,
            createdAt: new Date(),
            messageType: 'direct',
            priority: MessagePriority.NORMAL,
            encryptionScheme: MessageEncryptionScheme.NONE,
            deliveryStatus: new Map(),
            acknowledgments: new Map(),
            isCBL: false,
            cblBlockIds: [],
            expiresAt: null,
            durabilityLevel: DurabilityLevel.Ephemeral,
            parityBlockIds: [],
            accessCount: 0,
            lastAccessedAt: new Date(),
            replicationStatus: ReplicationStatus.Pending,
            targetReplicationFactor: 1,
            replicaNodeIds: [],
            size: 100,
            checksum: '0'.repeat(64),
          });

          const forwardingPath = [localNodeId];
          const result = await router.forwardMessage(
            messageId,
            recipients,
            forwardingPath,
          );

          expect(result.failedRecipients).toEqual(recipients);
        },
      ),
      { numRuns: 50 },
    );
  });
});
