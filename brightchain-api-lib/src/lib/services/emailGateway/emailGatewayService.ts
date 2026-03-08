/**
 * EmailGatewayService — orchestrator that bridges BrightChain's internal
 * gossip-based messaging with external SMTP email delivery via Postfix.
 *
 * Responsibilities:
 * - Listen for gossip announcements containing outbound email
 * - Extract message blocks from the Block Store
 * - Detect external recipients by comparing domain against canonicalDomain
 * - Enqueue outbound messages for SMTP delivery
 *
 * @see Requirements 1.1, 1.2, 1.4
 * @module emailGatewayService
 */

import type {
  BlockAnnouncement,
  IBlockStore,
  IEmailMetadata,
  IGossipService,
} from '@brightchain/brightchain-lib';
import {
  EmailMessageService,
  OutboundDeliveryStatus,
} from '@brightchain/brightchain-lib';

import type { IEmailGatewayConfig } from './emailGatewayConfig';

// ─── Outbound Queue Interface ───────────────────────────────────────────────
// The OutboundQueue is implemented in a later task (4.x). We define a minimal
// interface here so the orchestrator can enqueue messages without a circular
// dependency. The concrete class will satisfy this contract.

/**
 * Minimal interface for the outbound email queue.
 *
 * The full `OutboundQueue` class (task 4.2) will implement this.
 * Using an interface here keeps the orchestrator decoupled from the
 * queue's internal persistence and concurrency details.
 */
export interface IOutboundQueue {
  /**
   * Add a message to the outbound delivery queue.
   *
   * @param message - Outbound message payload with recipient, content, and retry metadata
   */
  enqueue(message: IOutboundQueueItem): Promise<void>;
}

/**
 * Interface for gateway components that support hot-reload of the canonical domain.
 *
 * Components implementing this interface can be registered with the
 * `EmailGatewayService` so that when the canonical domain changes,
 * all components are updated without requiring a restart.
 *
 * @see Requirement 8.5 — dynamic configuration reload
 */
export interface IDomainAwareComponent {
  /**
   * Update the canonical domain used by this component.
   *
   * Implementations should apply the new domain immediately and clear
   * any caches that depend on the old domain value.
   *
   * @param newDomain - The new canonical email domain
   */
  updateCanonicalDomain(newDomain: string): void;
}

/**
 * A single item placed on the outbound delivery queue.
 */
export interface IOutboundQueueItem {
  /** RFC 5322 Message-ID */
  messageId: string;

  /** Sender email address */
  from: string;

  /** External recipient email addresses */
  to: string[];

  /** Email subject */
  subject?: string;

  /** Full email metadata for serialization */
  metadata: IEmailMetadata;

  /** Timestamp when the item was enqueued */
  enqueuedAt: Date;

  /** Current delivery status */
  status: OutboundDeliveryStatus;

  /** Number of delivery attempts so far */
  retryCount: number;

  /** Earliest time at which the next delivery attempt should be made */
  nextAttemptAt?: Date;
}

// ─── EmailGatewayService ────────────────────────────────────────────────────

/**
 * Orchestrator service for the Email Gateway.
 *
 * Listens for gossip announcements that carry outbound email, extracts the
 * message content from the Block Store, identifies external recipients by
 * comparing their domain against the configured `canonicalDomain`, and
 * enqueues qualifying messages in the OutboundQueue for SMTP delivery.
 *
 * Lifecycle:
 * - `start()` registers the gossip announcement listener
 * - `stop()` removes the listener and performs cleanup
 *
 * @see Requirements 1.1, 1.2, 1.4
 */
export class EmailGatewayService {
  /** Bound reference kept so we can unsubscribe on stop(). */
  private readonly boundAnnouncementHandler: (
    announcement: BlockAnnouncement,
  ) => void;

  /** Whether the service is currently running. */
  private running = false;

  /**
   * Registered domain-aware child components that receive canonical domain
   * updates when `updateCanonicalDomain()` is called.
   *
   * @see Requirement 8.5 — hot-reload canonical domain without restart
   */
  private readonly domainAwareComponents: IDomainAwareComponent[] = [];

  /**
   * @param config          - Gateway configuration (canonical domain, limits, etc.)
   * @param gossipService   - Gossip protocol service for subscribing to announcements
   * @param blockStore      - Block store for retrieving message content blocks
   * @param emailMessageService - Email message service for retrieving email metadata
   * @param outboundQueue   - Queue for outbound SMTP delivery (optional; set later via `setOutboundQueue`)
   */
  constructor(
    private readonly config: IEmailGatewayConfig,
    private readonly gossipService: IGossipService,
    private readonly blockStore: IBlockStore,
    private readonly emailMessageService: EmailMessageService,
    private outboundQueue?: IOutboundQueue,
  ) {
    // Bind once so the same reference is used for on/off.
    this.boundAnnouncementHandler = this.handleAnnouncement.bind(this);
  }

  // ─── Lifecycle ──────────────────────────────────────────────────────

  /**
   * Start the gateway service.
   *
   * Registers a gossip announcement listener that intercepts outbound
   * email announcements and delegates them to the outbound queue.
   */
  start(): void {
    if (this.running) {
      return;
    }
    this.gossipService.onMessageDelivery(this.boundAnnouncementHandler);
    this.running = true;
  }

  /**
   * Stop the gateway service.
   *
   * Removes the gossip listener and marks the service as stopped.
   */
  stop(): void {
    if (!this.running) {
      return;
    }
    this.gossipService.offMessageDelivery(this.boundAnnouncementHandler);
    this.running = false;
  }

  /**
   * Whether the service is currently running.
   */
  isRunning(): boolean {
    return this.running;
  }

  /**
   * Wire the outbound queue after construction.
   *
   * Useful when the queue is created after the gateway service (e.g.
   * during staged initialisation).
   */
  setOutboundQueue(queue: IOutboundQueue): void {
    this.outboundQueue = queue;
  }

  // ─── Hot-Reload: Canonical Domain ──────────────────────────────────

  /**
   * Register a child component that should be notified when the
   * canonical domain changes.
   *
   * @param component - A component implementing `IDomainAwareComponent`
   *
   * @see Requirement 8.5 — hot-reload canonical domain without restart
   */
  registerDomainAwareComponent(component: IDomainAwareComponent): void {
    this.domainAwareComponents.push(component);
  }

  /**
   * Update the canonical domain across the gateway and all registered
   * child components without requiring a restart.
   *
   * This method:
   * 1. Updates the shared `IEmailGatewayConfig.canonicalDomain`
   * 2. Propagates the new domain to all registered `IDomainAwareComponent`s
   *    (e.g. OutboundDeliveryWorker for DKIM signing, RecipientLookupService
   *    for inbound validation, BounceProcessor for VERP parsing)
   *
   * @param newDomain - The new canonical email domain
   *
   * @see Requirement 8.5 — when the canonical domain changes, update all
   *   gateway components for outbound signing and inbound recipient
   *   validation without requiring a restart
   */
  updateCanonicalDomain(newDomain: string): void {
    const trimmed = newDomain.trim();
    if (trimmed.length === 0) {
      return; // Ignore empty domain updates
    }

    // Update the shared config object (all components hold a reference to it).
    (this.config as { canonicalDomain: string }).canonicalDomain = trimmed;

    // Propagate to all registered domain-aware components.
    for (const component of this.domainAwareComponents) {
      component.updateCanonicalDomain(trimmed);
    }
  }

  /**
   * Get the current canonical domain.
   */
  getCanonicalDomain(): string {
    return this.config.canonicalDomain;
  }

  // ─── Domain Check ──────────────────────────────────────────────────

  /**
   * Determine whether an email address is external (not on the canonical domain).
   *
   * Extracts the domain portion of the address and compares it
   * case-insensitively against `config.canonicalDomain`.
   *
   * @param emailAddress - A full email address (e.g. `alice@example.com`)
   * @returns `true` when the address belongs to an external domain
   *
   * @see Requirement 1.1 — detect recipients whose domain ≠ canonical domain
   */
  isExternalRecipient(emailAddress: string): boolean {
    const atIndex = emailAddress.lastIndexOf('@');
    if (atIndex === -1) {
      // Malformed address — treat as external to be safe.
      return true;
    }
    const domain = emailAddress.slice(atIndex + 1).toLowerCase();
    const canonical = this.config.canonicalDomain.toLowerCase();
    return domain !== canonical && !domain.endsWith(`.${canonical}`);
  }

  /**
   * Partition a list of email addresses into internal and external groups.
   *
   * @param addresses - Array of email addresses
   * @returns Object with `internal` and `external` arrays
   *
   * @see Requirement 1.4 — mixed internal/external recipient handling
   */
  partitionRecipients(addresses: string[]): {
    internal: string[];
    external: string[];
  } {
    const internal: string[] = [];
    const external: string[] = [];
    for (const addr of addresses) {
      if (this.isExternalRecipient(addr)) {
        external.push(addr);
      } else {
        internal.push(addr);
      }
    }
    return { internal, external };
  }

  // ─── Gossip Announcement Handler ───────────────────────────────────

  /**
   * Handle a gossip message-delivery announcement.
   *
   * When an announcement carries `messageDelivery` metadata the handler:
   * 1. Retrieves the email metadata from the EmailMessageService
   * 2. Identifies external recipients
   * 3. Enqueues the message in the OutboundQueue for SMTP delivery
   *
   * Internal-only messages are ignored — they are already delivered via gossip.
   *
   * @param announcement - The gossip BlockAnnouncement with messageDelivery metadata
   *
   * @see Requirement 1.2 — extract message from Block Store and enqueue
   * @see Requirement 1.4 — route external recipients to gateway
   */
  private async handleAnnouncement(
    announcement: BlockAnnouncement,
  ): Promise<void> {
    const delivery = announcement.messageDelivery;
    if (!delivery) {
      return;
    }

    // Retrieve the email metadata via the message ID.
    const metadata = await this.emailMessageService.getEmail(
      delivery.messageId,
    );
    if (!metadata) {
      // Message not found — nothing to route.
      return;
    }

    // Collect all recipient addresses from the metadata.
    const allRecipients = [
      ...metadata.to.map((m) => m.address),
      ...(metadata.cc ?? []).map((m) => m.address),
      ...(metadata.bcc ?? []).map((m) => m.address),
    ];

    // Partition into internal / external.
    const { external } = this.partitionRecipients(allRecipients);

    if (external.length === 0) {
      // Purely internal delivery — nothing for the gateway to do.
      return;
    }

    if (!this.outboundQueue) {
      // Queue not wired yet — cannot enqueue. This is a configuration issue.
      // In production this would be logged/alerted; for now we silently skip.
      return;
    }

    // Build the queue item and enqueue.
    const queueItem: IOutboundQueueItem = {
      messageId: metadata.messageId,
      from: metadata.from.address,
      to: external,
      subject: metadata.subject,
      metadata,
      enqueuedAt: new Date(),
      status: OutboundDeliveryStatus.Queued,
      retryCount: 0,
    };

    await this.outboundQueue.enqueue(queueItem);
  }
}
