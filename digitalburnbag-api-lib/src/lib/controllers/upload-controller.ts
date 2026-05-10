import type {
  IFileService,
  IStorageQuotaService,
  IUploadService,
} from '@brightchain/digitalburnbag-lib';
import {
  DigitalBurnbagStrings,
  getDigitalBurnbagTranslation,
} from '@brightchain/digitalburnbag-lib';
import { PlatformID } from '@digitaldefiance/ecies-lib';
import { CoreLanguageCode } from '@digitaldefiance/i18n-lib';
import { PlatformID as NodePlatformID } from '@digitaldefiance/node-ecies-lib';
import {
  BaseController,
  routeConfig,
  type ApiErrorResponse,
  type ApiRequestHandler,
  type IApiMessageResponse,
  type IApplication,
  type IStatusCodeResponse,
  type TypedHandlers,
} from '@digitaldefiance/node-express-suite';

import type { Request as ExpressRequest } from 'express';
import { raw as expressRaw } from 'express';
import { isBurnbagJouleEnabled } from '../config/burnbagConfig';

type BurnbagResponse = IApiMessageResponse | ApiErrorResponse;

/** Convert a TID to a hex string for JSON-safe responses. */
function sid<TID extends PlatformID>(value: TID | undefined): string | null {
  if (value === undefined || value === null) return null;
  if (value instanceof Uint8Array || Buffer.isBuffer(value)) {
    return Buffer.from(value).toString('hex');
  }
  return String(value);
}

export interface IUploadControllerDeps<TID extends PlatformID> {
  uploadService: IUploadService<TID>;
  storageQuotaService: IStorageQuotaService<TID>;
  fileService: IFileService<TID>;
  parseId: (idString: string) => TID;
}

interface IUploadHandlers extends TypedHandlers {
  initUpload: ApiRequestHandler<BurnbagResponse>;
  initNewVersionUpload: ApiRequestHandler<BurnbagResponse>;
  receiveChunk: ApiRequestHandler<BurnbagResponse>;
  finalize: ApiRequestHandler<BurnbagResponse>;
  getStatus: ApiRequestHandler<BurnbagResponse>;
  quoteSession: ApiRequestHandler<BurnbagResponse>;
  commitSession: ApiRequestHandler<BurnbagResponse>;
  discardSession: ApiRequestHandler<BurnbagResponse>;
}

export class UploadController<
  TID extends NodePlatformID = NodePlatformID,
> extends BaseController<
  BurnbagResponse,
  IUploadHandlers,
  CoreLanguageCode,
  TID,
  IApplication<TID>
> {
  private readonly deps: IUploadControllerDeps<TID>;

  constructor(
    application: IApplication<TID>,
    deps: IUploadControllerDeps<TID>,
  ) {
    super(application);
    this.deps = deps;
  }

  private safeParseId(idString: string | undefined): TID | undefined {
    if (!idString) return undefined;
    try {
      return this.deps.parseId(idString);
    } catch {
      return undefined;
    }
  }

  protected initRouteDefinitions(): void {
    const auth = { useAuthentication: true, useCryptoAuthentication: false };

    const chunkRoute = routeConfig<IUploadHandlers, CoreLanguageCode>(
      'put',
      '/:sessionId/chunk/:index',
      { handlerKey: 'receiveChunk', ...auth },
    );
    // Binary body — express.json() skips application/octet-stream, so we
    // need express.raw() to populate req.body with a Buffer.
    chunkRoute.middleware = [
      expressRaw({ type: 'application/octet-stream', limit: '64mb' }),
    ];

    this.routeDefinitions = [
      routeConfig('post', '/init', { handlerKey: 'initUpload', ...auth }),
      routeConfig('post', '/new-version', {
        handlerKey: 'initNewVersionUpload',
        ...auth,
      }),
      chunkRoute,
      routeConfig('post', '/:sessionId/finalize', {
        handlerKey: 'finalize',
        ...auth,
      }),
      routeConfig('get', '/:sessionId/status', {
        handlerKey: 'getStatus',
        ...auth,
      }),
      routeConfig('post', '/:sessionId/quote', {
        handlerKey: 'quoteSession',
        ...auth,
      }),
      routeConfig('post', '/:sessionId/commit', {
        handlerKey: 'commitSession',
        ...auth,
      }),
      routeConfig('post', '/:sessionId/discard', {
        handlerKey: 'discardSession',
        ...auth,
      }),
    ];
    this.handlers = {
      initUpload: this.handleInitUpload.bind(this),
      initNewVersionUpload: this.handleInitNewVersionUpload.bind(this),
      receiveChunk: this.handleReceiveChunk.bind(this),
      finalize: this.handleFinalize.bind(this),
      getStatus: this.handleGetStatus.bind(this),
      quoteSession: this.handleQuoteSession.bind(this),
      commitSession: this.handleCommitSession.bind(this),
      discardSession: this.handleDiscardSession.bind(this),
    };
  }

  private async handleInitUpload(
    req: ExpressRequest,
  ): Promise<IStatusCodeResponse<BurnbagResponse>> {
    const requesterId = this.safeParseId(req.user?.id as string);
    if (!requesterId)
      return {
        statusCode: 401,
        response: {
          message: getDigitalBurnbagTranslation(
            DigitalBurnbagStrings.Api_Error_AuthMissing,
          ),
          error: getDigitalBurnbagTranslation(
            DigitalBurnbagStrings.Api_Http_Unauthorized,
          ),
        } as unknown as BurnbagResponse,
      };
    const {
      fileName,
      mimeType,
      totalSizeBytes,
      targetFolderId,
      vaultContainerId,
      durabilityTier,
      durationDays,
      wrappedKeyB64,
      ivB64,
      authTagB64,
    } = req.body;

    // Build optional E2EE metadata when the client pre-encrypted the file
    const preEncryptedWrappedKeyB64: string | undefined =
      typeof wrappedKeyB64 === 'string' ? wrappedKeyB64 : undefined;
    const preEncryptedIvB64: string | undefined =
      typeof ivB64 === 'string' ? ivB64 : undefined;
    const preEncryptedAuthTagB64: string | undefined =
      typeof authTagB64 === 'string' ? authTagB64 : undefined;

    // When Joule is enabled, require durability tier and duration
    if (isBurnbagJouleEnabled()) {
      if (!durabilityTier) {
        return {
          statusCode: 422,
          response: {
            message: getDigitalBurnbagTranslation(
              DigitalBurnbagStrings.Api_Error_DurabilityTierRequired,
            ),
            error: getDigitalBurnbagTranslation(
              DigitalBurnbagStrings.Api_Http_UnprocessableEntity,
            ),
          } as unknown as BurnbagResponse,
        };
      }
      const validTiers = new Set([
        'performance',
        'standard',
        'archive',
        'pending-burn',
        'none',
      ]);
      if (!validTiers.has(durabilityTier as string)) {
        return {
          statusCode: 422,
          response: {
            message: getDigitalBurnbagTranslation(
              DigitalBurnbagStrings.Api_Error_DurabilityTierInvalid,
            ),
            error: getDigitalBurnbagTranslation(
              DigitalBurnbagStrings.Api_Http_UnprocessableEntity,
            ),
          } as unknown as BurnbagResponse,
        };
      }
      const parsedDurationDays = Number(durationDays);
      if (!Number.isInteger(parsedDurationDays) || parsedDurationDays < 1) {
        return {
          statusCode: 422,
          response: {
            message: getDigitalBurnbagTranslation(
              DigitalBurnbagStrings.Api_Error_DurationDaysInvalid,
            ),
            error: getDigitalBurnbagTranslation(
              DigitalBurnbagStrings.Api_Http_UnprocessableEntity,
            ),
          } as unknown as BurnbagResponse,
        };
      }
    }
    const parsedTotalSizeBytes = Number(totalSizeBytes);
    if (!Number.isFinite(parsedTotalSizeBytes) || parsedTotalSizeBytes <= 0) {
      return {
        statusCode: 400,
        response: {
          message: getDigitalBurnbagTranslation(
            DigitalBurnbagStrings.Api_Error_TotalSizeBytesInvalid,
          ),
          error: getDigitalBurnbagTranslation(
            DigitalBurnbagStrings.Api_Http_BadRequest,
          ),
        } as unknown as BurnbagResponse,
      };
    }
    await this.deps.storageQuotaService.checkQuota(
      requesterId,
      parsedTotalSizeBytes,
    );
    const parsedFolderId =
      typeof targetFolderId === 'string'
        ? this.safeParseId(targetFolderId)
        : targetFolderId;
    console.debug(
      '[UploadController] initUpload: targetFolderId=%s parsedFolderId=%s parsedFolderIdType=%s',
      targetFolderId,
      parsedFolderId ? sid(parsedFolderId as TID) : 'undefined',
      typeof parsedFolderId,
    );
    if (!parsedFolderId) {
      return {
        statusCode: 400,
        response: {
          message: getDigitalBurnbagTranslation(
            DigitalBurnbagStrings.Api_Error_TargetFolderIdMissing,
          ),
          error: getDigitalBurnbagTranslation(
            DigitalBurnbagStrings.Api_Http_BadRequest,
          ),
        } as unknown as BurnbagResponse,
      };
    }
    const parsedVaultContainerId =
      typeof vaultContainerId === 'string'
        ? this.safeParseId(vaultContainerId)
        : vaultContainerId;
    if (!parsedVaultContainerId) {
      return {
        statusCode: 400,
        response: {
          message: getDigitalBurnbagTranslation(
            DigitalBurnbagStrings.Api_Error_VaultContainerIdMissing,
          ),
          error: getDigitalBurnbagTranslation(
            DigitalBurnbagStrings.Api_Http_BadRequest,
          ),
        } as unknown as BurnbagResponse,
      };
    }
    const session = await this.deps.uploadService.createSession({
      userId: requesterId,
      fileName,
      mimeType,
      totalSizeBytes: parsedTotalSizeBytes,
      targetFolderId: parsedFolderId as TID,
      vaultContainerId: parsedVaultContainerId as TID,
      preEncryptedWrappedKeyB64,
      preEncryptedIvB64,
      preEncryptedAuthTagB64,
    });
    return {
      statusCode: 201,
      response: {
        sessionId: sid(session.id),
        chunkSize: session.chunkSizeBytes,
        totalChunks: session.totalChunks,
      } as unknown as IApiMessageResponse,
    };
  }

  private async handleInitNewVersionUpload(
    req: ExpressRequest,
  ): Promise<IStatusCodeResponse<BurnbagResponse>> {
    const requesterId = this.safeParseId(req.user?.id as string);
    if (!requesterId)
      return {
        statusCode: 401,
        response: {
          message: getDigitalBurnbagTranslation(
            DigitalBurnbagStrings.Api_Error_AuthMissing,
          ),
          error: getDigitalBurnbagTranslation(
            DigitalBurnbagStrings.Api_Http_Unauthorized,
          ),
        } as unknown as BurnbagResponse,
      };

    const { fileId, fileName, mimeType, totalSizeBytes } = req.body;

    const parsedFileId =
      typeof fileId === 'string' ? this.safeParseId(fileId) : fileId;
    if (!parsedFileId) {
      return {
        statusCode: 400,
        response: {
          message: getDigitalBurnbagTranslation(
            DigitalBurnbagStrings.Api_Error_FileIdMissing,
          ),
          error: getDigitalBurnbagTranslation(
            DigitalBurnbagStrings.Api_Http_BadRequest,
          ),
        } as unknown as BurnbagResponse,
      };
    }

    const parsedTotalSizeBytes = Number(totalSizeBytes);
    if (!Number.isFinite(parsedTotalSizeBytes) || parsedTotalSizeBytes <= 0) {
      return {
        statusCode: 400,
        response: {
          message: getDigitalBurnbagTranslation(
            DigitalBurnbagStrings.Api_Error_TotalSizeBytesInvalid,
          ),
          error: getDigitalBurnbagTranslation(
            DigitalBurnbagStrings.Api_Http_BadRequest,
          ),
        } as unknown as BurnbagResponse,
      };
    }

    // Fetch existing file metadata to validate MIME type
    let existingMetadata;
    try {
      existingMetadata = await this.deps.fileService.getFileMetadata(
        parsedFileId as TID,
        requesterId,
      );
    } catch {
      return {
        statusCode: 404,
        response: {
          message: getDigitalBurnbagTranslation(
            DigitalBurnbagStrings.Api_Error_FileNotFoundTemplate,
            { fileId },
          ),
          error: getDigitalBurnbagTranslation(
            DigitalBurnbagStrings.Api_Http_NotFound,
          ),
        } as unknown as BurnbagResponse,
      };
    }

    // Enforce MIME type consistency
    if (mimeType && existingMetadata.mimeType !== mimeType) {
      return {
        statusCode: 409,
        response: {
          message: getDigitalBurnbagTranslation(
            DigitalBurnbagStrings.Api_Error_MimeTypeMismatch,
            { actual: existingMetadata.mimeType, expected: mimeType },
          ),
          error: getDigitalBurnbagTranslation(
            DigitalBurnbagStrings.Api_Http_Conflict,
          ),
        } as unknown as BurnbagResponse,
      };
    }

    await this.deps.storageQuotaService.checkQuota(
      requesterId,
      parsedTotalSizeBytes,
    );

    const session = await this.deps.uploadService.createNewVersionSession({
      userId: requesterId,
      fileId: parsedFileId as TID,
      fileName: fileName ?? existingMetadata.fileName,
      mimeType: existingMetadata.mimeType,
      totalSizeBytes: parsedTotalSizeBytes,
    });

    return {
      statusCode: 201,
      response: {
        sessionId: sid(session.id),
        chunkSize: session.chunkSizeBytes,
        totalChunks: session.totalChunks,
      } as unknown as IApiMessageResponse,
    };
  }

  private async handleReceiveChunk(
    req: ExpressRequest,
  ): Promise<IStatusCodeResponse<BurnbagResponse>> {
    const sessionId = this.safeParseId(req.params.sessionId as string);
    if (!sessionId)
      return {
        statusCode: 400,
        response: {
          message: getDigitalBurnbagTranslation(
            DigitalBurnbagStrings.Api_Error_InvalidSessionId,
          ),
          error: getDigitalBurnbagTranslation(
            DigitalBurnbagStrings.Api_Http_BadRequest,
          ),
        } as unknown as BurnbagResponse,
      };
    const chunkIndex = parseInt(req.params.index as string, 10);
    const checksum = req.headers['x-chunk-checksum'] as string;
    const data = req.body as Uint8Array;
    const receipt = await this.deps.uploadService.receiveChunk(
      sessionId,
      chunkIndex,
      data,
      checksum,
    );
    return {
      statusCode: 200,
      response: receipt as unknown as IApiMessageResponse,
    };
  }

  private async handleFinalize(
    req: ExpressRequest,
  ): Promise<IStatusCodeResponse<BurnbagResponse>> {
    const sessionId = this.safeParseId(req.params.sessionId as string);
    if (!sessionId)
      return {
        statusCode: 400,
        response: {
          message: getDigitalBurnbagTranslation(
            DigitalBurnbagStrings.Api_Error_InvalidSessionId,
          ),
          error: getDigitalBurnbagTranslation(
            DigitalBurnbagStrings.Api_Http_BadRequest,
          ),
        } as unknown as BurnbagResponse,
      };
    const fileMetadata = await this.deps.uploadService.finalize(sessionId);
    return {
      statusCode: 200,
      response: {
        fileId: sid(fileMetadata.id),
        metadata: {
          ...fileMetadata,
          id: sid(fileMetadata.id),
          ownerId: sid(fileMetadata.ownerId),
          folderId: sid(fileMetadata.folderId),
          currentVersionId: sid(fileMetadata.currentVersionId),
          createdBy: sid(fileMetadata.createdBy as unknown as TID),
          updatedBy: sid(fileMetadata.updatedBy as unknown as TID),
          vaultCreationLedgerEntryHash:
            fileMetadata.vaultCreationLedgerEntryHash
              ? Buffer.from(fileMetadata.vaultCreationLedgerEntryHash).toString(
                  'hex',
                )
              : null,
        },
      } as unknown as IApiMessageResponse,
    };
  }

  private async handleGetStatus(
    req: ExpressRequest,
  ): Promise<IStatusCodeResponse<BurnbagResponse>> {
    const sessionId = this.safeParseId(req.params.sessionId as string);
    if (!sessionId)
      return {
        statusCode: 400,
        response: {
          message: getDigitalBurnbagTranslation(
            DigitalBurnbagStrings.Api_Error_InvalidSessionId,
          ),
          error: getDigitalBurnbagTranslation(
            DigitalBurnbagStrings.Api_Http_BadRequest,
          ),
        } as unknown as BurnbagResponse,
      };
    const status = await this.deps.uploadService.getSessionStatus(sessionId);
    return {
      statusCode: 200,
      response: status as unknown as IApiMessageResponse,
    };
  }

  private async handleQuoteSession(
    req: ExpressRequest,
  ): Promise<IStatusCodeResponse<BurnbagResponse>> {
    if (!isBurnbagJouleEnabled()) {
      return {
        statusCode: 404,
        response: {
          message: getDigitalBurnbagTranslation(
            DigitalBurnbagStrings.Api_Error_JouleNotEnabled,
          ),
          error: getDigitalBurnbagTranslation(
            DigitalBurnbagStrings.Api_Http_NotFound,
          ),
        } as unknown as BurnbagResponse,
      };
    }
    const requesterId = this.safeParseId(req.user?.id as string);
    if (!requesterId) {
      return {
        statusCode: 401,
        response: {
          message: getDigitalBurnbagTranslation(
            DigitalBurnbagStrings.Api_Error_AuthMissing,
          ),
          error: getDigitalBurnbagTranslation(
            DigitalBurnbagStrings.Api_Http_Unauthorized,
          ),
        } as unknown as BurnbagResponse,
      };
    }
    const sessionId = this.safeParseId(req.params.sessionId as string);
    if (!sessionId) {
      return {
        statusCode: 400,
        response: {
          message: getDigitalBurnbagTranslation(
            DigitalBurnbagStrings.Api_Error_InvalidSessionId,
          ),
          error: getDigitalBurnbagTranslation(
            DigitalBurnbagStrings.Api_Http_BadRequest,
          ),
        } as unknown as BurnbagResponse,
      };
    }
    try {
      const quote = await this.deps.uploadService.quote(
        sessionId,
        sid(requesterId) ?? '',
      );
      // Bigint fields are already serialized as strings in IUploadCostQuoteDTO
      return {
        statusCode: 200,
        response: quote as unknown as IApiMessageResponse,
      };
    } catch (err) {
      const code = (err as { code?: string }).code;
      if (code === 'INSUFFICIENT_JOULE_FOR_STORAGE') {
        return {
          statusCode: 402,
          response: {
            message: getDigitalBurnbagTranslation(
              DigitalBurnbagStrings.Api_Error_InsufficientJoule,
            ),
            error: getDigitalBurnbagTranslation(
              DigitalBurnbagStrings.Api_Http_PaymentRequired,
            ),
          } as unknown as BurnbagResponse,
        };
      }
      if (code === 'UPLOAD_ALREADY_QUOTED') {
        return {
          statusCode: 409,
          response: {
            message: getDigitalBurnbagTranslation(
              DigitalBurnbagStrings.Api_Error_UploadAlreadyQuoted,
            ),
            error: getDigitalBurnbagTranslation(
              DigitalBurnbagStrings.Api_Http_Conflict,
            ),
          } as unknown as BurnbagResponse,
        };
      }
      if (code === 'SESSION_NOT_FOUND' || code === 'NOT_FOUND') {
        return {
          statusCode: 404,
          response: {
            message: getDigitalBurnbagTranslation(
              DigitalBurnbagStrings.Api_Error_UploadSessionNotFound,
            ),
            error: getDigitalBurnbagTranslation(
              DigitalBurnbagStrings.Api_Http_NotFound,
            ),
          } as unknown as BurnbagResponse,
        };
      }
      if (code === 'FORBIDDEN') {
        return {
          statusCode: 403,
          response: {
            message: getDigitalBurnbagTranslation(
              DigitalBurnbagStrings.Api_Error_UploadSessionForbidden,
            ),
            error: getDigitalBurnbagTranslation(
              DigitalBurnbagStrings.Api_Http_Forbidden,
            ),
          } as unknown as BurnbagResponse,
        };
      }
      throw err;
    }
  }

  private async handleCommitSession(
    req: ExpressRequest,
  ): Promise<IStatusCodeResponse<BurnbagResponse>> {
    if (!isBurnbagJouleEnabled()) {
      return {
        statusCode: 404,
        response: {
          message: getDigitalBurnbagTranslation(
            DigitalBurnbagStrings.Api_Error_JouleNotEnabled,
          ),
          error: getDigitalBurnbagTranslation(
            DigitalBurnbagStrings.Api_Http_NotFound,
          ),
        } as unknown as BurnbagResponse,
      };
    }
    const requesterId = this.safeParseId(req.user?.id as string);
    if (!requesterId) {
      return {
        statusCode: 401,
        response: {
          message: getDigitalBurnbagTranslation(
            DigitalBurnbagStrings.Api_Error_AuthMissing,
          ),
          error: getDigitalBurnbagTranslation(
            DigitalBurnbagStrings.Api_Http_Unauthorized,
          ),
        } as unknown as BurnbagResponse,
      };
    }
    const sessionId = this.safeParseId(req.params.sessionId as string);
    if (!sessionId) {
      return {
        statusCode: 400,
        response: {
          message: getDigitalBurnbagTranslation(
            DigitalBurnbagStrings.Api_Error_InvalidSessionId,
          ),
          error: getDigitalBurnbagTranslation(
            DigitalBurnbagStrings.Api_Http_BadRequest,
          ),
        } as unknown as BurnbagResponse,
      };
    }
    try {
      const result = await this.deps.uploadService.commit(
        sessionId,
        sid(requesterId) ?? '',
      );
      return {
        statusCode: 201,
        response: result as unknown as IApiMessageResponse,
      };
    } catch (err) {
      const code = (err as { code?: string }).code;
      if (code === 'UPLOAD_QUOTE_EXPIRED') {
        return {
          statusCode: 409,
          response: {
            message:
              'Upload quote has expired. Please re-quote before committing.',
            error: getDigitalBurnbagTranslation(
              DigitalBurnbagStrings.Api_Http_Conflict,
            ),
          } as unknown as BurnbagResponse,
        };
      }
      if (code === 'SESSION_NOT_FOUND' || code === 'NOT_FOUND') {
        return {
          statusCode: 404,
          response: {
            message: getDigitalBurnbagTranslation(
              DigitalBurnbagStrings.Api_Error_UploadSessionNotFound,
            ),
            error: getDigitalBurnbagTranslation(
              DigitalBurnbagStrings.Api_Http_NotFound,
            ),
          } as unknown as BurnbagResponse,
        };
      }
      if (code === 'FORBIDDEN') {
        return {
          statusCode: 403,
          response: {
            message: getDigitalBurnbagTranslation(
              DigitalBurnbagStrings.Api_Error_UploadSessionForbidden,
            ),
            error: getDigitalBurnbagTranslation(
              DigitalBurnbagStrings.Api_Http_Forbidden,
            ),
          } as unknown as BurnbagResponse,
        };
      }
      throw err;
    }
  }

  private async handleDiscardSession(
    req: ExpressRequest,
  ): Promise<IStatusCodeResponse<BurnbagResponse>> {
    if (!isBurnbagJouleEnabled()) {
      return {
        statusCode: 404,
        response: {
          message: getDigitalBurnbagTranslation(
            DigitalBurnbagStrings.Api_Error_JouleNotEnabled,
          ),
          error: getDigitalBurnbagTranslation(
            DigitalBurnbagStrings.Api_Http_NotFound,
          ),
        } as unknown as BurnbagResponse,
      };
    }
    const requesterId = this.safeParseId(req.user?.id as string);
    if (!requesterId) {
      return {
        statusCode: 401,
        response: {
          message: getDigitalBurnbagTranslation(
            DigitalBurnbagStrings.Api_Error_AuthMissing,
          ),
          error: getDigitalBurnbagTranslation(
            DigitalBurnbagStrings.Api_Http_Unauthorized,
          ),
        } as unknown as BurnbagResponse,
      };
    }
    const sessionId = this.safeParseId(req.params.sessionId as string);
    if (!sessionId) {
      return {
        statusCode: 400,
        response: {
          message: getDigitalBurnbagTranslation(
            DigitalBurnbagStrings.Api_Error_InvalidSessionId,
          ),
          error: getDigitalBurnbagTranslation(
            DigitalBurnbagStrings.Api_Http_BadRequest,
          ),
        } as unknown as BurnbagResponse,
      };
    }
    try {
      await this.deps.uploadService.discard(sessionId, sid(requesterId) ?? '');
    } catch (err) {
      const code = (err as { code?: string }).code;
      // Idempotent: if session already gone, still return 204
      if (code !== 'SESSION_NOT_FOUND' && code !== 'NOT_FOUND') {
        throw err;
      }
    }
    return {
      statusCode: 204,
      response: null as unknown as BurnbagResponse,
    };
  }
}
