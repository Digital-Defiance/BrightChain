import type {
  IFileMetadataBase,
  IFolderMetadataBase,
  IFolderService,
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

type BurnbagResponse = IApiMessageResponse | ApiErrorResponse;
function sid<TID extends PlatformID>(value: TID | undefined): string | null {
  if (value === undefined || value === null) return null;
  if (value instanceof Uint8Array || Buffer.isBuffer(value)) {
    return Buffer.from(value).toString('hex');
  }
  return String(value);
}

/** Convert a folder metadata object to a JSON-safe DTO with string IDs. */
function serializeFolder<TID extends PlatformID>(f: IFolderMetadataBase<TID>) {
  return {
    id: sid(f.id),
    name: f.name,
    ownerId: sid(f.ownerId),
    parentFolderId: f.parentFolderId ? sid(f.parentFolderId) : null,
    approvalGoverned: f.approvalGoverned,
    createdAt: f.createdAt,
    updatedAt: f.updatedAt,
  };
}

/** Convert a file metadata object to a JSON-safe DTO with string IDs. */
function serializeFile<TID extends PlatformID>(f: IFileMetadataBase<TID>) {
  return {
    id: sid(f.id),
    name: f.fileName,
    ownerId: sid(f.ownerId),
    folderId: sid(f.folderId),
    fileName: f.fileName,
    mimeType: f.mimeType,
    sizeBytes: f.sizeBytes,
    description: f.description,
    tags: f.tags,
    currentVersionId: sid(f.currentVersionId),
    deletedAt: f.deletedAt ?? null,
    scheduledDestructionAt: f.scheduledDestructionAt ?? null,
    approvalGoverned: f.approvalGoverned,
    visibleWatermark: f.visibleWatermark,
    invisibleWatermark: f.invisibleWatermark,
    createdAt: f.createdAt,
    updatedAt: f.updatedAt,
    modifiedAt: f.updatedAt,
  };
}

export interface IFolderControllerDeps<TID extends PlatformID> {
  folderService: IFolderService<TID>;
  parseId: (idString: string) => TID;
  parseSafeId?: (idString: string) => TID | undefined;
}

interface IFolderHandlers extends TypedHandlers {
  createFolder: ApiRequestHandler<BurnbagResponse>;
  getRootFolder: ApiRequestHandler<BurnbagResponse>;
  getFolderPath: ApiRequestHandler<BurnbagResponse>;
  resolvePath: ApiRequestHandler<BurnbagResponse>;
  moveItem: ApiRequestHandler<BurnbagResponse>;
  getFolderContents: ApiRequestHandler<BurnbagResponse>;
  deleteFolder: ApiRequestHandler<BurnbagResponse>;
}

export class FolderController<
  TID extends NodePlatformID = NodePlatformID,
> extends BaseController<
  BurnbagResponse,
  IFolderHandlers,
  CoreLanguageCode,
  TID,
  IApplication<TID>
> {
  private readonly deps: IFolderControllerDeps<TID>;

  constructor(
    application: IApplication<TID>,
    deps: IFolderControllerDeps<TID>,
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
    this.routeDefinitions = [
      routeConfig('post', '/', {
        handlerKey: 'createFolder',
        useAuthentication: true,
        useCryptoAuthentication: false,
      }),
      routeConfig('get', '/root', {
        handlerKey: 'getRootFolder',
        useAuthentication: true,
        useCryptoAuthentication: false,
      }),
      routeConfig('get', '/:id/path', {
        handlerKey: 'getFolderPath',
        useAuthentication: true,
        useCryptoAuthentication: false,
      }),
      routeConfig('get', '/resolve/{*path}', {
        handlerKey: 'resolvePath',
        useAuthentication: true,
        useCryptoAuthentication: false,
      }),
      routeConfig('post', '/:id/move', {
        handlerKey: 'moveItem',
        useAuthentication: true,
        useCryptoAuthentication: false,
      }),
      routeConfig('get', '/:id', {
        handlerKey: 'getFolderContents',
        useAuthentication: true,
        useCryptoAuthentication: false,
      }),
      routeConfig('delete', '/:id', {
        handlerKey: 'deleteFolder',
        useAuthentication: true,
        useCryptoAuthentication: false,
      }),
    ];
    this.handlers = {
      createFolder: this.handleCreateFolder.bind(this),
      getRootFolder: this.handleGetRootFolder.bind(this),
      getFolderPath: this.handleGetFolderPath.bind(this),
      resolvePath: this.handleResolvePath.bind(this),
      moveItem: this.handleMoveItem.bind(this),
      getFolderContents: this.handleGetFolderContents.bind(this),
      deleteFolder: this.handleDeleteFolder.bind(this),
    };
  }

  private async handleCreateFolder(
    req: ExpressRequest,
  ): Promise<IStatusCodeResponse<BurnbagResponse>> {
    const memberIdStr = req.user?.id;
    const requesterId = this.safeParseId(memberIdStr);
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
        },
      };
    const { name, parentFolderId, vaultContainerId } = req.body;
    if (!parentFolderId)
      return {
        statusCode: 400,
        response: {
          message: getDigitalBurnbagTranslation(
            DigitalBurnbagStrings.Api_Error_ParentFolderIdRequired,
          ),
          error: getDigitalBurnbagTranslation(
            DigitalBurnbagStrings.Api_Http_BadRequest,
          ),
        },
      };
    if (!vaultContainerId)
      return {
        statusCode: 400,
        response: {
          message: getDigitalBurnbagTranslation(
            DigitalBurnbagStrings.Api_Error_VaultContainerIdRequired,
          ),
          error: getDigitalBurnbagTranslation(
            DigitalBurnbagStrings.Api_Http_BadRequest,
          ),
        },
      };
    const parsedParentId = this.safeParseId(parentFolderId);
    if (!parsedParentId)
      return {
        statusCode: 400,
        response: {
          message: getDigitalBurnbagTranslation(
            DigitalBurnbagStrings.Api_Error_InvalidParentFolderIdFormat,
          ),
          error: getDigitalBurnbagTranslation(
            DigitalBurnbagStrings.Api_Http_BadRequest,
          ),
        },
      };
    const parsedVaultContainerId = this.safeParseId(vaultContainerId);
    if (!parsedVaultContainerId)
      return {
        statusCode: 400,
        response: {
          message: getDigitalBurnbagTranslation(
            DigitalBurnbagStrings.Api_Error_InvalidVaultContainerIdFormat,
          ),
          error: getDigitalBurnbagTranslation(
            DigitalBurnbagStrings.Api_Http_BadRequest,
          ),
        },
      };
    const folder = await this.deps.folderService.createFolder({
      name,
      vaultContainerId: parsedVaultContainerId,
      parentFolderId: parsedParentId,
      ownerId: requesterId,
    });
    return {
      statusCode: 201,
      response: serializeFolder(folder) as unknown as IApiMessageResponse,
    };
  }

  private async handleGetRootFolder(
    req: ExpressRequest,
  ): Promise<IStatusCodeResponse<BurnbagResponse>> {
    const memberIdStr = req.user?.id;
    const requesterId = this.safeParseId(memberIdStr);
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
        },
      };
    const vaultContainerIdStr = req.query.vaultContainerId as
      | string
      | undefined;
    const vaultContainerId = vaultContainerIdStr
      ? this.safeParseId(vaultContainerIdStr)
      : undefined;
    if (vaultContainerIdStr && !vaultContainerId)
      return {
        statusCode: 400,
        response: {
          message: getDigitalBurnbagTranslation(
            DigitalBurnbagStrings.Api_Error_InvalidVaultContainerIdFormat,
          ),
          error: getDigitalBurnbagTranslation(
            DigitalBurnbagStrings.Api_Http_BadRequest,
          ),
        },
      };
    const rootFolder = await this.deps.folderService.getRootFolder(
      requesterId,
      vaultContainerId,
    );
    const contents = await this.deps.folderService.getFolderContents(
      rootFolder.id,
      requesterId,
    );
    return {
      statusCode: 200,
      response: {
        folder: serializeFolder(rootFolder),
        files: contents.files.map(serializeFile),
        subfolders: contents.folders.map(serializeFolder),
      } as unknown as IApiMessageResponse,
    };
  }

  private async handleGetFolderPath(
    req: ExpressRequest,
  ): Promise<IStatusCodeResponse<BurnbagResponse>> {
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
        },
      };
    const path = await this.deps.folderService.getFolderPath(folderId);
    return {
      statusCode: 200,
      response: path.map((p) => ({
        id: sid(p.id),
        name: p.name,
      })) as unknown as IApiMessageResponse,
    };
  }

  private async handleResolvePath(
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
        },
      };

    // Named wildcard param from path-to-regexp v8: /resolve/{*path}
    // The param value is an array of decoded segments (not a string).
    const rawPath = (req.params as Record<string, unknown>).path;
    const segments: string[] = Array.isArray(rawPath)
      ? rawPath.filter((s: string) => s.length > 0)
      : typeof rawPath === 'string'
        ? rawPath.split('/').filter((s) => s.length > 0)
        : [];

    try {
      const vaultContainerIdStr = req.query.vaultContainerId as
        | string
        | undefined;
      const vaultContainerId = vaultContainerIdStr
        ? this.safeParseId(vaultContainerIdStr)
        : undefined;
      const result = await this.deps.folderService.resolvePath(
        requesterId,
        segments,
        vaultContainerId,
      );
      console.debug(
        '[FolderController] resolvePath: segments=%j folders=%d file=%s',
        segments,
        result.folders.length,
        result.file ? 'yes' : 'no',
      );
      return {
        statusCode: 200,
        response: {
          folders: result.folders.map(serializeFolder),
          file: result.file ? serializeFile(result.file) : null,
        } as unknown as IApiMessageResponse,
      };
    } catch (err) {
      console.debug(
        '[FolderController] resolvePath FAILED: segments=%j error=%s',
        segments,
        err instanceof Error ? err.message : String(err),
      );
      return {
        statusCode: 404,
        response: {
          message: getDigitalBurnbagTranslation(
            DigitalBurnbagStrings.Api_Error_PathNotFound,
          ),
          error: getDigitalBurnbagTranslation(
            DigitalBurnbagStrings.Api_Http_NotFound,
          ),
        } as unknown as BurnbagResponse,
      };
    }
  }

  private async handleMoveItem(
    req: ExpressRequest,
  ): Promise<IStatusCodeResponse<BurnbagResponse>> {
    const memberIdStr = req.user?.id;
    const requesterId = this.safeParseId(memberIdStr);
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
        },
      };
    const itemId = this.safeParseId(req.params.id as string);
    if (!itemId)
      return {
        statusCode: 400,
        response: {
          message: getDigitalBurnbagTranslation(
            DigitalBurnbagStrings.Api_Error_InvalidItemId,
          ),
          error: getDigitalBurnbagTranslation(
            DigitalBurnbagStrings.Api_Http_BadRequest,
          ),
        },
      };
    const { itemType, newParentId } = req.body;
    if (!newParentId)
      return {
        statusCode: 400,
        response: {
          message: getDigitalBurnbagTranslation(
            DigitalBurnbagStrings.Api_Error_NewParentIdRequired,
          ),
          error: getDigitalBurnbagTranslation(
            DigitalBurnbagStrings.Api_Http_BadRequest,
          ),
        },
      };
    const parsedNewParentId = this.safeParseId(newParentId);
    if (!parsedNewParentId)
      return {
        statusCode: 400,
        response: {
          message: getDigitalBurnbagTranslation(
            DigitalBurnbagStrings.Api_Error_InvalidNewParentIdFormat,
          ),
          error: getDigitalBurnbagTranslation(
            DigitalBurnbagStrings.Api_Http_BadRequest,
          ),
        },
      };
    await this.deps.folderService.move(
      itemId,
      itemType,
      parsedNewParentId,
      requesterId,
    );
    return {
      statusCode: 200,
      response: { moved: true } as unknown as IApiMessageResponse,
    };
  }

  private async handleGetFolderContents(
    req: ExpressRequest,
  ): Promise<IStatusCodeResponse<BurnbagResponse>> {
    const memberIdStr = req.user?.id;
    const requesterId = this.safeParseId(memberIdStr);
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
        },
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
        },
      };
    const { sortField, sortDirection } = req.query;
    const sort = sortField
      ? {
          field: sortField as 'name' | 'size' | 'modifiedDate' | 'type',
          direction: (sortDirection as 'asc' | 'desc') ?? 'asc',
        }
      : undefined;
    const contents = await this.deps.folderService.getFolderContents(
      folderId,
      requesterId,
      sort,
    );
    const folderPath = await this.deps.folderService.getFolderPath(folderId);
    const currentFolder = folderPath[folderPath.length - 1];
    return {
      statusCode: 200,
      response: {
        folder: serializeFolder(currentFolder),
        files: contents.files.map(serializeFile),
        subfolders: contents.folders.map(serializeFolder),
      } as unknown as IApiMessageResponse,
    };
  }

  private async handleDeleteFolder(
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
    await this.deps.folderService.softDeleteFolder(folderId, requesterId);
    return { statusCode: 204, response: {} as IApiMessageResponse };
  }
}
