import * as fc from 'fast-check';
import { BlockSize } from '../../enumerations/blockSize';
import { DurabilityLevel } from '../../enumerations/durabilityLevel';
import { MessageEncryptionScheme } from '../../enumerations/messaging/messageEncryptionScheme';
import { MessagePriority } from '../../enumerations/messaging/messagePriority';
import { ReplicationStatus } from '../../enumerations/replicationStatus';
import { IMessageMetadata } from '../../interfaces/messaging/messageMetadata';
import { MemoryMessageMetadataStore } from './memoryMessageMetadataStore';

describe('Feature: message-passing-and-events, Property 23: Comprehensive Message Query Filtering', () => {
  it('should correctly filter messages by all query criteria', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.array(
          fc.record({
            blockId: fc.string({ minLength: 64, maxLength: 64 }),
            senderId: fc.string({ minLength: 64, maxLength: 64 }),
            recipients: fc.array(fc.string({ minLength: 64, maxLength: 64 }), {
              minLength: 0,
              maxLength: 5,
            }),
            messageType: fc.constantFrom(
              'chat',
              'notification',
              'system',
              'custom',
            ),
            priority: fc.constantFrom(
              MessagePriority.LOW,
              MessagePriority.NORMAL,
              MessagePriority.HIGH,
            ),
            timestamp: fc.date({
              min: new Date('2024-01-01'),
              max: new Date('2024-12-31'),
            }),
          }),
          { minLength: 10, maxLength: 50 },
        ),
        async (messages) => {
          const store = new MemoryMessageMetadataStore();
          const uniqueMessages = messages
            .filter(
              (msg, idx, arr) =>
                arr.findIndex((m) => m.blockId === msg.blockId) === idx,
            )
            .filter((msg) => !isNaN(msg.timestamp.getTime()));

          if (uniqueMessages.length === 0) return;

          for (const msg of uniqueMessages) {
            const metadata: IMessageMetadata = {
              blockId: msg.blockId,
              size: BlockSize.Small,
              createdAt: msg.timestamp,
              expiresAt: new Date(msg.timestamp.getTime() + 86400000),
              durabilityLevel: DurabilityLevel.Standard,
              parityBlockIds: [],
              accessCount: 0,
              lastAccessedAt: msg.timestamp,
              replicationStatus: ReplicationStatus.Pending,
              targetReplicationFactor: 3,
              replicaNodeIds: [],
              checksum: 'abc123',
              senderId: msg.senderId,
              recipients: msg.recipients,
              messageType: msg.messageType,
              priority: msg.priority,
              deliveryStatus: new Map(),
              acknowledgments: new Map(),
              encryptionScheme: MessageEncryptionScheme.NONE,
              isCBL: false,
            };
            await store.storeMessageMetadata(metadata);
          }

          // Test sender filtering
          const senderIds = [...new Set(uniqueMessages.map((m) => m.senderId))];
          if (senderIds.length > 0) {
            const senderId = senderIds[0];
            const results = await store.queryMessages({ senderId });
            expect(results.every((r) => r.senderId === senderId)).toBe(true);
            expect(results.length).toBe(
              uniqueMessages.filter((m) => m.senderId === senderId).length,
            );
          }

          // Test recipient filtering
          const allRecipients = [
            ...new Set(uniqueMessages.flatMap((m) => m.recipients)),
          ];
          if (allRecipients.length > 0) {
            const recipientId = allRecipients[0];
            const results = await store.queryMessages({ recipientId });
            expect(
              results.every((r) => r.recipients.includes(recipientId)),
            ).toBe(true);
          }

          // Test message type filtering
          const types = [...new Set(uniqueMessages.map((m) => m.messageType))];
          if (types.length > 0) {
            const messageType = types[0];
            const results = await store.queryMessages({ messageType });
            expect(results.every((r) => r.messageType === messageType)).toBe(
              true,
            );
            expect(results.length).toBe(
              uniqueMessages.filter((m) => m.messageType === messageType)
                .length,
            );
          }

          // Test priority filtering
          const priorities = [
            ...new Set(uniqueMessages.map((m) => m.priority)),
          ];
          if (priorities.length > 0) {
            const priority = priorities[0];
            const results = await store.queryMessages({ priority });
            expect(results.every((r) => r.priority === priority)).toBe(true);
          }

          // Test date range filtering
          const sortedDates = uniqueMessages
            .map((m) => m.timestamp)
            .sort((a, b) => a.getTime() - b.getTime());
          if (sortedDates.length >= 4) {
            const startDate =
              sortedDates[Math.floor(sortedDates.length * 0.25)];
            const endDate = sortedDates[Math.floor(sortedDates.length * 0.75)];
            const results = await store.queryMessages({ startDate, endDate });
            expect(
              results.every(
                (r) => r.createdAt >= startDate && r.createdAt <= endDate,
              ),
            ).toBe(true);
          }
        },
      ),
      { numRuns: 100 },
    );
  });
});
