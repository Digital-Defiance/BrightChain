import type {
  IDeletionService,
  IVaultContainerService,
} from '@brightchain/digitalburnbag-lib';
import {
  CertificateNotFoundError,
  DeletionAlreadyScheduledError,
  DigitalBurnbagStrings,
  DisownRequiresPublicVisibilityError,
  getDigitalBurnbagTranslation,
  InvalidStateTransitionError,
  VaultAlreadyDisownedError,
  VaultContainerDestroyedError,
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

export interface IVaultContainerControllerDeps<TID extends PlatformID> {
  vaultContainerService: IVaultContainerService<TID>;
  deletionService: IDeletionService<TID>;
  parseId: (idString: string) => TID;
  parseSafeId?: (idString: string) => TID | undefined;
}

interface IVaultContainerHandlers extends TypedHandlers {
  listContainers: ApiRequestHandler<BurnbagResponse>;
  listPublicContainers: ApiRequestHandler<BurnbagResponse>;
  createContainer: ApiRequestHandler<BurnbagResponse>;
  getContainer: ApiRequestHandler<BurnbagResponse>;
  lockContainer: ApiRequestHandler<BurnbagResponse>;
  sealContainer: ApiRequestHandler<BurnbagResponse>;
  destroyContainer: ApiRequestHandler<BurnbagResponse>;
  disownContainer: ApiRequestHandler<BurnbagResponse>;
  cancelDeletion: ApiRequestHandler<BurnbagResponse>;
  getCertificate: ApiRequestHandler<BurnbagResponse>;
}

export class VaultContainerController<
  TID extends NodePlatformID = NodePlatformID,
> extends BaseController<
  BurnbagResponse,
  IVaultContainerHandlers,
  CoreLanguageCode,
  TID,
  IApplication<TID>
> {
  private readonly deps: IVaultContainerControllerDeps<TID>;

  constructor(
    application: IApplication<TID>,
    deps: IVaultContainerControllerDeps<TID>,
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
    const noAuth = { useAuthentication: false, useCryptoAuthentication: false };
    this.routeDefinitions = [
      routeConfig('get', '/public', {
        handlerKey: 'listPublicContainers',
        ...noAuth,
      }),
      routeConfig('get', '/', { handlerKey: 'listContainers', ...auth }),
      routeConfig('post', '/', { handlerKey: 'createContainer', ...auth }),
      routeConfig('get', '/:id/certificate', {
        handlerKey: 'getCertificate',
        ...auth,
      }),
      routeConfig('get', '/:id', { handlerKey: 'getContainer', ...auth }),
      routeConfig('post', '/:id/lock', {
        handlerKey: 'lockContainer',
        ...auth,
      }),
      routeConfig('post', '/:id/seal', {
        handlerKey: 'sealContainer',
        ...auth,
      }),
      routeConfig('delete', '/:id', {
        handlerKey: 'destroyContainer',
        ...auth,
      }),
      routeConfig('post', '/:id/disown', {
        handlerKey: 'disownContainer',
        ...auth,
      }),
      routeConfig('post', '/:id/cancel-deletion', {
        handlerKey: 'cancelDeletion',
        ...auth,
      }),
    ];
    this.handlers = {
      listContainers: this.handleListContainers.bind(this),
      listPublicContainers: this.handleListPublicContainers.bind(this),
      createContainer: this.handleCreateContainer.bind(this),
      getContainer: this.handleGetContainer.bind(this),
      lockContainer: this.handleLockContainer.bind(this),
      sealContainer: this.handleSealContainer.bind(this),
      destroyContainer: this.handleDestroyContainer.bind(this),
      disownContainer: this.handleDisownContainer.bind(this),
      cancelDeletion: this.handleCancelDeletion.bind(this),
      getCertificate: this.handleGetCertificate.bind(this),
    };
  }

  private async handleListContainers(
    req: ExpressRequest,
  ): Promise<IStatusCodeResponse<BurnbagResponse>> {
    const requesterId = this.safeParseId(req.user?.id as string);
    if (!requesterId)
      return {
        statusCode: 401,
        response: {
          message: getDigitalBurnbagTranslation(
            DigitalBurnbagStrings.Api_Http_Unauthorized,
          ),
          error: getDigitalBurnbagTranslation(
            DigitalBurnbagStrings.Api_Http_Unauthorized,
          ),
        },
      };
    const summaries =
      await this.deps.vaultContainerService.listContainers(requesterId);
    return {
      statusCode: 200,
      response: summaries.map((s) => ({
        id: String(s.container.id),
        name: s.container.name,
        description: s.container.description ?? null,
        state: s.container.state,
        visibility: s.container.visibility ?? 'private',
        sealedAt: s.container.sealedAt ?? null,
        sealHash: s.container.sealHash ?? null,
        fileCount: s.fileCount,
        folderCount: s.folderCount,
        sealStatus: {
          allPristine: s.sealStatus.allPristine,
          sealedCount: s.sealStatus.sealedCount,
          accessedCount: s.sealStatus.accessedCount,
          totalFiles: s.sealStatus.totalFiles,
        },
        usedBytes: s.container.usedBytes,
        quotaBytes: s.container.quotaBytes ?? null,
        createdAt: s.container.createdAt,
      })) as unknown as IApiMessageResponse,
    };
  }

  /**
   * GET /vaults/public?search=&sortBy=name|createdAt|fileCount&sortDir=asc|desc&limit=20&offset=0
   *
   * No authentication required. Returns paginated public vaults with
   * total count for cursor-based pagination.
   */
  private async handleListPublicContainers(
    req: ExpressRequest,
  ): Promise<IStatusCodeResponse<BurnbagResponse>> {
    const q = req.query as Record<string, string | undefined>;

    const limit = Math.min(parseInt(q['limit'] ?? '20', 10) || 20, 100);
    const offset = Math.max(parseInt(q['offset'] ?? '0', 10) || 0, 0);
    const search = q['search']?.trim() || undefined;
    const sortBy = (['name', 'createdAt', 'fileCount'] as const).includes(
      q['sortBy'] as 'name' | 'createdAt' | 'fileCount',
    )
      ? (q['sortBy'] as 'name' | 'createdAt' | 'fileCount')
      : 'name';
    const sortDir = q['sortDir'] === 'desc' ? 'desc' : 'asc';

    const { summaries, total } =
      await this.deps.vaultContainerService.listPublicContainers({
        limit,
        offset,
        search,
        sortBy,
        sortDir,
      });

    return {
      statusCode: 200,
      response: {
        total,
        limit,
        offset,
        items: summaries.map((s) => ({
          id: String(s.container.id),
          name: s.container.name,
          description: s.container.description ?? null,
          visibility: s.container.visibility,
          fileCount: s.fileCount,
          folderCount: s.folderCount,
          ownerId: String(s.container.ownerId),
          createdAt: s.container.createdAt,
          // Canonical path base URL for this vault
          pathUrl: `/burnbag/path/${String(s.container.id)}`,
        })),
      } as unknown as IApiMessageResponse,
    };
  }

  private async handleCreateContainer(
    req: ExpressRequest,
  ): Promise<IStatusCodeResponse<BurnbagResponse>> {
    const requesterId = this.safeParseId(req.user?.id as string);
    if (!requesterId)
      return {
        statusCode: 401,
        response: {
          message: getDigitalBurnbagTranslation(
            DigitalBurnbagStrings.Api_Http_Unauthorized,
          ),
          error: getDigitalBurnbagTranslation(
            DigitalBurnbagStrings.Api_Http_Unauthorized,
          ),
        },
      };
    const { name, description, quotaBytes, approvalGoverned } = req.body;
    if (!name)
      return {
        statusCode: 400,
        response: {
          message: getDigitalBurnbagTranslation(
            DigitalBurnbagStrings.Api_Error_NameRequired,
          ),
          error: getDigitalBurnbagTranslation(
            DigitalBurnbagStrings.Api_Http_BadRequest,
          ),
        },
      };
    const container = await this.deps.vaultContainerService.createContainer({
      name,
      description,
      ownerId: requesterId,
      quotaBytes,
      approvalGoverned,
    });
    return {
      statusCode: 201,
      response: {
        id: String(container.id),
        name: container.name,
        description: container.description ?? null,
        state: container.state,
        rootFolderId: String(container.rootFolderId),
        createdAt: container.createdAt,
      } as unknown as IApiMessageResponse,
    };
  }

  private async handleGetContainer(
    req: ExpressRequest,
  ): Promise<IStatusCodeResponse<BurnbagResponse>> {
    const requesterId = this.safeParseId(req.user?.id as string);
    if (!requesterId)
      return {
        statusCode: 401,
        response: {
          message: getDigitalBurnbagTranslation(
            DigitalBurnbagStrings.Api_Http_Unauthorized,
          ),
          error: getDigitalBurnbagTranslation(
            DigitalBurnbagStrings.Api_Http_Unauthorized,
          ),
        },
      };
    const containerId = this.safeParseId(req.params.id as string);
    if (!containerId)
      return {
        statusCode: 400,
        response: {
          message: getDigitalBurnbagTranslation(
            DigitalBurnbagStrings.Api_Error_InvalidContainerId,
          ),
          error: getDigitalBurnbagTranslation(
            DigitalBurnbagStrings.Api_Http_BadRequest,
          ),
        },
      };
    const container = await this.deps.vaultContainerService.getContainer(
      containerId,
      requesterId,
    );
    return {
      statusCode: 200,
      response: {
        id: String(container.id),
        name: container.name,
        description: container.description ?? null,
        state: container.state,
        rootFolderId: String(container.rootFolderId),
        usedBytes: container.usedBytes,
        quotaBytes: container.quotaBytes ?? null,
        createdAt: container.createdAt,
      } as unknown as IApiMessageResponse,
    };
  }

  private async handleLockContainer(
    req: ExpressRequest,
  ): Promise<IStatusCodeResponse<BurnbagResponse>> {
    const requesterId = this.safeParseId(req.user?.id as string);
    if (!requesterId)
      return {
        statusCode: 401,
        response: {
          message: getDigitalBurnbagTranslation(
            DigitalBurnbagStrings.Api_Http_Unauthorized,
          ),
          error: getDigitalBurnbagTranslation(
            DigitalBurnbagStrings.Api_Http_Unauthorized,
          ),
        },
      };
    const containerId = this.safeParseId(req.params.id as string);
    if (!containerId)
      return {
        statusCode: 400,
        response: {
          message: getDigitalBurnbagTranslation(
            DigitalBurnbagStrings.Api_Error_InvalidContainerId,
          ),
          error: getDigitalBurnbagTranslation(
            DigitalBurnbagStrings.Api_Http_BadRequest,
          ),
        },
      };
    const container = await this.deps.vaultContainerService.lockContainer(
      containerId,
      requesterId,
    );
    return {
      statusCode: 200,
      response: {
        id: String(container.id),
        state: container.state,
      } as unknown as IApiMessageResponse,
    };
  }

  private async handleSealContainer(
    req: ExpressRequest,
  ): Promise<IStatusCodeResponse<BurnbagResponse>> {
    const requesterId = this.safeParseId(req.user?.id as string);
    if (!requesterId)
      return {
        statusCode: 401,
        response: {
          message: getDigitalBurnbagTranslation(
            DigitalBurnbagStrings.Api_Http_Unauthorized,
          ),
          error: getDigitalBurnbagTranslation(
            DigitalBurnbagStrings.Api_Http_Unauthorized,
          ),
        },
      };
    const containerId = this.safeParseId(req.params.id as string);
    if (!containerId)
      return {
        statusCode: 400,
        response: {
          message: getDigitalBurnbagTranslation(
            DigitalBurnbagStrings.Api_Error_InvalidContainerId,
          ),
          error: getDigitalBurnbagTranslation(
            DigitalBurnbagStrings.Api_Http_BadRequest,
          ),
        },
      };
    const { container, sealHash } =
      await this.deps.vaultContainerService.sealContainer(
        containerId,
        requesterId,
      );
    return {
      statusCode: 200,
      response: {
        id: String(container.id),
        state: container.state,
        sealedAt: container.sealedAt,
        sealHash,
      } as unknown as IApiMessageResponse,
    };
  }

  /**
   * DELETE /:id — Delete a vault container.
   *
   * Delegates to DeletionService which dispatches based on visibility:
   * - Private/Unlisted: immediate cascade destruction → 200
   * - Public: cool-down scheduling → 202
   *
   * Returns 207 for partial file destruction failure,
   * 410 for already destroyed vault, 403 for unauthorized.
   */
  private async handleDestroyContainer(
    req: ExpressRequest,
  ): Promise<IStatusCodeResponse<BurnbagResponse>> {
    const requesterId = this.safeParseId(req.user?.id as string);
    if (!requesterId)
      return {
        statusCode: 401,
        response: {
          message: getDigitalBurnbagTranslation(
            DigitalBurnbagStrings.Api_Http_Unauthorized,
          ),
          error: getDigitalBurnbagTranslation(
            DigitalBurnbagStrings.Api_Http_Unauthorized,
          ),
        },
      };
    const containerId = this.safeParseId(req.params.id as string);
    if (!containerId)
      return {
        statusCode: 400,
        response: {
          message: getDigitalBurnbagTranslation(
            DigitalBurnbagStrings.Api_Error_InvalidContainerId,
          ),
          error: getDigitalBurnbagTranslation(
            DigitalBurnbagStrings.Api_Http_BadRequest,
          ),
        },
      };

    try {
      const result = await this.deps.deletionService.deleteVaultContainer(
        containerId,
        requesterId,
      );

      if (result.type === 'pending') {
        // Public vault — cool-down scheduled
        return {
          statusCode: 202,
          response: {
            message: 'Deletion scheduled',
            pendingDeletionAt: result.pendingDeletionAt,
          } as unknown as IApiMessageResponse,
        };
      }

      // Immediate deletion result
      const { destructionResult, certificate, certificateOmittedReason, accessedFileIds } = result;

      // Determine status code: 207 if partial failure, 200 otherwise
      const hasFailures = destructionResult.failed.length > 0;
      const statusCode = hasFailures ? 207 : 200;

      const responseBody: Record<string, unknown> = {
        succeeded: destructionResult.succeeded.length,
        failed: destructionResult.failed.length,
      };

      if (hasFailures) {
        responseBody['failedFileIds'] = destructionResult.failed.map((f) =>
          String(f.fileId),
        );
      }

      if (certificate) {
        responseBody['certificate'] = certificate;
      }

      if (certificateOmittedReason) {
        responseBody['certificateOmittedReason'] = certificateOmittedReason;
      }

      if (accessedFileIds && accessedFileIds.length > 0) {
        responseBody['accessedFileIds'] = accessedFileIds;
      }

      return {
        statusCode,
        response: responseBody as unknown as IApiMessageResponse,
      };
    } catch (err) {
      return this.mapDeletionError(err);
    }
  }

  /**
   * POST /:id/disown — Disown a public vault container.
   *
   * Delegates to DeletionService.disownVaultContainer().
   * Returns 200 on success, 409 for non-public or already disowned,
   * 410 for destroyed vault.
   */
  private async handleDisownContainer(
    req: ExpressRequest,
  ): Promise<IStatusCodeResponse<BurnbagResponse>> {
    const requesterId = this.safeParseId(req.user?.id as string);
    if (!requesterId)
      return {
        statusCode: 401,
        response: {
          message: getDigitalBurnbagTranslation(
            DigitalBurnbagStrings.Api_Http_Unauthorized,
          ),
          error: getDigitalBurnbagTranslation(
            DigitalBurnbagStrings.Api_Http_Unauthorized,
          ),
        },
      };
    const containerId = this.safeParseId(req.params.id as string);
    if (!containerId)
      return {
        statusCode: 400,
        response: {
          message: getDigitalBurnbagTranslation(
            DigitalBurnbagStrings.Api_Error_InvalidContainerId,
          ),
          error: getDigitalBurnbagTranslation(
            DigitalBurnbagStrings.Api_Http_BadRequest,
          ),
        },
      };

    try {
      const container = await this.deps.deletionService.disownVaultContainer(
        containerId,
        requesterId,
      );
      return {
        statusCode: 200,
        response: {
          id: String(container.id),
          state: container.state,
          disownedAt: container.disownedAt,
        } as unknown as IApiMessageResponse,
      };
    } catch (err) {
      return this.mapDeletionError(err);
    }
  }

  /**
   * POST /:id/cancel-deletion — Cancel a pending public vault deletion.
   *
   * Delegates to DeletionService.cancelPendingDeletion().
   * Returns 200 on success, 409 if no pending deletion.
   */
  private async handleCancelDeletion(
    req: ExpressRequest,
  ): Promise<IStatusCodeResponse<BurnbagResponse>> {
    const requesterId = this.safeParseId(req.user?.id as string);
    if (!requesterId)
      return {
        statusCode: 401,
        response: {
          message: getDigitalBurnbagTranslation(
            DigitalBurnbagStrings.Api_Http_Unauthorized,
          ),
          error: getDigitalBurnbagTranslation(
            DigitalBurnbagStrings.Api_Http_Unauthorized,
          ),
        },
      };
    const containerId = this.safeParseId(req.params.id as string);
    if (!containerId)
      return {
        statusCode: 400,
        response: {
          message: getDigitalBurnbagTranslation(
            DigitalBurnbagStrings.Api_Error_InvalidContainerId,
          ),
          error: getDigitalBurnbagTranslation(
            DigitalBurnbagStrings.Api_Http_BadRequest,
          ),
        },
      };

    try {
      const container = await this.deps.deletionService.cancelPendingDeletion(
        containerId,
        requesterId,
      );
      return {
        statusCode: 200,
        response: {
          id: String(container.id),
          state: container.state,
        } as unknown as IApiMessageResponse,
      };
    } catch (err) {
      return this.mapDeletionError(err);
    }
  }

  /**
   * GET /:id/certificate — Retrieve a stored Certificate of Destruction.
   *
   * Delegates to DeletionService.getCertificate().
   * Returns 200 with certificate JSON, 404 if no certificate exists,
   * 403 for unauthorized.
   */
  private async handleGetCertificate(
    req: ExpressRequest,
  ): Promise<IStatusCodeResponse<BurnbagResponse>> {
    const requesterId = this.safeParseId(req.user?.id as string);
    if (!requesterId)
      return {
        statusCode: 401,
        response: {
          message: getDigitalBurnbagTranslation(
            DigitalBurnbagStrings.Api_Http_Unauthorized,
          ),
          error: getDigitalBurnbagTranslation(
            DigitalBurnbagStrings.Api_Http_Unauthorized,
          ),
        },
      };
    const containerId = this.safeParseId(req.params.id as string);
    if (!containerId)
      return {
        statusCode: 400,
        response: {
          message: getDigitalBurnbagTranslation(
            DigitalBurnbagStrings.Api_Error_InvalidContainerId,
          ),
          error: getDigitalBurnbagTranslation(
            DigitalBurnbagStrings.Api_Http_BadRequest,
          ),
        },
      };

    try {
      const certificate = await this.deps.deletionService.getCertificate(
        containerId,
        requesterId,
      );

      if (!certificate) {
        return {
          statusCode: 404,
          response: {
            message: `No certificate exists for vault '${String(containerId)}'`,
            error: getDigitalBurnbagTranslation(
              DigitalBurnbagStrings.Api_Http_NotFound,
            ),
          },
        };
      }

      return {
        statusCode: 200,
        response: certificate as unknown as IApiMessageResponse,
      };
    } catch (err) {
      return this.mapDeletionError(err);
    }
  }

  /**
   * Map deletion-related errors to appropriate HTTP status codes.
   */
  private mapDeletionError(
    err: unknown,
  ): IStatusCodeResponse<BurnbagResponse> {
    if (err instanceof VaultContainerDestroyedError) {
      return {
        statusCode: 410,
        response: {
          message: err.message,
          error: 'Gone',
        },
      };
    }

    if (err instanceof DisownRequiresPublicVisibilityError) {
      return {
        statusCode: 409,
        response: {
          message: err.message,
          error: getDigitalBurnbagTranslation(
            DigitalBurnbagStrings.Api_Http_Conflict,
          ),
        },
      };
    }

    if (err instanceof VaultAlreadyDisownedError) {
      return {
        statusCode: 409,
        response: {
          message: err.message,
          error: getDigitalBurnbagTranslation(
            DigitalBurnbagStrings.Api_Http_Conflict,
          ),
        },
      };
    }

    if (err instanceof DeletionAlreadyScheduledError) {
      return {
        statusCode: 409,
        response: {
          message: err.message,
          error: getDigitalBurnbagTranslation(
            DigitalBurnbagStrings.Api_Http_Conflict,
          ),
          pendingDeletionAt: err.pendingDeletionAt,
        } as unknown as BurnbagResponse,
      };
    }

    if (err instanceof InvalidStateTransitionError) {
      return {
        statusCode: 409,
        response: {
          message: err.message,
          error: getDigitalBurnbagTranslation(
            DigitalBurnbagStrings.Api_Http_Conflict,
          ),
        },
      };
    }

    if (err instanceof CertificateNotFoundError) {
      return {
        statusCode: 404,
        response: {
          message: err.message,
          error: getDigitalBurnbagTranslation(
            DigitalBurnbagStrings.Api_Http_NotFound,
          ),
        },
      };
    }

    // Check for generic unauthorized/forbidden errors by code
    const code = (err as { code?: string }).code;
    if (code === 'UNAUTHORIZED' || code === 'FORBIDDEN') {
      return {
        statusCode: 403,
        response: {
          message:
            (err as { message?: string }).message ?? 'Forbidden',
          error: getDigitalBurnbagTranslation(
            DigitalBurnbagStrings.Api_Http_Forbidden,
          ),
        },
      };
    }

    // Re-throw unhandled errors for the framework to handle
    throw err;
  }
}
