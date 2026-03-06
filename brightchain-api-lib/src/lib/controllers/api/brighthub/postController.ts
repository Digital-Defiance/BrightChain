import {
  IBasePostData,
  ICreatePostOptions,
  IPostService,
  IThreadService,
  PostErrorCode,
  PostServiceError,
  ThreadErrorCode,
  ThreadServiceError,
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
  IPostApiResponse,
  IPostListApiResponse,
  IThreadApiResponse,
} from '../../../interfaces/responses/brighthub';
import { DefaultBackendIdType } from '../../../shared-types';
import {
  forbiddenError,
  handleError,
  notFoundError,
  validationError,
} from '../../../utils/errorResponse';
import { BaseController } from '../../base';

type PostApiResponseType =
  | IPostApiResponse
  | IPostListApiResponse
  | IThreadApiResponse
  | IApiMessageResponse
  | ApiErrorResponse;

interface IPostHandlers extends TypedHandlers {
  createPost: ApiRequestHandler<IPostApiResponse | ApiErrorResponse>;
  getPost: ApiRequestHandler<IPostApiResponse | ApiErrorResponse>;
  getThread: ApiRequestHandler<IThreadApiResponse | ApiErrorResponse>;
  deletePost: ApiRequestHandler<IApiMessageResponse | ApiErrorResponse>;
  likePost: ApiRequestHandler<IApiMessageResponse | ApiErrorResponse>;
  unlikePost: ApiRequestHandler<IApiMessageResponse | ApiErrorResponse>;
  repostPost: ApiRequestHandler<IPostApiResponse | ApiErrorResponse>;
  createQuotePost: ApiRequestHandler<IPostApiResponse | ApiErrorResponse>;
  editPost: ApiRequestHandler<IPostApiResponse | ApiErrorResponse>;
}

/**
 * Controller for BrightHub post operations.
 *
 * Provides REST API endpoints for creating, retrieving, editing, deleting posts,
 * and managing post interactions (likes, reposts, quotes).
 *
 * @requirements 11.1-11.5
 */
export class BrightHubPostController<
  TID extends PlatformID = DefaultBackendIdType,
> extends BaseController<
  TID,
  PostApiResponseType,
  IPostHandlers,
  CoreLanguageCode
> {
  private postService: IPostService | null = null;
  private threadService: IThreadService | null = null;

  constructor(application: IBrightChainApplication<TID>) {
    super(application);
  }

  public setPostService(service: IPostService): void {
    this.postService = service;
  }

  public setThreadService(service: IThreadService): void {
    this.threadService = service;
  }

  private getPostService(): IPostService {
    if (!this.postService) {
      throw new Error('PostService not initialized');
    }
    return this.postService;
  }

  private getThreadService(): IThreadService {
    if (!this.threadService) {
      throw new Error('ThreadService not initialized');
    }
    return this.threadService;
  }

  protected initRouteDefinitions(): void {
    this.routeDefinitions = [
      routeConfig('post', '/', {
        handlerKey: 'createPost',
        useAuthentication: false,
        useCryptoAuthentication: false,
        openapi: {
          summary: 'Create a new post',
          description:
            'Create a new post with optional media attachments and hub restrictions.',
          tags: ['BrightHub Posts'],
          responses: {
            201: {
              schema: 'PostResponse',
              description: 'Post created successfully',
            },
            400: { schema: 'ErrorResponse', description: 'Validation error' },
          },
        },
      }),
      routeConfig('get', '/:id', {
        handlerKey: 'getPost',
        useAuthentication: false,
        useCryptoAuthentication: false,
        openapi: {
          summary: 'Get a single post',
          description: 'Retrieve a post by its ID.',
          tags: ['BrightHub Posts'],
          responses: {
            200: { schema: 'PostResponse', description: 'Post retrieved' },
            404: { schema: 'ErrorResponse', description: 'Post not found' },
          },
        },
      }),
      routeConfig('get', '/:id/thread', {
        handlerKey: 'getThread',
        useAuthentication: false,
        useCryptoAuthentication: false,
        openapi: {
          summary: 'Get a thread by root post ID',
          description:
            'Retrieve a thread with root post and all nested replies.',
          tags: ['BrightHub Posts'],
          responses: {
            200: { schema: 'ThreadResponse', description: 'Thread retrieved' },
            404: { schema: 'ErrorResponse', description: 'Post not found' },
          },
        },
      }),
      routeConfig('put', '/:id', {
        handlerKey: 'editPost',
        useAuthentication: false,
        useCryptoAuthentication: false,
        openapi: {
          summary: 'Edit a post',
          description: 'Edit a post within the 15-minute edit window.',
          tags: ['BrightHub Posts'],
          responses: {
            200: { schema: 'PostResponse', description: 'Post updated' },
            400: { schema: 'ErrorResponse', description: 'Validation error' },
            403: {
              schema: 'ErrorResponse',
              description: 'Not authorized or edit window expired',
            },
          },
        },
      }),
      routeConfig('delete', '/:id', {
        handlerKey: 'deletePost',
        useAuthentication: false,
        useCryptoAuthentication: false,
        openapi: {
          summary: 'Delete a post',
          description: 'Soft-delete a post and cascade to interactions.',
          tags: ['BrightHub Posts'],
          responses: {
            204: { schema: 'EmptyResponse', description: 'Post deleted' },
            403: { schema: 'ErrorResponse', description: 'Not authorized' },
          },
        },
      }),
      routeConfig('post', '/:id/like', {
        handlerKey: 'likePost',
        useAuthentication: false,
        useCryptoAuthentication: false,
        openapi: {
          summary: 'Like a post',
          tags: ['BrightHub Posts'],
          responses: {
            200: { schema: 'MessageResponse', description: 'Post liked' },
            404: { schema: 'ErrorResponse', description: 'Post not found' },
          },
        },
      }),
      routeConfig('delete', '/:id/like', {
        handlerKey: 'unlikePost',
        useAuthentication: false,
        useCryptoAuthentication: false,
        openapi: {
          summary: 'Unlike a post',
          tags: ['BrightHub Posts'],
          responses: {
            200: { schema: 'MessageResponse', description: 'Post unliked' },
          },
        },
      }),
      routeConfig('post', '/:id/repost', {
        handlerKey: 'repostPost',
        useAuthentication: false,
        useCryptoAuthentication: false,
        openapi: {
          summary: 'Repost a post',
          tags: ['BrightHub Posts'],
          responses: {
            201: { schema: 'PostResponse', description: 'Repost created' },
          },
        },
      }),
      routeConfig('post', '/:id/quote', {
        handlerKey: 'createQuotePost',
        useAuthentication: false,
        useCryptoAuthentication: false,
        openapi: {
          summary: 'Create a quote post',
          tags: ['BrightHub Posts'],
          responses: {
            201: { schema: 'PostResponse', description: 'Quote post created' },
          },
        },
      }),
    ];

    ControllerRegistry.register(
      '/brighthub/posts',
      'BrightHubPostController',
      this.routeDefinitions,
    );

    this.handlers = {
      createPost: this.handleCreatePost.bind(this),
      getPost: this.handleGetPost.bind(this),
      getThread: this.handleGetThread.bind(this),
      editPost: this.handleEditPost.bind(this),
      deletePost: this.handleDeletePost.bind(this),
      likePost: this.handleLikePost.bind(this),
      unlikePost: this.handleUnlikePost.bind(this),
      repostPost: this.handleRepostPost.bind(this),
      createQuotePost: this.handleCreateQuotePost.bind(this),
    };
  }

  private mapPostServiceError(
    error: PostServiceError,
  ): IStatusCodeResponse<ApiErrorResponse> {
    switch (error.code) {
      case PostErrorCode.EmptyContent:
      case PostErrorCode.ContentTooLong:
      case PostErrorCode.TooManyAttachments:
      case PostErrorCode.AttachmentSizeTooLarge:
      case PostErrorCode.InvalidMediaFormat:
        return validationError(error.message);
      case PostErrorCode.PostNotFound:
      case PostErrorCode.QuotedPostNotFound:
      case PostErrorCode.ParentPostNotFound:
        return notFoundError('Post', 'unknown');
      case PostErrorCode.Unauthorized:
      case PostErrorCode.EditWindowExpired:
        return forbiddenError(error.message);
      case PostErrorCode.AlreadyLiked:
      case PostErrorCode.NotLiked:
      case PostErrorCode.AlreadyReposted:
      case PostErrorCode.AlreadyDeleted:
        return validationError(error.message);
      default:
        return handleError(error);
    }
  }

  /**
   * POST /api/brighthub/posts
   * @requirements 11.1
   */
  private async handleCreatePost(
    req: unknown,
  ): Promise<IStatusCodeResponse<IPostApiResponse | ApiErrorResponse>> {
    try {
      const { authorId, content, parentPostId, mediaAttachments, hubIds } = (
        req as {
          body: {
            authorId: string;
            content: string;
            parentPostId?: string;
            mediaAttachments?: IBasePostData<string>['mediaAttachments'];
            hubIds?: string[];
          };
        }
      ).body;

      if (!authorId) return validationError('Missing required field: authorId');
      if (content === undefined || content === null)
        return validationError('Missing required field: content');

      const options: ICreatePostOptions = {};
      if (parentPostId) options.parentPostId = parentPostId;
      if (mediaAttachments) options.mediaAttachments = mediaAttachments;
      if (hubIds) options.hubIds = hubIds;

      const service = this.getPostService();
      const post = await service.createPost(authorId, content, options);

      return {
        statusCode: 201,
        response: { message: 'Post created', data: post },
      };
    } catch (error) {
      if (error instanceof PostServiceError)
        return this.mapPostServiceError(error);
      return handleError(error);
    }
  }

  /**
   * GET /api/brighthub/posts/:id
   * @requirements 11.2
   */
  private async handleGetPost(
    req: unknown,
  ): Promise<IStatusCodeResponse<IPostApiResponse | ApiErrorResponse>> {
    try {
      const { id } = (req as { params: { id: string } }).params;
      if (!id) return validationError('Missing required parameter: id');

      const service = this.getPostService();
      const post = await service.getPost(id);

      return {
        statusCode: 200,
        response: { message: 'OK', data: post },
      };
    } catch (error) {
      if (error instanceof PostServiceError)
        return this.mapPostServiceError(error);
      return handleError(error);
    }
  }

  /**
   * GET /api/brighthub/posts/:id/thread
   * @requirements 2.2
   */
  private async handleGetThread(
    req: unknown,
  ): Promise<IStatusCodeResponse<IThreadApiResponse | ApiErrorResponse>> {
    try {
      const { id } = (req as { params: { id: string } }).params;
      if (!id) return validationError('Missing required parameter: id');

      const service = this.getThreadService();
      const thread = await service.getThread(id);

      return {
        statusCode: 200,
        response: { message: 'OK', data: thread },
      };
    } catch (error) {
      if (error instanceof ThreadServiceError) {
        switch (error.code) {
          case ThreadErrorCode.PostNotFound:
          case ThreadErrorCode.ParentPostNotFound:
            return notFoundError('Post', 'unknown');
          case ThreadErrorCode.EmptyContent:
          case ThreadErrorCode.ContentTooLong:
          case ThreadErrorCode.MaxDepthExceeded:
            return validationError(error.message);
          default:
            return handleError(error);
        }
      }
      if (error instanceof PostServiceError)
        return this.mapPostServiceError(error);
      return handleError(error);
    }
  }

  /**
   * PUT /api/brighthub/posts/:id
   * @requirements 11.1
   */
  private async handleEditPost(
    req: unknown,
  ): Promise<IStatusCodeResponse<IPostApiResponse | ApiErrorResponse>> {
    try {
      const { id } = (req as { params: { id: string } }).params;
      const { userId, content } = (
        req as {
          body: { userId: string; content: string };
          params: { id: string };
        }
      ).body;

      if (!id) return validationError('Missing required parameter: id');
      if (!userId) return validationError('Missing required field: userId');
      if (content === undefined || content === null)
        return validationError('Missing required field: content');

      const service = this.getPostService();
      const post = await service.editPost(id, userId, content);

      return {
        statusCode: 200,
        response: { message: 'Post updated', data: post },
      };
    } catch (error) {
      if (error instanceof PostServiceError)
        return this.mapPostServiceError(error);
      return handleError(error);
    }
  }

  /**
   * DELETE /api/brighthub/posts/:id
   * @requirements 11.3
   */
  private async handleDeletePost(
    req: unknown,
  ): Promise<IStatusCodeResponse<IApiMessageResponse | ApiErrorResponse>> {
    try {
      const { id } = (req as { params: { id: string } }).params;
      const { userId } = (
        req as { body: { userId: string }; params: { id: string } }
      ).body;

      if (!id) return validationError('Missing required parameter: id');
      if (!userId) return validationError('Missing required field: userId');

      const service = this.getPostService();
      await service.deletePost(id, userId);

      return {
        statusCode: 204,
        response: { message: 'Post deleted' },
      };
    } catch (error) {
      if (error instanceof PostServiceError)
        return this.mapPostServiceError(error);
      return handleError(error);
    }
  }

  /**
   * POST /api/brighthub/posts/:id/like
   * @requirements 11.4
   */
  private async handleLikePost(
    req: unknown,
  ): Promise<IStatusCodeResponse<IApiMessageResponse | ApiErrorResponse>> {
    try {
      const { id } = (req as { params: { id: string } }).params;
      const { userId } = (
        req as { body: { userId: string }; params: { id: string } }
      ).body;

      if (!id) return validationError('Missing required parameter: id');
      if (!userId) return validationError('Missing required field: userId');

      const service = this.getPostService();
      await service.likePost(id, userId);

      return {
        statusCode: 200,
        response: { message: 'Post liked' },
      };
    } catch (error) {
      if (error instanceof PostServiceError)
        return this.mapPostServiceError(error);
      return handleError(error);
    }
  }

  /**
   * DELETE /api/brighthub/posts/:id/like
   */
  private async handleUnlikePost(
    req: unknown,
  ): Promise<IStatusCodeResponse<IApiMessageResponse | ApiErrorResponse>> {
    try {
      const { id } = (req as { params: { id: string } }).params;
      const { userId } = (
        req as { body: { userId: string }; params: { id: string } }
      ).body;

      if (!id) return validationError('Missing required parameter: id');
      if (!userId) return validationError('Missing required field: userId');

      const service = this.getPostService();
      await service.unlikePost(id, userId);

      return {
        statusCode: 200,
        response: { message: 'Post unliked' },
      };
    } catch (error) {
      if (error instanceof PostServiceError)
        return this.mapPostServiceError(error);
      return handleError(error);
    }
  }

  /**
   * POST /api/brighthub/posts/:id/repost
   * @requirements 11.5
   */
  private async handleRepostPost(
    req: unknown,
  ): Promise<IStatusCodeResponse<IPostApiResponse | ApiErrorResponse>> {
    try {
      const { id } = (req as { params: { id: string } }).params;
      const { userId } = (
        req as { body: { userId: string }; params: { id: string } }
      ).body;

      if (!id) return validationError('Missing required parameter: id');
      if (!userId) return validationError('Missing required field: userId');

      const service = this.getPostService();
      const repost = await service.repostPost(id, userId);

      return {
        statusCode: 201,
        response: { message: 'Repost created', data: repost },
      };
    } catch (error) {
      if (error instanceof PostServiceError)
        return this.mapPostServiceError(error);
      return handleError(error);
    }
  }

  /**
   * POST /api/brighthub/posts/:id/quote
   */
  private async handleCreateQuotePost(
    req: unknown,
  ): Promise<IStatusCodeResponse<IPostApiResponse | ApiErrorResponse>> {
    try {
      const { id } = (req as { params: { id: string } }).params;
      const { userId, commentary } = (
        req as {
          body: { userId: string; commentary: string };
          params: { id: string };
        }
      ).body;

      if (!id) return validationError('Missing required parameter: id');
      if (!userId) return validationError('Missing required field: userId');
      if (!commentary)
        return validationError('Missing required field: commentary');

      const service = this.getPostService();
      const quotePost = await service.createQuotePost(id, userId, commentary);

      return {
        statusCode: 201,
        response: { message: 'Quote post created', data: quotePost },
      };
    } catch (error) {
      if (error instanceof PostServiceError)
        return this.mapPostServiceError(error);
      return handleError(error);
    }
  }
}
