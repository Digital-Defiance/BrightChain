/**
 * PostImageController — Serves committed post images from the vault.
 *
 * Routes:
 *   GET /api/post-images/:fileId — Serve a committed post image
 *
 * Public endpoint (no auth required) — images live in public vault containers.
 * Supports ETag-based caching with immutable Cache-Control headers.
 *
 * Requirements: 9.1, 14.2
 */

import { PlatformID } from '@digitaldefiance/node-ecies-lib';
import {
  ApiErrorResponse,
  ApiRequestHandler,
  TypedHandlers,
  routeConfig,
} from '@digitaldefiance/node-express-suite';
import type { RequestHandler } from 'express';
import { IBrightChainApplication } from '../../../interfaces/application';
import {
  createDeferredVaultAccessAuditMiddleware,
  type IVaultAccessAuditDeps,
  type IVaultAuditRequest,
} from '../../../middlewares/vault-access-audit';
import { DefaultBackendIdType } from '../../../shared-types';
import { BaseController } from '../../base';

// ─── Dependencies ───────────────────────────────────────────────────────────

/**
 * External dependencies for post image serving.
 * Injected to keep the controller testable.
 */
export interface IPostImageControllerDeps {
  fileService: {
    readFile(vaultContainerId: PlatformID, fileId: PlatformID): Promise<Buffer>;
  };
  parseId: (idString: string) => PlatformID;
  /**
   * Look up the vault container ID and MIME type for a given file ID.
   * Returns null if the file is not found.
   */
  resolveFile: (fileId: string) => Promise<{
    vaultContainerId: string;
    mimeType: string;
  } | null>;
}

// ─── Handler types ──────────────────────────────────────────────────────────

type PostImageApiResponse = ApiErrorResponse;

interface PostImageHandlers extends TypedHandlers {
  serveImage: ApiRequestHandler<ApiErrorResponse>;
}

interface ServeImageRequestParams {
  params: { fileId: string };
  headers?: Record<string, string | undefined>;
}

// ─── Controller ─────────────────────────────────────────────────────────────

/**
 * Controller for serving committed post images from the vault.
 *
 * @requirements 9.1, 14.2
 */
export class PostImageController<
  TID extends PlatformID = DefaultBackendIdType,
> extends BaseController<TID, PostImageApiResponse, PostImageHandlers, string> {
  private deps: IPostImageControllerDeps | null = null;
  private _setAuditDeps: ((deps: IVaultAccessAuditDeps<TID>) => void) | null =
    null;

  constructor(application: IBrightChainApplication<TID>) {
    super(application);
  }

  /**
   * Wire the vault access audit middleware dependencies.
   * Once called, the deferred audit middleware on the image route activates.
   */
  public setAuditDeps(deps: IVaultAccessAuditDeps<TID>): void {
    if (this._setAuditDeps) {
      this._setAuditDeps(deps);
    }
  }

  public setDeps(deps: IPostImageControllerDeps): void {
    this.deps = deps;
  }

  private getDeps(): IPostImageControllerDeps {
    if (!this.deps) {
      throw new Error('PostImageController dependencies not initialized');
    }
    return this.deps;
  }

  protected initRouteDefinitions(): void {
    // Create a deferred audit middleware for the image serving route.
    // It is a no-op until setAuditDeps() is called with the real dependencies.
    const [auditMw, setDeps] = createDeferredVaultAccessAuditMiddleware<TID>();
    this._setAuditDeps = setDeps;

    this.routeDefinitions = [
      {
        ...routeConfig('get', '/:fileId', {
          useAuthentication: false,
          useCryptoAuthentication: false,
          handlerKey: 'serveImage',
        }),
        middleware: [auditMw() as RequestHandler],
      },
    ];

    this.handlers = {
      serveImage: this.handleServeImage.bind(this),
    };
  }

  // ─── Handler ────────────────────────────────────────────────────────

  /**
   * GET /api/post-images/:fileId — Serve a committed post image.
   *
   * Public endpoint (no auth). Returns image bytes with cache headers and ETag.
   * Attaches vault audit context to the request for the audit middleware.
   *
   * @requirements 9.1, 14.2
   */
  private async handleServeImage(req: unknown): Promise<{
    statusCode: number;
    response: ApiErrorResponse;
  }> {
    try {
      const { fileId } = (req as ServeImageRequestParams).params;

      if (!fileId) {
        return {
          statusCode: 400,
          response: {
            error: {
              code: 'MISSING_FILE_ID',
              message: 'fileId parameter is required',
            },
          } as unknown as ApiErrorResponse,
        };
      }

      const deps = this.getDeps();

      // Resolve the file to get vault container ID and MIME type
      const fileInfo = await deps.resolveFile(fileId);

      if (!fileInfo) {
        return {
          statusCode: 404,
          response: {
            error: {
              code: 'POST_IMAGE_NOT_FOUND',
              message: 'Post image not found',
            },
          } as unknown as ApiErrorResponse,
        };
      }

      // Attach vault audit context so the audit middleware can include
      // file-specific metadata in the audit entry.
      (req as IVaultAuditRequest).vaultAuditContext = {
        fileId,
        vaultContainerId: fileInfo.vaultContainerId,
      };

      // ETag check
      const etag = `"${fileId}"`;
      const ifNoneMatch = (
        req as { headers?: Record<string, string | undefined> }
      ).headers?.['if-none-match'];
      if (ifNoneMatch === etag) {
        return {
          statusCode: 304,
          response: {
            _headers: {
              ETag: etag,
            },
          } as unknown as ApiErrorResponse,
        };
      }

      // Read file from vault
      const fileBuffer = await deps.fileService.readFile(
        deps.parseId(fileInfo.vaultContainerId),
        deps.parseId(fileId),
      );

      // Send binary response directly via Express res object
      this.res.set('Content-Type', fileInfo.mimeType);
      this.res.set('Cache-Control', 'public, max-age=31536000, immutable');
      this.res.set('ETag', etag);
      this.res.status(200).send(fileBuffer);

      return {
        statusCode: 200,
        response: {
          message: 'OK',
        } as unknown as ApiErrorResponse,
      };
    } catch (error) {
      // If the file service throws (e.g. file not found at vault level),
      // treat it as a 404
      const message = error instanceof Error ? error.message : 'Unknown error';
      if (
        message.includes('not found') ||
        message.includes('Not found') ||
        message.includes('NOT_FOUND')
      ) {
        return {
          statusCode: 404,
          response: {
            error: {
              code: 'POST_IMAGE_NOT_FOUND',
              message: 'Post image not found',
            },
          } as unknown as ApiErrorResponse,
        };
      }
      return {
        statusCode: 500,
        response: {
          error: {
            code: 'INTERNAL_ERROR',
            message: `Failed to serve post image: ${message}`,
          },
        } as unknown as ApiErrorResponse,
      };
    }
  }
}
