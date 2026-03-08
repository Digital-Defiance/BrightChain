/**
 * OutboundDeliveryWorker — dequeues messages from the OutboundQueue,
 * serializes them to RFC 5322 format, applies DKIM signing, and
 * delegates delivery to Postfix via sendmail or LMTP.
 *
 * The worker registers itself as the OutboundQueue's handler so that
 * each dequeued item flows through the delivery pipeline:
 *   1. Enforce max message size
 *   2. Serialize IEmailMetadata → RFC 5322 via EmailSerializer
 *   3. Apply DKIM signature
 *   4. Send via Postfix transport
 *   5. Update queue status on success/failure
 *
 * Transport and DKIM signing are injected as interfaces so the worker
 * can be tested without real Postfix or key material.
 *
 * @see Requirements 2.1, 2.2, 2.3, 2.4, 2.5, 6.1
 * @module outboundDeliveryWorker
 */

import { EmailSerializer } from '@brightchain/brightchain-lib';

import type { IEmailGatewayConfig } from './emailGatewayConfig';
import type { IDomainAwareComponent } from './emailGatewayService';
import type { IOutboundQueueItem } from './emailGatewayService';
import type { OutboundQueue } from './outboundQueue';
import type { IOutboundQueueStore } from './outboundQueueStore';

// ─── Transport Interfaces ───────────────────────────────────────────────────

/**
 * Result returned by the Postfix transport after attempting delivery.
 */
export interface IPostfixTransportResult {
  /** Whether the delivery succeeded. */
  success: boolean;
  /** SMTP response code (e.g. 250 for success, 4xx for temp failure, 5xx for permanent). */
  responseCode: number;
  /** Human-readable response message from the MTA. */
  responseMessage: string;
}

/**
 * Interface for delegating email delivery to Postfix via sendmail or LMTP.
 *
 * Implementations wrap the actual transport mechanism (child_process sendmail,
 * LMTP socket, etc.) behind a simple async interface.
 *
 * @see Requirement 2.4
 */
export interface IPostfixTransport {
  /**
   * Send a raw RFC 5322 message to the specified recipients.
   *
   * @param from - Envelope sender address
   * @param to - Envelope recipient addresses
   * @param rawMessage - Complete RFC 5322 message bytes (with DKIM signature)
   * @returns Delivery result with SMTP response code
   */
  send(
    from: string,
    to: string[],
    rawMessage: Uint8Array,
  ): Promise<IPostfixTransportResult>;
}

/**
 * Interface for applying DKIM signatures to outbound messages.
 *
 * Implementations read the private key from the configured path and
 * produce a signed message with the DKIM-Signature header prepended.
 *
 * @see Requirement 6.1
 */
export interface IDkimSigner {
  /**
   * Sign a raw RFC 5322 message with DKIM.
   *
   * @param rawMessage - The unsigned RFC 5322 message bytes
   * @param domain - The signing domain (canonical domain)
   * @param selector - The DKIM selector for DNS lookup
   * @returns The signed message bytes with DKIM-Signature header prepended
   */
  sign(
    rawMessage: Uint8Array,
    domain: string,
    selector: string,
  ): Promise<Uint8Array>;
}

// ─── OutboundDeliveryWorker ─────────────────────────────────────────────────

/**
 * Worker that processes outbound email delivery from the queue.
 *
 * Registers as the OutboundQueue's handler and processes each dequeued
 * item through the serialization → DKIM → transport pipeline.
 *
 * @see Requirements 2.1, 2.2, 2.3, 2.4, 2.5, 6.1
 */
export class OutboundDeliveryWorker implements IDomainAwareComponent {
  private readonly serializer: EmailSerializer;

  /** Current DKIM signing domain — updated via `updateCanonicalDomain()`. */
  private signingDomain: string;

  /**
   * @param queue - The outbound queue to register as handler on
   * @param store - Queue store for updating item status on success/failure
   * @param config - Gateway configuration (max message size, DKIM settings)
   * @param transport - Postfix transport for actual SMTP delivery
   * @param dkimSigner - DKIM signer for message authentication
   */
  constructor(
    private readonly queue: OutboundQueue,
    private readonly store: IOutboundQueueStore,
    private readonly config: IEmailGatewayConfig,
    private readonly transport: IPostfixTransport,
    private readonly dkimSigner: IDkimSigner,
  ) {
    this.serializer = new EmailSerializer();
    this.signingDomain = config.canonicalDomain;
    // Register this worker as the queue's handler.
    this.queue.setHandler(this.handleItem.bind(this));
  }

  /**
   * Update the DKIM signing domain for outbound messages.
   *
   * @param newDomain - The new canonical domain for DKIM signing
   *
   * @see Requirement 8.5 — hot-reload canonical domain without restart
   */
  updateCanonicalDomain(newDomain: string): void {
    this.signingDomain = newDomain;
  }

  /**
   * Handle a single dequeued outbound queue item.
   *
   * Pipeline:
   * 1. Serialize IEmailMetadata → RFC 5322 via EmailSerializer
   * 2. Enforce max message size (Req 2.5)
   * 3. Apply DKIM signature (Req 6.1)
   * 4. Delegate to Postfix transport (Req 2.4)
   * 5. Mark completed or failed in the store
   *
   * @param item - The dequeued outbound queue item
   * @throws Re-throws transport errors so the OutboundQueue can requeue
   */
  async handleItem(item: IOutboundQueueItem): Promise<void> {
    // 1. Serialize metadata to RFC 5322
    const rawMessage = this.serializer.serialize(item.metadata);

    // 2. Enforce max message size (Req 2.5)
    if (rawMessage.byteLength > this.config.maxMessageSizeBytes) {
      await this.store.markFailed(
        item.messageId,
        `Message size ${rawMessage.byteLength} bytes exceeds maximum ${this.config.maxMessageSizeBytes} bytes`,
      );
      return;
    }

    // 3. Apply DKIM signature (Req 6.1)
    const signedMessage = await this.dkimSigner.sign(
      rawMessage,
      this.signingDomain,
      this.config.dkimSelector,
    );

    // 4. Delegate to Postfix transport (Req 2.4)
    const result = await this.transport.send(item.from, item.to, signedMessage);

    // 5. Update status based on transport result
    if (result.success) {
      await this.store.markCompleted(item.messageId);
    } else if (result.responseCode >= 500) {
      // Permanent failure (5xx) — mark failed, do not retry
      await this.store.markFailed(
        item.messageId,
        `Permanent failure (${result.responseCode}): ${result.responseMessage}`,
      );
    } else {
      // Temporary failure (4xx) — throw so OutboundQueue requeues with retry logic
      throw new Error(
        `Temporary failure (${result.responseCode}): ${result.responseMessage}`,
      );
    }
  }
}
