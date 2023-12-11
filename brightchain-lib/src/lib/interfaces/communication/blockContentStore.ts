/**
 * Platform-agnostic block content store abstraction for BrightChat services.
 *
 * This interface lives in brightchain-lib so that ConversationService,
 * GroupService, and ChannelService can delegate message content storage
 * to the block-based architecture without importing Node.js-specific
 * dependencies (MessageCBLService, GossipService, IBlockStore).
 *
 * A concrete implementation (BlockContentStoreAdapter) is provided at
 * construction time from application.ts in brightchain-api-lib, which
 * delegates to MessageCBLService for block storage and GossipService
 * for decentralized distribution.
 *
 * When no store is injected (e.g. in unit tests), services fall back
 * to their existing direct-storage behavior.
 *
 * Requirements: 2.1, 2.2, 2.3, 2.4, 2.5
 */

/**
 * Abstraction over block-based content storage and retrieval.
 *
 * Implementations are responsible for:
 *   1. Splitting content into blocks and persisting them
 *   2. Announcing blocks via gossip for decentralized distribution
 *   3. Returning a block reference (magnet URL) that can be stored
 *      in `ICommunicationMessage.encryptedContent` instead of raw content
 */
export interface IBlockContentStore {
  /**
   * Store content as blocks, announce via gossip, and return a reference.
   *
   * @param content    - The message content to store (text or binary)
   * @param senderId   - ID of the member sending the content
   * @param recipientIds - IDs of the intended recipients
   * @returns A block reference (magnet URL) that can later be used
   *          with {@link retrieveContent} to reconstruct the content
   */
  storeContent(
    content: Uint8Array | string,
    senderId: string,
    recipientIds: string[],
  ): Promise<{ blockReference: string }>;

  /**
   * Retrieve content from the block store by its reference.
   *
   * @param blockReference - The magnet URL / block reference returned
   *                         by {@link storeContent}
   * @returns The original content bytes, or null if the blocks are
   *          no longer available
   */
  retrieveContent(blockReference: string): Promise<Uint8Array | null>;

  /**
   * Remove content blocks from the block store.
   *
   * @param blockReference - The magnet URL / block reference to delete
   */
  deleteContent(blockReference: string): Promise<void>;
}
