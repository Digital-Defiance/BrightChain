import { MessageDeliveryStatus } from '../../enumerations/messaging/messageDeliveryStatus';
import { IGossipService } from '../../interfaces/availability/gossipService';
import { IMessageMetadataStore } from '../../interfaces/messaging/messageMetadataStore';

/**
 * Broadcast message router using gossip protocol
 * Routes messages to all network nodes via gossip propagation
 */
export class BroadcastMessageRouter {
  constructor(
    private readonly gossipService: IGossipService,
    private readonly metadataStore: IMessageMetadataStore,
  ) {}

  /**
   * Broadcast message to network via gossip protocol
   * @param messageId Message ID to broadcast
   * @returns Promise resolving to success status
   */
  async broadcastMessage(messageId: string, _ttl?: number): Promise<boolean> {
    try {
      await this.metadataStore.updateDeliveryStatus(
        messageId,
        'broadcast',
        MessageDeliveryStatus.IN_TRANSIT,
      );

      await this.gossipService.announceBlock(messageId);
      return true;
    } catch (error) {
      await this.metadataStore.updateDeliveryStatus(
        messageId,
        'broadcast',
        MessageDeliveryStatus.FAILED,
      );
      return false;
    }
  }
}
