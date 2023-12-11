/**
 * Concrete implementation of IBlockContentStore for Node.js environments.
 *
 * Bridges the platform-agnostic IBlockContentStore interface (defined in
 * brightchain-lib) to the Node.js-specific MessageCBLService and
 * IGossipService. Follows the same storage + gossip announcement pattern
 * used by MessagePassingService.sendMessage().
 *
 * This adapter lives in brightchain-api-lib because it depends on
 * MessageCBLService (which requires IBlockStore — a Node.js dependency)
 * and IGossipService for decentralized distribution.
 *
 * Requirements: 2.1, 2.2, 2.3, 2.4, 2.5, 2.8
 */

import {
  Checksum,
  type IBlockContentStore,
  IGossipService,
  MessageCBLService,
  MessageDeliveryMetadata,
  MessageEncryptionScheme,
  MessagePriority,
  type BlockId,
} from '@brightchain/brightchain-lib';

/**
 * Adapts MessageCBLService + IGossipService to the IBlockContentStore contract.
 *
 * - storeContent(): stores content as blocks via MessageCBLService, announces
 *   via GossipService, returns the magnet URL as blockReference.
 * - retrieveContent(): reconstructs content from blocks via MessageCBLService.
 * - deleteContent(): parses the magnet URL, retrieves block metadata, and
 *   deletes each content block from the block store.
 */
export class BlockContentStoreAdapter implements IBlockContentStore {
  constructor(
    private readonly messageCBLService: MessageCBLService,
    private readonly gossipService: IGossipService,
  ) {}

  async storeContent(
    content: Uint8Array | string,
    senderId: string,
    recipientIds: string[],
  ): Promise<{ blockReference: string }> {
    // Convert string content to Uint8Array (same pattern as MessagePassingService)
    const contentBytes =
      typeof content === 'string'
        ? new TextEncoder().encode(content)
        : content;

    // Delegate to MessageCBLService.createMessage() following the
    // MessagePassingService.sendMessage() pattern
    const { messageId, contentBlockIds, magnetUrl } =
      await this.messageCBLService.createMessage(
        contentBytes,
        // MessageCBLService expects Member<TID> but the existing pattern
        // in MessagePassingService casts senderId through `as unknown`
        senderId as unknown as Parameters<
          MessageCBLService['createMessage']
        >[1],
        {
          messageType: 'brightchat',
          senderId,
          recipients: recipientIds,
          priority: MessagePriority.NORMAL,
          encryptionScheme: MessageEncryptionScheme.SHARED_KEY,
        },
      );

    // Retrieve metadata for gossip announcement (same as MessagePassingService)
    const metadata =
      await this.messageCBLService.getMessageMetadata(messageId);

    if (metadata) {
      const deliveryMetadata: MessageDeliveryMetadata = {
        messageId,
        recipientIds:
          recipientIds.length > 0 ? [...recipientIds] : [],
        priority: 'normal',
        blockIds: (metadata.cblBlockIds ?? []) as BlockId[],
        cblBlockId: metadata.blockId,
        ackRequired: true,
      };

      await this.gossipService.announceMessage(
        (metadata.cblBlockIds ?? []) as BlockId[],
        deliveryMetadata,
      );
    }

    return { blockReference: magnetUrl };
  }

  async retrieveContent(
    blockReference: string,
  ): Promise<Uint8Array | null> {
    try {
      const content =
        await this.messageCBLService.getMessageContent(blockReference);
      return content;
    } catch {
      // Content may no longer be available in the block store
      return null;
    }
  }

  async deleteContent(blockReference: string): Promise<void> {
    // Retrieve metadata to get the content block IDs, then delete each
    // block from the underlying block store (same pattern as
    // MessagePassingService.deleteMessage())
    const metadata =
      await this.messageCBLService.getMessageMetadata(blockReference);

    if (metadata && metadata.cblBlockIds) {
      for (const blockId of metadata.cblBlockIds) {
        await (
          this.messageCBLService as unknown as {
            blockStore: { delete(key: Checksum): Promise<void> };
          }
        ).blockStore.delete(Checksum.fromHex(blockId));
      }
    }
  }
}
