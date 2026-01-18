/* eslint-disable @nx/enforce-module-boundaries, @typescript-eslint/no-explicit-any */
import {
  ApiErrorResponse,
  ApiRequestHandler,
  IApiMessageResponse,
  routeConfig,
  TypedHandlers,
  DiskCBLStore,
} from '@brightchain/brightchain-api-lib';
import {
  BlockSize,
  ConstituentBlockListBlock,
  StoreError,
  Checksum,
} from '@brightchain/brightchain-lib';
import { ServiceProvider } from '@brightchain/brightchain-lib/lib/services/service.provider';
import {
  ChecksumUint8Array,
  GuidV4,
  Member,
  uint8ArrayToHex,
} from '@digitaldefiance/ecies-lib';
import { IApplication } from '../../interfaces/application';
import {
  createApiErrorResult,
  ErrorCode,
  handleError,
  mapStoreError,
  notFoundError,
  notImplementedError,
  unauthorizedError,
  validationError,
} from '../../utils/errorResponse';
import { BaseController } from '../base';
import { SessionsController } from './sessions';

/**
 * Error codes for CBL API operations
 * @deprecated Use ErrorCode from '../../utils/errorResponse' instead
 */
export enum CBLErrorCode {
  CBL_NOT_FOUND = 'CBL_NOT_FOUND',
  INVALID_CBL_SIGNATURE = 'INVALID_CBL_SIGNATURE',
  INVALID_BLOCK_ADDRESSES = 'INVALID_BLOCK_ADDRESSES',
  BLOCK_NOT_FOUND = 'BLOCK_NOT_FOUND',
  VALIDATION_ERROR = 'VALIDATION_ERROR',
  UNAUTHORIZED = 'UNAUTHORIZED',
  INTERNAL_ERROR = 'INTERNAL_ERROR',
}

// === Request/Response Interfaces ===

interface CreateCBLRequest {
  body: {
    blockAddresses: string[]; // hex encoded checksums
  };
}

interface CreateCBLResponse extends IApiMessageResponse {
  cblId: string;
  blockCount: number;
  [key: string]: any;
}

interface GetCBLRequest {
  params: {
    cblId: string;
  };
}

interface GetCBLResponse extends IApiMessageResponse {
  cblId: string;
  blockAddresses: string[];
  creatorId: string;
  createdAt: string;
  [key: string]: any;
}

interface GetCBLBlocksRequest {
  params: {
    cblId: string;
  };
}

interface GetCBLBlocksResponse extends IApiMessageResponse {
  cblId: string;
  blocks: Array<{
    address: string;
    data: string; // base64 encoded
  }>;
  [key: string]: any;
}

interface DeleteCBLRequest {
  params: {
    cblId: string;
  };
}

interface DeleteCBLResponse extends IApiMessageResponse {
  success: boolean;
  cblId: string;
  [key: string]: any;
}

type CBLApiResponse =
  | CreateCBLResponse
  | GetCBLResponse
  | GetCBLBlocksResponse
  | DeleteCBLResponse
  | ApiErrorResponse;

interface CBLHandlers extends TypedHandlers {
  createCBL: ApiRequestHandler<CreateCBLResponse | ApiErrorResponse>;
  getCBL: ApiRequestHandler<GetCBLResponse | ApiErrorResponse>;
  getCBLBlocks: ApiRequestHandler<GetCBLBlocksResponse | ApiErrorResponse>;
  deleteCBL: ApiRequestHandler<DeleteCBLResponse | ApiErrorResponse>;
}

/**
 * Controller for CBL (Constituent Block List) operations.
 *
 * Provides REST API endpoints for managing Constituent Block Lists, which
 * map files to their constituent blocks in the BrightChain storage system.
 *
 * ## Endpoints
 *
 * ### POST /api/cbl
 * Create a new CBL with the provided block addresses.
 *
 * **Request Body:**
 * - `blockAddresses` (string[], required): Array of hex-encoded block checksums
 *
 * **Response:** CBL ID and block count
 *
 * ### GET /api/cbl/:cblId
 * Get a CBL by its ID.
 *
 * **Parameters:**
 * - `cblId` (string, required): Hex-encoded CBL checksum
 *
 * **Response:** CBL metadata including block addresses and creator
 *
 * ### GET /api/cbl/:cblId/blocks
 * Get the actual block data for all blocks in a CBL.
 *
 * **Parameters:**
 * - `cblId` (string, required): Hex-encoded CBL checksum
 *
 * **Response:** Array of block addresses with their data
 *
 * ### DELETE /api/cbl/:cblId
 * Delete a CBL by its ID.
 *
 * **Parameters:**
 * - `cblId` (string, required): Hex-encoded CBL checksum
 *
 * **Response:** Success confirmation
 *
 * @requirements 14.1, 14.2, 14.3, 14.4
 */
export class CBLController extends BaseController<CBLApiResponse, CBLHandlers> {
  public router: any; // Temporary router property
  private cblStore: DiskCBLStore<GuidV4>;

  constructor(application: IApplication) {
    super(application);
    this.router = {}; // Temporary implementation

    // Initialize CBL store
    const storePath =
      process.env.BRIGHTCHAIN_BLOCKSTORE_PATH ?? 'tmp/blockstore';
    const blockSize = (
      process.env.BRIGHTCHAIN_BLOCKSIZE_BYTES
        ? Number.parseInt(process.env.BRIGHTCHAIN_BLOCKSIZE_BYTES, 10)
        : BlockSize.Medium
    ) as BlockSize;

    this.cblStore = new DiskCBLStore<GuidV4>({ storePath, blockSize });
  }

  protected initRouteDefinitions(): void {
    this.routeDefinitions = [
      routeConfig('post', '/', {
        useAuthentication: true,
        useCryptoAuthentication: false,
        handlerKey: 'createCBL',
      }),
      routeConfig('get', '/:cblId', {
        useAuthentication: true,
        useCryptoAuthentication: false,
        handlerKey: 'getCBL',
      }),
      routeConfig('get', '/:cblId/blocks', {
        useAuthentication: true,
        useCryptoAuthentication: false,
        handlerKey: 'getCBLBlocks',
      }),
      routeConfig('delete', '/:cblId', {
        useAuthentication: true,
        useCryptoAuthentication: false,
        handlerKey: 'deleteCBL',
      }),
    ];

    this.handlers = {
      createCBL: this.handleCreateCBL.bind(this),
      getCBL: this.handleGetCBL.bind(this),
      getCBLBlocks: this.handleGetCBLBlocks.bind(this),
      deleteCBL: this.handleDeleteCBL.bind(this),
    };
  }

  /**
   * Helper to get authenticated member from session
   */
  private getAuthenticatedMember(
    req: any,
  ): Member<GuidV4> | { statusCode: number; response: ApiErrorResponse } {
    const sessionsController = this.application.getController(
      'sessions',
    ) as SessionsController;

    try {
      const member = sessionsController.getMemberFromSession(
        req.headers?.authorization as string,
      );
      return member as unknown as Member<GuidV4>;
    } catch {
      return unauthorizedError();
    }
  }

  /**
   * Helper to hydrate a member from a GuidV4
   */
  private async hydrateMember(id: GuidV4): Promise<Member<GuidV4>> {
    // In a real implementation, this would look up the member from a database
    // For now, we'll throw an error as we can't hydrate without more context
    throw new Error(`Cannot hydrate member with ID: ${id}`);
  }

  /**
   * POST /api/cbl
   * Create a new CBL with the provided block addresses.
   *
   * Creates a Constituent Block List that maps a file to its constituent blocks.
   * The CBL is signed by the authenticated user and stored in the block store.
   *
   * @param req - Request containing array of block addresses
   * @returns CBL ID and block count on success
   *
   * @example
   * ```json
   * // Request
   * POST /api/cbl
   * {
   *   "blockAddresses": ["abc123...", "def456...", "ghi789..."]
   * }
   *
   * // Response
   * {
   *   "message": "CBL created successfully",
   *   "cblId": "cbl123...",
   *   "blockCount": 3
   * }
   * ```
   */
  private handleCreateCBL: ApiRequestHandler<
    CreateCBLResponse | ApiErrorResponse
  > = async (req) => {
    try {
      const { blockAddresses } = (req as unknown as CreateCBLRequest).body;

      // Validate required fields
      if (!blockAddresses || !Array.isArray(blockAddresses)) {
        return validationError(
          'Missing required field: blockAddresses (array of hex-encoded checksums)',
        );
      }

      if (blockAddresses.length === 0) {
        return createApiErrorResult(
          400,
          ErrorCode.INVALID_BLOCK_ADDRESSES,
          'blockAddresses array cannot be empty',
        );
      }

      // Get authenticated member
      const memberResult = this.getAuthenticatedMember(req);
      if ('response' in memberResult) {
        return memberResult;
      }
      const member = memberResult;

      // Set active user on CBL store
      this.cblStore.setActiveUser(member);

      // Convert hex addresses to ChecksumUint8Array
      const checksumAddresses: ChecksumUint8Array[] = blockAddresses.map(
        (addr) => Buffer.from(addr, 'hex') as unknown as ChecksumUint8Array,
      );

      // Create CBL header using the CBL service
      const cblService = ServiceProvider.getInstance<GuidV4>().cblService;
      const checksumService =
        ServiceProvider.getInstance<GuidV4>().checksumService;

      // Concatenate all addresses into a single buffer
      const addressListLength = checksumAddresses.reduce(
        (acc, addr) => acc + addr.length,
        0,
      );
      const addressList = new Uint8Array(addressListLength);
      let offset = 0;
      for (const addr of checksumAddresses) {
        addressList.set(addr, offset);
        offset += addr.length;
      }

      // Get block size from environment or default
      const blockSize = (
        process.env.BRIGHTCHAIN_BLOCKSIZE_BYTES
          ? Number.parseInt(process.env.BRIGHTCHAIN_BLOCKSIZE_BYTES, 10)
          : BlockSize.Medium
      ) as BlockSize;

      // Create CBL header
      const { headerData } = cblService.makeCblHeader(
        member,
        new Date(),
        checksumAddresses.length,
        0, // fileDataLength - not applicable for direct CBL creation
        addressList,
        blockSize,
        0, // BlockEncryptionType.None
      );

      // Combine header and address data
      const cblData = new Uint8Array(headerData.length + addressList.length);
      cblData.set(headerData, 0);
      cblData.set(addressList, headerData.length);

      // Pad to block size
      const paddedData = new Uint8Array(blockSize);
      paddedData.set(cblData, 0);

      // Create CBL block
      const cbl = new ConstituentBlockListBlock<GuidV4>(paddedData, member);
      const cblChecksum = checksumService.calculateChecksum(paddedData);

      // Store the CBL
      await this.cblStore.set(cblChecksum, cbl);

      const cblId = cblChecksum.toHex();

      return {
        statusCode: 201,
        response: {
          message: 'CBL created successfully',
          cblId,
          blockCount: checksumAddresses.length,
        },
      };
    } catch (error) {
      if (error instanceof StoreError) {
        return mapStoreError(error);
      }
      return handleError(error);
    }
  };

  /**
   * GET /api/cbl/:cblId
   * Get a CBL by its ID.
   *
   * Returns the CBL metadata including all block addresses and creator information.
   *
   * @param req - Request containing the CBL ID parameter
   * @returns CBL metadata on success, or 404 if not found
   *
   * @example
   * ```json
   * // Request
   * GET /api/cbl/cbl123...
   *
   * // Response
   * {
   *   "message": "CBL retrieved successfully",
   *   "cblId": "cbl123...",
   *   "blockAddresses": ["abc123...", "def456...", "ghi789..."],
   *   "creatorId": "creator...",
   *   "createdAt": "2025-01-16T10:00:00Z"
   * }
   * ```
   */
  private handleGetCBL: ApiRequestHandler<GetCBLResponse | ApiErrorResponse> =
    async (req) => {
      try {
        const { cblId } = (req as unknown as GetCBLRequest).params;

        if (!cblId) {
          return validationError('Missing required parameter: cblId');
        }

        // Get authenticated member
        const memberResult = this.getAuthenticatedMember(req);
        if ('response' in memberResult) {
          return memberResult;
        }
        const member = memberResult;

        // Set active user on CBL store
        this.cblStore.setActiveUser(member);

        // Convert hex ID to checksum
        const checksum = Checksum.fromHex(cblId);

        // Check if CBL exists
        if (!this.cblStore.has(checksum)) {
          return notFoundError('CBL', cblId);
        }

        // Get the CBL
        const cbl = await this.cblStore.get(
          checksum,
          this.hydrateMember.bind(this),
        );

        // Get addresses as hex strings
        const blockAddresses = cbl.addresses.map((addr: Checksum) =>
          addr.toHex(),
        );

        // Get creator ID
        const cblService = ServiceProvider.getInstance<GuidV4>().cblService;
        const creatorId = uint8ArrayToHex(
          cblService.idProvider.toBytes(cbl.creatorId),
        );

        return {
          statusCode: 200,
          response: {
            message: 'CBL retrieved successfully',
            cblId,
            blockAddresses,
            creatorId,
            createdAt: cbl.dateCreated.toISOString(),
          },
        };
      } catch (error) {
        if (error instanceof StoreError) {
          return mapStoreError(error);
        }
        return handleError(error);
      }
    };

  /**
   * GET /api/cbl/:cblId/blocks
   * Get the actual block data for all blocks in a CBL.
   *
   * Returns the block addresses along with their actual data content.
   * Note: Block data retrieval is not yet fully implemented.
   *
   * @param req - Request containing the CBL ID parameter
   * @returns Array of blocks with addresses and data on success
   *
   * @example
   * ```json
   * // Request
   * GET /api/cbl/cbl123.../blocks
   *
   * // Response
   * {
   *   "message": "CBL blocks retrieved successfully",
   *   "cblId": "cbl123...",
   *   "blocks": [
   *     { "address": "abc123...", "data": "SGVsbG8=" },
   *     { "address": "def456...", "data": "V29ybGQ=" }
   *   ]
   * }
   * ```
   */
  private handleGetCBLBlocks: ApiRequestHandler<
    GetCBLBlocksResponse | ApiErrorResponse
  > = async (req) => {
    try {
      const { cblId } = (req as unknown as GetCBLBlocksRequest).params;

      if (!cblId) {
        return validationError('Missing required parameter: cblId');
      }

      // Get authenticated member
      const memberResult = this.getAuthenticatedMember(req);
      if ('response' in memberResult) {
        return memberResult;
      }
      const member = memberResult;

      // Set active user on CBL store
      this.cblStore.setActiveUser(member);

      // Convert hex ID to checksum
      const checksum = Checksum.fromHex(cblId);

      // Check if CBL exists
      if (!this.cblStore.has(checksum)) {
        return notFoundError('CBL', cblId);
      }

      // Get the CBL
      const cbl = await this.cblStore.get(
        checksum,
        this.hydrateMember.bind(this),
      );

      // Get block data for each address
      // Note: This requires access to the block store, which we'll need to inject
      // For now, we return the addresses without the actual block data
      // In a full implementation, we would fetch each block from the block store
      const blocks: Array<{ address: string; data: string }> = [];

      for (const addr of cbl.addresses) {
        const addressHex = addr.toHex();
        // TODO: Fetch actual block data from block store
        // For now, we indicate that block data retrieval is not yet implemented
        blocks.push({
          address: addressHex,
          data: '', // Would be base64 encoded block data
        });
      }

      return {
        statusCode: 200,
        response: {
          message: 'CBL blocks retrieved successfully',
          cblId,
          blocks,
        },
      };
    } catch (error) {
      if (error instanceof StoreError) {
        return mapStoreError(error);
      }
      return handleError(error);
    }
  };

  /**
   * DELETE /api/cbl/:cblId
   * Delete a CBL by its ID.
   *
   * Removes the CBL from storage. Note: This does not delete the underlying
   * blocks - they may still be referenced by other CBLs.
   *
   * Note: CBL deletion is not yet fully implemented in the underlying store.
   *
   * @param req - Request containing the CBL ID parameter
   * @returns Success confirmation on success, or 404 if not found
   *
   * @example
   * ```json
   * // Request
   * DELETE /api/cbl/cbl123...
   *
   * // Response (when implemented)
   * {
   *   "message": "CBL deleted successfully",
   *   "success": true,
   *   "cblId": "cbl123..."
   * }
   * ```
   */
  private handleDeleteCBL: ApiRequestHandler<
    DeleteCBLResponse | ApiErrorResponse
  > = async (req) => {
    try {
      const { cblId } = (req as unknown as DeleteCBLRequest).params;

      if (!cblId) {
        return validationError('Missing required parameter: cblId');
      }

      // Get authenticated member (for authorization check)
      const memberResult = this.getAuthenticatedMember(req);
      if ('response' in memberResult) {
        return memberResult;
      }

      // Convert hex ID to checksum
      const checksum = Checksum.fromHex(cblId);

      // Check if CBL exists
      if (!this.cblStore.has(checksum)) {
        return notFoundError('CBL', cblId);
      }

      // Note: CBLStore doesn't have a delete method yet
      // This would need to be implemented in the CBLStore class
      // For now, we return a 501 Not Implemented status
      return notImplementedError(
        'CBL deletion is not yet implemented in the underlying store',
      );
    } catch (error) {
      if (error instanceof StoreError) {
        return mapStoreError(error);
      }
      return handleError(error);
    }
  };
}
