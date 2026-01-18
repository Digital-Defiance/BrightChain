import { INetworkTransport } from '../../interfaces/network/networkTransport';
import { IMessageMetadataStore } from '../../interfaces/messaging/messageMetadataStore';
import { MessageDeliveryStatus } from '../../enumerations/messaging/messageDeliveryStatus';

/**
 * Direct message routing service
 * Routes messages to specific recipient nodes via network transport
 */
export class DirectMessageRouter {
  constructor(
    private readonly transport: INetworkTransport,
    private readonly metadataStore: IMessageMetadataStore
  ) {}

  /**
   * Route message to specific recipients
   * @param messageId Message ID to route
   * @param recipients List of recipient node IDs
   * @returns Map of recipient ID to routing success status
   */
  async routeToRecipients(
    messageId: string,
    recipients: string[]
  ): Promise<Map<string, boolean>> {
    const results = new Map<string, boolean>();

    for (const recipientId of recipients) {
      try {
        await this.metadataStore.updateDeliveryStatus(
          messageId,
          recipientId,
          MessageDeliveryStatus.IN_TRANSIT
        );

        const success = await this.transport.sendToNode(recipientId, messageId);
        results.set(recipientId, success);

        if (!success) {
          await this.metadataStore.updateDeliveryStatus(
            messageId,
            recipientId,
            MessageDeliveryStatus.FAILED
          );
        }
      } catch (error) {
        results.set(recipientId, false);
        await this.metadataStore.updateDeliveryStatus(
          messageId,
          recipientId,
          MessageDeliveryStatus.FAILED
        );
      }
    }

    return results;
  }

  /**
   * Check if recipients are reachable
   * @param recipients List of recipient node IDs
   * @returns Map of recipient ID to reachability status
   */
  async checkReachability(recipients: string[]): Promise<Map<string, boolean>> {
    const results = new Map<string, boolean>();

    for (const recipientId of recipients) {
      try {
        const reachable = await this.transport.isNodeReachable(recipientId);
        results.set(recipientId, reachable);
      } catch {
        results.set(recipientId, false);
      }
    }

    return results;
  }
}
