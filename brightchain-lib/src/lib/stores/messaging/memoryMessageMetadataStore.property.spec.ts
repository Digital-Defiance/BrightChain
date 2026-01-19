/**
 * @fileoverview Property-based tests for message metadata round-trip
 *
 * **Feature: message-passing-and-events, Property 20: Metadata Round-Trip for Optional Fields**
 * **Validates: Requirements 6.1, 6.3, 6.5, 7.1, 7.3**
 *
 * This test suite verifies that:
 * - Message metadata with explicit values preserves those values through store/retrieve
 * - Optional fields (expiration, priority, messageType) are stored correctly
 * - All message-specific fields survive round-trip
 */

import fc from 'fast-check';
import { DurabilityLevel } from '../../enumerations/durabilityLevel';
import { MessageEncryptionScheme } from '../../enumerations/messaging/messageEncryptionScheme';
import { MessagePriority } from '../../enumerations/messaging/messagePriority';
import { ReplicationStatus } from '../../enumerations/replicationStatus';
import { IMessageMetadata } from '../../interfaces/messaging/messageMetadata';
import { MemoryMessageMetadataStore } from './memoryMessageMetadataStore';

describe('Message Metadata Round-Trip Property Tests', () => {
  let _store: MemoryMessageMetadataStore;

  beforeEach(() => {
    _store = new MemoryMessageMetadataStore();
  });

  /**
   * Property 20: For any message created with explicit expiration, priority, and message type values,
   * the stored message metadata SHALL contain exactly those values.
   *
   * **Validates: Requirements 6.1, 6.3, 6.5, 7.1, 7.3**
   */
  it('should preserve explicit optional field values through store/retrieve cycle', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc
          .string({ minLength: 1, maxLength: 64 })
          .filter((s) => s.trim().length > 0), // blockId
        fc
          .string({ minLength: 1, maxLength: 50 })
          .filter((s) => s.trim().length > 0), // messageType
        fc
          .string({ minLength: 1, maxLength: 64 })
          .filter((s) => s.trim().length > 0), // senderId
        fc.array(
          fc
            .string({ minLength: 1, maxLength: 64 })
            .filter((s) => s.trim().length > 0),
          { maxLength: 10 },
        ), // recipients
        fc.constantFrom(
          MessagePriority.LOW,
          MessagePriority.NORMAL,
          MessagePriority.HIGH,
        ), // priority
        fc.date({
          min: new Date(),
          max: new Date(Date.now() + 86400000 * 365),
        }), // expiresAt
        fc.constantFrom(
          MessageEncryptionScheme.NONE,
          MessageEncryptionScheme.SHARED_KEY,
          MessageEncryptionScheme.RECIPIENT_KEYS,
        ), // encryptionScheme
        async (
          blockId,
          messageType,
          senderId,
          recipients,
          priority,
          expiresAt,
          encryptionScheme,
        ) => {
          // Create fresh store for each test to avoid duplicate blockId issues
          const testStore = new MemoryMessageMetadataStore();

          const metadata: IMessageMetadata = {
            blockId,
            createdAt: new Date(),
            expiresAt,
            durabilityLevel: DurabilityLevel.Standard,
            parityBlockIds: [],
            accessCount: 0,
            lastAccessedAt: new Date(),
            replicationStatus: ReplicationStatus.Pending,
            targetReplicationFactor: 3,
            replicaNodeIds: [],
            size: 100,
            checksum: 'abc123',
            messageType,
            senderId,
            recipients,
            priority,
            deliveryStatus: new Map(),
            acknowledgments: new Map(),
            encryptionScheme,
            isCBL: false,
          };

          await testStore.storeMessageMetadata(metadata);
          const retrieved = (await testStore.get(blockId)) as IMessageMetadata;

          expect(retrieved).toBeDefined();
          expect(retrieved!.messageType).toBe(messageType);
          expect(retrieved!.senderId).toBe(senderId);
          expect(retrieved!.recipients).toEqual(recipients);
          expect(retrieved!.priority).toBe(priority);
          expect(retrieved!.expiresAt?.getTime()).toBe(expiresAt.getTime());
          expect(retrieved!.encryptionScheme).toBe(encryptionScheme);
        },
      ),
      { numRuns: 100 },
    );
  });
});
