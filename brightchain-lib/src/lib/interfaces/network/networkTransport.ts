/**
 * Network transport interface for message transmission
 */
export interface INetworkTransport {
  /**
   * Send message to specific recipient node
   * @param recipientId Target node ID
   * @param messageId Message ID to send
   * @returns Promise resolving to success status
   */
  sendToNode(recipientId: string, messageId: string): Promise<boolean>;

  /**
   * Check if node is reachable
   * @param nodeId Node ID to check
   * @returns Promise resolving to reachability status
   */
  isNodeReachable(nodeId: string): Promise<boolean>;
}
