import type { PlatformID } from '@digitaldefiance/ecies-lib';

import { DeliveryStatus } from '../../enumerations/messaging/deliveryStatus';
import { MessagePriority } from '../../enumerations/messaging/messagePriority';
import { IBlockMetadataStore } from '../storage/blockMetadataStore';
import { IMessageMetadata } from './messageMetadata';

/**
 * Query options for message metadata queries.
 *
 * @see Requirements 9.1, 9.2, 9.3, 9.4, 9.5
 */
export interface MessageQueryOptions {
  startDate?: Date;
  endDate?: Date;
  messageType?: string;
  priority?: MessagePriority;
  limit?: number;
  offset?: number;
}

/**
 * Message query parameters for filtering messages.
 *
 * @template TID - Platform ID type for frontend/backend DTO compatibility.
 *   Defaults to `string` for backward compatibility.
 *
 * @see Requirements 9.1, 9.2, 9.3, 9.4
 */
export interface MessageQuery<TID extends PlatformID = string> {
  recipientId?: TID;
  senderId?: TID;
  messageType?: string;
  startDate?: Date;
  endDate?: Date;
  priority?: MessagePriority;
  page?: number;
  pageSize?: number;
}

/**
 * Interface for message metadata storage operations.
 *
 * @remarks
 * Extends IBlockMetadataStore with message-specific operations for
 * storing, querying, and tracking message delivery status.
 *
 * @template TID - Platform ID type for frontend/backend DTO compatibility.
 *   Defaults to `string` for backward compatibility.
 *
 * @see Requirements 1.3, 9.1, 9.2, 9.3, 9.4, 10.2
 */
export interface IMessageMetadataStore<
  TID extends PlatformID = string,
> extends IBlockMetadataStore {
  /**
   * Store message metadata.
   * @param metadata - Message metadata to store
   */
  storeMessageMetadata(metadata: IMessageMetadata<TID>): Promise<void>;

  /**
   * Query messages by various criteria.
   * @param query - Query parameters
   * @returns Array of matching message metadata
   */
  queryMessages(query: MessageQuery<TID>): Promise<IMessageMetadata<TID>[]>;

  /**
   * Update delivery status for a recipient.
   * @param messageId - Block ID of the message
   * @param recipientId - ID of the recipient
   * @param status - New delivery status
   */
  updateDeliveryStatus(
    messageId: string,
    recipientId: TID,
    status: DeliveryStatus,
  ): Promise<void>;

  /**
   * Record message acknowledgment from a recipient.
   * @param messageId - Block ID of the message
   * @param recipientId - ID of the acknowledging recipient
   * @param timestamp - Acknowledgment timestamp
   */
  recordAcknowledgment(
    messageId: string,
    recipientId: TID,
    timestamp: Date,
  ): Promise<void>;

  /**
   * Get messages by recipient.
   * @param recipientId - ID of the recipient
   * @param options - Query options
   * @returns Array of message metadata for the recipient
   */
  getMessagesByRecipient(
    recipientId: TID,
    options?: MessageQueryOptions,
  ): Promise<IMessageMetadata<TID>[]>;

  /**
   * Get messages by sender.
   * @param senderId - ID of the sender
   * @param options - Query options
   * @returns Array of message metadata from the sender
   */
  getMessagesBySender(
    senderId: TID,
    options?: MessageQueryOptions,
  ): Promise<IMessageMetadata<TID>[]>;
}
