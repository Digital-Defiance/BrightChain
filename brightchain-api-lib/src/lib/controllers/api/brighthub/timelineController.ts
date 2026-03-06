import {
  ApproveFollowersMode,
  FeedErrorCode,
  FeedServiceError,
  IFeedService,
  ITimelineOptions,
  IUserProfileService,
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
  TypedHandlers,
  routeConfig,
} from '@digitaldefiance/node-express-suite';
import { IBrightChainApplication } from '../../../interfaces/application';
import { IStatusCodeResponse } from '../../../interfaces/responses';
import {
  IBrightHubUserProfileApiResponse,
  ITimelineApiResponse,
} from '../../../interfaces/responses/brighthub';
import { DefaultBackendIdType } from '../../../shared-types';
import {
  handleError,
  notFoundError,
  validationError,
} from '../../../utils/errorResponse';
import { BaseController } from '../../base';

type TimelineApiResponseType =
  | ITimelineApiResponse
  | IBrightHubUserProfileApiResponse
  | IApiMessageResponse
  | ApiErrorResponse;

interface ITimelineHandlers extends TypedHandlers {
  getHomeTimeline: ApiRequestHandler<ITimelineApiResponse | ApiErrorResponse>;
  getPublicTimeline: ApiRequestHandler<ITimelineApiResponse | ApiErrorResponse>;
  getUserProfile: ApiRequestHandler<
    IBrightHubUserProfileApiResponse | ApiErrorResponse
  >;
  updateUserProfile: ApiRequestHandler<IApiMessageResponse | ApiErrorResponse>;
  followUser: ApiRequestHandler<IApiMessageResponse | ApiErrorResponse>;
  unfollowUser: ApiRequestHandler<IApiMessageResponse | ApiErrorResponse>;
  blockUser: ApiRequestHandler<IApiMessageResponse | ApiErrorResponse>;
  unblockUser: ApiRequestHandler<IApiMessageResponse | ApiErrorResponse>;
  search: ApiRequestHandler<ITimelineApiResponse | ApiErrorResponse>;
  getUserFeed: ApiRequestHandler<ITimelineApiResponse | ApiErrorResponse>;
  getHashtagFeed: ApiRequestHandler<ITimelineApiResponse | ApiErrorResponse>;
}

/**
 * Controller for BrightHub timeline, user profile, and search operations.
 *
 * @requirements 11.6-11.11
 */
export class BrightHubTimelineController<
  TID extends PlatformID = DefaultBackendIdType,
> extends BaseController<
  TID,
  TimelineApiResponseType,
  ITimelineHandlers,
  CoreLanguageCode
> {
  private feedService: IFeedService | null = null;
  private userProfileService: IUserProfileService | null = null;

  constructor(application: IBrightChainApplication<TID>) {
    super(application);
  }

  public setFeedService(service: IFeedService): void {
    this.feedService = service;
  }

  public setUserProfileService(service: IUserProfileService): void {
    this.userProfileService = service;
  }

  private getFeedService(): IFeedService {
    if (!this.feedService) throw new Error('FeedService not initialized');
    return this.feedService;
  }

  private getUserProfileService(): IUserProfileService {
    if (!this.userProfileService)
      throw new Error('UserProfileService not initialized');
    return this.userProfileService;
  }

  protected initRouteDefinitions(): void {
    this.routeDefinitions = [
      routeConfig('get', '/timeline/home', {
        handlerKey: 'getHomeTimeline',
        useAuthentication: false,
        useCryptoAuthentication: false,
        openapi: {
          summary: 'Get home timeline',
          description:
            'Returns posts from followed users in reverse chronological order.',
          tags: ['BrightHub Timeline'],
          responses: {
            200: {
              schema: 'TimelineResponse',
              description: 'Timeline retrieved',
            },
          },
        },
      }),
      routeConfig('get', '/timeline/public', {
        handlerKey: 'getPublicTimeline',
        useAuthentication: false,
        useCryptoAuthentication: false,
        openapi: {
          summary: 'Get public timeline',
          tags: ['BrightHub Timeline'],
          responses: {
            200: {
              schema: 'TimelineResponse',
              description: 'Public timeline retrieved',
            },
          },
        },
      }),
      routeConfig('get', '/users/:id', {
        handlerKey: 'getUserProfile',
        useAuthentication: false,
        useCryptoAuthentication: false,
        openapi: {
          summary: 'Get user profile',
          tags: ['BrightHub Users'],
          responses: {
            200: {
              schema: 'UserProfileResponse',
              description: 'Profile retrieved',
            },
            404: { schema: 'ErrorResponse', description: 'User not found' },
          },
        },
      }),
      routeConfig('put', '/users/:id', {
        handlerKey: 'updateUserProfile',
        useAuthentication: false,
        useCryptoAuthentication: false,
        openapi: {
          summary: 'Update user profile',
          tags: ['BrightHub Users'],
          responses: {
            200: {
              schema: 'UserProfileResponse',
              description: 'Profile updated',
            },
          },
        },
      }),
      routeConfig('get', '/users/:id/feed', {
        handlerKey: 'getUserFeed',
        useAuthentication: false,
        useCryptoAuthentication: false,
        openapi: {
          summary: "Get a user's post feed",
          tags: ['BrightHub Timeline'],
          responses: {
            200: {
              schema: 'TimelineResponse',
              description: 'User feed retrieved',
            },
          },
        },
      }),
      routeConfig('post', '/users/:id/follow', {
        handlerKey: 'followUser',
        useAuthentication: false,
        useCryptoAuthentication: false,
        openapi: {
          summary: 'Follow a user',
          tags: ['BrightHub Users'],
          responses: {
            200: {
              schema: 'MessageResponse',
              description: 'Follow successful or request created',
            },
          },
        },
      }),
      routeConfig('delete', '/users/:id/follow', {
        handlerKey: 'unfollowUser',
        useAuthentication: false,
        useCryptoAuthentication: false,
        openapi: {
          summary: 'Unfollow a user',
          tags: ['BrightHub Users'],
          responses: {
            200: { schema: 'MessageResponse', description: 'Unfollowed' },
          },
        },
      }),
      routeConfig('post', '/users/:id/block', {
        handlerKey: 'blockUser',
        useAuthentication: false,
        useCryptoAuthentication: false,
        openapi: {
          summary: 'Block a user',
          tags: ['BrightHub Users'],
          responses: {
            200: { schema: 'MessageResponse', description: 'User blocked' },
          },
        },
      }),
      routeConfig('delete', '/users/:id/block', {
        handlerKey: 'unblockUser',
        useAuthentication: false,
        useCryptoAuthentication: false,
        openapi: {
          summary: 'Unblock a user',
          tags: ['BrightHub Users'],
          responses: {
            200: { schema: 'MessageResponse', description: 'User unblocked' },
          },
        },
      }),
      routeConfig('get', '/search', {
        handlerKey: 'search',
        useAuthentication: false,
        useCryptoAuthentication: false,
        openapi: {
          summary: 'Search posts and users',
          tags: ['BrightHub Search'],
          responses: {
            200: { schema: 'TimelineResponse', description: 'Search results' },
          },
        },
      }),
      routeConfig('get', '/hashtag/:tag', {
        handlerKey: 'getHashtagFeed',
        useAuthentication: false,
        useCryptoAuthentication: false,
        openapi: {
          summary: 'Get posts by hashtag',
          tags: ['BrightHub Timeline'],
          responses: {
            200: {
              schema: 'TimelineResponse',
              description: 'Hashtag feed retrieved',
            },
          },
        },
      }),
    ];

    ControllerRegistry.register(
      '/brighthub',
      'BrightHubTimelineController',
      this.routeDefinitions,
    );

    this.handlers = {
      getHomeTimeline: this.handleGetHomeTimeline.bind(this),
      getPublicTimeline: this.handleGetPublicTimeline.bind(this),
      getUserProfile: this.handleGetUserProfile.bind(this),
      updateUserProfile: this.handleUpdateUserProfile.bind(this),
      followUser: this.handleFollowUser.bind(this),
      unfollowUser: this.handleUnfollowUser.bind(this),
      blockUser: this.handleBlockUser.bind(this),
      unblockUser: this.handleUnblockUser.bind(this),
      search: this.handleSearch.bind(this),
      getUserFeed: this.handleGetUserFeed.bind(this),
      getHashtagFeed: this.handleGetHashtagFeed.bind(this),
    };
  }

  private parseTimelineOptions(
    query: Record<string, string | undefined>,
  ): ITimelineOptions {
    const options: ITimelineOptions = {};
    if (query['cursor']) options.cursor = query['cursor'];
    if (query['limit']) options.limit = parseInt(query['limit'], 10);
    if (query['listId']) options.listId = query['listId'];
    if (query['categoryId']) options.categoryId = query['categoryId'];
    if (query['excludeMuted'] === 'true') options.excludeMuted = true;
    return options;
  }

  /**
   * GET /api/brighthub/timeline/home
   * @requirements 11.6
   */
  private async handleGetHomeTimeline(
    req: unknown,
  ): Promise<IStatusCodeResponse<ITimelineApiResponse | ApiErrorResponse>> {
    try {
      const typedReq = req as { query: Record<string, string | undefined> };
      const userId = typedReq.query['userId'];
      if (!userId)
        return validationError('Missing required query parameter: userId');

      const options = this.parseTimelineOptions(typedReq.query);
      const result = await this.getFeedService().getHomeTimeline(
        userId,
        options,
      );

      return {
        statusCode: 200,
        response: {
          message: 'OK',
          data: {
            posts: result.posts,
            cursor: result.cursor,
            hasMore: result.hasMore,
          },
        },
      };
    } catch (error) {
      if (error instanceof FeedServiceError) {
        if (error.code === FeedErrorCode.UserNotFound)
          return notFoundError('User', 'unknown');
        return validationError(error.message);
      }
      return handleError(error);
    }
  }

  /**
   * GET /api/brighthub/timeline/public
   * @requirements 11.7
   */
  private async handleGetPublicTimeline(
    req: unknown,
  ): Promise<IStatusCodeResponse<ITimelineApiResponse | ApiErrorResponse>> {
    try {
      const typedReq = req as { query: Record<string, string | undefined> };
      const options = this.parseTimelineOptions(typedReq.query);
      const requestingUserId = typedReq.query['userId'];

      const result = await this.getFeedService().getPublicTimeline(
        options,
        requestingUserId,
      );

      return {
        statusCode: 200,
        response: {
          message: 'OK',
          data: {
            posts: result.posts,
            cursor: result.cursor,
            hasMore: result.hasMore,
          },
        },
      };
    } catch (error) {
      return handleError(error);
    }
  }

  /**
   * GET /api/brighthub/users/:id
   * @requirements 11.8
   */
  private async handleGetUserProfile(
    req: unknown,
  ): Promise<
    IStatusCodeResponse<IBrightHubUserProfileApiResponse | ApiErrorResponse>
  > {
    try {
      const { id } = (req as { params: { id: string } }).params;
      if (!id) return validationError('Missing required parameter: id');

      const typedReq = req as {
        query: Record<string, string | undefined>;
        params: { id: string };
      };
      const requesterId = typedReq.query['requesterId'];

      const profile = await this.getUserProfileService().getProfile(
        id,
        requesterId,
      );

      return {
        statusCode: 200,
        response: { message: 'OK', data: profile },
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

  /**
   * GET /api/brighthub/users/:id/feed
   */
  /**
   * PUT /api/brighthub/users/:id
   * Update user profile including approveFollowersMode
   */
  private async handleUpdateUserProfile(
    req: unknown,
  ): Promise<IStatusCodeResponse<IApiMessageResponse | ApiErrorResponse>> {
    try {
      const { id } = (req as { params: { id: string } }).params;
      const body = (
        req as { body: Record<string, unknown>; params: { id: string } }
      ).body;
      if (!id) return validationError('Missing required parameter: id');

      const userId = (body['userId'] as string) ?? id;

      // Handle approveFollowersMode separately
      if (body['approveFollowersMode']) {
        await this.getUserProfileService().setApproveFollowersMode(
          userId,
          body['approveFollowersMode'] as ApproveFollowersMode,
        );
      }

      // Handle general profile updates
      const updates: Record<string, unknown> = {};
      if (body['displayName'] !== undefined)
        updates['displayName'] = body['displayName'];
      if (body['bio'] !== undefined) updates['bio'] = body['bio'];
      if (body['location'] !== undefined)
        updates['location'] = body['location'];
      if (body['websiteUrl'] !== undefined)
        updates['websiteUrl'] = body['websiteUrl'];

      if (Object.keys(updates).length > 0) {
        await this.getUserProfileService().updateProfile(userId, updates);
      }

      return {
        statusCode: 200,
        response: { message: 'Profile updated' },
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

  /**
   * POST /api/brighthub/users/:id/block
   */
  private async handleBlockUser(
    req: unknown,
  ): Promise<IStatusCodeResponse<IApiMessageResponse | ApiErrorResponse>> {
    try {
      const { id } = (req as { params: { id: string } }).params;
      const { userId } = (
        req as { body: { userId: string }; params: { id: string } }
      ).body;
      if (!id) return validationError('Missing required parameter: id');
      if (!userId) return validationError('Missing required field: userId');

      await this.getUserProfileService().blockUser(userId, id);
      return { statusCode: 200, response: { message: 'User blocked' } };
    } catch (error) {
      if (error instanceof UserProfileServiceError) {
        if (error.code === UserProfileErrorCode.UserNotFound)
          return notFoundError('User', 'unknown');
        return validationError(error.message);
      }
      return handleError(error);
    }
  }

  /**
   * DELETE /api/brighthub/users/:id/block
   */
  private async handleUnblockUser(
    req: unknown,
  ): Promise<IStatusCodeResponse<IApiMessageResponse | ApiErrorResponse>> {
    try {
      const { id } = (req as { params: { id: string } }).params;
      const { userId } = (
        req as { body: { userId: string }; params: { id: string } }
      ).body;
      if (!id) return validationError('Missing required parameter: id');
      if (!userId) return validationError('Missing required field: userId');

      await this.getUserProfileService().unblockUser(userId, id);
      return { statusCode: 200, response: { message: 'User unblocked' } };
    } catch (error) {
      if (error instanceof UserProfileServiceError) {
        if (error.code === UserProfileErrorCode.UserNotFound)
          return notFoundError('User', 'unknown');
        return validationError(error.message);
      }
      return handleError(error);
    }
  }

  /**
   * GET /api/brighthub/users/:id/feed
   */
  private async handleGetUserFeed(
    req: unknown,
  ): Promise<IStatusCodeResponse<ITimelineApiResponse | ApiErrorResponse>> {
    try {
      const { id } = (req as { params: { id: string } }).params;
      if (!id) return validationError('Missing required parameter: id');

      const typedReq = req as {
        query: Record<string, string | undefined>;
        params: { id: string };
      };
      const options = this.parseTimelineOptions(typedReq.query);
      const requestingUserId = typedReq.query['requestingUserId'];

      const result = await this.getFeedService().getUserFeed(
        id,
        options,
        requestingUserId,
      );

      return {
        statusCode: 200,
        response: {
          message: 'OK',
          data: {
            posts: result.posts,
            cursor: result.cursor,
            hasMore: result.hasMore,
          },
        },
      };
    } catch (error) {
      if (error instanceof FeedServiceError) {
        if (error.code === FeedErrorCode.UserNotFound)
          return notFoundError('User', 'unknown');
        return validationError(error.message);
      }
      return handleError(error);
    }
  }

  /**
   * POST /api/brighthub/users/:id/follow
   * @requirements 11.9
   */
  private async handleFollowUser(
    req: unknown,
  ): Promise<IStatusCodeResponse<IApiMessageResponse | ApiErrorResponse>> {
    try {
      const { id } = (req as { params: { id: string } }).params;
      const { followerId, message } = (
        req as {
          body: { followerId: string; message?: string };
          params: { id: string };
        }
      ).body;

      if (!id) return validationError('Missing required parameter: id');
      if (!followerId)
        return validationError('Missing required field: followerId');

      const result = await this.getUserProfileService().follow(
        followerId,
        id,
        message ? { message } : undefined,
      );

      return {
        statusCode: 200,
        response: {
          message: result.requestCreated
            ? 'Follow request created'
            : 'Now following user',
        },
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

  /**
   * DELETE /api/brighthub/users/:id/follow
   */
  private async handleUnfollowUser(
    req: unknown,
  ): Promise<IStatusCodeResponse<IApiMessageResponse | ApiErrorResponse>> {
    try {
      const { id } = (req as { params: { id: string } }).params;
      const { followerId } = (
        req as { body: { followerId: string }; params: { id: string } }
      ).body;

      if (!id) return validationError('Missing required parameter: id');
      if (!followerId)
        return validationError('Missing required field: followerId');

      await this.getUserProfileService().unfollow(followerId, id);

      return {
        statusCode: 200,
        response: { message: 'Unfollowed user' },
      };
    } catch (error) {
      if (error instanceof UserProfileServiceError)
        return validationError(error.message);
      return handleError(error);
    }
  }

  /**
   * GET /api/brighthub/search
   * @requirements 11.11
   */
  private async handleSearch(
    req: unknown,
  ): Promise<IStatusCodeResponse<ITimelineApiResponse | ApiErrorResponse>> {
    try {
      const typedReq = req as { query: Record<string, string | undefined> };
      const query = typedReq.query['q'];
      if (!query) return validationError('Missing required query parameter: q');

      const options = this.parseTimelineOptions(typedReq.query);
      const requestingUserId = typedReq.query['userId'];

      // Search by hashtag if query starts with #
      const result = query.startsWith('#')
        ? await this.getFeedService().getHashtagFeed(
            query.slice(1),
            options,
            requestingUserId,
          )
        : await this.getFeedService().getHashtagFeed(
            query,
            options,
            requestingUserId,
          );

      return {
        statusCode: 200,
        response: {
          message: 'OK',
          data: {
            posts: result.posts,
            cursor: result.cursor,
            hasMore: result.hasMore,
          },
        },
      };
    } catch (error) {
      if (error instanceof FeedServiceError)
        return validationError(error.message);
      return handleError(error);
    }
  }

  /**
   * GET /api/brighthub/hashtag/:tag
   */
  private async handleGetHashtagFeed(
    req: unknown,
  ): Promise<IStatusCodeResponse<ITimelineApiResponse | ApiErrorResponse>> {
    try {
      const { tag } = (req as { params: { tag: string } }).params;
      if (!tag) return validationError('Missing required parameter: tag');

      const typedReq = req as {
        query: Record<string, string | undefined>;
        params: { tag: string };
      };
      const options = this.parseTimelineOptions(typedReq.query);
      const requestingUserId = typedReq.query['userId'];

      const result = await this.getFeedService().getHashtagFeed(
        tag,
        options,
        requestingUserId,
      );

      return {
        statusCode: 200,
        response: {
          message: 'OK',
          data: {
            posts: result.posts,
            cursor: result.cursor,
            hasMore: result.hasMore,
          },
        },
      };
    } catch (error) {
      if (error instanceof FeedServiceError)
        return validationError(error.message);
      return handleError(error);
    }
  }
}
