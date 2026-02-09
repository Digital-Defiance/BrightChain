/**
 * Email delivery status tracking types.
 *
 * Defines the IDeliveryReceipt interface for tracking email delivery lifecycle
 * across BrightChain nodes. The IDeliveryReceipt now uses the unified
 * DeliveryStatus enum instead of the deprecated EmailDeliveryStatus.
 *
 * @see Requirements 12.1, 12.2, 12.3, 2.4, 2.5
 * @module emailDelivery
 */

import { DeliveryStatus } from '../../enumerations/messaging/deliveryStatus';

/**
 * Delivery status states for tracking email delivery lifecycle.
 *
 * @deprecated Use {@link DeliveryStatus} from `../../enumerations/messaging/deliveryStatus` instead.
 * This enum is replaced by the unified DeliveryStatus enum as part of the
 * unified gossip delivery migration (Requirement 2.4, 2.5).
 *
 * Migration mapping:
 * - Pending → DeliveryStatus.Pending
 * - Queued → DeliveryStatus.Pending (no separate Queued state)
 * - InTransit → DeliveryStatus.Announced
 * - Delivered → DeliveryStatus.Delivered
 * - Failed → DeliveryStatus.Failed
 * - Bounced → DeliveryStatus.Bounced
 * - Read → DeliveryStatus.Read
 *
 * @see Requirement 12.1
 * @see DeliveryStatus
 */
export enum EmailDeliveryStatus {
  /** Initial state when email is created but not yet queued for delivery */
  Pending = 'pending',

  /** Email has been queued for delivery processing */
  Queued = 'queued',

  /** Email blocks are being replicated to the recipient's node */
  InTransit = 'in_transit',

  /** Email blocks have been successfully replicated to the recipient's node */
  Delivered = 'delivered',

  /** Delivery failed after exhausting retry attempts */
  Failed = 'failed',

  /** Email was rejected/bounced by the recipient's node */
  Bounced = 'bounced',

  /** Recipient has read the email (read receipt received) */
  Read = 'read',
}

/**
 * Delivery receipt for tracking email delivery status per recipient.
 *
 * Each recipient of an email has their own delivery receipt that tracks
 * the full delivery lifecycle including timestamps and failure information.
 *
 * @see Requirement 12.2 - Delivery receipts with timestamps
 * @see Requirement 12.3 - Delivery timestamps per recipient
 */
export interface IDeliveryReceipt {
  /** Recipient identifier (e.g., user ID or address) */
  recipientId: string;

  /** Recipient's home node identifier */
  recipientNode: string;

  /** Current delivery status */
  status: DeliveryStatus;

  // ─── Timestamps ────────────────────────────────────────────────────────

  /** Timestamp when the email was queued for delivery */
  queuedAt?: Date;

  /** Timestamp when the email blocks were sent/replication initiated */
  sentAt?: Date;

  /** Timestamp when delivery was confirmed at the recipient's node */
  deliveredAt?: Date;

  /** Timestamp when the recipient read the email */
  readAt?: Date;

  /** Timestamp when delivery failed */
  failedAt?: Date;

  // ─── Failure Information ───────────────────────────────────────────────

  /** Human-readable reason for delivery failure */
  failureReason?: string;

  /** Machine-readable error code for delivery failure */
  failureCode?: string;

  /** Number of delivery retry attempts made */
  retryCount: number;
}
