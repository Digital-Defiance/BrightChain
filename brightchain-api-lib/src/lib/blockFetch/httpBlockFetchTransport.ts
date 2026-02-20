/**
 * @fileoverview HTTP Block Fetch Transport
 *
 * Implements IBlockFetchTransport using HTTP GET requests to remote nodes'
 * SyncController `/api/sync/blocks/:blockId` endpoint.
 *
 * Node.js specific (uses fetch API available in Node 18+).
 *
 * @see cross-node-eventual-consistency design, Section 2
 * @see Requirements 1.1, 5.2
 */

import {
  BlockFetchError,
  IBlockFetchTransport,
  PoolId,
} from '@brightchain/brightchain-lib';
import { IBlockDataResponse } from '../interfaces/responses/block-data-response';

/**
 * Resolves a node ID to its base URL (e.g., `http://node-address:port`).
 * Implementations may use a static registry, DNS, or discovery service.
 */
export interface INodeAddressResolver {
  /**
   * Get the base URL for a given node.
   * @param nodeId - The node identifier
   * @returns The base URL (without trailing slash), or undefined if unknown
   */
  getNodeBaseUrl(nodeId: string): string | undefined;
}

/**
 * Simple map-based node address resolver.
 * Maps node IDs to their base URLs.
 */
export class MapNodeAddressResolver implements INodeAddressResolver {
  constructor(private readonly nodeAddresses: Map<string, string>) {}

  public getNodeBaseUrl(nodeId: string): string | undefined {
    return this.nodeAddresses.get(nodeId);
  }
}

/**
 * HTTP-based implementation of IBlockFetchTransport.
 *
 * Fetches block data from remote nodes via their SyncController endpoint:
 *   GET /api/sync/blocks/:blockId[?poolId=<poolId>]
 *
 * The response is JSON with `{ message, blockId, data }` where `data` is
 * base64-encoded. This transport decodes the base64 data and returns raw bytes.
 *
 * @see Requirements 1.1 — Block fetching protocol
 * @see Requirements 5.2 — Pool ID included in fetch request
 */
export class HttpBlockFetchTransport implements IBlockFetchTransport {
  constructor(private readonly addressResolver: INodeAddressResolver) {}

  /**
   * Fetch raw block data from a specific remote node via HTTP GET.
   *
   * @param nodeId - The target node identifier (resolved to URL via addressResolver)
   * @param blockId - The block checksum/ID to fetch
   * @param poolId - Optional pool scope; appended as query parameter
   * @returns The raw block bytes decoded from the base64 response
   * @throws BlockFetchError if the node address is unknown, HTTP request fails, or response is invalid
   */
  public async fetchBlockFromNode(
    nodeId: string,
    blockId: string,
    poolId?: PoolId,
  ): Promise<Uint8Array> {
    const baseUrl = this.addressResolver.getNodeBaseUrl(nodeId);
    if (!baseUrl) {
      throw new BlockFetchError(
        blockId,
        [
          {
            nodeId,
            error: `Unknown node: no address registered for "${nodeId}"`,
          },
        ],
        `Cannot fetch block ${blockId}: no address for node "${nodeId}"`,
      );
    }

    const url = this.buildUrl(baseUrl, blockId, poolId);

    let response: Response;
    try {
      response = await fetch(url);
    } catch (error: unknown) {
      const errorMessage =
        error instanceof Error ? error.message : String(error);
      throw new BlockFetchError(
        blockId,
        [{ nodeId, error: errorMessage }],
        `Network error fetching block ${blockId} from node "${nodeId}": ${errorMessage}`,
      );
    }

    if (!response.ok) {
      const statusText = response.statusText || `HTTP ${response.status}`;
      throw new BlockFetchError(
        blockId,
        [{ nodeId, error: `${statusText} (${response.status})` }],
        `Failed to fetch block ${blockId} from node "${nodeId}": ${statusText} (${response.status})`,
      );
    }

    let body: IBlockDataResponse;
    try {
      body = (await response.json()) as IBlockDataResponse;
    } catch (error: unknown) {
      const errorMessage =
        error instanceof Error ? error.message : String(error);
      throw new BlockFetchError(
        blockId,
        [{ nodeId, error: `Invalid JSON response: ${errorMessage}` }],
        `Invalid response from node "${nodeId}" for block ${blockId}: ${errorMessage}`,
      );
    }

    if (!body.data) {
      throw new BlockFetchError(
        blockId,
        [{ nodeId, error: 'Response missing "data" field' }],
        `Invalid response from node "${nodeId}" for block ${blockId}: missing "data" field`,
      );
    }

    return Buffer.from(body.data, 'base64');
  }

  /**
   * Build the full URL for the block fetch request.
   * Format: {baseUrl}/api/sync/blocks/{blockId}[?poolId={poolId}]
   */
  private buildUrl(baseUrl: string, blockId: string, poolId?: PoolId): string {
    const path = `/api/sync/blocks/${encodeURIComponent(blockId)}`;
    const base = baseUrl.endsWith('/') ? baseUrl.slice(0, -1) : baseUrl;

    if (poolId) {
      return `${base}${path}?poolId=${encodeURIComponent(poolId)}`;
    }

    return `${base}${path}`;
  }
}
