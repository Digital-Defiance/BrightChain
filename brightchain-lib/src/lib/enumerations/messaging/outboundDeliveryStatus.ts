/**
 * Delivery status for outbound email messages sent through the Email Gateway
 * to external recipients via SMTP.
 *
 * @remarks
 * - Queued: Message enqueued in the outbound queue, awaiting delivery attempt
 * - Sending: Delivery attempt in progress (handed to Postfix)
 * - Delivered: Postfix confirmed successful SMTP delivery
 * - TemporaryFailure: SMTP 4xx response; message will be retried with exponential back-off
 * - PermanentFailure: SMTP 5xx response or retries exhausted; DSN generated to sender
 * - Expired: Maximum retry duration exceeded without successful delivery
 *
 * @see Requirements 11.4, 3.1, 3.4, 3.5, 7.2
 */
export enum OutboundDeliveryStatus {
  Queued = 'queued',
  Sending = 'sending',
  Delivered = 'delivered',
  TemporaryFailure = 'temporary_failure',
  PermanentFailure = 'permanent_failure',
  Expired = 'expired',
}

/**
 * Valid state transitions for the OutboundDeliveryStatus state machine.
 *
 * Transitions:
 * - Queued → Sending
 * - Sending → Delivered, TemporaryFailure, PermanentFailure
 * - TemporaryFailure → Queued, PermanentFailure, Expired
 * - Delivered → (terminal)
 * - PermanentFailure → (terminal)
 * - Expired → (terminal)
 *
 * @see Requirements 3.1, 3.4, 3.5
 */
export const OUTBOUND_VALID_TRANSITIONS: Record<
  OutboundDeliveryStatus,
  OutboundDeliveryStatus[]
> = {
  [OutboundDeliveryStatus.Queued]: [OutboundDeliveryStatus.Sending],
  [OutboundDeliveryStatus.Sending]: [
    OutboundDeliveryStatus.Delivered,
    OutboundDeliveryStatus.TemporaryFailure,
    OutboundDeliveryStatus.PermanentFailure,
  ],
  [OutboundDeliveryStatus.TemporaryFailure]: [
    OutboundDeliveryStatus.Queued,
    OutboundDeliveryStatus.PermanentFailure,
    OutboundDeliveryStatus.Expired,
  ],
  [OutboundDeliveryStatus.Delivered]: [],
  [OutboundDeliveryStatus.PermanentFailure]: [],
  [OutboundDeliveryStatus.Expired]: [],
};

/**
 * Validates whether a transition from one OutboundDeliveryStatus to another
 * is allowed by the state machine.
 *
 * @param from - The current outbound delivery status
 * @param to - The target outbound delivery status
 * @returns true if the transition is valid, false otherwise
 *
 * @see Requirements 3.1, 3.4, 3.5
 */
export function validateOutboundTransition(
  from: OutboundDeliveryStatus,
  to: OutboundDeliveryStatus,
): boolean {
  return OUTBOUND_VALID_TRANSITIONS[from].includes(to);
}
