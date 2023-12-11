import {
  BlockAnnouncement,
  Checksum,
  DeliveryStatus,
  EmailMessageService,
  IMessageCBLOptions as ICreateMessageOptions,
  IGossipService,
  IMessageMetadata,
  IMessageMetadataStore,
  MessageCBLService,
  MessageDeliveryMetadata,
  StoreError,
  StoreErrorType,
  type IDeliveryReceipt,
  type IEmailContent,
  type IEmailInput,
  type IEmailMetadata,
  type IEmailMetadataStore,
  type IEmailServiceConfig,
  type IInboxQuery,
  type IInboxResult,
  type IMailbox,
  type IReplyInput,
  type ISendEmailResult,
} from '@brightchain/brightchain-lib';
import {
  EventNotificationSystem,
  MessageEventType,
} from './eventNotificationSystem';

/**
 * High-level message passing service coordinating storage, routing, and events.
 *
 * Uses IGossipService for message delivery instead of WebSocketMessageServer.
 * Messages are announced via gossip protocol and delivery acknowledgments
 * are received through gossip ack events.
 *
 * @see Requirements 7.1, 7.2, 7.3, 7.4, 7.5
 */
export class MessagePassingService {
  private emailService?: EmailMessageService;

  constructor(
    private messageCBL: MessageCBLService,
    private metadataStore: IMessageMetadataStore,
    private eventSystem: EventNotificationSystem,
    private gossipService: IGossipService,
  ) {
    this.setupHandlers();
  }

  /**
   * Wire up the EmailMessageService for email-specific operations.
   *
   * Call this after construction to enable email methods (sendEmail,
   * getEmail, queryInbox, etc.). Without this, email methods will throw.
   */
  configureEmail(
    emailMetadataStore: IEmailMetadataStore,
    config?: Partial<IEmailServiceConfig>,
  ): void {
    this.emailService = new EmailMessageService(
      this.messageCBL,
      emailMetadataStore,
      this.gossipService,
      config,
    );
  }

  /**
   * Returns the underlying EmailMessageService.
   * @throws Error if email has not been configured via configureEmail()
   */
  private getEmailService(): EmailMessageService {
    if (!this.emailService) {
      throw new Error(
        'Email not configured. Call configureEmail() before using email methods.',
      );
    }
    return this.emailService;
  }

  // ─── Email Operations ─────────────────────────────────────────────

  /**
   * Send an email message via the BrightChain email protocol.
   *
   * @see Requirements 15.1, 15.4
   */
  async sendEmail(email: IEmailInput): Promise<ISendEmailResult> {
    return this.getEmailService().sendEmail(email);
  }

  /**
   * Retrieve email metadata by message ID.
   */
  async getEmail(messageId: string): Promise<IEmailMetadata | null> {
    return this.getEmailService().getEmail(messageId);
  }

  /**
   * Retrieve full email content including MIME parts and attachments.
   */
  async getEmailContent(messageId: string): Promise<IEmailContent> {
    return this.getEmailService().getEmailContent(messageId);
  }

  /**
   * Delete an email by message ID.
   */
  async deleteEmail(messageId: string): Promise<void> {
    return this.getEmailService().deleteEmail(messageId);
  }

  /**
   * Query a user's inbox with filtering, sorting, and pagination.
   *
   * @see Requirements 13.1, 13.2, 13.3, 13.6, 13.7
   */
  async queryInbox(userId: string, query: IInboxQuery): Promise<IInboxResult> {
    return this.getEmailService().queryInbox(userId, query);
  }

  /**
   * Mark an email as read for a specific user.
   */
  async markEmailAsRead(messageId: string, userId: string): Promise<void> {
    return this.getEmailService().markAsRead(messageId, userId);
  }

  /**
   * Get unread email count for a user.
   */
  async getUnreadEmailCount(userId: string): Promise<number> {
    return this.getEmailService().getUnreadCount(userId);
  }

  /**
   * Get all emails in a thread.
   */
  async getEmailThread(messageId: string): Promise<IEmailMetadata[]> {
    return this.getEmailService().getThread(messageId);
  }

  /**
   * Create a reply to an existing email.
   *
   * @see Requirements 10.1, 10.2, 10.3
   */
  async createEmailReply(
    originalId: string,
    replyContent: IReplyInput,
  ): Promise<ISendEmailResult> {
    return this.getEmailService().createReply(originalId, replyContent);
  }

  /**
   * Forward an email to new recipients.
   *
   * @see Requirements 17.1, 17.2, 17.3
   */
  async forwardEmail(
    originalId: string,
    forwardTo: IMailbox[],
  ): Promise<ISendEmailResult> {
    return this.getEmailService().forwardEmail(originalId, forwardTo);
  }

  /**
   * Get delivery status for all recipients of an email.
   */
  async getEmailDeliveryStatus(
    messageId: string,
  ): Promise<Map<string, IDeliveryReceipt>> {
    return this.getEmailService().getDeliveryStatus(messageId);
  }

  /**
   * Send a message
   *
   * Stores the message via MessageCBLService, emits MESSAGE_STORED event,
   * then announces the message via gossip protocol for delivery.
   *
   * @see Requirements 7.1, 7.3, 7.5
   */
  async sendMessage(
    content: Buffer,
    senderId: string,
    options: ICreateMessageOptions,
  ): Promise<{ messageId: string; magnetUrl: string }> {
    const { messageId, magnetUrl } = await this.messageCBL.createMessage(
      new Uint8Array(content),
      senderId as unknown as Parameters<MessageCBLService['createMessage']>[1],
      options,
    );
    const metadata = await this.messageCBL.getMessageMetadata(messageId);

    if (metadata) {
      // Emit MESSAGE_STORED event after successful storage (Requirement 7.3)
      this.eventSystem.emit(MessageEventType.MESSAGE_STORED, metadata);

      // Build message delivery metadata for gossip announcement
      const recipientIds =
        options.recipients && options.recipients.length > 0
          ? [...options.recipients]
          : [];

      const deliveryMetadata: MessageDeliveryMetadata = {
        messageId,
        recipientIds,
        priority: 'normal',
        blockIds: metadata.cblBlockIds ?? [],
        cblBlockId: metadata.blockId,
        ackRequired: true,
      };

      // Announce message via gossip protocol (Requirement 7.1)
      await this.gossipService.announceMessage(
        metadata.cblBlockIds ?? [],
        deliveryMetadata,
      );

      // Update delivery status for each recipient to Announced
      for (const recipientId of recipientIds) {
        await this.metadataStore.updateDeliveryStatus(
          messageId,
          recipientId,
          DeliveryStatus.Announced,
        );
      }
    }

    return { messageId, magnetUrl };
  }

  /**
   * Get message content
   *
   * @see Requirements 7.5
   */
  async getMessage(messageId: string): Promise<Buffer | null> {
    const content = await this.messageCBL.getMessageContent(messageId);
    return content ? Buffer.from(content) : null;
  }

  /**
   * Query messages
   *
   * @see Requirements 7.5
   */
  async queryMessages(
    query: Record<string, unknown>,
  ): Promise<IMessageMetadata[]> {
    return this.metadataStore.queryMessages(query);
  }

  /**
   * Delete message
   *
   * @see Requirements 7.5
   */
  async deleteMessage(messageId: string): Promise<void> {
    const metadata = await this.messageCBL.getMessageMetadata(messageId);
    if (metadata && metadata.cblBlockIds) {
      for (const blockId of metadata.cblBlockIds) {
        await this.messageCBL['blockStore'].delete(Checksum.fromHex(blockId));
      }
    }
  }

  /**
   * Set up handlers for gossip delivery events.
   *
   * Listens for:
   * - Message delivery announcements (incoming messages)
   * - Delivery acknowledgments (confirmation of sent messages)
   *
   * @see Requirements 7.4
   */
  private setupHandlers(): void {
    // Handle incoming message delivery announcements
    this.gossipService.onMessageDelivery(
      async (announcement: BlockAnnouncement) => {
        if (announcement.messageDelivery) {
          const metadata = await this.messageCBL.getMessageMetadata(
            announcement.messageDelivery.messageId,
          );
          if (metadata) {
            this.eventSystem.emit(MessageEventType.MESSAGE_RECEIVED, metadata);
          }
        }
      },
    );

    // Handle delivery acknowledgments (Requirement 7.4)
    this.gossipService.onDeliveryAck(
      async (announcement: BlockAnnouncement) => {
        if (announcement.deliveryAck) {
          const { messageId, recipientId, status } = announcement.deliveryAck;

          // Map ack status to DeliveryStatus
          const deliveryStatus =
            status === 'delivered' || status === 'read'
              ? DeliveryStatus.Delivered
              : DeliveryStatus.Failed;

          // Record the acknowledgment and update delivery status.
          // The message may be managed by the email subsystem (InMemoryEmailMetadataStore)
          // rather than the generic MemoryMessageMetadataStore, so KeyNotFound is expected
          // for email messages and should be silently ignored.
          try {
            await this.metadataStore.recordAcknowledgment(
              messageId,
              recipientId,
              new Date(),
            );
          } catch (err) {
            if (
              !(err instanceof StoreError) ||
              err.type !== StoreErrorType.KeyNotFound
            ) {
              throw err;
            }
          }

          try {
            await this.metadataStore.updateDeliveryStatus(
              messageId,
              recipientId,
              deliveryStatus,
            );
          } catch (err) {
            if (
              !(err instanceof StoreError) ||
              err.type !== StoreErrorType.KeyNotFound
            ) {
              throw err;
            }
          }

          // Check if all recipients have been delivered and emit appropriate events
          const metadata = await this.messageCBL.getMessageMetadata(messageId);
          if (metadata) {
            const allDelivered = metadata.recipients?.every(
              (r: string) =>
                metadata.deliveryStatus?.get(r) === DeliveryStatus.Delivered,
            );

            if (allDelivered) {
              this.eventSystem.emit(
                MessageEventType.MESSAGE_DELIVERED,
                metadata,
              );
            } else if (deliveryStatus === DeliveryStatus.Failed) {
              this.eventSystem.emit(MessageEventType.MESSAGE_FAILED, metadata);
            }
          }
        }
      },
    );
  }
}
