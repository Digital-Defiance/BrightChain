import { MessageDeliveryStatus } from '../../enumerations/messaging/messageDeliveryStatus';
import { MessageErrorType } from '../../enumerations/messaging/messageErrorType';
import { RoutingStrategy } from '../../enumerations/messaging/routingStrategy';
import { MessageError } from '../../errors/messaging/messageError';
import { IMessageMetadataStore } from '../../interfaces/messaging/messageMetadataStore';
import {
  IMessageRouter,
  RoutingResult,
} from '../../interfaces/messaging/messageRouter';
import {
  DEFAULT_MESSAGE_SYSTEM_CONFIG,
  IMessageSystemConfig,
} from '../../interfaces/messaging/messageSystemConfig';
import { IMessageLogger } from './messageLogger';
import { IMessageMetricsCollector } from './messageMetrics';

/**
 * @description Message router for routing messages to recipients
 * Note: This is a minimal implementation. Network transport (WebSocket, gossip)
 * integration is deferred to higher-level services.
 */
export class MessageRouter implements IMessageRouter {
  private readonly config: IMessageSystemConfig;

  constructor(
    private readonly metadataStore: IMessageMetadataStore,
    private readonly localNodeId: string,
    config?: Partial<IMessageSystemConfig>,
    private readonly metrics?: IMessageMetricsCollector,
    private readonly logger?: IMessageLogger,
  ) {
    this.config = { ...DEFAULT_MESSAGE_SYSTEM_CONFIG, ...config };
  }

  async routeMessage(
    messageId: string,
    recipients: string[],
  ): Promise<RoutingResult> {
    const startTime = Date.now();
    const strategy = this.determineStrategy(recipients);
    this.logger?.logRoutingDecision(messageId, strategy, recipients.length);
    const successfulRecipients: string[] = [];
    const failedRecipients: string[] = [];
    const errors = new Map<string, string>();

    for (const recipient of recipients) {
      try {
        await Promise.race([
          this.metadataStore.updateDeliveryStatus(
            messageId,
            recipient,
            MessageDeliveryStatus.IN_TRANSIT,
          ),
          new Promise((_, reject) =>
            setTimeout(
              () => reject(new Error('Routing timeout')),
              this.config.routingTimeoutMs,
            ),
          ),
        ]);
        successfulRecipients.push(recipient);
      } catch (error) {
        failedRecipients.push(recipient);
        const errorMsg =
          error instanceof Error ? error.message : 'Unknown error';
        errors.set(recipient, errorMsg);
        this.logger?.logDeliveryFailure(messageId, recipient, errorMsg);

        try {
          await this.metadataStore.updateDeliveryStatus(
            messageId,
            recipient,
            MessageDeliveryStatus.FAILED,
          );
        } catch {
          // Ignore metadata update errors
        }
      }
    }

    if (
      failedRecipients.length === recipients.length &&
      recipients.length > 0
    ) {
      this.metrics?.recordMessageFailed();
      throw new MessageError(
        MessageErrorType.DELIVERY_FAILED,
        'Failed to route message to any recipient',
        { messageId, failedRecipients, errors: Object.fromEntries(errors) },
      );
    }

    const latency = Date.now() - startTime;
    if (successfulRecipients.length > 0) {
      this.metrics?.recordMessageDelivered(latency);
    }

    return {
      strategy,
      successfulRecipients,
      failedRecipients,
      errors,
    };
  }

  async handleIncomingMessage(
    messageId: string,
    _senderId: string,
  ): Promise<void> {
    // Verify message exists in metadata store
    const metadata = await this.metadataStore.get(messageId);
    if (!metadata) {
      throw new Error(`Message ${messageId} not found`);
    }

    // Message received successfully - actual storage is handled by MessageCBLService
    // This method is called after the message has been stored locally
  }

  async forwardMessage(
    messageId: string,
    recipients: string[],
    forwardingPath: string[],
  ): Promise<RoutingResult> {
    // Prevent forwarding loops
    if (forwardingPath.includes(this.localNodeId)) {
      return {
        strategy: RoutingStrategy.DIRECT,
        successfulRecipients: [],
        failedRecipients: recipients,
        errors: new Map(recipients.map((r) => [r, 'Forwarding loop detected'])),
      };
    }

    // Add this node to forwarding path
    const _newPath = [...forwardingPath, this.localNodeId];

    // Forward using same logic as routeMessage
    // In a full implementation, this would pass the forwarding path to the transport layer
    return this.routeMessage(messageId, recipients);
  }

  determineStrategy(recipients: string[]): RoutingStrategy {
    if (recipients.length === 0) {
      // Empty recipients = broadcast via gossip
      return RoutingStrategy.GOSSIP;
    } else {
      // Non-empty recipients = direct routing
      return RoutingStrategy.DIRECT;
    }
  }
}
