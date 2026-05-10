import type {
  IFolderExportOptions,
  IFolderExportService,
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
import { ForbiddenError, NotFoundError } from '../errors';

/** Convert a TID to a hex string for JSON-safe responses. */
function sid<TID extends PlatformID>(value: TID | undefined): string | null {
  if (value === undefined || value === null) return null;
  if (value instanceof Uint8Array || Buffer.isBuffer(value)) {
    return Buffer.from(value).toString('hex');
  }
  return String(value);
}

/** Serialize a folder export result so TID fields become hex strings. */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
function serializeExportResult<TID extends PlatformID>(result: any) {
  return {
    ...result,
    skippedFiles: Array.isArray(result.skippedFiles)
      ? // eslint-disable-next-line @typescript-eslint/no-explicit-any
        result.skippedFiles.map((sf: any) => ({
          ...sf,
          fileId: sf.fileId ? sid<TID>(sf.fileId) : null,
        }))
      : [],
  };
}

type BurnbagResponse = IApiMessageResponse | ApiErrorResponse;

export interface IFolderExportControllerDeps<TID extends PlatformID> {
  folderExportService: IFolderExportService<TID>;
  checkPermissionFlag: (
    targetId: TID,
    targetType: 'file' | 'folder',
    principalId: TID,
    requiredFlag: string,
    context?: unknown,
  ) => Promise<boolean>;
  folderExists: (folderId: TID) => Promise<boolean>;
  parseId: (idString: string) => TID;
  parseSafeId?: (idString: string) => TID | undefined;
}

interface IFolderExportHandlers extends TypedHandlers {
  exportToTCBL: ApiRequestHandler<BurnbagResponse>;
}

export class FolderExportController<
  TID extends NodePlatformID = NodePlatformID,
> extends BaseController<
  BurnbagResponse,
  IFolderExportHandlers,
  CoreLanguageCode,
  TID,
  IApplication<TID>
> {
  private readonly deps: IFolderExportControllerDeps<TID>;

  constructor(
    application: IApplication<TID>,
    deps: IFolderExportControllerDeps<TID>,
  ) {
    super(application);
    this.deps = deps;
  }

  private safeParseId(idString: string | undefined): TID | undefined {
    if (!idString) return undefined;
    if (this.deps.parseSafeId) return this.deps.parseSafeId(idString);
    try {
      return this.deps.parseId(idString);
    } catch {
      return undefined;
    }
  }

  protected initRouteDefinitions(): void {
    const auth = { useAuthentication: true, useCryptoAuthentication: false };
    this.routeDefinitions = [
      routeConfig('post', '/:id/export-tcbl', {
        handlerKey: 'exportToTCBL',
        ...auth,
      }),
    ];
    this.handlers = {
      exportToTCBL: this.handleExportToTCBL.bind(this),
    };
  }

  private async handleExportToTCBL(
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
    const folderId = this.safeParseId(req.params.id as string);
    if (!folderId)
      return {
        statusCode: 400,
        response: {
          message: getDigitalBurnbagTranslation(
            DigitalBurnbagStrings.Api_Error_InvalidFolderId,
          ),
          error: getDigitalBurnbagTranslation(
            DigitalBurnbagStrings.Api_Http_BadRequest,
          ),
        } as unknown as BurnbagResponse,
      };

    const exists = await this.deps.folderExists(folderId);
    if (!exists) {
      throw new NotFoundError('Folder', req.params.id as string);
    }

    const hasPermission = await this.deps.checkPermissionFlag(
      folderId,
      'folder',
      requesterId,
      'Read',
    );
    if (!hasPermission) {
      throw new ForbiddenError(
        'You do not have permission to export this folder',
      );
    }

    const options: IFolderExportOptions | undefined = req.body
      ? {
          ...(req.body.mimeTypeFilters && {
            mimeTypeFilters: req.body.mimeTypeFilters,
          }),
          ...(req.body.maxDepth !== undefined && {
            maxDepth: req.body.maxDepth,
          }),
          ...(req.body.excludePatterns && {
            excludePatterns: req.body.excludePatterns,
          }),
        }
      : undefined;

    try {
      const result = await this.deps.folderExportService.exportFolderToTCBL(
        folderId,
        requesterId,
        options,
      );
      return {
        statusCode: 200,
        response: serializeExportResult(
          result,
        ) as unknown as IApiMessageResponse,
      };
    } catch (err: unknown) {
      if (err instanceof Error && err.message.includes('no exportable files')) {
        return {
          statusCode: 422,
          response: { error: err.message } as unknown as ApiErrorResponse,
        };
      }
      throw err;
    }
  }
}
