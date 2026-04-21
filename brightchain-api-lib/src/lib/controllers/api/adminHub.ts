import type { BrightDb } from '@brightchain/db';
import { CoreLanguageCode } from '@digitaldefiance/i18n-lib';
import { PlatformID } from '@digitaldefiance/node-ecies-lib';
import {
  ApiErrorResponse,
  ApiRequestHandler,
  IApiMessageResponse,
  routeConfig,
  TypedHandlers,
} from '@digitaldefiance/node-express-suite';
import { SchemaCollection } from '../../enumerations/schema-collection';
import { IBrightChainApplication } from '../../interfaces/application';
import { DefaultBackendIdType } from '../../shared-types';
import {
  handleError,
  notFoundError,
  validationError,
} from '../../utils/errorResponse';
import { BaseController } from '../base';

type AdminHubApiResponse = IApiMessageResponse | ApiErrorResponse;

interface AdminHubHandlers extends TypedHandlers {
  listPosts: ApiRequestHandler<AdminHubApiResponse>;
  deletePost: ApiRequestHandler<AdminHubApiResponse>;
}

/**
 * Admin-only BrightHub post management controller.
 *
 * ## Endpoints
 *
 * ### GET /api/admin/hub/posts
 * Paginated post list with optional authorId and isDeleted filters.
 *
 * ### DELETE /api/admin/hub/posts/:postId
 * Soft-delete a post (sets isDeleted flag).
 *
 * @requirements 14.2, 14.3, 14.4
 */
export class AdminHubController<
  TID extends PlatformID = DefaultBackendIdType,
> extends BaseController<
  TID,
  AdminHubApiResponse,
  AdminHubHandlers,
  CoreLanguageCode
> {
  constructor(application: IBrightChainApplication<TID>) {
    super(application);
  }

  protected initRouteDefinitions(): void {
    this.routeDefinitions = [
      routeConfig('get', '/posts', {
        handlerKey: 'listPosts',
        useAuthentication: true,
        useCryptoAuthentication: false,
      }),
      routeConfig('delete', '/posts/:postId', {
        handlerKey: 'deletePost',
        useAuthentication: true,
        useCryptoAuthentication: false,
      }),
    ];

    this.handlers = {
      listPosts: this.handleListPosts.bind(this),
      deletePost: this.handleDeletePost.bind(this),
    };
  }

  /**
   * GET /api/admin/hub/posts?page=1&limit=20&authorId=...&isDeleted=false
   */
  private async handleListPosts(
    req: unknown,
  ): Promise<{ statusCode: number; response: AdminHubApiResponse }> {
    try {
      const request = req as {
        query?: {
          page?: string;
          limit?: string;
          authorId?: string;
          isDeleted?: string;
        };
      };
      const page = Math.max(1, parseInt(request.query?.page ?? '1', 10) || 1);
      const limit = Math.min(
        100,
        Math.max(1, parseInt(request.query?.limit ?? '20', 10) || 20),
      );

      // Admin bypass: go directly to DB for admin-level operations
      // (domain services require userId for authorization checks)
      const brightDb = this.application.services.has('db')
        ? (this.application.services.get('db') as BrightDb)
        : undefined;
      if (brightDb) {
        const postsCollection = brightDb.collection('brighthub_posts');
        const filter: Record<string, unknown> = {};
        if (request.query?.authorId) {
          filter['authorId'] = request.query.authorId;
        }
        if (request.query?.isDeleted !== undefined) {
          filter['isDeleted'] = request.query.isDeleted === 'true';
        }

        const total = await postsCollection.countDocuments(filter);
        const skip = (page - 1) * limit;
        const docs = await postsCollection
          .find(filter)
          .skip(skip)
          .limit(limit)
          .toArray();

        // Resolve author usernames from the users collection
        const authorIds = [
          ...new Set(
            docs.map(
              (doc: Record<string, unknown>) => doc['authorId'] as string,
            ),
          ),
        ].filter(Boolean);
        const usernameMap = new Map<string, string>();
        if (authorIds.length > 0) {
          const usersCollection =
            brightDb.collection(SchemaCollection.User);
          const users = await usersCollection
            .find({ _id: { $in: authorIds } } as never)
            .toArray();
          for (const u of users) {
            const user = u as Record<string, unknown>;
            usernameMap.set(
              user['_id'] as string,
              (user['username'] as string) ?? '',
            );
          }
        }

        const posts = docs.map((doc: Record<string, unknown>) => ({
          id: doc['_id'] ?? doc['id'],
          authorId: doc['authorId'] ?? '',
          authorUsername:
            usernameMap.get(doc['authorId'] as string) ?? '',
          content: String(doc['content'] ?? '').slice(0, 200),
          createdAt: doc['createdAt'] ?? null,
          isDeleted: doc['isDeleted'] ?? false,
          likeCount: doc['likeCount'] ?? 0,
          repostCount: doc['repostCount'] ?? 0,
        }));

        return {
          statusCode: 200,
          response: {
            message: 'OK',
            posts,
            total,
            page,
            limit,
          } as IApiMessageResponse & Record<string, unknown>,
        };
      }

      return {
        statusCode: 200,
        response: {
          message: 'OK',
          posts: [],
          total: 0,
          page,
          limit,
        } as IApiMessageResponse & Record<string, unknown>,
      };
    } catch (error) {
      return handleError(error);
    }
  }

  /**
   * DELETE /api/admin/hub/posts/:postId
   * Soft-delete: sets isDeleted flag.
   */
  private async handleDeletePost(
    req: unknown,
  ): Promise<{ statusCode: number; response: AdminHubApiResponse }> {
    try {
      const request = req as { params?: { postId?: string } };
      const postId = request.params?.postId;

      if (!postId) {
        return validationError('postId is required');
      }

      // Admin bypass: go directly to DB for admin-level operations
      // (domain services require userId for authorization checks)
      const brightDb = this.application.services.has('db')
        ? (this.application.services.get('db') as BrightDb)
        : undefined;
      if (brightDb) {
        const postsCollection = brightDb.collection('brighthub_posts');
        const result = await postsCollection.updateOne(
          { _id: postId },
          { $set: { isDeleted: true } },
        );
        if (result.matchedCount === 0) {
          return notFoundError('Post', postId);
        }
        return {
          statusCode: 200,
          response: {
            message: 'Post deleted successfully',
          } as IApiMessageResponse,
        };
      }

      return notFoundError('Post', postId);
    } catch (error) {
      return handleError(error);
    }
  }
}
