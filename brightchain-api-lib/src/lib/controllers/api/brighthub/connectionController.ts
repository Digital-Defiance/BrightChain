import {
  ConnectionServiceError,
  ConnectionServiceErrorCode,
  IConnectionService,
  IDiscoveryService,
  InsightPeriod,
  IPaginationOptions,
  IUserProfileService,
  MuteDuration,
  UserProfileErrorCode,
  UserProfileServiceError,
} from '@brightchain/brighthub-lib';
import { CoreLanguageCode } from '@digitaldefiance/i18n-lib';
import { PlatformID } from '@digitaldefiance/node-ecies-lib';
import {
  ApiErrorResponse,
  ApiRequestHandler,
  ControllerRegistry,
  IApiMessageResponse,
  routeConfig,
  TypedHandlers,
} from '@digitaldefiance/node-express-suite';
import { IBrightChainApplication } from '../../../interfaces/application';
import { IStatusCodeResponse } from '../../../interfaces/responses';
import {
  IConnectionListApiResponse,
  IConnectionListsApiResponse,
} from '../../../interfaces/responses/brighthub';
import { DefaultBackendIdType } from '../../../shared-types';
import {
  forbiddenError,
  handleError,
  notFoundError,
  validationError,
} from '../../../utils/errorResponse';
import { BaseController } from '../../base';

type ConnectionApiResponseType =
  | IConnectionListApiResponse
  | IConnectionListsApiResponse
  | IApiMessageResponse
  | ApiErrorResponse;

interface IConnectionHandlers extends TypedHandlers {
  // List management (21.3)
  createList: ApiRequestHandler<IConnectionListApiResponse | ApiErrorResponse>;
  getUserLists: ApiRequestHandler<
    IConnectionListsApiResponse | ApiErrorResponse
  >;
  updateList: ApiRequestHandler<IConnectionListApiResponse | ApiErrorResponse>;
  deleteList: ApiRequestHandler<IApiMessageResponse | ApiErrorResponse>;
  addMembers: ApiRequestHandler<IApiMessageResponse | ApiErrorResponse>;
  removeMembers: ApiRequestHandler<IApiMessageResponse | ApiErrorResponse>;
  getListMembers: ApiRequestHandler<IApiMessageResponse | ApiErrorResponse>;
  // Additional endpoints (21.4)
  getCategories: ApiRequestHandler<IApiMessageResponse | ApiErrorResponse>;
  addNote: ApiRequestHandler<IApiMessageResponse | ApiErrorResponse>;
  getSuggestions: ApiRequestHandler<IApiMessageResponse | ApiErrorResponse>;
  getMutualConnections: ApiRequestHandler<
    IApiMessageResponse | ApiErrorResponse
  >;
  setPriority: ApiRequestHandler<IApiMessageResponse | ApiErrorResponse>;
  setQuietMode: ApiRequestHandler<IApiMessageResponse | ApiErrorResponse>;
  setTemporaryMute: ApiRequestHandler<IApiMessageResponse | ApiErrorResponse>;
  exportConnections: ApiRequestHandler<IApiMessageResponse | ApiErrorResponse>;
  importConnections: ApiRequestHandler<IApiMessageResponse | ApiErrorResponse>;
  createHub: ApiRequestHandler<IApiMessageResponse | ApiErrorResponse>;
  getHubs: ApiRequestHandler<IApiMessageResponse | ApiErrorResponse>;
  addHubMembers: ApiRequestHandler<IApiMessageResponse | ApiErrorResponse>;
  removeHubMembers: ApiRequestHandler<IApiMessageResponse | ApiErrorResponse>;
  exploreHubs: ApiRequestHandler<IApiMessageResponse | ApiErrorResponse>;
  getHubDetail: ApiRequestHandler<IApiMessageResponse | ApiErrorResponse>;
  updateHub: ApiRequestHandler<IApiMessageResponse | ApiErrorResponse>;
  joinHub: ApiRequestHandler<IApiMessageResponse | ApiErrorResponse>;
  leaveHub: ApiRequestHandler<IApiMessageResponse | ApiErrorResponse>;
  addModerator: ApiRequestHandler<IApiMessageResponse | ApiErrorResponse>;
  removeModerator: ApiRequestHandler<IApiMessageResponse | ApiErrorResponse>;
  getSubHubs: ApiRequestHandler<IApiMessageResponse | ApiErrorResponse>;
  banFromHub: ApiRequestHandler<IApiMessageResponse | ApiErrorResponse>;
  unbanFromHub: ApiRequestHandler<IApiMessageResponse | ApiErrorResponse>;
  getBannedUsers: ApiRequestHandler<IApiMessageResponse | ApiErrorResponse>;
  getHubMembersList: ApiRequestHandler<IApiMessageResponse | ApiErrorResponse>;
  getHubLeaderboard: ApiRequestHandler<IApiMessageResponse | ApiErrorResponse>;
  removePostFromHub: ApiRequestHandler<IApiMessageResponse | ApiErrorResponse>;
  transferOwnership: ApiRequestHandler<IApiMessageResponse | ApiErrorResponse>;
  deleteHub: ApiRequestHandler<IApiMessageResponse | ApiErrorResponse>;
  bulkMembers: ApiRequestHandler<IApiMessageResponse | ApiErrorResponse>;
  getConnectionInsights: ApiRequestHandler<
    IApiMessageResponse | ApiErrorResponse
  >;
  getFollowRequests: ApiRequestHandler<IApiMessageResponse | ApiErrorResponse>;
  approveFollowRequest: ApiRequestHandler<
    IApiMessageResponse | ApiErrorResponse
  >;
  rejectFollowRequest: ApiRequestHandler<
    IApiMessageResponse | ApiErrorResponse
  >;
}

/**
 * Controller for BrightHub connection management operations.
 *
 * Provides REST API endpoints for connection lists, categories, hubs,
 * notes, suggestions, mutual connections, and follow requests.
 *
 * @requirements 34.1-34.22
 */
export class BrightHubConnectionController<
  TID extends PlatformID = DefaultBackendIdType,
> extends BaseController<
  TID,
  ConnectionApiResponseType,
  IConnectionHandlers,
  CoreLanguageCode
> {
  private connectionService: IConnectionService | null = null;
  private discoveryService: IDiscoveryService | null = null;
  private userProfileService: IUserProfileService | null = null;

  constructor(application: IBrightChainApplication<TID>) {
    super(application);
  }

  public setConnectionService(service: IConnectionService): void {
    this.connectionService = service;
  }

  public setDiscoveryService(service: IDiscoveryService): void {
    this.discoveryService = service;
  }

  public setUserProfileService(service: IUserProfileService): void {
    this.userProfileService = service;
  }

  private getConnectionService(): IConnectionService {
    if (!this.connectionService)
      throw new Error('ConnectionService not initialized');
    return this.connectionService;
  }

  private getDiscoveryService(): IDiscoveryService {
    if (!this.discoveryService)
      throw new Error('DiscoveryService not initialized');
    return this.discoveryService;
  }

  private getUserProfileService(): IUserProfileService {
    if (!this.userProfileService)
      throw new Error('UserProfileService not initialized');
    return this.userProfileService;
  }

  private mapConnectionError(
    error: ConnectionServiceError,
  ): IStatusCodeResponse<ApiErrorResponse> {
    switch (error.code) {
      case ConnectionServiceErrorCode.ListNotFound:
      case ConnectionServiceErrorCode.CategoryNotFound:
      case ConnectionServiceErrorCode.HubNotFound:
      case ConnectionServiceErrorCode.NoteNotFound:
        return notFoundError('Resource', 'unknown');
      case ConnectionServiceErrorCode.ListNotAuthorized:
      case ConnectionServiceErrorCode.CategoryNotAuthorized:
      case ConnectionServiceErrorCode.HubNotAuthorized:
        return forbiddenError(error.message);
      case ConnectionServiceErrorCode.ListLimitExceeded:
      case ConnectionServiceErrorCode.ListMemberLimitExceeded:
      case ConnectionServiceErrorCode.CategoryLimitExceeded:
      case ConnectionServiceErrorCode.HubLimitExceeded:
      case ConnectionServiceErrorCode.HubMemberLimitExceeded:
      case ConnectionServiceErrorCode.PriorityLimitExceeded:
      case ConnectionServiceErrorCode.NoteTooLong:
      case ConnectionServiceErrorCode.InvalidImportFormat:
      case ConnectionServiceErrorCode.ImportRateLimited:
      case ConnectionServiceErrorCode.AlreadyHubMember:
      case ConnectionServiceErrorCode.InvalidHubName:
      case ConnectionServiceErrorCode.InvalidListName:
      case ConnectionServiceErrorCode.InvalidCategoryName:
      case ConnectionServiceErrorCode.InvalidNoteContent:
      case ConnectionServiceErrorCode.AlreadyMember:
      case ConnectionServiceErrorCode.NotMember:
      case ConnectionServiceErrorCode.CategoryAlreadyAssigned:
      case ConnectionServiceErrorCode.CategoryNotAssigned:
      case ConnectionServiceErrorCode.CannotDeleteDefaultCategory:
      case ConnectionServiceErrorCode.DuplicateCategoryName:
      case ConnectionServiceErrorCode.CannotDeleteDefaultHub:
      case ConnectionServiceErrorCode.ListNotPublic:
      case ConnectionServiceErrorCode.AlreadyFollowingList:
      case ConnectionServiceErrorCode.NotFollowingList:
        return validationError(error.message);
      default:
        return handleError(error);
    }
  }

  private parsePaginationOptions(
    query: Record<string, string | undefined>,
  ): IPaginationOptions {
    const options: IPaginationOptions = {};
    if (query['cursor']) options.cursor = query['cursor'];
    if (query['limit']) options.limit = parseInt(query['limit'], 10);
    return options;
  }

  protected initRouteDefinitions(): void {
    this.routeDefinitions = [
      // ── List Management (21.3) ──
      routeConfig('post', '/lists', {
        handlerKey: 'createList',
        useAuthentication: true,
        useCryptoAuthentication: false,
        openapi: {
          summary: 'Create a connection list',
          tags: ['BrightHub Connections'],
          responses: {
            201: {
              schema: 'ConnectionListResponse',
              description: 'List created',
            },
          },
        },
      }),
      routeConfig('get', '/lists', {
        handlerKey: 'getUserLists',
        useAuthentication: true,
        useCryptoAuthentication: false,
        openapi: {
          summary: "Get user's connection lists",
          tags: ['BrightHub Connections'],
          responses: {
            200: {
              schema: 'ConnectionListsResponse',
              description: 'Lists retrieved',
            },
          },
        },
      }),
      routeConfig('put', '/lists/:id', {
        handlerKey: 'updateList',
        useAuthentication: true,
        useCryptoAuthentication: false,
        openapi: {
          summary: 'Update a connection list',
          tags: ['BrightHub Connections'],
          responses: {
            200: {
              schema: 'ConnectionListResponse',
              description: 'List updated',
            },
          },
        },
      }),
      routeConfig('delete', '/lists/:id', {
        handlerKey: 'deleteList',
        useAuthentication: true,
        useCryptoAuthentication: false,
        openapi: {
          summary: 'Delete a connection list',
          tags: ['BrightHub Connections'],
          responses: {
            204: { schema: 'EmptyResponse', description: 'List deleted' },
          },
        },
      }),
      routeConfig('post', '/lists/:id/members', {
        handlerKey: 'addMembers',
        useAuthentication: true,
        useCryptoAuthentication: false,
        openapi: {
          summary: 'Add members to a list',
          tags: ['BrightHub Connections'],
          responses: {
            200: { schema: 'MessageResponse', description: 'Members added' },
          },
        },
      }),
      routeConfig('delete', '/lists/:id/members', {
        handlerKey: 'removeMembers',
        useAuthentication: true,
        useCryptoAuthentication: false,
        openapi: {
          summary: 'Remove members from a list',
          tags: ['BrightHub Connections'],
          responses: {
            200: { schema: 'MessageResponse', description: 'Members removed' },
          },
        },
      }),
      routeConfig('get', '/lists/:id/members', {
        handlerKey: 'getListMembers',
        useAuthentication: true,
        useCryptoAuthentication: false,
        openapi: {
          summary: 'Get list members',
          tags: ['BrightHub Connections'],
          responses: {
            200: {
              schema: 'PaginatedResponse',
              description: 'Members retrieved',
            },
          },
        },
      }),
      // ── Additional Endpoints (21.4) ──
      routeConfig('get', '/connections/categories', {
        handlerKey: 'getCategories',
        useAuthentication: true,
        useCryptoAuthentication: false,
        openapi: {
          summary: 'Get connection categories',
          tags: ['BrightHub Connections'],
          responses: {
            200: {
              schema: 'CategoriesResponse',
              description: 'Categories retrieved',
            },
          },
        },
      }),
      routeConfig('post', '/connections/:id/note', {
        handlerKey: 'addNote',
        useAuthentication: true,
        useCryptoAuthentication: false,
        openapi: {
          summary: 'Add a note to a connection',
          tags: ['BrightHub Connections'],
          responses: {
            200: { schema: 'MessageResponse', description: 'Note added' },
          },
        },
      }),
      routeConfig('get', '/connections/suggestions', {
        handlerKey: 'getSuggestions',
        useAuthentication: true,
        useCryptoAuthentication: false,
        openapi: {
          summary: 'Get connection suggestions',
          tags: ['BrightHub Connections'],
          responses: {
            200: {
              schema: 'SuggestionsResponse',
              description: 'Suggestions retrieved',
            },
          },
        },
      }),
      routeConfig('get', '/connections/mutual/:userId', {
        handlerKey: 'getMutualConnections',
        useAuthentication: true,
        useCryptoAuthentication: false,
        openapi: {
          summary: 'Get mutual connections',
          tags: ['BrightHub Connections'],
          responses: {
            200: {
              schema: 'PaginatedResponse',
              description: 'Mutual connections retrieved',
            },
          },
        },
      }),
      routeConfig('post', '/connections/:id/priority', {
        handlerKey: 'setPriority',
        useAuthentication: true,
        useCryptoAuthentication: false,
        openapi: {
          summary: 'Set connection priority',
          tags: ['BrightHub Connections'],
          responses: {
            200: { schema: 'MessageResponse', description: 'Priority updated' },
          },
        },
      }),
      routeConfig('post', '/connections/:id/quiet', {
        handlerKey: 'setQuietMode',
        useAuthentication: true,
        useCryptoAuthentication: false,
        openapi: {
          summary: 'Set quiet mode for connection',
          tags: ['BrightHub Connections'],
          responses: {
            200: {
              schema: 'MessageResponse',
              description: 'Quiet mode updated',
            },
          },
        },
      }),
      routeConfig('post', '/connections/:id/mute/temporary', {
        handlerKey: 'setTemporaryMute',
        useAuthentication: true,
        useCryptoAuthentication: false,
        openapi: {
          summary: 'Set temporary mute for connection',
          tags: ['BrightHub Connections'],
          responses: {
            200: {
              schema: 'MessageResponse',
              description: 'Temporary mute set',
            },
          },
        },
      }),
      routeConfig('get', '/connections/export', {
        handlerKey: 'exportConnections',
        useAuthentication: true,
        useCryptoAuthentication: false,
        openapi: {
          summary: 'Export connections',
          tags: ['BrightHub Connections'],
          responses: {
            200: {
              schema: 'ExportResponse',
              description: 'Connections exported',
            },
          },
        },
      }),
      routeConfig('post', '/connections/import', {
        handlerKey: 'importConnections',
        useAuthentication: true,
        useCryptoAuthentication: false,
        openapi: {
          summary: 'Import connections',
          tags: ['BrightHub Connections'],
          responses: {
            200: {
              schema: 'ImportResponse',
              description: 'Connections imported',
            },
          },
        },
      }),
      routeConfig('post', '/hubs', {
        handlerKey: 'createHub',
        useAuthentication: true,
        useCryptoAuthentication: false,
        openapi: {
          summary: 'Create a hub',
          tags: ['BrightHub Connections'],
          responses: {
            201: { schema: 'HubResponse', description: 'Hub created' },
          },
        },
      }),
      routeConfig('get', '/hubs', {
        handlerKey: 'getHubs',
        useAuthentication: true,
        useCryptoAuthentication: false,
        openapi: {
          summary: "Get user's hubs",
          tags: ['BrightHub Connections'],
          responses: {
            200: {
              schema: 'HubsResponse',
              description: 'Hubs retrieved',
            },
          },
        },
      }),
      routeConfig('post', '/hubs/:id/members', {
        handlerKey: 'addHubMembers',
        useAuthentication: true,
        useCryptoAuthentication: false,
        openapi: {
          summary: 'Add members to a hub',
          tags: ['BrightHub Connections'],
          responses: {
            200: {
              schema: 'MessageResponse',
              description: 'Members added to hub',
            },
          },
        },
      }),
      routeConfig('delete', '/hubs/:id/members', {
        handlerKey: 'removeHubMembers',
        useAuthentication: true,
        useCryptoAuthentication: false,
        openapi: {
          summary: 'Remove members from a hub',
          tags: ['BrightHub Connections'],
          responses: {
            200: {
              schema: 'MessageResponse',
              description: 'Members removed from hub',
            },
          },
        },
      }),
      routeConfig('get', '/hubs/explore', {
        handlerKey: 'exploreHubs',
        useAuthentication: false,
        useCryptoAuthentication: false,
        openapi: {
          summary: 'Explore and discover public hubs',
          tags: ['BrightHub Hubs'],
          responses: {
            200: { schema: 'HubsResponse', description: 'Hubs retrieved' },
          },
        },
      }),
      routeConfig('get', '/hubs/:idOrSlug', {
        handlerKey: 'getHubDetail',
        useAuthentication: false,
        useCryptoAuthentication: false,
        openapi: {
          summary: 'Get hub detail by ID or slug',
          tags: ['BrightHub Hubs'],
          responses: {
            200: { schema: 'HubResponse', description: 'Hub retrieved' },
            404: { schema: 'ErrorResponse', description: 'Hub not found' },
          },
        },
      }),
      routeConfig('put', '/hubs/:id', {
        handlerKey: 'updateHub',
        useAuthentication: true,
        useCryptoAuthentication: false,
        openapi: {
          summary: 'Update hub settings',
          tags: ['BrightHub Hubs'],
          responses: {
            200: { schema: 'HubResponse', description: 'Hub updated' },
          },
        },
      }),
      routeConfig('post', '/hubs/:idOrSlug/join', {
        handlerKey: 'joinHub',
        useAuthentication: true,
        useCryptoAuthentication: false,
        openapi: {
          summary: 'Join a hub',
          tags: ['BrightHub Hubs'],
          responses: {
            200: { schema: 'MessageResponse', description: 'Joined hub' },
          },
        },
      }),
      routeConfig('post', '/hubs/:idOrSlug/leave', {
        handlerKey: 'leaveHub',
        useAuthentication: true,
        useCryptoAuthentication: false,
        openapi: {
          summary: 'Leave a hub',
          tags: ['BrightHub Hubs'],
          responses: {
            200: { schema: 'MessageResponse', description: 'Left hub' },
          },
        },
      }),
      routeConfig('post', '/hubs/:id/moderators', {
        handlerKey: 'addModerator',
        useAuthentication: true,
        useCryptoAuthentication: false,
        openapi: {
          summary: 'Add a moderator to a hub',
          tags: ['BrightHub Hubs'],
          responses: {
            200: { schema: 'MessageResponse', description: 'Moderator added' },
          },
        },
      }),
      routeConfig('delete', '/hubs/:id/moderators', {
        handlerKey: 'removeModerator',
        useAuthentication: true,
        useCryptoAuthentication: false,
        openapi: {
          summary: 'Remove a moderator from a hub',
          tags: ['BrightHub Hubs'],
          responses: {
            200: {
              schema: 'MessageResponse',
              description: 'Moderator removed',
            },
          },
        },
      }),
      routeConfig('get', '/hubs/:id/sub-hubs', {
        handlerKey: 'getSubHubs',
        useAuthentication: false,
        useCryptoAuthentication: false,
        openapi: {
          summary: 'Get sub-hubs of a hub',
          tags: ['BrightHub Hubs'],
          responses: {
            200: { schema: 'HubsResponse', description: 'Sub-hubs retrieved' },
          },
        },
      }),
      routeConfig('post', '/hubs/:id/ban', {
        handlerKey: 'banFromHub',
        useAuthentication: true,
        useCryptoAuthentication: false,
        openapi: {
          summary: 'Ban a user from a hub',
          tags: ['BrightHub Hubs'],
          responses: {
            200: { schema: 'MessageResponse', description: 'User banned' },
          },
        },
      }),
      routeConfig('post', '/hubs/:id/unban', {
        handlerKey: 'unbanFromHub',
        useAuthentication: true,
        useCryptoAuthentication: false,
        openapi: {
          summary: 'Unban a user from a hub',
          tags: ['BrightHub Hubs'],
          responses: {
            200: { schema: 'MessageResponse', description: 'User unbanned' },
          },
        },
      }),
      routeConfig('get', '/hubs/:id/banned', {
        handlerKey: 'getBannedUsers',
        useAuthentication: true,
        useCryptoAuthentication: false,
        openapi: {
          summary: 'Get banned users list for a hub',
          tags: ['BrightHub Hubs'],
          responses: {
            200: { schema: 'MessageResponse', description: 'Banned users retrieved' },
          },
        },
      }),
      routeConfig('get', '/hubs/:id/members-list', {
        handlerKey: 'getHubMembersList',
        useAuthentication: false,
        useCryptoAuthentication: false,
        openapi: {
          summary: 'Get hub members with profiles',
          tags: ['BrightHub Hubs'],
          responses: {
            200: { schema: 'MessageResponse', description: 'Members retrieved' },
          },
        },
      }),
      routeConfig('get', '/hubs/:id/leaderboard', {
        handlerKey: 'getHubLeaderboard',
        useAuthentication: false,
        useCryptoAuthentication: false,
        openapi: {
          summary: 'Get hub reputation leaderboard',
          tags: ['BrightHub Hubs'],
          responses: {
            200: { schema: 'MessageResponse', description: 'Leaderboard retrieved' },
          },
        },
      }),
      routeConfig('post', '/hubs/:id/remove-post', {
        handlerKey: 'removePostFromHub',
        useAuthentication: true,
        useCryptoAuthentication: false,
        openapi: {
          summary: 'Remove a post from a hub (moderator action)',
          tags: ['BrightHub Hubs'],
          responses: {
            200: { schema: 'MessageResponse', description: 'Post removed from hub' },
          },
        },
      }),
      routeConfig('post', '/hubs/:id/transfer', {
        handlerKey: 'transferOwnership',
        useAuthentication: true,
        useCryptoAuthentication: false,
        openapi: {
          summary: 'Transfer hub ownership',
          tags: ['BrightHub Hubs'],
          responses: {
            200: { schema: 'HubResponse', description: 'Ownership transferred' },
          },
        },
      }),
      routeConfig('delete', '/hubs/:id', {
        handlerKey: 'deleteHub',
        useAuthentication: true,
        useCryptoAuthentication: false,
        openapi: {
          summary: 'Delete a hub (owner only)',
          tags: ['BrightHub Hubs'],
          responses: {
            204: { schema: 'EmptyResponse', description: 'Hub deleted' },
          },
        },
      }),
      routeConfig('post', '/lists/:id/members/bulk', {
        handlerKey: 'bulkMembers',
        useAuthentication: true,
        useCryptoAuthentication: false,
        openapi: {
          summary: 'Bulk add or remove members from a list',
          tags: ['BrightHub Connections'],
          responses: {
            200: {
              schema: 'MessageResponse',
              description: 'Bulk operation complete',
            },
          },
        },
      }),
      routeConfig('get', '/connections/:id/insights', {
        handlerKey: 'getConnectionInsights',
        useAuthentication: true,
        useCryptoAuthentication: false,
        openapi: {
          summary: 'Get connection insights',
          tags: ['BrightHub Connections'],
          responses: {
            200: {
              schema: 'InsightsResponse',
              description: 'Insights retrieved',
            },
          },
        },
      }),
      routeConfig('get', '/follow-requests', {
        handlerKey: 'getFollowRequests',
        useAuthentication: true,
        useCryptoAuthentication: false,
        openapi: {
          summary: 'Get pending follow requests',
          tags: ['BrightHub Connections'],
          responses: {
            200: {
              schema: 'FollowRequestsResponse',
              description: 'Follow requests retrieved',
            },
          },
        },
      }),
      routeConfig('post', '/follow-requests/:id/approve', {
        handlerKey: 'approveFollowRequest',
        useAuthentication: true,
        useCryptoAuthentication: false,
        openapi: {
          summary: 'Approve a follow request',
          tags: ['BrightHub Connections'],
          responses: {
            200: { schema: 'MessageResponse', description: 'Request approved' },
          },
        },
      }),
      routeConfig('post', '/follow-requests/:id/reject', {
        handlerKey: 'rejectFollowRequest',
        useAuthentication: true,
        useCryptoAuthentication: false,
        openapi: {
          summary: 'Reject a follow request',
          tags: ['BrightHub Connections'],
          responses: {
            200: { schema: 'MessageResponse', description: 'Request rejected' },
          },
        },
      }),
    ];

    ControllerRegistry.register(
      '/brighthub',
      'BrightHubConnectionController',
      this.routeDefinitions,
    );

    this.handlers = {
      createList: this.handleCreateList.bind(this),
      getUserLists: this.handleGetUserLists.bind(this),
      updateList: this.handleUpdateList.bind(this),
      deleteList: this.handleDeleteList.bind(this),
      addMembers: this.handleAddMembers.bind(this),
      removeMembers: this.handleRemoveMembers.bind(this),
      getListMembers: this.handleGetListMembers.bind(this),
      getCategories: this.handleGetCategories.bind(this),
      addNote: this.handleAddNote.bind(this),
      getSuggestions: this.handleGetSuggestions.bind(this),
      getMutualConnections: this.handleGetMutualConnections.bind(this),
      setPriority: this.handleSetPriority.bind(this),
      setQuietMode: this.handleSetQuietMode.bind(this),
      setTemporaryMute: this.handleSetTemporaryMute.bind(this),
      exportConnections: this.handleExportConnections.bind(this),
      importConnections: this.handleImportConnections.bind(this),
      createHub: this.handleCreateHub.bind(this),
      getHubs: this.handleGetHubs.bind(this),
      addHubMembers: this.handleAddHubMembers.bind(this),
      removeHubMembers: this.handleRemoveHubMembers.bind(this),
      exploreHubs: this.handleExploreHubs.bind(this),
      getHubDetail: this.handleGetHubDetail.bind(this),
      updateHub: this.handleUpdateHub.bind(this),
      joinHub: this.handleJoinHub.bind(this),
      leaveHub: this.handleLeaveHub.bind(this),
      addModerator: this.handleAddModerator.bind(this),
      removeModerator: this.handleRemoveModerator.bind(this),
      getSubHubs: this.handleGetSubHubs.bind(this),
      banFromHub: this.handleBanFromHub.bind(this),
      unbanFromHub: this.handleUnbanFromHub.bind(this),
      getBannedUsers: this.handleGetBannedUsers.bind(this),
      getHubMembersList: this.handleGetHubMembersList.bind(this),
      getHubLeaderboard: this.handleGetHubLeaderboard.bind(this),
      removePostFromHub: this.handleRemovePostFromHub.bind(this),
      transferOwnership: this.handleTransferOwnership.bind(this),
      deleteHub: this.handleDeleteHub.bind(this),
      bulkMembers: this.handleBulkMembers.bind(this),
      getConnectionInsights: this.handleGetConnectionInsights.bind(this),
      getFollowRequests: this.handleGetFollowRequests.bind(this),
      approveFollowRequest: this.handleApproveFollowRequest.bind(this),
      rejectFollowRequest: this.handleRejectFollowRequest.bind(this),
    };
  }

  // ═══════════════════════════════════════════════════════
  // List Management Handlers (21.3)
  // ═══════════════════════════════════════════════════════

  private async handleCreateList(
    req: unknown,
  ): Promise<
    IStatusCodeResponse<IConnectionListApiResponse | ApiErrorResponse>
  > {
    try {
      const { ownerId, name, description, visibility } = (
        req as {
          body: {
            ownerId: string;
            name: string;
            description?: string;
            visibility?: string;
          };
        }
      ).body;
      if (!ownerId) return validationError('Missing required field: ownerId');
      if (!name) return validationError('Missing required field: name');

      const list = await this.getConnectionService().createList(ownerId, name, {
        description,
        visibility: visibility as never,
      });
      return {
        statusCode: 201,
        response: { message: 'List created', data: list },
      };
    } catch (error) {
      if (error instanceof ConnectionServiceError)
        return this.mapConnectionError(error);
      return handleError(error);
    }
  }

  private async handleGetUserLists(
    req: unknown,
  ): Promise<
    IStatusCodeResponse<IConnectionListsApiResponse | ApiErrorResponse>
  > {
    try {
      const typedReq = req as { query: Record<string, string | undefined> };
      const userId = typedReq.query['userId'] ?? typedReq.query['ownerId'];
      if (!userId)
        return validationError(
          'Missing required query parameter: userId or ownerId',
        );

      const options = this.parsePaginationOptions(typedReq.query);
      const result = await this.getConnectionService().getUserLists(
        userId,
        options,
      );
      return {
        statusCode: 200,
        response: {
          message: 'OK',
          data: {
            lists: result.items,
            cursor: result.cursor,
            hasMore: result.hasMore,
          },
        },
      };
    } catch (error) {
      if (error instanceof ConnectionServiceError)
        return this.mapConnectionError(error);
      return handleError(error);
    }
  }

  private async handleUpdateList(
    req: unknown,
  ): Promise<
    IStatusCodeResponse<IConnectionListApiResponse | ApiErrorResponse>
  > {
    try {
      const { id } = (req as { params: { id: string } }).params;
      const { ownerId, name, description, visibility } = (
        req as {
          body: {
            ownerId: string;
            name?: string;
            description?: string;
            visibility?: string;
          };
          params: { id: string };
        }
      ).body;
      if (!id) return validationError('Missing required parameter: id');
      if (!ownerId) return validationError('Missing required field: ownerId');

      const updates: Record<string, unknown> = {};
      if (name !== undefined) updates['name'] = name;
      if (description !== undefined) updates['description'] = description;
      if (visibility !== undefined) updates['visibility'] = visibility;

      const list = await this.getConnectionService().updateList(
        id,
        ownerId,
        updates as never,
      );
      return {
        statusCode: 200,
        response: { message: 'List updated', data: list },
      };
    } catch (error) {
      if (error instanceof ConnectionServiceError)
        return this.mapConnectionError(error);
      return handleError(error);
    }
  }

  private async handleDeleteList(
    req: unknown,
  ): Promise<IStatusCodeResponse<IApiMessageResponse | ApiErrorResponse>> {
    try {
      const { id } = (req as { params: { id: string } }).params;
      const { ownerId } = (
        req as { body: { ownerId: string }; params: { id: string } }
      ).body;
      if (!id) return validationError('Missing required parameter: id');
      if (!ownerId) return validationError('Missing required field: ownerId');

      await this.getConnectionService().deleteList(id, ownerId);
      return { statusCode: 204, response: { message: 'List deleted' } };
    } catch (error) {
      if (error instanceof ConnectionServiceError)
        return this.mapConnectionError(error);
      return handleError(error);
    }
  }

  private async handleAddMembers(
    req: unknown,
  ): Promise<IStatusCodeResponse<IApiMessageResponse | ApiErrorResponse>> {
    try {
      const { id } = (req as { params: { id: string } }).params;
      const { ownerId, userIds } = (
        req as {
          body: { ownerId: string; userIds: string[] };
          params: { id: string };
        }
      ).body;
      if (!id) return validationError('Missing required parameter: id');
      if (!ownerId) return validationError('Missing required field: ownerId');
      if (!userIds || !Array.isArray(userIds))
        return validationError('Missing required field: userIds (array)');

      await this.getConnectionService().addMembersToList(id, ownerId, userIds);
      return { statusCode: 200, response: { message: 'Members added' } };
    } catch (error) {
      if (error instanceof ConnectionServiceError)
        return this.mapConnectionError(error);
      return handleError(error);
    }
  }

  private async handleRemoveMembers(
    req: unknown,
  ): Promise<IStatusCodeResponse<IApiMessageResponse | ApiErrorResponse>> {
    try {
      const { id } = (req as { params: { id: string } }).params;
      const { ownerId, userIds } = (
        req as {
          body: { ownerId: string; userIds: string[] };
          params: { id: string };
        }
      ).body;
      if (!id) return validationError('Missing required parameter: id');
      if (!ownerId) return validationError('Missing required field: ownerId');
      if (!userIds || !Array.isArray(userIds))
        return validationError('Missing required field: userIds (array)');

      await this.getConnectionService().removeMembersFromList(
        id,
        ownerId,
        userIds,
      );
      return { statusCode: 200, response: { message: 'Members removed' } };
    } catch (error) {
      if (error instanceof ConnectionServiceError)
        return this.mapConnectionError(error);
      return handleError(error);
    }
  }

  private async handleGetListMembers(
    req: unknown,
  ): Promise<IStatusCodeResponse<IApiMessageResponse | ApiErrorResponse>> {
    try {
      const { id } = (req as { params: { id: string } }).params;
      if (!id) return validationError('Missing required parameter: id');

      const typedReq = req as {
        query: Record<string, string | undefined>;
        params: { id: string };
      };
      const options = this.parsePaginationOptions(typedReq.query);
      const result = await this.getConnectionService().getListMembers(
        id,
        options,
      );
      return {
        statusCode: 200,
        response: { message: 'OK', data: result } as IApiMessageResponse,
      };
    } catch (error) {
      if (error instanceof ConnectionServiceError)
        return this.mapConnectionError(error);
      return handleError(error);
    }
  }

  // ═══════════════════════════════════════════════════════
  // Additional Endpoint Handlers (21.4)
  // ═══════════════════════════════════════════════════════

  private async handleGetCategories(
    req: unknown,
  ): Promise<IStatusCodeResponse<IApiMessageResponse | ApiErrorResponse>> {
    try {
      const typedReq = req as { query: Record<string, string | undefined> };
      const userId = typedReq.query['userId'] ?? typedReq.query['ownerId'];
      if (!userId)
        return validationError(
          'Missing required query parameter: userId or ownerId',
        );

      const categories =
        await this.getConnectionService().getDefaultCategories(userId);
      return {
        statusCode: 200,
        response: { message: 'OK', data: categories } as IApiMessageResponse,
      };
    } catch (error) {
      if (error instanceof ConnectionServiceError)
        return this.mapConnectionError(error);
      return handleError(error);
    }
  }

  private async handleAddNote(
    req: unknown,
  ): Promise<IStatusCodeResponse<IApiMessageResponse | ApiErrorResponse>> {
    try {
      const { id } = (req as { params: { id: string } }).params;
      const { userId, note } = (
        req as {
          body: { userId: string; note: string };
          params: { id: string };
        }
      ).body;
      if (!id) return validationError('Missing required parameter: id');
      if (!userId) return validationError('Missing required field: userId');
      if (!note) return validationError('Missing required field: note');

      await this.getConnectionService().addNote(userId, id, note);
      return { statusCode: 200, response: { message: 'Note added' } };
    } catch (error) {
      if (error instanceof ConnectionServiceError)
        return this.mapConnectionError(error);
      return handleError(error);
    }
  }

  private async handleGetSuggestions(
    req: unknown,
  ): Promise<IStatusCodeResponse<IApiMessageResponse | ApiErrorResponse>> {
    try {
      const typedReq = req as { query: Record<string, string | undefined> };
      const userId = typedReq.query['userId'];
      if (!userId)
        return validationError('Missing required query parameter: userId');

      const limit = typedReq.query['limit']
        ? parseInt(typedReq.query['limit'], 10)
        : undefined;
      const cursor = typedReq.query['cursor'];
      const result = await this.getDiscoveryService().getSuggestions(userId, {
        limit,
        cursor,
      });
      return {
        statusCode: 200,
        response: {
          message: 'OK',
          data: {
            suggestions: result.items,
            cursor: result.cursor,
            hasMore: result.hasMore,
          },
        } as IApiMessageResponse,
      };
    } catch (error) {
      return handleError(error);
    }
  }

  private async handleGetMutualConnections(
    req: unknown,
  ): Promise<IStatusCodeResponse<IApiMessageResponse | ApiErrorResponse>> {
    try {
      const { userId: targetUserId } = (req as { params: { userId: string } })
        .params;
      const typedReq = req as {
        query: Record<string, string | undefined>;
        params: { userId: string };
      };
      const userId = typedReq.query['userId'];
      if (!userId)
        return validationError('Missing required query parameter: userId');
      if (!targetUserId)
        return validationError('Missing required parameter: userId');

      const options = this.parsePaginationOptions(typedReq.query);
      const result = await this.getConnectionService().getMutualConnections(
        userId,
        targetUserId,
        options,
      );
      return {
        statusCode: 200,
        response: {
          message: 'OK',
          data: {
            mutualConnections: result.items,
            cursor: result.cursor,
            hasMore: result.hasMore,
          },
        } as IApiMessageResponse,
      };
    } catch (error) {
      if (error instanceof ConnectionServiceError)
        return this.mapConnectionError(error);
      return handleError(error);
    }
  }

  private async handleSetPriority(
    req: unknown,
  ): Promise<IStatusCodeResponse<IApiMessageResponse | ApiErrorResponse>> {
    try {
      const { id } = (req as { params: { id: string } }).params;
      const { userId, isPriority } = (
        req as {
          body: { userId: string; isPriority: boolean };
          params: { id: string };
        }
      ).body;
      if (!id) return validationError('Missing required parameter: id');
      if (!userId) return validationError('Missing required field: userId');
      if (isPriority === undefined)
        return validationError('Missing required field: isPriority');

      await this.getConnectionService().setPriority(userId, id, isPriority);
      return {
        statusCode: 200,
        response: { message: isPriority ? 'Priority set' : 'Priority removed' },
      };
    } catch (error) {
      if (error instanceof ConnectionServiceError)
        return this.mapConnectionError(error);
      return handleError(error);
    }
  }

  private async handleSetQuietMode(
    req: unknown,
  ): Promise<IStatusCodeResponse<IApiMessageResponse | ApiErrorResponse>> {
    try {
      const { id } = (req as { params: { id: string } }).params;
      const { userId, isQuiet } = (
        req as {
          body: { userId: string; isQuiet: boolean };
          params: { id: string };
        }
      ).body;
      if (!id) return validationError('Missing required parameter: id');
      if (!userId) return validationError('Missing required field: userId');
      if (isQuiet === undefined)
        return validationError('Missing required field: isQuiet');

      await this.getConnectionService().setQuietMode(userId, id, isQuiet);
      return {
        statusCode: 200,
        response: {
          message: isQuiet ? 'Quiet mode enabled' : 'Quiet mode disabled',
        },
      };
    } catch (error) {
      if (error instanceof ConnectionServiceError)
        return this.mapConnectionError(error);
      return handleError(error);
    }
  }

  private async handleSetTemporaryMute(
    req: unknown,
  ): Promise<IStatusCodeResponse<IApiMessageResponse | ApiErrorResponse>> {
    try {
      const { id } = (req as { params: { id: string } }).params;
      const { userId, duration } = (
        req as {
          body: { userId: string; duration: MuteDuration };
          params: { id: string };
        }
      ).body;
      if (!id) return validationError('Missing required parameter: id');
      if (!userId) return validationError('Missing required field: userId');
      if (!duration) return validationError('Missing required field: duration');

      await this.getConnectionService().setTemporaryMute(userId, id, duration);
      return { statusCode: 200, response: { message: 'Temporary mute set' } };
    } catch (error) {
      if (error instanceof ConnectionServiceError)
        return this.mapConnectionError(error);
      return handleError(error);
    }
  }

  private async handleExportConnections(
    req: unknown,
  ): Promise<IStatusCodeResponse<IApiMessageResponse | ApiErrorResponse>> {
    try {
      const typedReq = req as { query: Record<string, string | undefined> };
      const userId = typedReq.query['userId'];
      if (!userId)
        return validationError('Missing required query parameter: userId');

      const exportData =
        await this.getConnectionService().exportConnections(userId);
      return {
        statusCode: 200,
        response: { message: 'OK', data: exportData } as IApiMessageResponse,
      };
    } catch (error) {
      if (error instanceof ConnectionServiceError)
        return this.mapConnectionError(error);
      return handleError(error);
    }
  }

  private async handleImportConnections(
    req: unknown,
  ): Promise<IStatusCodeResponse<IApiMessageResponse | ApiErrorResponse>> {
    try {
      const { userId, data, format } = (
        req as {
          body: { userId: string; data: unknown; format?: 'json' | 'csv' };
        }
      ).body;
      if (!userId) return validationError('Missing required field: userId');
      if (!data) return validationError('Missing required field: data');

      // The service expects data as a JSON string, but Express parses the body
      // so data arrives as an object. Stringify it for the service.
      const dataStr = typeof data === 'string' ? data : JSON.stringify(data);

      const result = await this.getConnectionService().importConnections(
        userId,
        dataStr,
        format ?? 'json',
      );
      return {
        statusCode: 200,
        response: {
          message: 'Import complete',
          data: {
            ...result,
            imported: result.successCount,
            successful: result.successCount,
            created: result.successCount,
          },
        } as IApiMessageResponse,
      };
    } catch (error) {
      if (error instanceof ConnectionServiceError)
        return this.mapConnectionError(error);
      return handleError(error);
    }
  }

  private async handleCreateHub(
    req: unknown,
  ): Promise<IStatusCodeResponse<IApiMessageResponse | ApiErrorResponse>> {
    try {
      const { ownerId, name, slug, description, rules, trustTier, parentHubId, icon } = (
        req as {
          body: {
            ownerId: string;
            name: string;
            slug?: string;
            description?: string;
            rules?: string;
            trustTier?: string;
            parentHubId?: string;
            icon?: string;
          };
        }
      ).body;
      if (!ownerId) return validationError('Missing required field: ownerId');
      if (!name) return validationError('Missing required field: name');

      const hub = await this.getConnectionService().createHub(ownerId, name, {
        slug,
        description,
        rules,
        trustTier,
        parentHubId,
        icon,
      });
      return {
        statusCode: 201,
        response: {
          message: 'Hub created',
          data: hub,
        } as IApiMessageResponse,
      };
    } catch (error) {
      if (error instanceof ConnectionServiceError)
        return this.mapConnectionError(error);
      return handleError(error);
    }
  }

  private async handleGetHubs(
    req: unknown,
  ): Promise<IStatusCodeResponse<IApiMessageResponse | ApiErrorResponse>> {
    try {
      const typedReq = req as { query: Record<string, string | undefined> };
      const userId = typedReq.query['userId'] ?? typedReq.query['ownerId'];
      if (!userId)
        return validationError(
          'Missing required query parameter: userId or ownerId',
        );

      const service = this.getConnectionService();
      // Return subscribed hubs (hubs the user is a member of)
      const result = await service.getUserSubscribedHubs(userId);
      return {
        statusCode: 200,
        response: { message: 'OK', data: result } as IApiMessageResponse,
      };
    } catch (error) {
      if (error instanceof ConnectionServiceError)
        return this.mapConnectionError(error);
      return handleError(error);
    }
  }

  private async handleAddHubMembers(
    req: unknown,
  ): Promise<IStatusCodeResponse<IApiMessageResponse | ApiErrorResponse>> {
    try {
      const { id } = (req as { params: { id: string } }).params;
      const { ownerId, userIds } = (
        req as {
          body: { ownerId: string; userIds: string[] };
          params: { id: string };
        }
      ).body;
      if (!id) return validationError('Missing required parameter: id');
      if (!ownerId) return validationError('Missing required field: ownerId');
      if (!userIds || !Array.isArray(userIds))
        return validationError('Missing required field: userIds (array)');

      await this.getConnectionService().addToHub(id, ownerId, userIds);
      return { statusCode: 200, response: { message: 'Members added to hub' } };
    } catch (error) {
      if (error instanceof ConnectionServiceError)
        return this.mapConnectionError(error);
      return handleError(error);
    }
  }

  private async handleRemoveHubMembers(
    req: unknown,
  ): Promise<IStatusCodeResponse<IApiMessageResponse | ApiErrorResponse>> {
    try {
      const { id } = (req as { params: { id: string } }).params;
      const { ownerId, userIds } = (
        req as {
          body: { ownerId: string; userIds: string[] };
          params: { id: string };
        }
      ).body;
      if (!id) return validationError('Missing required parameter: id');
      if (!ownerId) return validationError('Missing required field: ownerId');
      if (!userIds || !Array.isArray(userIds))
        return validationError('Missing required field: userIds (array)');

      await this.getConnectionService().removeFromHub(id, ownerId, userIds);
      return {
        statusCode: 200,
        response: { message: 'Members removed from hub' },
      };
    } catch (error) {
      if (error instanceof ConnectionServiceError)
        return this.mapConnectionError(error);
      return handleError(error);
    }
  }

  // ═══════════════════════════════════════════════════════
  // New Hub Community Handlers
  // ═══════════════════════════════════════════════════════

  private async handleExploreHubs(
    req: unknown,
  ): Promise<IStatusCodeResponse<IApiMessageResponse | ApiErrorResponse>> {
    try {
      const typedReq = req as { query: Record<string, string | undefined> };
      const sort = (typedReq.query['sort'] as 'trending' | 'new' | 'suggested') ?? 'trending';
      const query = typedReq.query['q'];
      const limit = typedReq.query['limit'] ? parseInt(typedReq.query['limit'], 10) : undefined;
      const userId = typedReq.query['userId'];

      const service = this.getConnectionService();
      const hubs = await service.exploreHubs({ sort, query, limit, userId: userId ?? undefined });
      return {
        statusCode: 200,
        response: { message: 'OK', data: { hubs } } as IApiMessageResponse,
      };
    } catch (error) {
      if (error instanceof ConnectionServiceError)
        return this.mapConnectionError(error);
      return handleError(error);
    }
  }

  private async handleGetHubDetail(
    req: unknown,
  ): Promise<IStatusCodeResponse<IApiMessageResponse | ApiErrorResponse>> {
    try {
      const { idOrSlug } = (req as { params: { idOrSlug: string } }).params;
      const typedReq = req as { query: Record<string, string | undefined>; params: { idOrSlug: string } };
      const userId = typedReq.query['userId'];

      if (!idOrSlug) return validationError('Missing required parameter: idOrSlug');

      const service = this.getConnectionService();

      const hub = await service.getHubByIdOrSlug(idOrSlug);
      if (!hub) return notFoundError('Hub', idOrSlug);

      let isMember = false;
      if (userId) {
        isMember = await service.isHubMember(hub._id, userId);
      }

      const subHubs = await service.getSubHubs(hub._id);

      return {
        statusCode: 200,
        response: {
          message: 'OK',
          data: { hub, isMember, subHubs },
        } as IApiMessageResponse,
      };
    } catch (error) {
      if (error instanceof ConnectionServiceError)
        return this.mapConnectionError(error);
      return handleError(error);
    }
  }

  private async handleUpdateHub(
    req: unknown,
  ): Promise<IStatusCodeResponse<IApiMessageResponse | ApiErrorResponse>> {
    try {
      const { id } = (req as { params: { id: string } }).params;
      const { userId, name, description, rules, trustTier, icon } = (
        req as {
          body: {
            userId: string;
            name?: string;
            description?: string;
            rules?: string;
            trustTier?: string;
            icon?: string;
          };
          params: { id: string };
        }
      ).body;

      if (!id) return validationError('Missing required parameter: id');
      if (!userId) return validationError('Missing required field: userId');

      const service = this.getConnectionService();
      const hub = await service.updateHub(id, userId, { name, description, rules, trustTier, icon });
      return {
        statusCode: 200,
        response: { message: 'Hub updated', data: hub } as IApiMessageResponse,
      };
    } catch (error) {
      if (error instanceof ConnectionServiceError)
        return this.mapConnectionError(error);
      return handleError(error);
    }
  }

  private async handleJoinHub(
    req: unknown,
  ): Promise<IStatusCodeResponse<IApiMessageResponse | ApiErrorResponse>> {
    try {
      const { idOrSlug } = (req as { params: { idOrSlug: string } }).params;
      const { userId } = (req as { body: { userId: string }; params: { idOrSlug: string } }).body;

      if (!idOrSlug) return validationError('Missing required parameter: idOrSlug');
      if (!userId) return validationError('Missing required field: userId');

      const service = this.getConnectionService();

      const hub = await service.getHubByIdOrSlug(idOrSlug);
      if (!hub) return notFoundError('Hub', idOrSlug);

      await service.joinHub(hub._id, userId);
      return { statusCode: 200, response: { message: 'Joined hub' } };
    } catch (error) {
      if (error instanceof ConnectionServiceError)
        return this.mapConnectionError(error);
      return handleError(error);
    }
  }

  private async handleLeaveHub(
    req: unknown,
  ): Promise<IStatusCodeResponse<IApiMessageResponse | ApiErrorResponse>> {
    try {
      const { idOrSlug } = (req as { params: { idOrSlug: string } }).params;
      const { userId } = (req as { body: { userId: string }; params: { idOrSlug: string } }).body;

      if (!idOrSlug) return validationError('Missing required parameter: idOrSlug');
      if (!userId) return validationError('Missing required field: userId');

      const service = this.getConnectionService();

      const hub = await service.getHubByIdOrSlug(idOrSlug);
      if (!hub) return notFoundError('Hub', idOrSlug);

      await service.leaveHub(hub._id, userId);
      return { statusCode: 200, response: { message: 'Left hub' } };
    } catch (error) {
      if (error instanceof ConnectionServiceError)
        return this.mapConnectionError(error);
      return handleError(error);
    }
  }

  private async handleAddModerator(
    req: unknown,
  ): Promise<IStatusCodeResponse<IApiMessageResponse | ApiErrorResponse>> {
    try {
      const { id } = (req as { params: { id: string } }).params;
      const { ownerId, userId } = (
        req as { body: { ownerId: string; userId: string }; params: { id: string } }
      ).body;

      if (!id) return validationError('Missing required parameter: id');
      if (!ownerId) return validationError('Missing required field: ownerId');
      if (!userId) return validationError('Missing required field: userId');

      const service = this.getConnectionService();
      await service.addModerator(id, ownerId, userId);
      return { statusCode: 200, response: { message: 'Moderator added' } };
    } catch (error) {
      if (error instanceof ConnectionServiceError)
        return this.mapConnectionError(error);
      return handleError(error);
    }
  }

  private async handleRemoveModerator(
    req: unknown,
  ): Promise<IStatusCodeResponse<IApiMessageResponse | ApiErrorResponse>> {
    try {
      const { id } = (req as { params: { id: string } }).params;
      const { ownerId, userId } = (
        req as { body: { ownerId: string; userId: string }; params: { id: string } }
      ).body;

      if (!id) return validationError('Missing required parameter: id');
      if (!ownerId) return validationError('Missing required field: ownerId');
      if (!userId) return validationError('Missing required field: userId');

      const service = this.getConnectionService();
      await service.removeModerator(id, ownerId, userId);
      return { statusCode: 200, response: { message: 'Moderator removed' } };
    } catch (error) {
      if (error instanceof ConnectionServiceError)
        return this.mapConnectionError(error);
      return handleError(error);
    }
  }

  private async handleGetSubHubs(
    req: unknown,
  ): Promise<IStatusCodeResponse<IApiMessageResponse | ApiErrorResponse>> {
    try {
      const { id } = (req as { params: { id: string } }).params;
      if (!id) return validationError('Missing required parameter: id');

      const service = this.getConnectionService();
      const subHubs = await service.getSubHubs(id);
      return {
        statusCode: 200,
        response: { message: 'OK', data: { hubs: subHubs } } as IApiMessageResponse,
      };
    } catch (error) {
      if (error instanceof ConnectionServiceError)
        return this.mapConnectionError(error);
      return handleError(error);
    }
  }

  private async handleBanFromHub(
    req: unknown,
  ): Promise<IStatusCodeResponse<IApiMessageResponse | ApiErrorResponse>> {
    try {
      const { id } = (req as { params: { id: string } }).params;
      const { moderatorId, userId } = (
        req as { body: { moderatorId: string; userId: string }; params: { id: string } }
      ).body;

      if (!id) return validationError('Missing required parameter: id');
      if (!moderatorId) return validationError('Missing required field: moderatorId');
      if (!userId) return validationError('Missing required field: userId');

      const service = this.getConnectionService();
      await service.banFromHub(id, userId, moderatorId);
      return { statusCode: 200, response: { message: 'User banned from hub' } };
    } catch (error) {
      if (error instanceof ConnectionServiceError)
        return this.mapConnectionError(error);
      return handleError(error);
    }
  }

  private async handleUnbanFromHub(
    req: unknown,
  ): Promise<IStatusCodeResponse<IApiMessageResponse | ApiErrorResponse>> {
    try {
      const { id } = (req as { params: { id: string } }).params;
      const { moderatorId, userId } = (
        req as { body: { moderatorId: string; userId: string }; params: { id: string } }
      ).body;

      if (!id) return validationError('Missing required parameter: id');
      if (!moderatorId) return validationError('Missing required field: moderatorId');
      if (!userId) return validationError('Missing required field: userId');

      const service = this.getConnectionService() as unknown as {
        unbanFromHub(hubId: string, userId: string, moderatorId: string): Promise<void>;
      };
      await service.unbanFromHub(id, userId, moderatorId);
      return { statusCode: 200, response: { message: 'User unbanned from hub' } };
    } catch (error) {
      if (error instanceof ConnectionServiceError)
        return this.mapConnectionError(error);
      return handleError(error);
    }
  }

  private async handleGetBannedUsers(
    req: unknown,
  ): Promise<IStatusCodeResponse<IApiMessageResponse | ApiErrorResponse>> {
    try {
      const { id } = (req as { params: { id: string } }).params;
      const typedReq = req as { query: Record<string, string | undefined>; params: { id: string } };
      const moderatorId = typedReq.query['userId'] ?? typedReq.query['moderatorId'];

      if (!id) return validationError('Missing required parameter: id');
      if (!moderatorId) return validationError('Missing required query parameter: userId');

      const service = this.getConnectionService() as unknown as {
        getBannedUsers(hubId: string, moderatorId: string): Promise<unknown[]>;
      };
      const banned = await service.getBannedUsers(id, moderatorId);
      return {
        statusCode: 200,
        response: { message: 'OK', data: { bannedUsers: banned } } as IApiMessageResponse,
      };
    } catch (error) {
      if (error instanceof ConnectionServiceError)
        return this.mapConnectionError(error);
      return handleError(error);
    }
  }

  private async handleGetHubMembersList(
    req: unknown,
  ): Promise<IStatusCodeResponse<IApiMessageResponse | ApiErrorResponse>> {
    try {
      const { id } = (req as { params: { id: string } }).params;
      if (!id) return validationError('Missing required parameter: id');

      const service = this.getConnectionService();
      const result = await service.getHubMembers(id);
      return {
        statusCode: 200,
        response: { message: 'OK', data: result } as IApiMessageResponse,
      };
    } catch (error) {
      if (error instanceof ConnectionServiceError)
        return this.mapConnectionError(error);
      return handleError(error);
    }
  }

  private async handleGetHubLeaderboard(
    req: unknown,
  ): Promise<IStatusCodeResponse<IApiMessageResponse | ApiErrorResponse>> {
    try {
      const { id } = (req as { params: { id: string } }).params;
      if (!id) return validationError('Missing required parameter: id');

      const limit = 20;
      const reputationCollection = (
        this.application as unknown as {
          getModel<T>(name: string): {
            find(filter: Partial<T>): { exec(): Promise<T[]> };
          };
        }
      ).getModel<{
        _id: string;
        userId: string;
        hubId: string;
        score: number;
        postCount: number;
        upvotesReceived: number;
        lastActiveAt: string;
      }>('brighthub_hub_reputation');

      const records = await reputationCollection
        .find({ hubId: id } as never)
        .exec();

      // Sort by score descending
      const sorted = records
        .sort((a, b) => b.score - a.score)
        .slice(0, limit);

      return {
        statusCode: 200,
        response: {
          message: 'OK',
          data: { leaderboard: sorted },
        } as IApiMessageResponse,
      };
    } catch (error) {
      return handleError(error);
    }
  }

  private async handleRemovePostFromHub(
    req: unknown,
  ): Promise<IStatusCodeResponse<IApiMessageResponse | ApiErrorResponse>> {
    try {
      const { id } = (req as { params: { id: string } }).params;
      const { moderatorId, postId } = (
        req as {
          body: { moderatorId: string; postId: string };
          params: { id: string };
        }
      ).body;

      if (!id) return validationError('Missing required parameter: id');
      if (!moderatorId)
        return validationError('Missing required field: moderatorId');
      if (!postId) return validationError('Missing required field: postId');

      // Validate moderator permissions via connection service
      const service = this.getConnectionService();
      await service.removePostFromHub(id, postId, moderatorId);

      // Update the post's hubIds via the application's post collection
      const postsCollection = (
        this.application as unknown as {
          getModel<T>(name: string): {
            findOne(filter: Partial<T>): { exec(): Promise<T | null> };
            updateOne(
              filter: Partial<T>,
              update: Partial<T>,
            ): { exec(): Promise<{ modifiedCount: number }> };
          };
        }
      ).getModel<{ _id: string; hubIds?: string[] }>('brighthub_posts');

      const post = await postsCollection
        .findOne({ _id: postId } as never)
        .exec();
      if (post && post.hubIds) {
        const newHubIds = post.hubIds.filter((hid) => hid !== id);
        await postsCollection
          .updateOne(
            { _id: postId } as never,
            { hubIds: newHubIds } as never,
          )
          .exec();
      }

      return {
        statusCode: 200,
        response: { message: 'Post removed from hub' },
      };
    } catch (error) {
      if (error instanceof ConnectionServiceError)
        return this.mapConnectionError(error);
      return handleError(error);
    }
  }

  private async handleTransferOwnership(
    req: unknown,
  ): Promise<IStatusCodeResponse<IApiMessageResponse | ApiErrorResponse>> {
    try {
      const { id } = (req as { params: { id: string } }).params;
      const { ownerId, newOwnerId } = (
        req as { body: { ownerId: string; newOwnerId: string }; params: { id: string } }
      ).body;

      if (!id) return validationError('Missing required parameter: id');
      if (!ownerId) return validationError('Missing required field: ownerId');
      if (!newOwnerId) return validationError('Missing required field: newOwnerId');

      const service = this.getConnectionService();
      const hub = await service.transferHubOwnership(id, ownerId, newOwnerId);
      return {
        statusCode: 200,
        response: { message: 'Ownership transferred', data: hub } as IApiMessageResponse,
      };
    } catch (error) {
      if (error instanceof ConnectionServiceError)
        return this.mapConnectionError(error);
      return handleError(error);
    }
  }

  private async handleDeleteHub(
    req: unknown,
  ): Promise<IStatusCodeResponse<IApiMessageResponse | ApiErrorResponse>> {
    try {
      const { id } = (req as { params: { id: string } }).params;
      const typedReq = req as {
        body?: { ownerId?: string };
        query: Record<string, string | undefined>;
        params: { id: string };
      };
      const ownerId =
        typedReq.body?.ownerId ?? typedReq.query['ownerId'];

      if (!id) return validationError('Missing required parameter: id');
      if (!ownerId)
        return validationError('Missing required field: ownerId');

      const service = this.getConnectionService();
      await service.deleteHub(id, ownerId);
      return { statusCode: 204, response: { message: 'Hub deleted' } };
    } catch (error) {
      if (error instanceof ConnectionServiceError)
        return this.mapConnectionError(error);
      return handleError(error);
    }
  }

  private async handleBulkMembers(
    req: unknown,
  ): Promise<IStatusCodeResponse<IApiMessageResponse | ApiErrorResponse>> {
    try {
      const { id } = (req as { params: { id: string } }).params;
      const { ownerId, action, userIds } = (
        req as {
          body: {
            ownerId: string;
            action: 'add' | 'remove';
            userIds: string[];
          };
          params: { id: string };
        }
      ).body;
      if (!id) return validationError('Missing required parameter: id');
      if (!ownerId) return validationError('Missing required field: ownerId');
      if (!action || !['add', 'remove'].includes(action))
        return validationError('Missing or invalid field: action (add|remove)');
      if (!userIds || !Array.isArray(userIds))
        return validationError('Missing required field: userIds (array)');

      if (action === 'add') {
        await this.getConnectionService().addMembersToList(
          id,
          ownerId,
          userIds,
        );
      } else {
        await this.getConnectionService().removeMembersFromList(
          id,
          ownerId,
          userIds,
        );
      }
      return {
        statusCode: 200,
        response: { message: `Bulk ${action} complete` },
      };
    } catch (error) {
      if (error instanceof ConnectionServiceError)
        return this.mapConnectionError(error);
      return handleError(error);
    }
  }

  private async handleGetConnectionInsights(
    req: unknown,
  ): Promise<IStatusCodeResponse<IApiMessageResponse | ApiErrorResponse>> {
    try {
      const { id } = (req as { params: { id: string } }).params;
      const typedReq = req as {
        query: Record<string, string | undefined>;
        params: { id: string };
      };
      const userId = typedReq.query['userId'];
      if (!id) return validationError('Missing required parameter: id');
      if (!userId)
        return validationError('Missing required query parameter: userId');

      const period = (typedReq.query['period'] as InsightPeriod) || '30d';
      const insights = await this.getDiscoveryService().getConnectionInsights(
        userId,
        id,
        period,
      );
      return {
        statusCode: 200,
        response: { message: 'OK', data: insights } as IApiMessageResponse,
      };
    } catch (error) {
      return handleError(error);
    }
  }

  private async handleGetFollowRequests(
    req: unknown,
  ): Promise<IStatusCodeResponse<IApiMessageResponse | ApiErrorResponse>> {
    try {
      const typedReq = req as { query: Record<string, string | undefined> };
      const userId = typedReq.query['userId'];
      if (!userId)
        return validationError('Missing required query parameter: userId');

      const options = this.parsePaginationOptions(typedReq.query);
      const result = await this.getUserProfileService().getFollowRequests(
        userId,
        options,
      );
      return {
        statusCode: 200,
        response: {
          message: 'OK',
          data: {
            requests: result.items,
            cursor: result.cursor,
            hasMore: result.hasMore,
          },
        } as IApiMessageResponse,
      };
    } catch (error) {
      if (error instanceof UserProfileServiceError) {
        if (error.code === UserProfileErrorCode.UserNotFound)
          return notFoundError('User', 'unknown');
        return validationError(error.message);
      }
      return handleError(error);
    }
  }

  private async handleApproveFollowRequest(
    req: unknown,
  ): Promise<IStatusCodeResponse<IApiMessageResponse | ApiErrorResponse>> {
    const { id } = (req as { params: { id: string } }).params;
    try {
      const { userId } = (
        req as { body: { userId: string }; params: { id: string } }
      ).body;
      if (!id) return validationError('Missing required parameter: id');
      if (!userId) return validationError('Missing required field: userId');

      await this.getUserProfileService().approveFollowRequest(userId, id);
      return {
        statusCode: 200,
        response: { message: 'Follow request approved' },
      };
    } catch (error) {
      if (error instanceof UserProfileServiceError) {
        if (error.code === UserProfileErrorCode.FollowRequestNotFound)
          return notFoundError('FollowRequest', id);
        return validationError(error.message);
      }
      return handleError(error);
    }
  }

  private async handleRejectFollowRequest(
    req: unknown,
  ): Promise<IStatusCodeResponse<IApiMessageResponse | ApiErrorResponse>> {
    const { id } = (req as { params: { id: string } }).params;
    try {
      const { userId } = (
        req as { body: { userId: string }; params: { id: string } }
      ).body;
      if (!id) return validationError('Missing required parameter: id');
      if (!userId) return validationError('Missing required field: userId');

      await this.getUserProfileService().rejectFollowRequest(userId, id);
      return {
        statusCode: 200,
        response: { message: 'Follow request rejected' },
      };
    } catch (error) {
      if (error instanceof UserProfileServiceError) {
        if (error.code === UserProfileErrorCode.FollowRequestNotFound)
          return notFoundError('FollowRequest', id);
        return validationError(error.message);
      }
      return handleError(error);
    }
  }
}
