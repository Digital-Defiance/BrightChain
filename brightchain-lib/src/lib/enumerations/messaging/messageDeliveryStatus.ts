/**
 * Message delivery status for tracking message lifecycle.
 *
 * @remarks
 * - PENDING: Message created but not yet sent
 * - IN_TRANSIT: Message sent but not yet acknowledged
 * - DELIVERED: Message acknowledged by recipient
 * - FAILED: Message delivery failed after timeout
 *
 * @see Requirements 10.2, 10.3, 10.5
 */
export enum MessageDeliveryStatus {
  PENDING = 'pending',
  IN_TRANSIT = 'in_transit',
  DELIVERED = 'delivered',
  FAILED = 'failed',
}
