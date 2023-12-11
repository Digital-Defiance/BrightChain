import { CoreLanguageCode } from '@digitaldefiance/i18n-lib';
import { PlatformID } from '@digitaldefiance/node-ecies-lib';
import {
  ApiErrorResponse,
  ApiRequestHandler,
  IApiMessageResponse,
  routeConfig,
  TypedHandlers,
} from '@digitaldefiance/node-express-suite';
import { IBrightChainApplication } from '../../interfaces/application';
import { DefaultBackendIdType } from '../../shared-types';
import {
  handleError,
  notFoundError,
  validationError,
} from '../../utils/errorResponse';
import { BaseController } from '../base';

type AdminBlockApiResponse = IApiMessageResponse | ApiErrorResponse;

interface AdminBlockHandlers extends TypedHandlers {
  listBlocks: ApiRequestHandler<AdminBlockApiResponse>;
  getBlockMetadata: ApiRequestHandler<AdminBlockApiResponse>;
  discoverBlock: ApiRequestHandler<AdminBlockApiResponse>;
  deleteBlock: ApiRequestHandler<AdminBlockApiResponse>;
}

/**
 * Admin-only block management controller.
 *
 * ## Endpoints
 *
 * ### GET /api/admin/blocks
 * Paginated block list with optional durabilityLevel filter and sortBy.
 *
 * ### GET /api/admin/blocks/:blockId
 * Full block metadata for a specific block.
 *
 * ### POST /api/admin/blocks/:blockId/discover
 * Discover which nodes hold a block.
 *
 * ### DELETE /api/admin/blocks/:blockId
 * Delete block from local store.
 *
 * @requirements 13.1, 13.2, 13.3, 13.4, 13.5
 */
export class AdminBlockController<
  TID extends PlatformID = DefaultBackendIdType,
> extends BaseController<
  TID,
  AdminBlockApiResponse,
  AdminBlockHandlers,
  CoreLanguageCode
> {
  constructor(application: IBrightChainApplication<TID>) {
    super(application);
  }

  protected initRouteDefinitions(): void {
    this.routeDefinitions = [
      routeConfig('get', '/', {
        handlerKey: 'listBlocks',
        useAuthentication: true,
        useCryptoAuthentication: false,
      }),
      routeConfig('get', '/:blockId', {
        handlerKey: 'getBlockMetadata',
        useAuthentication: true,
        useCryptoAuthentication: false,
      }),
      routeConfig('post', '/:blockId/discover', {
        handlerKey: 'discoverBlock',
        useAuthentication: true,
        useCryptoAuthentication: false,
      }),
      routeConfig('delete', '/:blockId', {
        handlerKey: 'deleteBlock',
        useAuthentication: true,
        useCryptoAuthentication: false,
      }),
    ];

    this.handlers = {
      listBlocks: this.handleListBlocks.bind(this),
      getBlockMetadata: this.handleGetBlockMetadata.bind(this),
      discoverBlock: this.handleDiscoverBlock.bind(this),
      deleteBlock: this.handleDeleteBlock.bind(this),
    };
  }

  /**
   * GET /api/admin/blocks?page=1&limit=20&durabilityLevel=standard&sortBy=createdAt
   */
  private async handleListBlocks(
    req: unknown,
  ): Promise<{ statusCode: number; response: AdminBlockApiResponse }> {
    try {
      const request = req as {
        query?: {
          page?: string;
          limit?: string;
          durabilityLevel?: string;
          sortBy?: string;
        };
      };
      const page = Math.max(1, parseInt(request.query?.page ?? '1', 10) || 1);
      const limit = Math.min(
        100,
        Math.max(1, parseInt(request.query?.limit ?? '20', 10) || 20),
      );
      const durabilityFilter = request.query?.durabilityLevel;
      const sortBy = request.query?.sortBy ?? 'createdAt';

      const blockStore = this.application.services.get('blockStore') as
        | {
            listBlocks?: (options: {
              page: number;
              limit: number;
              durabilityLevel?: string;
              sortBy?: string;
            }) => Promise<{
              blocks: Record<string, unknown>[];
              total: number;
            }>;
          }
        | undefined;

      if (blockStore?.listBlocks) {
        const result = await blockStore.listBlocks({
          page,
          limit,
          durabilityLevel: durabilityFilter,
          sortBy,
        });
        return {
          statusCode: 200,
          response: {
            message: 'OK',
            blocks: result.blocks,
            total: result.total,
            page,
            limit,
          } as IApiMessageResponse & Record<string, unknown>,
        };
      }

      return {
        statusCode: 200,
        response: {
          message: 'OK',
          blocks: [],
          total: 0,
          page,
          limit,
        } as IApiMessageResponse & Record<string, unknown>,
      };
    } catch (error) {
      return handleError(error);
    }
  }

  /**
   * GET /api/admin/blocks/:blockId
   */
  private async handleGetBlockMetadata(
    req: unknown,
  ): Promise<{ statusCode: number; response: AdminBlockApiResponse }> {
    try {
      const request = req as { params?: { blockId?: string } };
      const blockId = request.params?.blockId;

      if (!blockId) {
        return validationError('blockId is required');
      }

      const blockStore = this.application.services.get('blockStore') as
        | {
            getBlockMetadata?: (
              blockId: string,
            ) => Promise<Record<string, unknown> | null>;
          }
        | undefined;

      if (blockStore?.getBlockMetadata) {
        const metadata = await blockStore.getBlockMetadata(blockId);
        if (!metadata) {
          return notFoundError('Block', blockId);
        }
        return {
          statusCode: 200,
          response: {
            message: 'OK',
            block: metadata,
          } as IApiMessageResponse & { block: Record<string, unknown> },
        };
      }

      return notFoundError('Block', blockId);
    } catch (error) {
      return handleError(error);
    }
  }

  /**
   * POST /api/admin/blocks/:blockId/discover
   */
  private async handleDiscoverBlock(
    req: unknown,
  ): Promise<{ statusCode: number; response: AdminBlockApiResponse }> {
    try {
      const request = req as { params?: { blockId?: string } };
      const blockId = request.params?.blockId;

      if (!blockId) {
        return validationError('blockId is required');
      }

      const discoveryProtocol = this.application.services.get(
        'discoveryProtocol',
      ) as
        | {
            discoverBlock?: (blockId: string) => Promise<{
              found: boolean;
              locations: Array<{ nodeId: string }>;
              queriedPeers: number;
              duration: number;
            }>;
          }
        | undefined;

      if (discoveryProtocol?.discoverBlock) {
        const result = await discoveryProtocol.discoverBlock(blockId);
        return {
          statusCode: 200,
          response: {
            message: 'OK',
            blockId,
            ...result,
          } as IApiMessageResponse & Record<string, unknown>,
        };
      }

      return {
        statusCode: 200,
        response: {
          message: 'OK',
          blockId,
          found: false,
          locations: [],
          queriedPeers: 0,
          duration: 0,
        } as IApiMessageResponse & Record<string, unknown>,
      };
    } catch (error) {
      return handleError(error);
    }
  }

  /**
   * DELETE /api/admin/blocks/:blockId
   */
  private async handleDeleteBlock(
    req: unknown,
  ): Promise<{ statusCode: number; response: AdminBlockApiResponse }> {
    try {
      const request = req as { params?: { blockId?: string } };
      const blockId = request.params?.blockId;

      if (!blockId) {
        return validationError('blockId is required');
      }

      const blockStore = this.application.services.get('blockStore') as
        | {
            deleteBlock?: (blockId: string) => Promise<boolean>;
          }
        | undefined;

      if (blockStore?.deleteBlock) {
        const deleted = await blockStore.deleteBlock(blockId);
        if (!deleted) {
          return notFoundError('Block', blockId);
        }
        return {
          statusCode: 200,
          response: {
            message: 'Block deleted successfully',
          } as IApiMessageResponse,
        };
      }

      return notFoundError('Block', blockId);
    } catch (error) {
      return handleError(error);
    }
  }
}
