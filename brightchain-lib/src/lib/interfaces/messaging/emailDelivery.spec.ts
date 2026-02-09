import { describe, expect, it } from '@jest/globals';
import { DeliveryStatus } from '../../enumerations/messaging/deliveryStatus';
import { EmailDeliveryStatus, IDeliveryReceipt } from './emailDelivery';

describe('EmailDeliveryStatus Enum (deprecated)', () => {
  it('should define all required delivery status states', () => {
    expect(EmailDeliveryStatus.Pending).toBe('pending');
    expect(EmailDeliveryStatus.Queued).toBe('queued');
    expect(EmailDeliveryStatus.InTransit).toBe('in_transit');
    expect(EmailDeliveryStatus.Delivered).toBe('delivered');
    expect(EmailDeliveryStatus.Failed).toBe('failed');
    expect(EmailDeliveryStatus.Bounced).toBe('bounced');
    expect(EmailDeliveryStatus.Read).toBe('read');
  });

  it('should have exactly 7 status values', () => {
    const values = Object.values(EmailDeliveryStatus);
    expect(values).toHaveLength(7);
  });

  it('should use string-backed values for JSON serialization compatibility', () => {
    // All enum values should be strings
    for (const value of Object.values(EmailDeliveryStatus)) {
      expect(typeof value).toBe('string');
    }
  });

  it('should have unique values for each status', () => {
    const values = Object.values(EmailDeliveryStatus);
    const uniqueValues = new Set(values);
    expect(uniqueValues.size).toBe(values.length);
  });
});

describe('IDeliveryReceipt Interface', () => {
  /**
   * Helper to create a minimal valid IDeliveryReceipt.
   * Now uses unified DeliveryStatus for the status field.
   */
  function createMinimalReceipt(
    overrides?: Partial<IDeliveryReceipt>,
  ): IDeliveryReceipt {
    return {
      recipientId: 'recipient-1',
      recipientNode: 'node-abc',
      status: DeliveryStatus.Pending,
      retryCount: 0,
      ...overrides,
    };
  }

  describe('Required fields', () => {
    it('should include recipientId', () => {
      const receipt = createMinimalReceipt();
      expect(receipt.recipientId).toBe('recipient-1');
    });

    it('should include recipientNode', () => {
      const receipt = createMinimalReceipt();
      expect(receipt.recipientNode).toBe('node-abc');
    });

    it('should include status as DeliveryStatus', () => {
      const receipt = createMinimalReceipt();
      expect(receipt.status).toBe(DeliveryStatus.Pending);
    });

    it('should include retryCount', () => {
      const receipt = createMinimalReceipt();
      expect(receipt.retryCount).toBe(0);
    });
  });

  describe('Optional timestamp fields', () => {
    it('should support queuedAt timestamp', () => {
      const queuedAt = new Date('2024-01-01T12:00:00Z');
      const receipt = createMinimalReceipt({
        status: DeliveryStatus.Pending,
        queuedAt,
      });
      expect(receipt.queuedAt).toBeInstanceOf(Date);
      expect(receipt.queuedAt).toEqual(queuedAt);
    });

    it('should support sentAt timestamp', () => {
      const sentAt = new Date('2024-01-01T12:00:01Z');
      const receipt = createMinimalReceipt({
        status: DeliveryStatus.Announced,
        sentAt,
      });
      expect(receipt.sentAt).toBeInstanceOf(Date);
      expect(receipt.sentAt).toEqual(sentAt);
    });

    it('should support deliveredAt timestamp', () => {
      const deliveredAt = new Date('2024-01-01T12:00:05Z');
      const receipt = createMinimalReceipt({
        status: DeliveryStatus.Delivered,
        deliveredAt,
      });
      expect(receipt.deliveredAt).toBeInstanceOf(Date);
      expect(receipt.deliveredAt).toEqual(deliveredAt);
    });

    it('should support readAt timestamp', () => {
      const readAt = new Date('2024-01-01T13:00:00Z');
      const receipt = createMinimalReceipt({
        status: DeliveryStatus.Read,
        readAt,
      });
      expect(receipt.readAt).toBeInstanceOf(Date);
      expect(receipt.readAt).toEqual(readAt);
    });

    it('should support failedAt timestamp', () => {
      const failedAt = new Date('2024-01-01T12:05:00Z');
      const receipt = createMinimalReceipt({
        status: DeliveryStatus.Failed,
        failedAt,
      });
      expect(receipt.failedAt).toBeInstanceOf(Date);
      expect(receipt.failedAt).toEqual(failedAt);
    });

    it('should allow all timestamps to be undefined', () => {
      const receipt = createMinimalReceipt();
      expect(receipt.queuedAt).toBeUndefined();
      expect(receipt.sentAt).toBeUndefined();
      expect(receipt.deliveredAt).toBeUndefined();
      expect(receipt.readAt).toBeUndefined();
      expect(receipt.failedAt).toBeUndefined();
    });
  });

  describe('Optional failure information fields', () => {
    it('should support failureReason', () => {
      const receipt = createMinimalReceipt({
        status: DeliveryStatus.Failed,
        failureReason: 'Recipient node unreachable',
      });
      expect(receipt.failureReason).toBe('Recipient node unreachable');
    });

    it('should support failureCode', () => {
      const receipt = createMinimalReceipt({
        status: DeliveryStatus.Failed,
        failureCode: 'NODE_UNREACHABLE',
      });
      expect(receipt.failureCode).toBe('NODE_UNREACHABLE');
    });

    it('should allow failure fields to be undefined', () => {
      const receipt = createMinimalReceipt();
      expect(receipt.failureReason).toBeUndefined();
      expect(receipt.failureCode).toBeUndefined();
    });
  });

  describe('Delivery lifecycle scenarios', () => {
    it('should represent a successful delivery lifecycle', () => {
      const receipt = createMinimalReceipt({
        status: DeliveryStatus.Delivered,
        queuedAt: new Date('2024-01-01T12:00:00Z'),
        sentAt: new Date('2024-01-01T12:00:01Z'),
        deliveredAt: new Date('2024-01-01T12:00:05Z'),
        retryCount: 0,
      });
      expect(receipt.status).toBe(DeliveryStatus.Delivered);
      expect(receipt.deliveredAt).toBeDefined();
      expect(receipt.failureReason).toBeUndefined();
    });

    it('should represent a failed delivery with retry info', () => {
      const receipt = createMinimalReceipt({
        status: DeliveryStatus.Failed,
        queuedAt: new Date('2024-01-01T12:00:00Z'),
        sentAt: new Date('2024-01-01T12:00:01Z'),
        failedAt: new Date('2024-01-01T12:05:00Z'),
        failureReason: 'Replication failed after max retries',
        failureCode: 'REPLICATION_FAILED',
        retryCount: 3,
      });
      expect(receipt.status).toBe(DeliveryStatus.Failed);
      expect(receipt.retryCount).toBe(3);
      expect(receipt.failureReason).toBeDefined();
      expect(receipt.failureCode).toBe('REPLICATION_FAILED');
      expect(receipt.deliveredAt).toBeUndefined();
    });

    it('should represent a bounced delivery', () => {
      const receipt = createMinimalReceipt({
        status: DeliveryStatus.Bounced,
        queuedAt: new Date('2024-01-01T12:00:00Z'),
        sentAt: new Date('2024-01-01T12:00:01Z'),
        failedAt: new Date('2024-01-01T12:00:02Z'),
        failureReason: 'Recipient rejected the message',
        failureCode: 'RECIPIENT_REJECTED',
        retryCount: 0,
      });
      expect(receipt.status).toBe(DeliveryStatus.Bounced);
      expect(receipt.failureReason).toBe('Recipient rejected the message');
    });

    it('should represent a read receipt', () => {
      const receipt = createMinimalReceipt({
        status: DeliveryStatus.Read,
        queuedAt: new Date('2024-01-01T12:00:00Z'),
        sentAt: new Date('2024-01-01T12:00:01Z'),
        deliveredAt: new Date('2024-01-01T12:00:05Z'),
        readAt: new Date('2024-01-01T13:00:00Z'),
        retryCount: 0,
      });
      expect(receipt.status).toBe(DeliveryStatus.Read);
      expect(receipt.readAt).toBeDefined();
      expect(receipt.deliveredAt).toBeDefined();
    });
  });

  describe('Re-export compatibility', () => {
    it('should be importable from emailMetadata re-exports', async () => {
      // Verify the re-export path works for the enum (runtime value)
      const { EmailDeliveryStatus: ReExportedStatus } =
        await import('./emailMetadata');
      expect(ReExportedStatus.Delivered).toBe('delivered');
      expect(ReExportedStatus.Pending).toBe('pending');
    });

    it('should be importable from messaging index', async () => {
      const { EmailDeliveryStatus: IndexStatus } = await import('./index');
      expect(IndexStatus.Pending).toBe('pending');
      expect(IndexStatus.Delivered).toBe('delivered');
    });
  });
});
