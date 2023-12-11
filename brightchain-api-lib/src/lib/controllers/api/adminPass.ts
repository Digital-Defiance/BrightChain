import type { BrightDb } from '@brightchain/db';
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

type AdminPassApiResponse = IApiMessageResponse | ApiErrorResponse;

interface AdminPassHandlers extends TypedHandlers {
  listVaults: ApiRequestHandler<AdminPassApiResponse>;
  deleteVault: ApiRequestHandler<AdminPassApiResponse>;
}

/**
 * Admin-only BrightPass vault management controller.
 *
 * Vault contents are encrypted and never exposed — admin can only see
 * metadata and delete vaults. Per-vault entry counts are not available
 * because vaults are opaque encrypted blobs.
 *
 * ## Endpoints
 *
 * ### GET /api/admin/pass/vaults
 * Paginated vault list with id, ownerId, ownerUsername, isShared,
 * createdAt, lastAccessedAt.
 *
 * ### DELETE /api/admin/pass/vaults/:vaultId
 * Delete vault and associated blocks from local store.
 *
 * @requirements 16.2, 16.3
 */
export class AdminPassController<
  TID extends PlatformID = DefaultBackendIdType,
> extends BaseController<
  TID,
  AdminPassApiResponse,
  AdminPassHandlers,
  CoreLanguageCode
> {
  constructor(application: IBrightChainApplication<TID>) {
    super(application);
  }

  protected initRouteDefinitions(): void {
    this.routeDefinitions = [
      routeConfig('get', '/vaults', {
        handlerKey: 'listVaults',
        useAuthentication: true,
        useCryptoAuthentication: false,
      }),
      routeConfig('delete', '/vaults/:vaultId', {
        handlerKey: 'deleteVault',
        useAuthentication: true,
        useCryptoAuthentication: false,
      }),
    ];

    this.handlers = {
      listVaults: this.handleListVaults.bind(this),
      deleteVault: this.handleDeleteVault.bind(this),
    };
  }

  /**
   * GET /api/admin/pass/vaults?page=1&limit=20
   * Returns: id, ownerId, ownerUsername, isShared, createdAt, lastAccessedAt
   * NO entryCount — vaults are opaque encrypted blobs.
   */
  private async handleListVaults(
    req: unknown,
  ): Promise<{ statusCode: number; response: AdminPassApiResponse }> {
    try {
      const request = req as {
        query?: { page?: string; limit?: string };
      };
      const page = Math.max(1, parseInt(request.query?.page ?? '1', 10) || 1);
      const limit = Math.min(
        100,
        Math.max(1, parseInt(request.query?.limit ?? '20', 10) || 20),
      );

      const passService = this.application.services.has('passService')
        ? (this.application.services.get('passService') as {
            listVaults?: (options: { page: number; limit: number }) => Promise<{
              vaults: Record<string, unknown>[];
              total: number;
            }>;
          })
        : undefined;

      if (passService?.listVaults) {
        const result = await passService.listVaults({ page, limit });

        const vaults = result.vaults.map((vault: Record<string, unknown>) => ({
          id: vault['_id'] ?? vault['id'],
          ownerId: vault['ownerId'] ?? '',
          ownerUsername: vault['ownerUsername'] ?? '',
          isShared: vault['isShared'] ?? false,
          createdAt: vault['createdAt'] ?? null,
          lastAccessedAt: vault['lastAccessedAt'] ?? null,
        }));

        return {
          statusCode: 200,
          response: {
            message: 'OK',
            vaults,
            total: result.total,
            page,
            limit,
          } as IApiMessageResponse & Record<string, unknown>,
        };
      }

      // Fallback: direct DB access
      const brightDb = this.application.services.has('db')
        ? (this.application.services.get('db') as BrightDb)
        : undefined;
      if (brightDb) {
        const collection = brightDb.collection('brightpass_vaults');
        const total = await collection.countDocuments();
        const skip = (page - 1) * limit;
        const docs = await collection.find().skip(skip).limit(limit).toArray();

        const vaults = docs.map((doc: Record<string, unknown>) => ({
          id: doc['_id'] ?? doc['id'],
          ownerId: doc['ownerId'] ?? '',
          ownerUsername: doc['ownerUsername'] ?? '',
          isShared: doc['isShared'] ?? false,
          createdAt: doc['createdAt'] ?? null,
          lastAccessedAt: doc['lastAccessedAt'] ?? null,
        }));

        return {
          statusCode: 200,
          response: {
            message: 'OK',
            vaults,
            total,
            page,
            limit,
          } as IApiMessageResponse & Record<string, unknown>,
        };
      }

      return {
        statusCode: 200,
        response: {
          message: 'OK',
          vaults: [],
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
   * DELETE /api/admin/pass/vaults/:vaultId
   */
  private async handleDeleteVault(
    req: unknown,
  ): Promise<{ statusCode: number; response: AdminPassApiResponse }> {
    try {
      const request = req as { params?: { vaultId?: string } };
      const vaultId = request.params?.vaultId;

      if (!vaultId) {
        return validationError('vaultId is required');
      }

      const passService = this.application.services.has('passService')
        ? (this.application.services.get('passService') as {
            deleteVault?: (vaultId: string) => Promise<boolean>;
          })
        : undefined;

      if (passService?.deleteVault) {
        const deleted = await passService.deleteVault(vaultId);
        if (!deleted) {
          return notFoundError('Vault', vaultId);
        }
        return {
          statusCode: 200,
          response: {
            message: 'Vault deleted successfully',
          } as IApiMessageResponse,
        };
      }

      // Fallback: direct DB delete
      const brightDb = this.application.services.has('db')
        ? (this.application.services.get('db') as BrightDb)
        : undefined;
      if (brightDb) {
        const collection = brightDb.collection('brightpass_vaults');
        const result = await collection.deleteOne({ _id: vaultId });
        if (!result.deletedCount) {
          return notFoundError('Vault', vaultId);
        }
        return {
          statusCode: 200,
          response: {
            message: 'Vault deleted successfully',
          } as IApiMessageResponse,
        };
      }

      return notFoundError('Vault', vaultId);
    } catch (error) {
      return handleError(error);
    }
  }
}
