/**
 * @fileoverview Block Fetch Transport Interface
 *
 * Defines the transport abstraction for fetching raw block data from remote nodes.
 * The interface lives in brightchain-lib so it can be shared; HTTP implementations
 * live in brightchain-api-lib.
 *
 * @see cross-node-eventual-consistency design, Section 2
 */

import { PoolId } from '../storage/pooledBlockStore';

/**
 * Transport abstraction for fetching raw block data from a specific remote node.
 * Implementations handle the actual network protocol (HTTP, gRPC, etc.).
 */
export interface IBlockFetchTransport {
  /**
   * Fetch raw block data from a specific remote node.
   * @param nodeId - The target node identifier
   * @param blockId - The block checksum/ID to fetch
   * @param poolId - Optional pool scope for the fetch
   * @returns The raw block bytes
   * @throws BlockFetchError on failure
   */
  fetchBlockFromNode(
    nodeId: string,
    blockId: string,
    poolId?: PoolId,
  ): Promise<Uint8Array>;
}
