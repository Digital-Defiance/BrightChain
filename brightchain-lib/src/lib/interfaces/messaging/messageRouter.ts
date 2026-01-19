import { RoutingStrategy } from '../../enumerations/messaging/routingStrategy';

/**
 * @description Message router interface for routing messages to recipients
 */
export interface IMessageRouter {
  /**
   * Route a message to its recipients
   * @param messageId - Message ID to route
   * @param recipients - List of recipient node IDs
   * @returns Promise resolving to routing results
   */
  routeMessage(messageId: string, recipients: string[]): Promise<RoutingResult>;

  /**
   * Handle an incoming message from another node
   * @param messageId - Message ID received
   * @param senderId - Sender node ID
   * @returns Promise resolving when message is handled
   */
  handleIncomingMessage(messageId: string, senderId: string): Promise<void>;

  /**
   * Forward a message through this node to other recipients
   * @param messageId - Message ID to forward
   * @param recipients - List of recipient node IDs
   * @param forwardingPath - Path of nodes that have already forwarded this message
   * @returns Promise resolving to forwarding results
   */
  forwardMessage(
    messageId: string,
    recipients: string[],
    forwardingPath: string[],
  ): Promise<RoutingResult>;

  /**
   * Determine routing strategy based on recipients
   * @param recipients - List of recipient node IDs
   * @returns Routing strategy to use
   */
  determineStrategy(recipients: string[]): RoutingStrategy;
}

/**
 * @description Result of routing operation
 */
export interface RoutingResult {
  /** Routing strategy used */
  strategy: RoutingStrategy;
  /** Recipients successfully routed to */
  successfulRecipients: string[];
  /** Recipients that failed routing */
  failedRecipients: string[];
  /** Error messages for failed recipients */
  errors: Map<string, string>;
}
