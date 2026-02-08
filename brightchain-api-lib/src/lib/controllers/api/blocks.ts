/* eslint-disable @typescript-eslint/no-explicit-any */
import {
  BlockStoreOptions,
  DurabilityLevel,
  StoreError,
} from '@brightchain/brightchain-lib';
import { CoreLanguageCode } from '@digitaldefiance/i18n-lib';
import { PlatformID } from '@digitaldefiance/node-ecies-lib';
import {
  ApiErrorResponse,
  ApiRequestHandler,
  ControllerRegistry,
  TypedHandlers,
  routeConfig,
} from '@digitaldefiance/node-express-suite';
import { IBrightChainApplication } from '../../interfaces/application';
import {
  BrightenBlockRequest,
  DeleteBlockRequest,
  GetBlockMetadataRequest,
  GetBlockRequest,
  StoreBlockRequest,
} from '../../interfaces/blockRequest';
import {
  IBrightenBlockResponse,
  IDeleteBlockResponse,
  IGetBlockMetadataResponse,
  IGetBlockResponse,
  IStoreBlockResponse,
} from '../../interfaces/blockResponses';
import { IBlockService } from '../../interfaces/blockService';
import { BlockServiceFactory } from '../../services/blockServiceFactory';
import { DefaultBackendIdType } from '../../shared-types';
import {
  handleError,
  mapStoreError,
  notFoundError,
  unauthorizedError,
  validationError,
} from '../../utils/errorResponse';
import { BaseController } from '../base';
import { SessionsController } from './sessions';

/**
 * Error codes for block API operations
 * @deprecated Use ErrorCode from '../../utils/errorResponse' instead
 */
export enum BlockErrorCode {
  BLOCK_NOT_FOUND = 'BLOCK_NOT_FOUND',
  BLOCK_VALIDATION_FAILED = 'BLOCK_VALIDATION_FAILED',
  BLOCK_SIZE_MISMATCH = 'BLOCK_SIZE_MISMATCH',
  INSUFFICIENT_RANDOM_BLOCKS = 'INSUFFICIENT_RANDOM_BLOCKS',
  BLOCK_ALREADY_EXISTS = 'BLOCK_ALREADY_EXISTS',
  VALIDATION_ERROR = 'VALIDATION_ERROR',
  UNAUTHORIZED = 'UNAUTHORIZED',
  INTERNAL_ERROR = 'INTERNAL_ERROR',
}

type BlockApiResponse =
  | IStoreBlockResponse
  | IGetBlockResponse
  | IGetBlockMetadataResponse
  | IDeleteBlockResponse
  | IBrightenBlockResponse
  | ApiErrorResponse;

interface BlocksHandlers extends TypedHandlers {
  storeBlock: ApiRequestHandler<IStoreBlockResponse | ApiErrorResponse>;
  getBlock: ApiRequestHandler<IGetBlockResponse | ApiErrorResponse>;
  getBlockMetadata: ApiRequestHandler<
    IGetBlockMetadataResponse | ApiErrorResponse
  >;
  deleteBlock: ApiRequestHandler<IDeleteBlockResponse | ApiErrorResponse>;
  brightenBlock: ApiRequestHandler<IBrightenBlockResponse | ApiErrorResponse>;
}

/**
 * Controller for block storage operations.
 *
 * Provides REST API endpoints for storing, retrieving, and managing blocks
 * in the BrightChain distributed storage system.
 *
 * ## Endpoints
 *
 * ### POST /api/blocks
 * Store a new block with optional durability settings.
 *
 * **Request Body:**
 * - `data` (string, required): Base64-encoded block data
 * - `canRead` (boolean, optional): Whether the block can be read (default: true)
 * - `canPersist` (boolean, optional): Whether the block can be persisted (default: true)
 * - `options` (object, optional): Block storage options
 *   - `expiresAt` (string): ISO date when the block expires
 *   - `durabilityLevel` (string): 'ephemeral' | 'standard' | 'high_durability'
 *
 * **Response:** Block ID and metadata
 *
 * ### GET /api/blocks/:blockId
 * Retrieve a block by its ID.
 *
 * **Parameters:**
 * - `blockId` (string, required): Hex-encoded block checksum
 *
 * **Response:** Block data (base64) and metadata
 *
 * ### GET /api/blocks/:blockId/metadata
 * Get metadata for a block without retrieving the data.
 *
 * **Parameters:**
 * - `blockId` (string, required): Hex-encoded block checksum
 *
 * **Response:** Block metadata including durability level, access count, etc.
 *
 * ### DELETE /api/blocks/:blockId
 * Delete a block and its associated parity blocks.
 *
 * **Parameters:**
 * - `blockId` (string, required): Hex-encoded block checksum
 *
 * **Response:** Success confirmation
 *
 * ### POST /api/blocks/brighten
 * Brighten a block by XORing it with random blocks for Owner-Free storage.
 *
 * **Request Body:**
 * - `blockId` (string, required): Hex-encoded block checksum to brighten
 * - `randomBlockCount` (number, required): Number of random blocks to XOR with
 *
 * **Response:** Brightened block ID and list of random block IDs used
 *
 * @requirements 11.1, 11.2, 11.3, 11.4, 11.5, 11.6, 11.7
 */
export class BlocksController<
  TID extends PlatformID = DefaultBackendIdType,
> extends BaseController<
  TID,
  BlockApiResponse,
  BlocksHandlers,
  CoreLanguageCode
> {
  private blocksService: IBlockService;

  constructor(application: IBrightChainApplication<TID>) {
    super(application);
    this.blocksService = BlockServiceFactory.getInstance().getService(
      application as any,
    );
  }

  protected initRouteDefinitions(): void {
    this.routeDefinitions = [
      routeConfig('post', '/', {
        useAuthentication: true,
        useCryptoAuthentication: false,
        handlerKey: 'storeBlock',
        openapi: {
          summary: 'Store a block',
          description: 'Store a new block with optional durability settings.',
          tags: ['Blocks'],
          requestBody: {
            schema: 'StoreBlockRequest',
            example: {
              data: 'SGVsbG8gV29ybGQ=',
              options: { durabilityLevel: 'standard' },
            },
          },
          responses: {
            200: { schema: 'StoreBlockResponse', description: 'Block stored' },
          },
        },
      }),
      routeConfig('get', '/:blockId', {
        handlerKey: 'getBlock',
        useAuthentication: true,
        useCryptoAuthentication: false,
        openapi: {
          summary: 'Get block by ID',
          description: 'Retrieve a block by its ID.',
          tags: ['Blocks'],
          responses: {
            200: { schema: 'GetBlockResponse', description: 'Block retrieved' },
            404: { schema: 'ErrorResponse', description: 'Block not found' },
          },
        },
      }),
      routeConfig('get', '/:blockId/metadata', {
        handlerKey: 'getBlockMetadata',
        useAuthentication: true,
        useCryptoAuthentication: false,
        openapi: {
          summary: 'Get block metadata',
          description: 'Get metadata for a block without retrieving the data.',
          tags: ['Blocks'],
          responses: {
            200: {
              schema: 'GetBlockMetadataResponse',
              description: 'Metadata retrieved',
            },
            404: { schema: 'ErrorResponse', description: 'Block not found' },
          },
        },
      }),
      routeConfig('delete', '/:blockId', {
        handlerKey: 'deleteBlock',
        useAuthentication: true,
        useCryptoAuthentication: false,
        openapi: {
          summary: 'Delete block',
          description: 'Delete a block and its parity blocks.',
          tags: ['Blocks'],
          responses: {
            200: { description: 'Block deleted' },
            404: { schema: 'ErrorResponse', description: 'Block not found' },
          },
        },
      }),
      routeConfig('post', '/brighten', {
        handlerKey: 'brightenBlock',
        useAuthentication: true,
        useCryptoAuthentication: false,
        openapi: {
          summary: 'Brighten a block',
          description: 'XOR a block with random blocks for Owner-Free storage.',
          tags: ['Blocks'],
          requestBody: {
            schema: 'BrightenBlockRequest',
            example: { blockId: 'abc123...', randomBlockCount: 3 },
          },
          responses: {
            200: {
              schema: 'BrightenBlockResponse',
              description: 'Block brightened',
            },
          },
        },
      }),
    ];

    // Register with OpenAPI registry
    ControllerRegistry.register(
      '/blocks',
      'BlocksController',
      this.routeDefinitions,
    );

    this.handlers = {
      storeBlock: this.handleStoreBlock.bind(this),
      getBlock: this.handleGetBlock.bind(this),
      getBlockMetadata: this.handleGetBlockMetadata.bind(this),
      deleteBlock: this.handleDeleteBlock.bind(this),
      brightenBlock: this.handleBrightenBlock.bind(this),
    };
  }

  /**
   * POST /api/blocks
   * Store a new block with optional durability settings.
   *
   * The block data is stored with the configured durability level, which determines
   * how many parity blocks are generated for FEC recovery:
   * - 'ephemeral': No parity blocks
   * - 'standard': 1 parity block
   * - 'high_durability': 2+ parity blocks
   *
   * @param req - Request containing base64-encoded block data and options
   * @returns Block ID and metadata on success, or error response
   *
   * @example
   * ```json
   * // Request
   * POST /api/blocks
   * {
   *   "data": "SGVsbG8gV29ybGQ=",
   *   "options": {
   *     "durabilityLevel": "standard",
   *     "expiresAt": "2025-12-31T23:59:59Z"
   *   }
   * }
   *
   * // Response
   * {
   *   "blockId": "abc123...",
   *   "success": true,
   *   "metadata": {
   *     "blockId": "abc123...",
   *     "durabilityLevel": "standard",
   *     "parityBlockIds": ["abc123.p0"],
   *     ...
   *   }
   * }
   * ```
   */
  private handleStoreBlock: ApiRequestHandler<
    IStoreBlockResponse | ApiErrorResponse
  > = async (req) => {
    try {
      const {
        data,
        canRead = true,
        canPersist = true,
        options,
      } = (req as unknown as StoreBlockRequest).body;

      // Validate required fields
      if (!data) {
        return validationError('Missing required field: data');
      }

      // Get authenticated member from session
      const sessionsController =
        this.application.getController<SessionsController>('sessions');

      let member;
      try {
        member = sessionsController.getMemberFromSession(
          (req.headers as any).authorization as string,
        );
      } catch {
        return unauthorizedError();
      }

      // Parse options if provided
      const blockStoreOptions: BlockStoreOptions | undefined = options
        ? {
            expiresAt: options.expiresAt
              ? new Date(options.expiresAt)
              : undefined,
            durabilityLevel: options.durabilityLevel as
              | DurabilityLevel
              | undefined,
          }
        : undefined;

      const result = await this.blocksService.storeBlock(
        Buffer.from(data, 'base64'),
        member,
        canRead,
        canPersist,
        blockStoreOptions,
      );

      return {
        statusCode: 200,
        response: {
          blockId: result.blockId,
          success: true,
          metadata: result.metadata,
        },
      };
    } catch (_error) {
      if (_error instanceof StoreError) {
        return mapStoreError(_error);
      }
      return handleError(_error);
    }
  };

  /**
   * GET /api/blocks/:blockId
   * Retrieve a block by its ID.
   *
   * Returns the block data and metadata. The access count and last access
   * timestamp in the metadata are updated on each retrieval.
   *
   * @param req - Request containing the block ID parameter
   * @returns Block data (base64) and metadata on success, or 404 if not found
   *
   * @example
   * ```json
   * // Request
   * GET /api/blocks/abc123...
   *
   * // Response
   * {
   *   "blockId": "abc123...",
   *   "data": "SGVsbG8gV29ybGQ=",
   *   "canRead": true,
   *   "canPersist": true,
   *   "metadata": { ... }
   * }
   * ```
   */
  private handleGetBlock: ApiRequestHandler<
    IGetBlockResponse | ApiErrorResponse
  > = async (req) => {
    try {
      const { blockId } = (req as unknown as GetBlockRequest).params;

      if (!blockId) {
        return validationError('Missing required parameter: blockId');
      }

      const block = await this.blocksService.getBlock(blockId);

      return {
        statusCode: 200,
        response: {
          blockId,
          data: block.data,
          canRead: true,
          canPersist: true,
          metadata: block.metadata,
        },
      };
    } catch (_error) {
      if (_error instanceof StoreError) {
        return mapStoreError(_error);
      }
      return handleError(_error);
    }
  };

  /**
   * GET /api/blocks/:blockId/metadata
   * Get metadata for a block without retrieving the data.
   *
   * Useful for checking block status, durability level, replication status,
   * and access patterns without the overhead of retrieving the full block data.
   *
   * @param req - Request containing the block ID parameter
   * @returns Block metadata on success, or 404 if not found
   *
   * @example
   * ```json
   * // Request
   * GET /api/blocks/abc123.../metadata
   *
   * // Response
   * {
   *   "blockId": "abc123...",
   *   "metadata": {
   *     "blockId": "abc123...",
   *     "createdAt": "2025-01-15T10:00:00Z",
   *     "durabilityLevel": "standard",
   *     "parityBlockIds": ["abc123.p0"],
   *     "accessCount": 5,
   *     "lastAccessedAt": "2025-01-16T14:30:00Z",
   *     "replicationStatus": "replicated",
   *     "size": 4096,
   *     "checksum": "abc123..."
   *   }
   * }
   * ```
   */
  private handleGetBlockMetadata: ApiRequestHandler<
    IGetBlockMetadataResponse | ApiErrorResponse
  > = async (req) => {
    try {
      const { blockId } = (req as unknown as GetBlockMetadataRequest).params;

      if (!blockId) {
        return validationError('Missing required parameter: blockId');
      }

      const metadata = await this.blocksService.getBlockMetadata(blockId);

      if (!metadata) {
        return notFoundError('Block', blockId);
      }

      return {
        statusCode: 200,
        response: {
          blockId,
          metadata,
        },
      };
    } catch (_error) {
      if (_error instanceof StoreError) {
        return mapStoreError(_error);
      }
      return handleError(_error);
    }
  };

  /**
   * DELETE /api/blocks/:blockId
   * Delete a block and its associated parity blocks.
   *
   * This operation removes:
   * - The block data file
   * - All associated parity block files
   * - The block metadata
   *
   * @param req - Request containing the block ID parameter
   * @returns Success confirmation on success, or 404 if not found
   *
   * @example
   * ```json
   * // Request
   * DELETE /api/blocks/abc123...
   *
   * // Response
   * {
   *   "blockId": "abc123...",
   *   "success": true
   * }
   * ```
   */
  private handleDeleteBlock: ApiRequestHandler<
    IDeleteBlockResponse | ApiErrorResponse
  > = async (req) => {
    try {
      const { blockId } = (req as unknown as DeleteBlockRequest).params;

      if (!blockId) {
        return validationError('Missing required parameter: blockId');
      }

      await this.blocksService.deleteBlock(blockId);

      return {
        statusCode: 200,
        response: {
          blockId,
          success: true,
        },
      };
    } catch (_error) {
      if (_error instanceof StoreError) {
        return mapStoreError(_error);
      }
      return handleError(_error);
    }
  };

  /**
   * POST /api/blocks/brighten
   * Brighten a block by XORing it with random blocks for Owner-Free storage.
   *
   * This operation implements the Owner-Free storage pattern where the original
   * data cannot be reconstructed without all the random blocks used in the
   * XOR operation. The brightened block is stored and its ID is returned along
   * with the IDs of all random blocks used.
   *
   * @param req - Request containing block ID and random block count
   * @returns Brightened block ID and list of random block IDs used
   * @throws INSUFFICIENT_RANDOM_BLOCKS if not enough random blocks are available
   *
   * @example
   * ```json
   * // Request
   * POST /api/blocks/brighten
   * {
   *   "blockId": "abc123...",
   *   "randomBlockCount": 3
   * }
   *
   * // Response
   * {
   *   "brightenedBlockId": "def456...",
   *   "randomBlockIds": ["rand1...", "rand2...", "rand3..."],
   *   "originalBlockId": "abc123..."
   * }
   * ```
   */
  private handleBrightenBlock: ApiRequestHandler<
    IBrightenBlockResponse | ApiErrorResponse
  > = async (req) => {
    try {
      const { blockId, randomBlockCount } = (
        req as unknown as BrightenBlockRequest
      ).body;

      // Validate required fields
      if (!blockId) {
        return validationError('Missing required field: blockId');
      }

      if (randomBlockCount === undefined || randomBlockCount < 1) {
        return validationError('randomBlockCount must be a positive integer');
      }

      const result = await this.blocksService.brightenBlock(
        blockId,
        randomBlockCount,
      );

      return {
        statusCode: 200,
        response: {
          brightenedBlockId: result.brightenedBlockId,
          randomBlockIds: result.randomBlockIds,
          originalBlockId: result.originalBlockId,
        },
      };
    } catch (_error) {
      if (_error instanceof StoreError) {
        return mapStoreError(_error);
      }
      return handleError(_error);
    }
  };
}
