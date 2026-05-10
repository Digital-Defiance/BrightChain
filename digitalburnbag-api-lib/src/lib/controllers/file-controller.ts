import type { IFileService } from '@brightchain/digitalburnbag-lib';
import {
  DigitalBurnbagStrings,
  getDigitalBurnbagTranslation,
  PermissionDeniedError,
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

import type { Request as ExpressRequest, RequestHandler } from 'express';

type BurnbagResponse = IApiMessageResponse | ApiErrorResponse;

/** Convert a TID to a hex string for JSON-safe responses. */
function sid<TID extends PlatformID>(value: TID | undefined): string | null {
  if (value === undefined || value === null) return null;
  if (value instanceof Uint8Array || Buffer.isBuffer(value)) {
    return Buffer.from(value).toString('hex');
  }
  return String(value);
}

export interface IFileControllerDeps<TID extends PlatformID> {
  fileService: IFileService<TID>;
  parseId: (idString: string) => TID;
  /** Optional WCAP signing middleware — applied to file-serving routes */
  wcapMiddleware?: RequestHandler;
}

interface IFileHandlers extends TypedHandlers {
  searchFiles: ApiRequestHandler<BurnbagResponse>;
  getFileMetadata: ApiRequestHandler<BurnbagResponse>;
  getVersionHistory: ApiRequestHandler<BurnbagResponse>;
  restoreVersion: ApiRequestHandler<BurnbagResponse>;
  downloadVersion: ApiRequestHandler<BurnbagResponse>;
  getNonAccessProof: ApiRequestHandler<BurnbagResponse>;
  previewFile: ApiRequestHandler<BurnbagResponse>;
  downloadFile: ApiRequestHandler<BurnbagResponse>;
  downloadEncryptedFile: ApiRequestHandler<BurnbagResponse>;
  updateMetadata: ApiRequestHandler<BurnbagResponse>;
  deleteFile: ApiRequestHandler<BurnbagResponse>;
  restoreFile: ApiRequestHandler<BurnbagResponse>;
}

export class FileController<
  TID extends NodePlatformID = NodePlatformID,
> extends BaseController<
  BurnbagResponse,
  IFileHandlers,
  CoreLanguageCode,
  TID,
  IApplication<TID>
> {
  private readonly deps: IFileControllerDeps<TID>;

  constructor(application: IApplication<TID>, deps: IFileControllerDeps<TID>) {
    // NOTE: super() calls initRouteDefinitions() before this.deps is assigned.
    // The lazy wcapMiddleware wrapper in initRouteDefinitions() reads this.deps
    // at request time (not at construction time), so it works correctly.
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
    // NOTE: this.deps is not yet assigned when initRouteDefinitions() is called
    // from BaseController's constructor. We use a lazy wrapper that reads
    // this.deps at request time so wcapMiddleware is applied correctly.
    const lazyWcapMiddleware: RequestHandler = (req, res, next) => {
      const mw = this.deps?.wcapMiddleware;
      if (mw) {
        mw(req, res, next);
      } else {
        next();
      }
    };
    const wcapMiddleware = [lazyWcapMiddleware];

    const downloadVersionRoute = routeConfig(
      'get',
      '/:id/versions/:versionId/download',
      {
        handlerKey: 'downloadVersion',
        ...auth,
      },
    );
    downloadVersionRoute.middleware = wcapMiddleware;

    const previewFileRoute = routeConfig('get', '/:id/preview', {
      handlerKey: 'previewFile',
      ...auth,
    });
    previewFileRoute.middleware = wcapMiddleware;

    const downloadEncryptedFileRoute = routeConfig('get', '/:id/encrypted', {
      handlerKey: 'downloadEncryptedFile',
      ...auth,
    });
    downloadEncryptedFileRoute.middleware = wcapMiddleware;

    const downloadFileRoute = routeConfig('get', '/:id', {
      handlerKey: 'downloadFile',
      ...auth,
    });
    downloadFileRoute.middleware = wcapMiddleware;

    this.routeDefinitions = [
      routeConfig('get', '/search', { handlerKey: 'searchFiles', ...auth }),
      routeConfig('get', '/:id/metadata', {
        handlerKey: 'getFileMetadata',
        ...auth,
      }),
      routeConfig('get', '/:id/versions', {
        handlerKey: 'getVersionHistory',
        ...auth,
      }),
      routeConfig('post', '/:id/versions/:versionId/restore', {
        handlerKey: 'restoreVersion',
        ...auth,
      }),
      downloadVersionRoute,
      routeConfig('get', '/:id/non-access-proof', {
        handlerKey: 'getNonAccessProof',
        ...auth,
      }),
      previewFileRoute,
      downloadEncryptedFileRoute,
      downloadFileRoute,
      routeConfig('patch', '/:id', { handlerKey: 'updateMetadata', ...auth }),
      routeConfig('delete', '/:id', { handlerKey: 'deleteFile', ...auth }),
      routeConfig('post', '/:id/restore', {
        handlerKey: 'restoreFile',
        ...auth,
      }),
    ];
    this.handlers = {
      searchFiles: this.handleSearchFiles.bind(this),
      getFileMetadata: this.handleGetFileMetadata.bind(this),
      getVersionHistory: this.handleGetVersionHistory.bind(this),
      restoreVersion: this.handleRestoreVersion.bind(this),
      downloadVersion: this.handleDownloadVersion.bind(this),
      getNonAccessProof: this.handleGetNonAccessProof.bind(this),
      previewFile: this.handlePreviewFile.bind(this),
      downloadFile: this.handleDownloadFile.bind(this),
      downloadEncryptedFile: this.handleDownloadEncryptedFile.bind(this),
      updateMetadata: this.handleUpdateMetadata.bind(this),
      deleteFile: this.handleDeleteFile.bind(this),
      restoreFile: this.handleRestoreFile.bind(this),
    };
  }

  private async handleSearchFiles(
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
      query,
      tags,
      mimeType,
      folderId,
      dateFrom,
      dateTo,
      sizeMin,
      sizeMax,
      fileType,
      deleted,
    } = req.query;
    const results = await this.deps.fileService.search(
      {
        query: query as string | undefined,
        tags: tags
          ? Array.isArray(tags)
            ? (tags as string[])
            : [tags as string]
          : undefined,
        mimeType: mimeType as string | undefined,
        folderId: folderId as unknown as TID | undefined,
        dateFrom: dateFrom as string | undefined,
        dateTo: dateTo as string | undefined,
        sizeMin: sizeMin ? Number(sizeMin) : undefined,
        sizeMax: sizeMax ? Number(sizeMax) : undefined,
        fileType: fileType as string | undefined,
        deleted: deleted === 'true',
      },
      requesterId,
    );
    // Serialize TID fields and add frontend-friendly aliases
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const serialized = (results as any).results
      ? {
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          ...(results as any),
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          results: (results as any).results.map((f: any) => ({
            ...f,
            id: sid(f.id),
            name: f.fileName,
            ownerId: sid(f.ownerId),
            folderId: sid(f.folderId),
            currentVersionId: sid(f.currentVersionId),
            modifiedAt: f.updatedAt,
          })),
        }
      : results;
    return {
      statusCode: 200,
      response: serialized as unknown as IApiMessageResponse,
    };
  }

  private async handleGetFileMetadata(
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
    const fileId = this.safeParseId(req.params.id as string);
    if (!fileId)
      return {
        statusCode: 400,
        response: {
          message: getDigitalBurnbagTranslation(
            DigitalBurnbagStrings.Api_Error_InvalidFileId,
          ),
          error: getDigitalBurnbagTranslation(
            DigitalBurnbagStrings.Api_Http_BadRequest,
          ),
        } as unknown as BurnbagResponse,
      };
    const metadata = await this.deps.fileService.getFileMetadata(
      fileId,
      requesterId,
    );
    return {
      statusCode: 200,
      response: {
        ...metadata,
        id: sid(metadata.id),
        name: metadata.fileName,
        ownerId: sid(metadata.ownerId),
        folderId: sid(metadata.folderId),
        currentVersionId: sid(metadata.currentVersionId),
        createdBy: sid(metadata.createdBy as unknown as TID),
        updatedBy: sid(metadata.updatedBy as unknown as TID),
        modifiedAt: metadata.updatedAt,
        vaultCreationLedgerEntryHash: metadata.vaultCreationLedgerEntryHash
          ? Buffer.from(metadata.vaultCreationLedgerEntryHash).toString('hex')
          : null,
        aclId: metadata.aclId ? sid(metadata.aclId) : undefined,
      } as unknown as IApiMessageResponse,
    };
  }

  private async handleGetVersionHistory(
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
    const fileId = this.safeParseId(req.params.id as string);
    if (!fileId)
      return {
        statusCode: 400,
        response: {
          message: getDigitalBurnbagTranslation(
            DigitalBurnbagStrings.Api_Error_InvalidFileId,
          ),
          error: getDigitalBurnbagTranslation(
            DigitalBurnbagStrings.Api_Http_BadRequest,
          ),
        } as unknown as BurnbagResponse,
      };
    const versions = await this.deps.fileService.getVersionHistory(
      fileId,
      requesterId,
    );
    return {
      statusCode: 200,
      response: versions as unknown as IApiMessageResponse,
    };
  }

  private async handleRestoreVersion(
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
    const fileId = this.safeParseId(req.params.id as string);
    if (!fileId)
      return {
        statusCode: 400,
        response: {
          message: getDigitalBurnbagTranslation(
            DigitalBurnbagStrings.Api_Error_InvalidFileId,
          ),
          error: getDigitalBurnbagTranslation(
            DigitalBurnbagStrings.Api_Http_BadRequest,
          ),
        } as unknown as BurnbagResponse,
      };
    const versionId = this.safeParseId(req.params.versionId as string);
    if (!versionId)
      return {
        statusCode: 400,
        response: {
          message: getDigitalBurnbagTranslation(
            DigitalBurnbagStrings.Api_Error_InvalidVersionId,
          ),
          error: getDigitalBurnbagTranslation(
            DigitalBurnbagStrings.Api_Http_BadRequest,
          ),
        } as unknown as BurnbagResponse,
      };
    const metadata = await this.deps.fileService.restoreVersion(
      fileId,
      versionId,
      requesterId,
    );
    return {
      statusCode: 200,
      response: metadata as unknown as IApiMessageResponse,
    };
  }

  private async handleDownloadVersion(
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
    const fileId = this.safeParseId(req.params.id as string);
    if (!fileId)
      return {
        statusCode: 400,
        response: {
          message: getDigitalBurnbagTranslation(
            DigitalBurnbagStrings.Api_Error_InvalidFileId,
          ),
          error: getDigitalBurnbagTranslation(
            DigitalBurnbagStrings.Api_Http_BadRequest,
          ),
        } as unknown as BurnbagResponse,
      };
    const stream = await this.deps.fileService.getFileContent(
      fileId,
      requesterId,
      { ipAddress: req.ip ?? '0.0.0.0', timestamp: new Date() },
    );
    const chunks: Uint8Array[] = [];
    const reader = stream.getReader();
    for (;;) {
      const { done, value } = await reader.read();
      if (done) break;
      chunks.push(value);
    }
    const buf = Buffer.concat(chunks);
    this.res.setHeader('Content-Type', 'application/octet-stream');
    this.res.setHeader('Content-Length', buf.length.toString());
    this.res.status(200).end(buf);
    return {
      statusCode: 200,
      response: {} as IApiMessageResponse,
      headers: {},
    };
  }

  private async handleGetNonAccessProof(
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
    const fileId = this.safeParseId(req.params.id as string);
    if (!fileId)
      return {
        statusCode: 400,
        response: {
          message: getDigitalBurnbagTranslation(
            DigitalBurnbagStrings.Api_Error_InvalidFileId,
          ),
          error: getDigitalBurnbagTranslation(
            DigitalBurnbagStrings.Api_Http_BadRequest,
          ),
        } as unknown as BurnbagResponse,
      };
    const proof = await this.deps.fileService.getNonAccessProof(
      fileId,
      requesterId,
    );
    return {
      statusCode: 200,
      response: proof as unknown as IApiMessageResponse,
    };
  }

  private async handlePreviewFile(
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
    const fileId = this.safeParseId(req.params.id as string);
    if (!fileId)
      return {
        statusCode: 400,
        response: {
          message: getDigitalBurnbagTranslation(
            DigitalBurnbagStrings.Api_Error_InvalidFileId,
          ),
          error: getDigitalBurnbagTranslation(
            DigitalBurnbagStrings.Api_Http_BadRequest,
          ),
        } as unknown as BurnbagResponse,
      };

    // Get metadata for MIME type, then stream content
    const metadata = await this.deps.fileService.getFileMetadata(
      fileId,
      requesterId,
    );
    const stream = await this.deps.fileService.getFileContent(
      fileId,
      requesterId,
      { ipAddress: req.ip ?? '0.0.0.0', timestamp: new Date() },
    );
    const chunks: Uint8Array[] = [];
    const reader = stream.getReader();
    for (;;) {
      const { done, value } = await reader.read();
      if (done) break;
      chunks.push(value);
    }
    const buf = Buffer.concat(chunks);
    const mimeType = metadata.mimeType || 'application/octet-stream';
    this.res.setHeader('Content-Type', mimeType);
    this.res.setHeader('Content-Length', buf.length.toString());
    this.res.setHeader(
      'Content-Disposition',
      `inline; filename="${encodeURIComponent(metadata.fileName)}"`,
    );
    this.res.status(200).end(buf);
    return {
      statusCode: 200,
      response: {} as IApiMessageResponse,
    };
  }

  private async handleDownloadFile(
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
    const fileId = this.safeParseId(req.params.id as string);
    if (!fileId)
      return {
        statusCode: 400,
        response: {
          message: getDigitalBurnbagTranslation(
            DigitalBurnbagStrings.Api_Error_InvalidFileId,
          ),
          error: getDigitalBurnbagTranslation(
            DigitalBurnbagStrings.Api_Http_BadRequest,
          ),
        } as unknown as BurnbagResponse,
      };

    const metadata = await this.deps.fileService.getFileMetadata(
      fileId,
      requesterId,
    );
    const stream = await this.deps.fileService.getFileContent(
      fileId,
      requesterId,
      { ipAddress: req.ip ?? '0.0.0.0', timestamp: new Date() },
    );
    const chunks: Uint8Array[] = [];
    const reader = stream.getReader();
    for (;;) {
      const { done, value } = await reader.read();
      if (done) break;
      chunks.push(value);
    }
    const buf = Buffer.concat(chunks);
    const mimeType = metadata.mimeType || 'application/octet-stream';
    this.res.setHeader('Content-Type', mimeType);
    this.res.setHeader('Content-Length', buf.length.toString());
    this.res.setHeader(
      'Content-Disposition',
      `attachment; filename="${encodeURIComponent(metadata.fileName)}"`,
    );
    this.res.status(200).end(buf);
    return {
      statusCode: 200,
      response: {} as IApiMessageResponse,
    };
  }

  private async handleDownloadEncryptedFile(
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
    const fileId = this.safeParseId(req.params.id as string);
    if (!fileId)
      return {
        statusCode: 400,
        response: {
          message: getDigitalBurnbagTranslation(
            DigitalBurnbagStrings.Api_Error_InvalidFileId,
          ),
          error: getDigitalBurnbagTranslation(
            DigitalBurnbagStrings.Api_Http_BadRequest,
          ),
        } as unknown as BurnbagResponse,
      };

    let metadata: Awaited<
      ReturnType<typeof this.deps.fileService.getFileMetadata>
    >;
    let encrypted: Awaited<
      ReturnType<typeof this.deps.fileService.getEncryptedFileContent>
    >;
    try {
      [metadata, encrypted] = await Promise.all([
        this.deps.fileService.getFileMetadata(fileId, requesterId),
        this.deps.fileService.getEncryptedFileContent(fileId, requesterId, {
          ipAddress: req.ip ?? '0.0.0.0',
          timestamp: new Date(),
        }),
      ]);
    } catch (err) {
      if (err instanceof PermissionDeniedError) {
        return {
          statusCode: 403,
          response: {
            message: err.message,
            error: getDigitalBurnbagTranslation(
              DigitalBurnbagStrings.Api_Http_Forbidden,
            ),
          } as unknown as BurnbagResponse,
        };
      }
      throw err;
    }

    const payload = {
      fileName: metadata.fileName,
      mimeType: metadata.mimeType ?? 'application/octet-stream',
      encryptedContent: Buffer.from(encrypted.encryptedContent).toString(
        'base64',
      ),
      iv: Buffer.from(encrypted.iv).toString('base64'),
      authTag: Buffer.from(encrypted.authTag).toString('base64'),
      encryptedSymmetricKey: Buffer.from(
        encrypted.encryptedSymmetricKey,
      ).toString('base64'),
    };

    return {
      statusCode: 200,
      response: payload as unknown as BurnbagResponse,
    };
  }

  private async handleUpdateMetadata(
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
    const fileId = this.safeParseId(req.params.id as string);
    if (!fileId)
      return {
        statusCode: 400,
        response: {
          message: getDigitalBurnbagTranslation(
            DigitalBurnbagStrings.Api_Error_InvalidFileId,
          ),
          error: getDigitalBurnbagTranslation(
            DigitalBurnbagStrings.Api_Http_BadRequest,
          ),
        } as unknown as BurnbagResponse,
      };
    const metadata = await this.deps.fileService.updateFileMetadata(
      fileId,
      req.body,
      requesterId,
    );
    return {
      statusCode: 200,
      response: metadata as unknown as IApiMessageResponse,
    };
  }

  private async handleDeleteFile(
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
    const fileId = this.safeParseId(req.params.id as string);
    if (!fileId)
      return {
        statusCode: 400,
        response: {
          message: getDigitalBurnbagTranslation(
            DigitalBurnbagStrings.Api_Error_InvalidFileId,
          ),
          error: getDigitalBurnbagTranslation(
            DigitalBurnbagStrings.Api_Http_BadRequest,
          ),
        } as unknown as BurnbagResponse,
      };
    await this.deps.fileService.softDelete(fileId, requesterId);
    return { statusCode: 204, response: {} as IApiMessageResponse };
  }

  private async handleRestoreFile(
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
    const fileId = this.safeParseId(req.params.id as string);
    if (!fileId)
      return {
        statusCode: 400,
        response: {
          message: getDigitalBurnbagTranslation(
            DigitalBurnbagStrings.Api_Error_InvalidFileId,
          ),
          error: getDigitalBurnbagTranslation(
            DigitalBurnbagStrings.Api_Http_BadRequest,
          ),
        } as unknown as BurnbagResponse,
      };
    await this.deps.fileService.restoreFromTrash(fileId, requesterId);
    return {
      statusCode: 200,
      response: { restored: true } as unknown as IApiMessageResponse,
    };
  }
}
