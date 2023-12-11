/**
 * ServerController — REST API for server management.
 *
 * Routes:
 *   POST   /                                         — Create a server
 *   GET    /                                         — List user's servers
 *   GET    /:serverId                                — Get server details
 *   PUT    /:serverId                                — Update server
 *   DELETE /:serverId                                — Delete server
 *   POST   /:serverId/members                        — Add members
 *   DELETE /:serverId/members/:memberId              — Remove member
 *   POST   /:serverId/invites                        — Create invite
 *   POST   /:serverId/invites/:token/redeem          — Redeem invite
 *   POST   /:serverId/icon                           — Upload server icon (staging-based)
 *   GET    /:serverId/icon                           — Serve server icon
 *   DELETE /:serverId/icon                           — Remove server icon
 *
 * Requirements: 2.1, 2.2, 2.3, 2.4, 2.5, 2.6, 2.7, 2.8, 3.1, 3.2, 3.3, 3.4
 */

import {
  DEFAULT_SERVER_ICON_CONFIG,
  IAddServerMembersResponse,
  ICreateServerInviteResponse,
  ICreateServerResponse,
  IDeleteServerIconResponse,
  IDeleteServerResponse,
  IGetServerResponse,
  IListServersResponse,
  IRedeemServerInviteResponse,
  IRemoveServerMemberResponse,
  IServerIconUploadRequest,
  IUpdateServerResponse,
  IUploadServerIconResponse,
  MemberAlreadyInServerError,
  NotServerMemberError,
  ServerInviteExpiredError,
  ServerInviteNotFoundError,
  ServerNameValidationError,
  ServerNotFoundError,
  ServerPermissionError,
  ServerService,
  isAllowedIconFileSize,
  isAllowedIconMimeType,
} from '@brightchain/brightchain-lib';
import { CoreLanguageCode } from '@digitaldefiance/i18n-lib';
import { PlatformID } from '@digitaldefiance/node-ecies-lib';
import {
  ApiErrorResponse,
  ApiRequestHandler,
  TypedHandlers,
  routeConfig,
} from '@digitaldefiance/node-express-suite';
import type { RequestHandler } from 'express';
import { IBrightChainApplication } from '../../interfaces/application';
import {
  createDeferredVaultAccessAuditMiddleware,
  type IVaultAccessAuditDeps,
  type IVaultAuditRequest,
} from '../../middlewares/vault-access-audit';
import type { StagingService } from '../../services/staging/stagingService';
import { DefaultBackendIdType } from '../../shared-types';
import {
  addServerMembersValidation,
  createServerInviteValidation,
  createServerValidation,
  listServersValidation,
  redeemServerInviteValidation,
  removeServerMemberValidation,
  serverIconParamValidation,
  serverIdParamValidation,
  updateServerValidation,
  uploadServerIconValidation,
} from '../../utils/communicationValidation';
import {
  forbiddenError,
  handleError,
  internalError,
  notFoundError,
  validationError,
} from '../../utils/errorResponse';
import { getServerIconVaultName } from '../../utils/imageProcessing';
import { processImage } from '../../utils/stagingImageProcessor';
import { BaseController } from '../base';

type ServerApiResponse =
  | ICreateServerResponse
  | IListServersResponse
  | IGetServerResponse
  | IUpdateServerResponse
  | IDeleteServerResponse
  | IAddServerMembersResponse
  | IRemoveServerMemberResponse
  | ICreateServerInviteResponse
  | IRedeemServerInviteResponse
  | IUploadServerIconResponse
  | IDeleteServerIconResponse
  | ApiErrorResponse;

interface ServerHandlers extends TypedHandlers {
  createServer: ApiRequestHandler<ICreateServerResponse | ApiErrorResponse>;
  listServers: ApiRequestHandler<IListServersResponse | ApiErrorResponse>;
  getServer: ApiRequestHandler<IGetServerResponse | ApiErrorResponse>;
  updateServer: ApiRequestHandler<IUpdateServerResponse | ApiErrorResponse>;
  deleteServer: ApiRequestHandler<IDeleteServerResponse | ApiErrorResponse>;
  addMembers: ApiRequestHandler<IAddServerMembersResponse | ApiErrorResponse>;
  removeMember: ApiRequestHandler<
    IRemoveServerMemberResponse | ApiErrorResponse
  >;
  createInvite: ApiRequestHandler<
    ICreateServerInviteResponse | ApiErrorResponse
  >;
  redeemInvite: ApiRequestHandler<
    IRedeemServerInviteResponse | ApiErrorResponse
  >;
  uploadIcon: ApiRequestHandler<IUploadServerIconResponse | ApiErrorResponse>;
  serveIcon: ApiRequestHandler<ApiErrorResponse>;
  removeIcon: ApiRequestHandler<IDeleteServerIconResponse | ApiErrorResponse>;
}

// ─── Icon Controller Dependencies ───────────────────────────────────────────

/**
 * DJB2-style checksum matching the default used by the upload service.
 * Must produce the same output as digitalburnbag-lib's computeChecksum.
 */
function djb2Checksum(data: Uint8Array): string {
  let hash = 5381;
  for (let i = 0; i < data.length; i++) {
    hash = ((hash << 5) + hash + data[i]) >>> 0;
  }
  return hash.toString(16).padStart(8, '0');
}

/**
 * External dependencies for server icon operations.
 * Injected to keep the controller testable.
 */
export interface IServerIconControllerDeps {
  stagingService: StagingService;
  vaultContainerService: {
    createContainer(params: {
      name: string;
      ownerId: PlatformID;
      visibility?: string;
    }): Promise<{ id: PlatformID; rootFolderId: PlatformID }>;
    listContainers(
      ownerId: PlatformID,
    ): Promise<Array<{ container: { id: PlatformID; name: string; rootFolderId: PlatformID } }>>;
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
  fileService: {
    readFile(vaultContainerId: PlatformID, fileId: PlatformID, ownerId?: PlatformID): Promise<Buffer>;
    deleteFile(vaultContainerId: PlatformID, fileId: PlatformID): Promise<void>;
  };
  parseId: (idString: string) => PlatformID;
}

// ─── Request shape interfaces ───────────────────────────────────────────────

interface CreateServerBody {
  body: { name?: string; iconUrl?: string };
}

interface ServerIdParams {
  params: { serverId: string };
}

interface UpdateServerBody {
  params: { serverId: string };
  body: { name?: string; iconUrl?: string; categories?: unknown[] };
}

interface ListServersQuery {
  query: { cursor?: string; limit?: string };
}

interface AddMembersBody {
  params: { serverId: string };
  body: { memberIds?: string[] };
}

interface RemoveMemberParams {
  params: { serverId: string; memberId: string };
}

interface CreateInviteBody {
  params: { serverId: string };
  body: { maxUses?: number; expiresInMs?: number };
}

interface RedeemInviteParams {
  params: { serverId: string; token: string };
}

interface IconUploadBody {
  params: { serverId: string };
  body: IServerIconUploadRequest;
}

interface IconRequestParams {
  params: { serverId: string };
  headers?: Record<string, string | undefined>;
}

/**
 * Controller for server operations.
 *
 * @requirements 2.1, 2.2, 2.3, 2.4, 2.5, 2.6, 2.7, 2.8, 3.1, 3.2, 3.3, 3.4
 */
export class ServerController<
  TID extends PlatformID = DefaultBackendIdType,
> extends BaseController<
  TID,
  ServerApiResponse,
  ServerHandlers,
  CoreLanguageCode
> {
  private serverService: ServerService | null = null;
  private iconDeps: IServerIconControllerDeps | null = null;
  private _setAuditDeps: ((deps: IVaultAccessAuditDeps<TID>) => void) | null =
    null;

  /**
   * Per-user icon upload rate limiter.
   * Maps memberId → array of upload timestamps (ms).
   * Entries older than the window are pruned on each check.
   */
  private readonly iconUploadTimestamps = new Map<string, number[]>();
  private static readonly ICON_RATE_LIMIT_MAX = 10;
  private static readonly ICON_RATE_LIMIT_WINDOW_MS = 60 * 60 * 1000; // 1 hour

  private checkIconRateLimit(memberId: string): boolean {
    const now = Date.now();
    const cutoff = now - ServerController.ICON_RATE_LIMIT_WINDOW_MS;
    const timestamps = (this.iconUploadTimestamps.get(memberId) ?? []).filter(
      (t) => t > cutoff,
    );
    if (timestamps.length >= ServerController.ICON_RATE_LIMIT_MAX) {
      this.iconUploadTimestamps.set(memberId, timestamps);
      return false;
    }
    timestamps.push(now);
    this.iconUploadTimestamps.set(memberId, timestamps);
    return true;
  }

  constructor(application: IBrightChainApplication<TID>) {
    super(application);
  }

  /**
   * Wire the vault access audit middleware dependencies.
   * Once called, the deferred audit middleware on the icon route activates.
   *
   * @requirements 5.5
   */
  public setAuditDeps(deps: IVaultAccessAuditDeps<TID>): void {
    if (this._setAuditDeps) {
      this._setAuditDeps(deps);
    }
  }

  public setServerService(service: ServerService): void {
    this.serverService = service;
  }

  public setIconDeps(deps: IServerIconControllerDeps): void {
    this.iconDeps = deps;
  }

  private getIconDeps(): IServerIconControllerDeps {
    if (!this.iconDeps) {
      throw new Error('Icon dependencies not initialized');
    }
    return this.iconDeps;
  }

  private getServerService(): ServerService {
    if (!this.serverService) {
      throw new Error('ServerService not initialized');
    }
    return this.serverService;
  }

  /**
   * Extract the authenticated member ID from the request.
   */
  private getMemberId(req: unknown): string {
    const user = (req as { user?: { id?: string } }).user;
    if (user && typeof user.id === 'string') return user.id;
    throw new Error('No authenticated user');
  }

  protected initRouteDefinitions(): void {
    const auth = {
      useAuthentication: true,
      useCryptoAuthentication: false,
    };

    // Create a deferred audit middleware for the icon serving route.
    // It is a no-op until setAuditDeps() is called with the real dependencies.
    const [auditMw, setDeps] = createDeferredVaultAccessAuditMiddleware<TID>();
    this._setAuditDeps = setDeps;

    this.routeDefinitions = [
      routeConfig('post', '/', {
        ...auth,
        handlerKey: 'createServer',
        validation: () => createServerValidation,
      }),
      routeConfig('get', '/', {
        ...auth,
        handlerKey: 'listServers',
        validation: () => listServersValidation,
      }),
      routeConfig('get', '/:serverId', {
        ...auth,
        handlerKey: 'getServer',
        validation: () => serverIdParamValidation,
      }),
      routeConfig('put', '/:serverId', {
        ...auth,
        handlerKey: 'updateServer',
        validation: () => updateServerValidation,
      }),
      routeConfig('delete', '/:serverId', {
        ...auth,
        handlerKey: 'deleteServer',
        validation: () => serverIdParamValidation,
      }),
      routeConfig('post', '/:serverId/members', {
        ...auth,
        handlerKey: 'addMembers',
        validation: () => addServerMembersValidation,
      }),
      routeConfig('delete', '/:serverId/members/:memberId', {
        ...auth,
        handlerKey: 'removeMember',
        validation: () => removeServerMemberValidation,
      }),
      routeConfig('post', '/:serverId/invites', {
        ...auth,
        handlerKey: 'createInvite',
        validation: () => createServerInviteValidation,
      }),
      routeConfig('post', '/:serverId/invites/:token/redeem', {
        ...auth,
        handlerKey: 'redeemInvite',
        validation: () => redeemServerInviteValidation,
      }),
      routeConfig('post', '/:serverId/icon', {
        ...auth,
        handlerKey: 'uploadIcon',
        validation: () => uploadServerIconValidation,
      }),
      {
        ...routeConfig('get', '/:serverId/icon', {
          useAuthentication: false,
          useCryptoAuthentication: false,
          handlerKey: 'serveIcon',
          validation: () => serverIconParamValidation,
        }),
        middleware: [auditMw() as RequestHandler],
      },
      routeConfig('delete', '/:serverId/icon', {
        ...auth,
        handlerKey: 'removeIcon',
        validation: () => serverIconParamValidation,
      }),
    ];

    this.handlers = {
      createServer: this.handleCreateServer.bind(this),
      listServers: this.handleListServers.bind(this),
      getServer: this.handleGetServer.bind(this),
      updateServer: this.handleUpdateServer.bind(this),
      deleteServer: this.handleDeleteServer.bind(this),
      addMembers: this.handleAddMembers.bind(this),
      removeMember: this.handleRemoveMember.bind(this),
      createInvite: this.handleCreateInvite.bind(this),
      redeemInvite: this.handleRedeemInvite.bind(this),
      uploadIcon: this.handleUploadIcon.bind(this),
      serveIcon: this.handleServeIcon.bind(this),
      removeIcon: this.handleRemoveIcon.bind(this),
    };
  }

  // ─── Handlers ─────────────────────────────────────────────────────────

  /** POST / — Create a server. @requirements 2.1 */
  private async handleCreateServer(req: unknown): Promise<{
    statusCode: number;
    response: ICreateServerResponse | ApiErrorResponse;
  }> {
    try {
      const { name, iconUrl } = (req as CreateServerBody).body;
      if (!name) {
        return validationError('Missing required field: name');
      }
      const memberId = this.getMemberId(req);

      // Pre-populate the ECIES public key cache for the creator
      await this.ensureMemberKeys(memberId);

      const server = await this.getServerService().createServer(memberId, {
        name,
        iconUrl,
      });
      return {
        statusCode: 201,
        response: {
          status: 'success',
          data: server,
          message: 'Server created',
        } satisfies ICreateServerResponse,
      };
    } catch (error) {
      return this.mapServiceError(error);
    }
  }

  /** GET / — List user's servers. @requirements 2.2 */
  private async handleListServers(req: unknown): Promise<{
    statusCode: number;
    response: IListServersResponse | ApiErrorResponse;
  }> {
    try {
      const { cursor, limit } = (req as ListServersQuery).query;
      const memberId = this.getMemberId(req);
      const result = await this.getServerService().listServersForMember(
        memberId,
        {
          cursor,
          limit: limit ? parseInt(limit, 10) : undefined,
        },
      );
      return {
        statusCode: 200,
        response: {
          status: 'success',
          data: result,
          message: 'Servers listed',
        } satisfies IListServersResponse,
      };
    } catch (error) {
      return this.mapServiceError(error);
    }
  }

  /** GET /:serverId — Get server details. @requirements 2.3 */
  private async handleGetServer(req: unknown): Promise<{
    statusCode: number;
    response: IGetServerResponse | ApiErrorResponse;
  }> {
    try {
      const { serverId } = (req as ServerIdParams).params;
      const server = await this.getServerService().getServer(serverId);
      return {
        statusCode: 200,
        response: {
          status: 'success',
          data: server,
          message: 'Server retrieved',
        } satisfies IGetServerResponse,
      };
    } catch (error) {
      return this.mapServiceError(error);
    }
  }

  /** PUT /:serverId — Update server. @requirements 2.4 */
  private async handleUpdateServer(req: unknown): Promise<{
    statusCode: number;
    response: IUpdateServerResponse | ApiErrorResponse;
  }> {
    try {
      const { serverId } = (req as UpdateServerBody).params;
      const { name, iconUrl, categories } = (req as UpdateServerBody).body;
      const iconFaClass = ((req as UpdateServerBody).body as Record<string, unknown>)['iconFaClass'] as string | undefined;
      const memberId = this.getMemberId(req);
      const update: Record<string, unknown> = {};
      if (name !== undefined) update['name'] = name;
      if (iconUrl !== undefined) update['iconUrl'] = iconUrl;
      if (iconFaClass !== undefined) update['iconFaClass'] = iconFaClass;
      if (categories !== undefined) update['categories'] = categories;
      const server = await this.getServerService().updateServer(
        serverId,
        memberId,
        update as never,
      );
      return {
        statusCode: 200,
        response: {
          status: 'success',
          data: server,
          message: 'Server updated',
        } satisfies IUpdateServerResponse,
      };
    } catch (error) {
      return this.mapServiceError(error);
    }
  }

  /** DELETE /:serverId — Delete server. @requirements 2.5, 2.6 */
  private async handleDeleteServer(req: unknown): Promise<{
    statusCode: number;
    response: IDeleteServerResponse | ApiErrorResponse;
  }> {
    try {
      const { serverId } = (req as ServerIdParams).params;
      const memberId = this.getMemberId(req);
      await this.getServerService().deleteServer(serverId, memberId);
      return {
        statusCode: 200,
        response: {
          status: 'success',
          data: { deleted: true },
          message: 'Server deleted',
        } satisfies IDeleteServerResponse,
      };
    } catch (error) {
      return this.mapServiceError(error);
    }
  }

  /** POST /:serverId/members — Add members. @requirements 2.7 */
  private async handleAddMembers(req: unknown): Promise<{
    statusCode: number;
    response: IAddServerMembersResponse | ApiErrorResponse;
  }> {
    try {
      const { serverId } = (req as AddMembersBody).params;
      const { memberIds } = (req as AddMembersBody).body;
      if (!memberIds || !Array.isArray(memberIds)) {
        return validationError('Missing required field: memberIds');
      }
      const memberId = this.getMemberId(req);
      await this.ensureMemberKeys(memberId, ...memberIds);
      const added = await this.getServerService().addMembers(
        serverId,
        memberId,
        memberIds,
      );
      return {
        statusCode: 200,
        response: {
          status: 'success',
          data: { added },
          message: 'Members added',
        } satisfies IAddServerMembersResponse,
      };
    } catch (error) {
      return this.mapServiceError(error);
    }
  }

  /** DELETE /:serverId/members/:memberId — Remove member. @requirements 2.8 */
  private async handleRemoveMember(req: unknown): Promise<{
    statusCode: number;
    response: IRemoveServerMemberResponse | ApiErrorResponse;
  }> {
    try {
      const { serverId, memberId: targetId } = (req as RemoveMemberParams)
        .params;
      const requesterId = this.getMemberId(req);
      await this.getServerService().removeMember(
        serverId,
        requesterId,
        targetId,
      );
      return {
        statusCode: 200,
        response: {
          status: 'success',
          data: { removed: targetId },
          message: 'Member removed',
        } satisfies IRemoveServerMemberResponse,
      };
    } catch (error) {
      return this.mapServiceError(error);
    }
  }

  /** POST /:serverId/invites — Create invite. @requirements 3.1 */
  private async handleCreateInvite(req: unknown): Promise<{
    statusCode: number;
    response: ICreateServerInviteResponse | ApiErrorResponse;
  }> {
    try {
      const { serverId } = (req as CreateInviteBody).params;
      const { maxUses, expiresInMs } = (req as CreateInviteBody).body;
      const memberId = this.getMemberId(req);
      const invite = await this.getServerService().createInvite(
        serverId,
        memberId,
        { maxUses, expiresInMs },
      );
      return {
        statusCode: 201,
        response: {
          status: 'success',
          data: invite,
          message: 'Invite created',
        } satisfies ICreateServerInviteResponse,
      };
    } catch (error) {
      return this.mapServiceError(error);
    }
  }

  /** POST /:serverId/invites/:token/redeem — Redeem invite. @requirements 3.2, 3.3, 3.4 */
  private async handleRedeemInvite(req: unknown): Promise<{
    statusCode: number;
    response: IRedeemServerInviteResponse | ApiErrorResponse;
  }> {
    try {
      const { serverId, token } = (req as RedeemInviteParams).params;
      const memberId = this.getMemberId(req);
      await this.ensureMemberKeys(memberId);
      await this.getServerService().redeemInvite(serverId, token, memberId);
      return {
        statusCode: 200,
        response: {
          status: 'success',
          data: { redeemed: true },
          message: 'Invite redeemed',
        } satisfies IRedeemServerInviteResponse,
      };
    } catch (error) {
      return this.mapServiceError(error);
    }
  }

  // ─── Icon Handlers ──────────────────────────────────────────────────

  /**
   * POST /:serverId/icon — Upload server icon via staging commit token.
   *
   * Accepts JSON body { commitToken }, validates auth + staging record,
   * processes image to 256×256 PNG, uploads to vault, updates server record.
   *
   * @requirements 2.1, 2.2, 2.3, 2.4, 2.5, 2.6, 2.7, 2.8, 2.9
   */
  private async handleUploadIcon(req: unknown): Promise<{
    statusCode: number;
    response: IUploadServerIconResponse | ApiErrorResponse;
  }> {
    try {
      const { serverId } = (req as IconUploadBody).params;
      const { commitToken } = (req as IconUploadBody).body;
      const memberId = this.getMemberId(req);

      // Validate server exists and user has permission
      const server = await this.getServerService().getServer(serverId);
      const role = this.getServerService().getMemberRole(serverId, memberId);
      if (role !== 'owner' && role !== 'admin') {
        return forbiddenError(
          'Only the server owner or admin can upload an icon',
        );
      }

      if (
        !commitToken ||
        typeof commitToken !== 'string' ||
        commitToken.trim() === ''
      ) {
        return validationError('commitToken is required');
      }

      // Rate limit: max 10 icon uploads per user per hour
      if (!this.checkIconRateLimit(memberId)) {
        return {
          statusCode: 429,
          response: {
            error: {
              code: 'ICON_RATE_LIMIT_EXCEEDED',
              message: `Icon upload rate limit exceeded. Maximum ${ServerController.ICON_RATE_LIMIT_MAX} uploads per hour.`,
            },
          } as unknown as ApiErrorResponse,
        };
      }

      const deps = this.getIconDeps();

      // Get the staged file record
      const record = await deps.stagingService.getRecord(commitToken);
      if (!record) {
        return {
          statusCode: 404,
          response: {
            error: {
              code: 'STAGED_FILE_NOT_FOUND',
              message: 'Staged file not found',
            },
          } as unknown as ApiErrorResponse,
        };
      }

      // Check if expired
      if (deps.stagingService.isExpired(record)) {
        return {
          statusCode: 410,
          response: {
            error: {
              code: 'STAGED_FILE_EXPIRED',
              message: 'Staged file has expired',
            },
          } as unknown as ApiErrorResponse,
        };
      }

      // Check uploader matches authenticated user
      if (record.uploaderId !== memberId) {
        return {
          statusCode: 403,
          response: {
            error: {
              code: 'STAGING_PERMISSION_ERROR',
              message: 'You do not have permission to use this staged file',
            },
          } as unknown as ApiErrorResponse,
        };
      }

      // Validate MIME type
      if (!isAllowedIconMimeType(record.mimeType)) {
        return {
          statusCode: 400,
          response: {
            error: {
              code: 'INVALID_FILE_TYPE',
              message: `File type '${record.mimeType}' is not allowed. Allowed types: ${DEFAULT_SERVER_ICON_CONFIG.allowedMimeTypes.join(', ')}`,
            },
          } as unknown as ApiErrorResponse,
        };
      }

      // Validate file size
      if (!isAllowedIconFileSize(record.sizeBytes)) {
        return {
          statusCode: 400,
          response: {
            error: {
              code: 'FILE_TOO_LARGE',
              message: `File size ${record.sizeBytes} bytes exceeds the maximum allowed size of ${DEFAULT_SERVER_ICON_CONFIG.maxFileSizeBytes} bytes`,
            },
          } as unknown as ApiErrorResponse,
        };
      }

      // Read the staged file
      const rawBuffer = await deps.stagingService.readFile(commitToken);

      // Process image to 256×256 PNG
      let processedBuffer: Buffer;
      try {
        const result = await processImage(rawBuffer, {
          width: DEFAULT_SERVER_ICON_CONFIG.outputSizePx,
          height: DEFAULT_SERVER_ICON_CONFIG.outputSizePx,
          format: 'png',
          stripExif: true,
        });
        processedBuffer = result.buffer;
      } catch (processingError) {
        return {
          statusCode: 500,
          response: {
            error: {
              code: 'IMAGE_PROCESSING_ERROR',
              message: `Image processing failed: ${processingError instanceof Error ? processingError.message : 'Unknown error'}`,
            },
          } as unknown as ApiErrorResponse,
        };
      }

      // Create or reuse vault container
      let vaultContainerId: PlatformID | undefined;
      let targetFolderId: PlatformID | undefined;

      // If the server already has a vault container from a previous icon upload, reuse it
      if (server.iconVaultContainerId) {
        try {
          vaultContainerId = deps.parseId(server.iconVaultContainerId as string);
          targetFolderId = vaultContainerId; // use container ID as folder ID fallback
        } catch {
          // If parsing fails, fall through to create a new container
        }
      }

      if (!vaultContainerId) {
        const containerName = getServerIconVaultName(serverId);
        try {
          const container = await deps.vaultContainerService.createContainer({
            name: containerName,
            ownerId: deps.parseId(server.ownerId as string),
            visibility: 'public',
          });
          vaultContainerId = container.id;
          targetFolderId = container.rootFolderId;
        } catch (containerError) {
          // If the container already exists, look it up
          const isDuplicate =
            containerError instanceof Error &&
            containerError.message.includes('already exists');

          if (!isDuplicate) {
            return {
              statusCode: 500,
              response: {
                error: {
                  code: 'VAULT_CREATION_ERROR',
                  message: `Failed to create vault container for icon storage: ${containerError instanceof Error ? containerError.message : 'Unknown error'}`,
                },
              } as unknown as ApiErrorResponse,
            };
          }

          // Find the existing container by name
          try {
            const existing = await deps.vaultContainerService.listContainers(
              deps.parseId(server.ownerId as string),
            );
            const match = existing.find(
              (c) => c.container.name === containerName,
            );
            if (match) {
              vaultContainerId = match.container.id;
              targetFolderId = match.container.rootFolderId ?? match.container.id;
            }
          } catch {
            // Lookup failed — fall through to error
          }

          if (!vaultContainerId) {
            return {
              statusCode: 500,
              response: {
                error: {
                  code: 'VAULT_CREATION_ERROR',
                  message: 'Container exists but could not be found',
                },
              } as unknown as ApiErrorResponse,
            };
          }
        }
      }

      // Upload processed image via upload pipeline
      try {
        const session = await deps.uploadService.createSession({
          userId: deps.parseId(memberId),
          fileName: 'icon.png',
          mimeType: 'image/png',
          totalSizeBytes: processedBuffer.length,
          targetFolderId: targetFolderId!,
          vaultContainerId: vaultContainerId!,
        });

        // Send the file in chunks matching the upload service's expected
        // chunk size (default 1 MB).
        const chunkSize = 1 * 1024 * 1024; // 1 MB
        const totalChunks = Math.max(
          1,
          Math.ceil(processedBuffer.length / chunkSize),
        );

        for (let i = 0; i < totalChunks; i++) {
          const start = i * chunkSize;
          const end = Math.min(start + chunkSize, processedBuffer.length);
          const chunkData = new Uint8Array(processedBuffer.subarray(start, end));
          const chunkChecksum = djb2Checksum(chunkData);
          await deps.uploadService.receiveChunk(
            session.id,
            i,
            chunkData,
            chunkChecksum,
          );
        }

        const fileMetadata = await deps.uploadService.finalize(session.id);

        // Remove staged file only after successful upload
        await deps.stagingService.remove(commitToken);

        // Update server record with icon fields
        const updatedServer = await this.getServerService().updateServer(
          serverId,
          memberId,
          {
            iconAssetId: fileMetadata.id.toString(),
            iconVaultContainerId: fileMetadata.vaultContainerId.toString(),
            iconUrl: `/api/servers/${serverId}/icon`,
          },
        );

        return {
          statusCode: 200,
          response: {
            status: 'success',
            data: updatedServer,
            message: 'Server icon uploaded',
          } satisfies IUploadServerIconResponse,
        };
      } catch (uploadError) {
        // On upload failure, do NOT remove staged file — user can retry
        return {
          statusCode: 500,
          response: {
            error: {
              code: 'UPLOAD_FAILED',
              message: `Failed to upload icon to vault: ${uploadError instanceof Error ? uploadError.message : 'Unknown error'}`,
            },
          } as unknown as ApiErrorResponse,
        };
      }
    } catch (error) {
      return this.mapServiceError(error);
    }
  }

  /**
   * GET /:serverId/icon — Serve server icon image.
   *
   * Public endpoint (no auth). Returns PNG bytes with cache headers and ETag.
   * Attaches vault audit context to the request for the audit middleware.
   *
   * @requirements 3.1, 3.2, 3.3, 3.4, 3.5, 3.6, 5.5
   */
  private async handleServeIcon(req: unknown): Promise<{
    statusCode: number;
    response: ApiErrorResponse;
  }> {
    try {
      const { serverId } = (req as IconRequestParams).params;

      const server = await this.getServerService().getServer(serverId);

      if (!server.iconAssetId) {
        return {
          statusCode: 404,
          response: {
            error: {
              code: 'SERVER_ICON_NOT_FOUND',
              message: 'This server does not have an icon',
            },
          } as unknown as ApiErrorResponse,
        };
      }

      // Attach vault audit context so the audit middleware can include
      // file-specific metadata in the audit entry.
      (req as IVaultAuditRequest).vaultAuditContext = {
        fileId: server.iconAssetId as string,
        vaultContainerId: server.iconVaultContainerId as string,
      };

      // ETag check
      const etag = `"${server.iconAssetId}"`;
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

      const deps = this.getIconDeps();

      // Read file from vault
      const fileBuffer = await deps.fileService.readFile(
        deps.parseId(server.iconVaultContainerId as string),
        deps.parseId(server.iconAssetId as string),
        deps.parseId(server.ownerId as string),
      );

      // Send binary response directly via Express res object
      this.res.set('Content-Type', 'image/png');
      this.res.set('Cache-Control', 'public, max-age=86400, immutable');
      this.res.set('ETag', etag);
      this.res.status(200).send(fileBuffer);

      return {
        statusCode: 200,
        response: {
          message: 'OK',
        } as unknown as ApiErrorResponse,
      };
    } catch (error) {
      return this.mapServiceError(error);
    }
  }

  /**
   * DELETE /:serverId/icon — Remove server icon.
   *
   * Validates owner/admin role, deletes from vault, clears icon fields.
   *
   * @requirements 4.1, 4.2, 4.3, 4.4, 4.5
   */
  private async handleRemoveIcon(req: unknown): Promise<{
    statusCode: number;
    response: IDeleteServerIconResponse | ApiErrorResponse;
  }> {
    try {
      const { serverId } = (req as IconRequestParams).params;
      const memberId = this.getMemberId(req);

      const server = await this.getServerService().getServer(serverId);

      // Check permission
      const role = this.getServerService().getMemberRole(serverId, memberId);
      if (role !== 'owner' && role !== 'admin') {
        return forbiddenError(
          'Only the server owner or admin can remove the icon',
        );
      }

      if (!server.iconAssetId) {
        return {
          statusCode: 404,
          response: {
            error: {
              code: 'SERVER_ICON_NOT_FOUND',
              message: 'This server does not have an icon',
            },
          } as unknown as ApiErrorResponse,
        };
      }

      const deps = this.getIconDeps();

      // Delete file from vault
      await deps.fileService.deleteFile(
        deps.parseId(server.iconVaultContainerId as string),
        deps.parseId(server.iconAssetId as string),
      );

      // Clear icon fields on server
      const updatedServer = await this.getServerService().updateServer(
        serverId,
        memberId,
        {
          iconAssetId: undefined,
          iconVaultContainerId: undefined,
          iconUrl: undefined,
        },
      );

      return {
        statusCode: 200,
        response: {
          status: 'success',
          data: updatedServer,
          message: 'Server icon removed',
        } satisfies IDeleteServerIconResponse,
      };
    } catch (error) {
      return this.mapServiceError(error);
    }
  }

  // ─── Error mapping ────────────────────────────────────────────────────

  private mapServiceError(error: unknown): {
    statusCode: number;
    response: ApiErrorResponse;
  } {
    if (error instanceof ServerNotFoundError) {
      return notFoundError('Server', 'unknown');
    }
    if (error instanceof ServerPermissionError) {
      return forbiddenError(error.message);
    }
    if (error instanceof NotServerMemberError) {
      return forbiddenError(error.message);
    }
    if (error instanceof ServerInviteExpiredError) {
      return {
        statusCode: 410,
        response: {
          error: {
            code: 'GONE',
            message: error.message,
          },
        } as ApiErrorResponse,
      };
    }
    if (error instanceof ServerInviteNotFoundError) {
      return notFoundError('ServerInvite', 'unknown');
    }
    if (error instanceof MemberAlreadyInServerError) {
      return {
        statusCode: 409,
        response: {
          error: {
            code: 'ALREADY_EXISTS',
            message: error.message,
          },
        } as ApiErrorResponse,
      };
    }
    if (error instanceof ServerNameValidationError) {
      return validationError(error.message);
    }
    if (error instanceof Error) {
      return internalError(error);
    }
    return handleError(error);
  }
}
