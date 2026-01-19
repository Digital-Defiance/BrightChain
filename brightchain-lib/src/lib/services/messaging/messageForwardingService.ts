import { MessageDeliveryStatus } from '../../enumerations/messaging/messageDeliveryStatus';
import { IMessageMetadataStore } from '../../interfaces/messaging/messageMetadataStore';
import { INetworkTransport } from '../../interfaces/network/networkTransport';

/**
 * Message forwarding service with loop detection
 * Forwards messages through intermediate nodes to reach recipients
 */
export class MessageForwardingService {
  private readonly forwardingPaths = new Map<string, Set<string>>();

  constructor(
    private readonly transport: INetworkTransport,
    private readonly metadataStore: IMessageMetadataStore,
    private readonly nodeId: string,
  ) {}

  /**
   * Forward message to recipient via intermediate node
   * @param messageId Message ID to forward
   * @param recipientId Target recipient node ID
   * @param intermediateNodeId Intermediate node to forward through
   * @returns Promise resolving to success status
   */
  async forwardMessage(
    messageId: string,
    recipientId: string,
    intermediateNodeId: string,
  ): Promise<boolean> {
    if (this.detectLoop(messageId, intermediateNodeId)) {
      return false;
    }

    this.trackForwardingPath(messageId, intermediateNodeId);

    try {
      await this.metadataStore.updateDeliveryStatus(
        messageId,
        recipientId,
        MessageDeliveryStatus.IN_TRANSIT,
      );

      const success = await this.transport.sendToNode(
        intermediateNodeId,
        messageId,
      );

      if (!success) {
        await this.metadataStore.updateDeliveryStatus(
          messageId,
          recipientId,
          MessageDeliveryStatus.FAILED,
        );
      }

      return success;
    } catch (_error) {
      await this.metadataStore.updateDeliveryStatus(
        messageId,
        recipientId,
        MessageDeliveryStatus.FAILED,
      );
      return false;
    }
  }

  /**
   * Detect forwarding loop
   * @param messageId Message ID
   * @param nodeId Node ID to check
   * @returns True if loop detected
   */
  private detectLoop(messageId: string, nodeId: string): boolean {
    if (nodeId === this.nodeId) {
      return true;
    }
    const path = this.forwardingPaths.get(messageId);
    return path ? path.has(nodeId) : false;
  }

  /**
   * Track forwarding path for loop detection
   * @param messageId Message ID
   * @param nodeId Node ID to add to path
   */
  private trackForwardingPath(messageId: string, nodeId: string): void {
    if (!this.forwardingPaths.has(messageId)) {
      this.forwardingPaths.set(messageId, new Set());
    }
    this.forwardingPaths.get(messageId)!.add(nodeId);
  }

  /**
   * Clear forwarding path for message
   * @param messageId Message ID
   */
  clearPath(messageId: string): void {
    this.forwardingPaths.delete(messageId);
  }
}
