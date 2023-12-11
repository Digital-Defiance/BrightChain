/**
 * TempUploadController — REST endpoints for the temporary upload staging system.
 *
 * Provides four endpoints:
 *   POST   /                        — Stage a file upload (auth required)
 *   GET    /:commitToken/preview    — Preview a staged file (no auth)
 *   POST   /:commitToken/commit     — Commit staged file to vault (auth required)
 *   DELETE /:commitToken            — Discard a staged file (auth required)
 *
 * Follows the BaseController pattern with routeConfig definitions.
 *
 * Requirements: 1.1, 1.8, 1.9, 2.1, 2.2, 2.3, 3.1, 3.9, 4.1, 4.4
 */

import type {
  ICommitRequest,
  ICommitResponse,
  IStagingConfig,
  ITempUploadResponse,
} from '@brightchain/brightchain-lib';
import { CoreLanguageCode } from '@digitaldefiance/i18n-lib';
import { PlatformID } from '@digitaldefiance/node-ecies-lib';
import {
  ApiErrorResponse,
  ApiRequestHandler,
  ControllerRegistry,
  IStatusCodeResponse,
  routeConfig,
  TypedHandlers,
} from '@digitaldefiance/node-express-suite';
import type { RequestHandler } from 'express';
import multer from 'multer';
import { IBrightChainApplication } from '../../interfaces/application';
import {
  createDeferredVaultAccessAuditMiddleware,
  type IVaultAccessAuditDeps,
} from '../../middlewares/vault-access-audit';
import type { StagingService } from '../../services/staging/stagingService';
import { DefaultBackendIdType } from '../../shared-types';
import {
  forbiddenError,
  handleError,
  internalError,
  notFoundError,
  unauthorizedError,
  validationError,
} from '../../utils/errorResponse';
import {
  isSupportedImageType,
  processImage,
} from '../../utils/stagingImageProcessor';
import { BaseController } from '../base';

// ─── Dependency Injection ───────────────────────────────────────────────────

/**
 * External dependencies injected into TempUploadController.
 * Keeps the controller testable by allowing mock implementations.
 */
export interface ITempUploadControllerDeps {
  stagingService: StagingService;
  vaultContainerService: {
    createContainer(params: {
      name: string;
      ownerId: PlatformID;
      visibility?: string;
    }): Promise<{ id: PlatformID; rootFolderId: PlatformID }>;
  };
  uploadService: {
    createSession(params: {
      userId: PlatformID;
      fileName: string;
      mimeType: string;
      totalSizeBytes: number;
      targetFolderId: PlatformID;
      vaultContainerId: PlatformID;
    }): Promise<{ id: PlatformID }>;
    receiveChunk(
      sessionId: PlatformID,
      chunkIndex: number,
      data: Uint8Array,
      checksum: string,
    ): Promise<unknown>;
    finalize(sessionId: PlatformID): Promise<{
      id: PlatformID;
      vaultContainerId: PlatformID;
      fileName: string;
      mimeType: string;
      sizeBytes: number;
    }>;
  };
  parseId: (idString: string) => PlatformID;
}

// ─── Handler Types ──────────────────────────────────────────────────────────

// Use ApiErrorResponse as the base response type for the controller generic
// since ITempUploadResponse and ICommitResponse lack the index signature
// required by ApiResponse. Handlers cast to the specific types internally.
type TempUploadApiResponse = ApiErrorResponse;

interface ITempUploadHandlers extends TypedHandlers {
  stage: ApiRequestHandler<ApiErrorResponse>;
  preview: ApiRequestHandler<ApiErrorResponse>;
  commit: ApiRequestHandler<ApiErrorResponse>;
  discard: ApiRequestHandler<ApiErrorResponse>;
}

// ─── Controller ─────────────────────────────────────────────────────────────

/**
 * Controller for temporary upload staging endpoints.
 *
 * ## Endpoints
 *
 * ### POST /api/temp-upload
 * Stage a file upload. Requires authentication. Accepts multipart/form-data
 * with a `file` field and optional `ttlSeconds` body field.
 *
 * ### GET /api/temp-upload/:commitToken/preview
 * Preview a staged file. No authentication required — the commit token
 * acts as a bearer credential.
 *
 * ### POST /api/temp-upload/:commitToken/commit
 * Commit a staged file to permanent vault storage. Requires authentication.
 * Accepts JSON body with vault target and optional processing params.
 *
 * ### DELETE /api/temp-upload/:commitToken
 * Discard a staged file. Requires authentication.
 *
 * @requirements 1.1, 1.8, 1.9, 2.1, 2.2, 2.3, 3.1, 3.9, 4.1, 4.4
 */
export class TempUploadController<
  TID extends PlatformID = DefaultBackendIdType,
> extends BaseController<
  TID,
  TempUploadApiResponse,
  ITempUploadHandlers,
  CoreLanguageCode
> {
  private readonly deps: ITempUploadControllerDeps;
  private readonly stagingConfig: IStagingConfig;
  private readonly upload: multer.Multer;
  private _setAuditDeps: ((deps: IVaultAccessAuditDeps<TID>) => void) | null =
    null;

  /**
   * Per-user staging rate limiter.
   * Maps userId → array of upload timestamps (ms).
   * Max 60 staged files per user per hour.
   */
  private readonly stageTimestamps = new Map<string, number[]>();
  private static readonly STAGE_RATE_LIMIT_MAX = 60;
  private static readonly STAGE_RATE_LIMIT_WINDOW_MS = 60 * 60 * 1000; // 1 hour

  private checkStageRateLimit(userId: string): boolean {
    const now = Date.now();
    const cutoff = now - TempUploadController.STAGE_RATE_LIMIT_WINDOW_MS;
    const timestamps = (this.stageTimestamps.get(userId) ?? []).filter(
      (t) => t > cutoff,
    );
    if (timestamps.length >= TempUploadController.STAGE_RATE_LIMIT_MAX) {
      this.stageTimestamps.set(userId, timestamps);
      return false;
    }
    timestamps.push(now);
    this.stageTimestamps.set(userId, timestamps);
    return true;
  }

  constructor(
    application: IBrightChainApplication<TID>,
    deps: ITempUploadControllerDeps,
    stagingConfig: IStagingConfig,
  ) {
    super(application);
    this.deps = deps;
    this.stagingConfig = stagingConfig;
    this.upload = multer({
      storage: multer.memoryStorage(),
      limits: { fileSize: stagingConfig.maxFileSizeBytes },
    });
  }

  /**
   * Wire the vault access audit middleware dependencies.
   * Once called, the deferred audit middleware on the preview route activates.
   *
   * @requirements 5.6
   */
  public setAuditDeps(deps: IVaultAccessAuditDeps<TID>): void {
    if (this._setAuditDeps) {
      this._setAuditDeps(deps);
    }
  }

  protected initRouteDefinitions(): void {
    // Create a deferred audit middleware for the preview route.
    // It is a no-op until setAuditDeps() is called with the real dependencies.
    const [auditMw, setDeps] = createDeferredVaultAccessAuditMiddleware<TID>();
    this._setAuditDeps = setDeps;

    this.routeDefinitions = [
      routeConfig('post', '/', {
        handlerKey: 'stage',
        useAuthentication: true,
        useCryptoAuthentication: false,
        openapi: {
          summary: 'Stage a file upload',
          description:
            'Upload a file to temporary staging. Returns a commit token for preview/commit/discard.',
          tags: ['TempUpload'],
          requestBody: {
            schema: 'TempUploadRequest',
            example: { file: '(binary)', ttlSeconds: 3600 },
          },
          responses: {
            201: {
              schema: 'TempUploadResponse',
              description: 'File staged successfully',
            },
            413: {
              schema: 'ErrorResponse',
              description: 'File too large',
            },
          },
        },
      }),
      {
        ...routeConfig('get', '/:commitToken/preview', {
          handlerKey: 'preview',
          useAuthentication: false,
          useCryptoAuthentication: false,
          openapi: {
            summary: 'Preview a staged file',
            description:
              'Returns the staged file bytes. No auth required — commit token is the bearer credential.',
            tags: ['TempUpload'],
            responses: {
              200: { description: 'File bytes with correct Content-Type' },
              404: {
                schema: 'ErrorResponse',
                description: 'Unknown commit token',
              },
              410: {
                schema: 'ErrorResponse',
                description: 'Staged file expired',
              },
            },
          },
        }),
        middleware: [auditMw() as RequestHandler],
      },
      routeConfig('post', '/:commitToken/commit', {
        handlerKey: 'commit',
        useAuthentication: true,
        useCryptoAuthentication: false,
        openapi: {
          summary: 'Commit staged file to vault',
          description:
            'Promotes a staged file to permanent vault storage with optional image processing.',
          tags: ['TempUpload'],
          requestBody: {
            schema: 'CommitRequest',
            example: {
              vaultContainerId: 'abc-123',
              targetFolderId: 'def-456',
            },
          },
          responses: {
            200: {
              schema: 'CommitResponse',
              description: 'File committed to vault',
            },
            404: {
              schema: 'ErrorResponse',
              description: 'Unknown commit token',
            },
            410: {
              schema: 'ErrorResponse',
              description: 'Staged file expired',
            },
            403: {
              schema: 'ErrorResponse',
              description: 'User does not match uploader',
            },
          },
        },
      }),
      routeConfig('delete', '/:commitToken', {
        handlerKey: 'discard',
        useAuthentication: true,
        useCryptoAuthentication: false,
        openapi: {
          summary: 'Discard a staged file',
          description:
            'Deletes a staged file from the staging store. Returns 204 on success.',
          tags: ['TempUpload'],
          responses: {
            204: { description: 'File discarded' },
            404: {
              schema: 'ErrorResponse',
              description: 'Unknown commit token',
            },
            403: {
              schema: 'ErrorResponse',
              description: 'User does not match uploader',
            },
          },
        },
      }),
    ];

    ControllerRegistry.register(
      '/temp-upload',
      'TempUploadController',
      this.routeDefinitions,
    );

    this.handlers = {
      stage: this.handleStage.bind(this),
      preview: this.handlePreview.bind(this),
      commit: this.handleCommit.bind(this),
      discard: this.handleDiscard.bind(this),
    };
  }

  // ─── Multer helper ──────────────────────────────────────────────────────

  /**
   * Parse a multipart upload from the request using multer.
   * Returns the uploaded file or null if no file was provided.
   */
  public parseMultipartUpload(
    req: Parameters<ApiRequestHandler<ApiErrorResponse>>[0],
  ): Promise<Express.Multer.File | null> {
    return new Promise((resolve, reject) => {
      const singleUpload = this.upload.single('file');
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      singleUpload(req as any, {} as any, (err: unknown) => {
        if (err) {
          reject(err);
          return;
        }
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const file = (req as any).file as Express.Multer.File | undefined;
        resolve(file ?? null);
      });
    });
  }

  // ─── Handlers ─────────────────────────────────────────────────────────

  /**
   * POST / — Stage a file upload.
   *
   * Authenticates user, extracts file from multer, reads optional ttlSeconds
   * from body, calls stagingService.stage(), returns 201 with ITempUploadResponse.
   *
   * @requirements 1.1, 1.2, 1.3, 1.5, 1.6, 1.8, 1.9, 1.10
   */
  private async handleStage(
    req: Parameters<ApiRequestHandler<ApiErrorResponse>>[0],
  ): Promise<IStatusCodeResponse<ApiErrorResponse>> {
    try {
      const user = (req as { user?: { id?: string } }).user;
      if (!user?.id) {
        return unauthorizedError();
      }

      // Rate limit: max 60 staged files per user per hour
      if (!this.checkStageRateLimit(user.id)) {
        return {
          statusCode: 429,
          response: {
            message: `Upload rate limit exceeded. Maximum ${TempUploadController.STAGE_RATE_LIMIT_MAX} uploads per hour.`,
            error: 'RATE_LIMIT_EXCEEDED',
          } as unknown as ApiErrorResponse,
        };
      }

      let file: Express.Multer.File | null;
      try {
        file = await this.parseMultipartUpload(req);
      } catch (err: unknown) {
        // Multer file size limit error
        if (
          err &&
          typeof err === 'object' &&
          'code' in err &&
          (err as { code: string }).code === 'LIMIT_FILE_SIZE'
        ) {
          return {
            statusCode: 413,
            response: {
              message: `File size exceeds the maximum allowed size of ${this.stagingConfig.maxFileSizeBytes} bytes`,
              error: 'PAYLOAD_TOO_LARGE',
            } as unknown as ApiErrorResponse,
          };
        }
        throw err;
      }

      if (!file) {
        return validationError('No file provided in the request');
      }

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const body = (req as any).body ?? {};
      const ttlSeconds =
        body.ttlSeconds !== undefined ? Number(body.ttlSeconds) : undefined;

      const record = await this.deps.stagingService.stage(
        file.buffer,
        file.originalname,
        file.mimetype,
        user.id,
        ttlSeconds,
      );

      const response: ITempUploadResponse = {
        commitToken: record.commitToken,
        previewUrl: `/api/temp-upload/${record.commitToken}/preview`,
        expiresAt:
          typeof record.expiresAt === 'string'
            ? record.expiresAt
            : record.expiresAt.toISOString(),
        originalFilename: record.originalFilename,
        mimeType: record.mimeType,
        sizeBytes: record.sizeBytes,
      };

      return {
        statusCode: 201,
        response: response as unknown as ApiErrorResponse,
      };
    } catch (error) {
      return handleError(error);
    }
  }

  /**
   * GET /:commitToken/preview — Preview a staged file.
   *
   * No authentication required. Returns file bytes with correct Content-Type,
   * Cache-Control: private, no-store, and Content-Disposition: inline.
   *
   * @requirements 2.1, 2.2, 2.3, 2.4, 2.5
   */
  private async handlePreview(
    req: Parameters<ApiRequestHandler<ApiErrorResponse>>[0],
  ): Promise<IStatusCodeResponse<ApiErrorResponse>> {
    try {
      const commitToken = req.params['commitToken'] as string;

      const record = await this.deps.stagingService.getRecord(commitToken);
      if (!record) {
        return notFoundError('StagedFile', commitToken);
      }

      if (this.deps.stagingService.isExpired(record)) {
        return {
          statusCode: 410,
          response: {
            message: 'Staged file has expired',
            error: 'GONE',
          } as unknown as ApiErrorResponse,
        };
      }

      const fileBuffer = await this.deps.stagingService.readFile(commitToken);

      // Set response headers and send file bytes directly
      this.res.set('Content-Type', record.mimeType);
      this.res.set('Cache-Control', 'private, no-store');
      this.res.set(
        'Content-Disposition',
        `inline; filename="${record.originalFilename}"`,
      );
      this.res.status(200).send(fileBuffer);

      // Return a sentinel that the framework won't try to send again.
      // The response has already been sent above.
      return {
        statusCode: 200,
        response: {
          message: 'OK',
        } as unknown as ApiErrorResponse,
      };
    } catch (error) {
      return handleError(error);
    }
  }

  /**
   * POST /:commitToken/commit — Commit staged file to vault.
   *
   * Authenticates user, gets record (404/410/403), reads file, applies optional
   * image processing, creates vault container if needed, uploads to vault,
   * removes staged file, returns ICommitResponse.
   *
   * @requirements 3.1, 3.2, 3.3, 3.4, 3.5, 3.6, 3.7, 3.8, 3.9, 3.10, 6.1, 6.2, 6.3, 6.4, 6.5
   */
  private async handleCommit(
    req: Parameters<ApiRequestHandler<ApiErrorResponse>>[0],
  ): Promise<IStatusCodeResponse<ApiErrorResponse>> {
    try {
      const user = (req as { user?: { id?: string } }).user;
      if (!user?.id) {
        return unauthorizedError();
      }

      const commitToken = req.params['commitToken'] as string;

      const record = await this.deps.stagingService.getRecord(commitToken);
      if (!record) {
        return notFoundError('StagedFile', commitToken);
      }

      if (this.deps.stagingService.isExpired(record)) {
        return {
          statusCode: 410,
          response: {
            message: 'Staged file has expired',
            error: 'GONE',
          } as unknown as ApiErrorResponse,
        };
      }

      if (record.uploaderId !== user.id) {
        return forbiddenError(
          'You do not have permission to commit this staged file',
        );
      }

      // Read the staged file bytes
      let fileBuffer = await this.deps.stagingService.readFile(commitToken);
      let mimeType = record.mimeType;
      let sizeBytes = record.sizeBytes;

      // Parse commit request body
      const body = req.body as ICommitRequest<string> | undefined;

      // Apply image processing if requested
      if (body?.processingParams) {
        if (!isSupportedImageType(mimeType)) {
          return {
            statusCode: 422,
            response: {
              message: `Image processing is only supported for image files. File type '${mimeType}' is not supported.`,
              error: 'UNPROCESSABLE_ENTITY',
            } as unknown as ApiErrorResponse,
          };
        }

        try {
          const processed = await processImage(
            fileBuffer,
            body.processingParams,
          );
          fileBuffer = processed.buffer;
          mimeType = processed.mimeType;
          sizeBytes = fileBuffer.length;
        } catch (processingError) {
          return {
            statusCode: 422,
            response: {
              message: `Image processing failed: ${processingError instanceof Error ? processingError.message : 'Unknown error'}`,
              error: 'UNPROCESSABLE_ENTITY',
            } as unknown as ApiErrorResponse,
          };
        }
      }

      // Determine vault target
      let vaultContainerId: PlatformID;
      let targetFolderId: PlatformID;

      if (body?.createContainer) {
        try {
          const container =
            await this.deps.vaultContainerService.createContainer({
              name: body.createContainer.name,
              ownerId: this.deps.parseId(body.createContainer.ownerId),
              visibility: body.createContainer.visibility,
            });
          vaultContainerId = container.id;
          targetFolderId = container.rootFolderId;
        } catch (containerError) {
          return internalError(
            containerError instanceof Error
              ? containerError
              : new Error('Failed to create vault container'),
          );
        }
      } else if (body?.vaultContainerId) {
        vaultContainerId = this.deps.parseId(body.vaultContainerId);
        targetFolderId = body.targetFolderId
          ? this.deps.parseId(body.targetFolderId)
          : vaultContainerId; // fallback to container ID if no folder specified
      } else {
        return validationError(
          'Either vaultContainerId or createContainer must be provided',
        );
      }

      // Upload to vault via the upload pipeline
      try {
        const session = await this.deps.uploadService.createSession({
          userId: this.deps.parseId(user.id),
          fileName: record.originalFilename,
          mimeType,
          totalSizeBytes: sizeBytes,
          targetFolderId,
          vaultContainerId,
        });

        // Compute a simple checksum for the chunk
        const { createHash } = await import('crypto');
        const checksum = createHash('sha256').update(fileBuffer).digest('hex');

        await this.deps.uploadService.receiveChunk(
          session.id,
          0,
          new Uint8Array(fileBuffer),
          checksum,
        );

        const fileMetadata = await this.deps.uploadService.finalize(session.id);

        // Remove staged file only after successful vault upload
        await this.deps.stagingService.remove(commitToken);

        const commitResponse: ICommitResponse<string> = {
          fileId: fileMetadata.id.toString(),
          vaultContainerId: fileMetadata.vaultContainerId.toString(),
          fileName: fileMetadata.fileName,
          mimeType: fileMetadata.mimeType,
          sizeBytes: fileMetadata.sizeBytes,
        };

        return {
          statusCode: 200,
          response: commitResponse as unknown as ApiErrorResponse,
        };
      } catch (uploadError) {
        // On upload failure, do NOT delete staged file — user can retry
        return internalError(
          uploadError instanceof Error
            ? uploadError
            : new Error('Failed to upload file to vault'),
        );
      }
    } catch (error) {
      return handleError(error);
    }
  }

  /**
   * DELETE /:commitToken — Discard a staged file.
   *
   * Authenticates user, gets record (404/403), removes staged file,
   * returns 204 No Content.
   *
   * @requirements 4.1, 4.2, 4.3, 4.4, 4.5
   */
  private async handleDiscard(
    req: Parameters<ApiRequestHandler<ApiErrorResponse>>[0],
  ): Promise<IStatusCodeResponse<ApiErrorResponse>> {
    try {
      const user = (req as { user?: { id?: string } }).user;
      if (!user?.id) {
        return unauthorizedError();
      }

      const commitToken = req.params['commitToken'] as string;

      const record = await this.deps.stagingService.getRecord(commitToken);
      if (!record) {
        return notFoundError('StagedFile', commitToken);
      }

      if (record.uploaderId !== user.id) {
        return forbiddenError(
          'You do not have permission to discard this staged file',
        );
      }

      await this.deps.stagingService.remove(commitToken);

      return {
        statusCode: 204,
        response: {
          message: '',
        } as unknown as ApiErrorResponse,
      };
    } catch (error) {
      return handleError(error);
    }
  }
}
