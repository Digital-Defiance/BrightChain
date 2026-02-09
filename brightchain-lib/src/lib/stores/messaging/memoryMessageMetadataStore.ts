import { DeliveryStatus } from '../../enumerations/messaging/deliveryStatus';
import { StoreErrorType } from '../../enumerations/storeErrorType';
import { StoreError } from '../../errors/storeError';
import { IMessageMetadata } from '../../interfaces/messaging/messageMetadata';
import {
  IMessageMetadataStore,
  MessageQuery,
  MessageQueryOptions,
} from '../../interfaces/messaging/messageMetadataStore';
import { MemoryBlockMetadataStore } from '../memoryBlockMetadataStore';

/**
 * In-memory implementation of IMessageMetadataStore.
 *
 * @remarks
 * Extends MemoryBlockMetadataStore with message-specific operations.
 * Uses Map for fast lookups and filtering.
 *
 * @see Requirements 1.3, 9.1, 9.2, 9.3, 9.4, 9.5, 10.2
 */
export class MemoryMessageMetadataStore
  extends MemoryBlockMetadataStore
  implements IMessageMetadataStore
{
  private readonly messageMetadata = new Map<string, IMessageMetadata>();

  async storeMessageMetadata(metadata: IMessageMetadata): Promise<void> {
    await this.create(metadata);
    this.messageMetadata.set(
      metadata.blockId,
      this.cloneMessageMetadata(metadata),
    );
  }

  async queryMessages(query: MessageQuery): Promise<IMessageMetadata[]> {
    const results: IMessageMetadata[] = [];
    const {
      recipientId,
      senderId,
      messageType,
      startDate,
      endDate,
      priority,
      page = 0,
      pageSize = 50,
    } = query;

    for (const meta of this.messageMetadata.values()) {
      if (recipientId && !meta.recipients.includes(recipientId)) continue;
      if (senderId && meta.senderId !== senderId) continue;
      if (messageType && meta.messageType !== messageType) continue;
      if (startDate && meta.createdAt < startDate) continue;
      if (endDate && meta.createdAt > endDate) continue;
      if (priority !== undefined && meta.priority !== priority) continue;

      results.push(this.cloneMessageMetadata(meta));
    }

    const start = page * pageSize;
    return results.slice(start, start + pageSize);
  }

  async updateDeliveryStatus(
    messageId: string,
    recipientId: string,
    status: DeliveryStatus,
  ): Promise<void> {
    const meta = this.messageMetadata.get(messageId);
    if (!meta)
      throw new StoreError(StoreErrorType.KeyNotFound, undefined, {
        KEY: messageId,
      });

    meta.deliveryStatus.set(recipientId, status);
    // Also update the base metadata store
    await this.update(messageId, meta);
  }

  async recordAcknowledgment(
    messageId: string,
    recipientId: string,
    timestamp: Date,
  ): Promise<void> {
    const meta = this.messageMetadata.get(messageId);
    if (!meta)
      throw new StoreError(StoreErrorType.KeyNotFound, undefined, {
        KEY: messageId,
      });

    meta.acknowledgments.set(recipientId, timestamp);
    meta.deliveryStatus.set(recipientId, DeliveryStatus.Delivered);
    // Also update the base metadata store
    await this.update(messageId, meta);
  }

  async getMessagesByRecipient(
    recipientId: string,
    options?: MessageQueryOptions,
  ): Promise<IMessageMetadata[]> {
    const results: IMessageMetadata[] = [];
    const {
      startDate,
      endDate,
      messageType,
      priority,
      limit = 50,
      offset = 0,
    } = options || {};

    for (const meta of this.messageMetadata.values()) {
      if (!meta.recipients.includes(recipientId)) continue;
      if (startDate && meta.createdAt < startDate) continue;
      if (endDate && meta.createdAt > endDate) continue;
      if (messageType && meta.messageType !== messageType) continue;
      if (priority !== undefined && meta.priority !== priority) continue;

      results.push(this.cloneMessageMetadata(meta));
    }

    return results.slice(offset, offset + limit);
  }

  async getMessagesBySender(
    senderId: string,
    options?: MessageQueryOptions,
  ): Promise<IMessageMetadata[]> {
    const results: IMessageMetadata[] = [];
    const {
      startDate,
      endDate,
      messageType,
      priority,
      limit = 50,
      offset = 0,
    } = options || {};

    for (const meta of this.messageMetadata.values()) {
      if (meta.senderId !== senderId) continue;
      if (startDate && meta.createdAt < startDate) continue;
      if (endDate && meta.createdAt > endDate) continue;
      if (messageType && meta.messageType !== messageType) continue;
      if (priority !== undefined && meta.priority !== priority) continue;

      results.push(this.cloneMessageMetadata(meta));
    }

    return results.slice(offset, offset + limit);
  }

  private cloneMessageMetadata(meta: IMessageMetadata): IMessageMetadata {
    return {
      ...meta,
      createdAt: new Date(meta.createdAt.getTime()),
      expiresAt: meta.expiresAt ? new Date(meta.expiresAt.getTime()) : null,
      lastAccessedAt: new Date(meta.lastAccessedAt.getTime()),
      parityBlockIds: [...meta.parityBlockIds],
      replicaNodeIds: [...meta.replicaNodeIds],
      recipients: [...meta.recipients],
      deliveryStatus: new Map(meta.deliveryStatus),
      acknowledgments: new Map(
        Array.from(meta.acknowledgments.entries()).map(([k, v]) => [
          k,
          new Date(v.getTime()),
        ]),
      ),
      cblBlockIds: meta.cblBlockIds ? [...meta.cblBlockIds] : undefined,
    };
  }
}
