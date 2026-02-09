import fc from 'fast-check';
import { DurabilityLevel } from '../../enumerations/durabilityLevel';
import { DeliveryStatus } from '../../enumerations/messaging/deliveryStatus';
import { MessageEncryptionScheme } from '../../enumerations/messaging/messageEncryptionScheme';
import { MessagePriority } from '../../enumerations/messaging/messagePriority';
import { ReplicationStatus } from '../../enumerations/replicationStatus';
import { IMessageMetadata } from '../../interfaces/messaging/messageMetadata';

/**
 * Helper to check if all recipients have acknowledged
 */
function allRecipientsAcknowledged(metadata: IMessageMetadata): boolean {
  if (metadata.recipients.length === 0) {
    return false;
  }

  for (const recipient of metadata.recipients) {
    if (!metadata.acknowledgments.has(recipient)) {
      return false;
    }
  }

  return true;
}

/**
 * Helper to check if all recipients have delivered status
 */
function allRecipientsDelivered(metadata: IMessageMetadata): boolean {
  if (metadata.recipients.length === 0) {
    return false;
  }

  for (const recipient of metadata.recipients) {
    const status = metadata.deliveryStatus.get(recipient);
    if (status !== DeliveryStatus.Delivered) {
      return false;
    }
  }

  return true;
}

/**
 * Property tests for full delivery detection
 * Validates Requirements 10.3
 */
describe('Feature: message-passing-and-events, Property: Full Delivery Detection', () => {
  /**
   * Property 26a: Empty recipients means not fully delivered
   * A message with no recipients cannot be fully delivered
   */
  it('Property 26a: should not be fully delivered with no recipients', () => {
    fc.assert(
      fc.property(fc.string(), fc.string(), (messageId, senderId) => {
        const metadata: IMessageMetadata = {
          blockId: messageId,
          messageType: 'test',
          senderId,
          recipients: [],
          priority: MessagePriority.NORMAL,
          deliveryStatus: new Map(),
          acknowledgments: new Map(),
          encryptionScheme: MessageEncryptionScheme.NONE,
          isCBL: false,
          createdAt: new Date(),
          expiresAt: null,
          size: 100,
          durabilityLevel: DurabilityLevel.Ephemeral,
          parityBlockIds: [],
          accessCount: 0,
          lastAccessedAt: new Date(),
          replicationStatus: ReplicationStatus.Pending,
          targetReplicationFactor: 1,
          replicaNodeIds: [],
          checksum: 'test',
        };

        expect(allRecipientsAcknowledged(metadata)).toBe(false);
        expect(allRecipientsDelivered(metadata)).toBe(false);
      }),
      { numRuns: 100 },
    );
  });

  /**
   * Property 26b: All recipients must acknowledge for full delivery
   * Full delivery requires acknowledgment from every recipient
   */
  it('Property 26b: should detect full delivery when all recipients acknowledge', () => {
    fc.assert(
      fc.property(
        fc.string(),
        fc.string(),
        fc.array(fc.string({ minLength: 1 }), { minLength: 1, maxLength: 10 }),
        (messageId, senderId, recipients) => {
          const uniqueRecipients = Array.from(new Set(recipients));
          const acknowledgments = new Map<string, Date>();
          const deliveryStatus = new Map<string, DeliveryStatus>();

          // All recipients acknowledge
          for (const recipient of uniqueRecipients) {
            acknowledgments.set(recipient, new Date());
            deliveryStatus.set(recipient, DeliveryStatus.Delivered);
          }

          const metadata: IMessageMetadata = {
            blockId: messageId,
            messageType: 'test',
            senderId,
            recipients: uniqueRecipients,
            priority: MessagePriority.NORMAL,
            deliveryStatus,
            acknowledgments,
            encryptionScheme: MessageEncryptionScheme.NONE,
            isCBL: false,
            createdAt: new Date(),
            expiresAt: null,
            size: 100,
            durabilityLevel: DurabilityLevel.Ephemeral,
            parityBlockIds: [],
            accessCount: 0,
            lastAccessedAt: new Date(),
            replicationStatus: ReplicationStatus.Pending,
            targetReplicationFactor: 1,
            replicaNodeIds: [],
            checksum: 'test',
          };

          expect(allRecipientsAcknowledged(metadata)).toBe(true);
          expect(allRecipientsDelivered(metadata)).toBe(true);
        },
      ),
      { numRuns: 100 },
    );
  });

  /**
   * Property 26c: Partial acknowledgment means not fully delivered
   * If any recipient hasn't acknowledged, delivery is not complete
   */
  it('Property 26c: should not be fully delivered with partial acknowledgments', () => {
    fc.assert(
      fc.property(
        fc.string(),
        fc.string(),
        fc.array(fc.string({ minLength: 1 }), { minLength: 2, maxLength: 10 }),
        fc.integer({ min: 1, max: 9 }),
        (messageId, senderId, recipients, ackCount) => {
          const uniqueRecipients = Array.from(new Set(recipients));
          if (uniqueRecipients.length < 2) return;

          const acknowledgments = new Map<string, Date>();
          const deliveryStatus = new Map<string, DeliveryStatus>();

          // Only some recipients acknowledge
          const numToAck = Math.min(ackCount, uniqueRecipients.length - 1);
          for (let i = 0; i < numToAck; i++) {
            acknowledgments.set(uniqueRecipients[i], new Date());
            deliveryStatus.set(uniqueRecipients[i], DeliveryStatus.Delivered);
          }

          const metadata: IMessageMetadata = {
            blockId: messageId,
            messageType: 'test',
            senderId,
            recipients: uniqueRecipients,
            priority: MessagePriority.NORMAL,
            deliveryStatus,
            acknowledgments,
            encryptionScheme: MessageEncryptionScheme.NONE,
            isCBL: false,
            createdAt: new Date(),
            expiresAt: null,
            size: 100,
            durabilityLevel: DurabilityLevel.Ephemeral,
            parityBlockIds: [],
            accessCount: 0,
            lastAccessedAt: new Date(),
            replicationStatus: ReplicationStatus.Pending,
            targetReplicationFactor: 1,
            replicaNodeIds: [],
            checksum: 'test',
          };

          expect(allRecipientsAcknowledged(metadata)).toBe(false);
        },
      ),
      { numRuns: 50 },
    );
  });

  /**
   * Property 26d: Delivery status must be DELIVERED for all recipients
   * Even with acknowledgments, status must be DELIVERED
   */
  it('Property 26d: should require DELIVERED status for all recipients', () => {
    fc.assert(
      fc.property(
        fc.string(),
        fc.string(),
        fc.array(fc.string({ minLength: 1 }), { minLength: 1, maxLength: 5 }),
        (messageId, senderId, recipients) => {
          const uniqueRecipients = Array.from(new Set(recipients));
          const acknowledgments = new Map<string, Date>();
          const deliveryStatus = new Map<string, DeliveryStatus>();

          // All acknowledge but not all delivered
          for (let i = 0; i < uniqueRecipients.length; i++) {
            acknowledgments.set(uniqueRecipients[i], new Date());
            deliveryStatus.set(
              uniqueRecipients[i],
              i === 0 ? DeliveryStatus.Announced : DeliveryStatus.Delivered,
            );
          }

          const metadata: IMessageMetadata = {
            blockId: messageId,
            messageType: 'test',
            senderId,
            recipients: uniqueRecipients,
            priority: MessagePriority.NORMAL,
            deliveryStatus,
            acknowledgments,
            encryptionScheme: MessageEncryptionScheme.NONE,
            isCBL: false,
            createdAt: new Date(),
            expiresAt: null,
            size: 100,
            durabilityLevel: DurabilityLevel.Ephemeral,
            parityBlockIds: [],
            accessCount: 0,
            lastAccessedAt: new Date(),
            replicationStatus: ReplicationStatus.Pending,
            targetReplicationFactor: 1,
            replicaNodeIds: [],
            checksum: 'test',
          };

          expect(allRecipientsAcknowledged(metadata)).toBe(true);
          expect(allRecipientsDelivered(metadata)).toBe(false);
        },
      ),
      { numRuns: 50 },
    );
  });

  /**
   * Property 26e: Single recipient delivery detection
   * Full delivery works correctly for single recipient
   */
  it('Property 26e: should detect full delivery for single recipient', () => {
    fc.assert(
      fc.property(
        fc.string(),
        fc.string(),
        fc.string({ minLength: 1 }),
        (messageId, senderId, recipient) => {
          const acknowledgments = new Map<string, Date>();
          const deliveryStatus = new Map<string, DeliveryStatus>();

          acknowledgments.set(recipient, new Date());
          deliveryStatus.set(recipient, DeliveryStatus.Delivered);

          const metadata: IMessageMetadata = {
            blockId: messageId,
            messageType: 'test',
            senderId,
            recipients: [recipient],
            priority: MessagePriority.NORMAL,
            deliveryStatus,
            acknowledgments,
            encryptionScheme: MessageEncryptionScheme.NONE,
            isCBL: false,
            createdAt: new Date(),
            expiresAt: null,
            size: 100,
            durabilityLevel: DurabilityLevel.Ephemeral,
            parityBlockIds: [],
            accessCount: 0,
            lastAccessedAt: new Date(),
            replicationStatus: ReplicationStatus.Pending,
            targetReplicationFactor: 1,
            replicaNodeIds: [],
            checksum: 'test',
          };

          expect(allRecipientsAcknowledged(metadata)).toBe(true);
          expect(allRecipientsDelivered(metadata)).toBe(true);
        },
      ),
      { numRuns: 100 },
    );
  });
});
