import {
  Checksum,
  IMessageCBLOptions as ICreateMessageOptions,
  IMessageMetadata,
  IMessageMetadataStore,
  MessageCBLService,
  MessageDeliveryStatus,
} from '@brightchain/brightchain-lib';
import {
  EventNotificationSystem,
  MessageEventType,
} from './eventNotificationSystem';
import { WebSocketMessageServer } from './webSocketMessageServer';

/**
 * High-level message passing service coordinating storage, routing, and events
 */
export class MessagePassingService {
  constructor(
    private messageCBL: MessageCBLService,
    private metadataStore: IMessageMetadataStore,
    private eventSystem: EventNotificationSystem,
    private wsServer: WebSocketMessageServer,
  ) {
    this.setupHandlers();
  }

  /**
   * Send a message
   */
  async sendMessage(
    content: Buffer,
    senderId: string,
    options: ICreateMessageOptions,
  ): Promise<string> {
    const { messageId } = await this.messageCBL.createMessage(
      new Uint8Array(content),
      senderId as unknown as Parameters<MessageCBLService['createMessage']>[1],
      options,
    );
    const metadata = await this.messageCBL.getMessageMetadata(messageId);

    if (metadata) {
      this.eventSystem.emit(MessageEventType.MESSAGE_STORED, metadata);

      // Route to recipients
      if (options.recipients && options.recipients.length > 0) {
        for (const recipientId of options.recipients) {
          await this.wsServer.sendToNode(recipientId, messageId);
          await this.metadataStore.updateDeliveryStatus(
            messageId,
            recipientId,
            MessageDeliveryStatus.IN_TRANSIT,
          );
        }
      } else {
        // Broadcast
        this.wsServer.broadcast(messageId);
      }
    }

    return messageId;
  }

  /**
   * Get message content
   */
  async getMessage(messageId: string): Promise<Buffer | null> {
    const content = await this.messageCBL.getMessageContent(messageId);
    return content ? Buffer.from(content) : null;
  }

  /**
   * Query messages
   */
  async queryMessages(
    query: Record<string, unknown>,
  ): Promise<IMessageMetadata[]> {
    return this.metadataStore.queryMessages(query);
  }

  /**
   * Delete message
   */
  async deleteMessage(messageId: string): Promise<void> {
    const metadata = await this.messageCBL.getMessageMetadata(messageId);
    if (metadata && metadata.cblBlockIds) {
      for (const blockId of metadata.cblBlockIds) {
        await this.messageCBL['blockStore'].delete(Checksum.fromHex(blockId));
      }
    }
  }

  private setupHandlers(): void {
    this.wsServer.onMessage(async (nodeId, messageId) => {
      const metadata = await this.messageCBL.getMessageMetadata(messageId);
      if (metadata) {
        this.eventSystem.emit(MessageEventType.MESSAGE_RECEIVED, metadata);
        await this.wsServer.sendToNode(nodeId, messageId);
      }
    });

    this.wsServer.onAck(async (nodeId, messageId, status) => {
      await this.metadataStore.recordAcknowledgment(
        messageId,
        nodeId,
        new Date(),
      );
      await this.metadataStore.updateDeliveryStatus(
        messageId,
        nodeId,
        status as MessageDeliveryStatus,
      );

      const metadata = await this.messageCBL.getMessageMetadata(messageId);
      if (metadata) {
        const allDelivered = metadata.recipients?.every(
          (r: string) =>
            metadata.deliveryStatus?.get(r) === MessageDeliveryStatus.DELIVERED,
        );

        if (allDelivered) {
          this.eventSystem.emit(MessageEventType.MESSAGE_DELIVERED, metadata);
        } else if (status === MessageDeliveryStatus.FAILED) {
          this.eventSystem.emit(MessageEventType.MESSAGE_FAILED, metadata);
        }
      }
    });
  }
}
