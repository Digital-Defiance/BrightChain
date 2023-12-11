/**
 * Unified delivery status enum for tracking the lifecycle of message and email deliveries.
 *
 * Replaces both MessageDeliveryStatus (4 states) and EmailDeliveryStatus (7 states)
 * with a single consistent enum used across the entire codebase.
 *
 * @remarks
 * - Pending: Delivery created but not yet announced to the network
 * - Announced: Delivery announced via gossip protocol
 * - Delivered: Recipient node acknowledged successful receipt
 * - Read: Recipient has read the message
 * - Failed: Delivery failed (after retries or post-delivery failure)
 * - Bounced: Recipient node rejected the message
 *
 * @see Requirements 2.1, 2.2, 2.3
 */
export enum DeliveryStatus {
  Pending = 'pending',
  Announced = 'announced',
  Delivered = 'delivered',
  Read = 'read',
  Failed = 'failed',
  Bounced = 'bounced',
}

/**
 * Valid state transitions for the DeliveryStatus state machine.
 *
 * Transitions:
 * - Pending → Announced
 * - Announced → Delivered, Failed, Bounced
 * - Delivered → Read, Failed
 * - Read → (terminal)
 * - Failed → (terminal)
 * - Bounced → (terminal)
 *
 * @see Requirements 2.2
 */
export const VALID_TRANSITIONS: Record<DeliveryStatus, DeliveryStatus[]> = {
  [DeliveryStatus.Pending]: [DeliveryStatus.Announced],
  [DeliveryStatus.Announced]: [
    DeliveryStatus.Delivered,
    DeliveryStatus.Failed,
    DeliveryStatus.Bounced,
  ],
  [DeliveryStatus.Delivered]: [DeliveryStatus.Read, DeliveryStatus.Failed],
  [DeliveryStatus.Read]: [],
  [DeliveryStatus.Failed]: [],
  [DeliveryStatus.Bounced]: [],
};

/**
 * Validates whether a transition from one DeliveryStatus to another is allowed
 * by the state machine.
 *
 * @param from - The current delivery status
 * @param to - The target delivery status
 * @returns true if the transition is valid, false otherwise
 *
 * @see Requirements 2.2, 2.3
 */
export function validateTransition(
  from: DeliveryStatus,
  to: DeliveryStatus,
): boolean {
  return VALID_TRANSITIONS[from].includes(to);
}
