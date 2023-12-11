/**
 * UnifiedNotificationController — thin aggregation endpoint.
 *
 * Fans out to Hub NotificationService and Email MessagePassingService
 * via Promise.all, merges unread counts, and returns a single response.
 * BrightChat is a placeholder (returns 0) until ConversationService
 * exposes an unread count method.
 *
 * Routes:
 *   GET /unified-notifications/unread-counts — aggregated unread counts
 *   GET /unified-notifications/recent        — merged recent notifications
 */

import { IUnifiedNotificationItem } from '@brightchain/brightchain-lib';
import { INotificationService } from '@brightchain/brighthub-lib';
import { INotificationService as IBurnbagNotificationService } from '@brightchain/digitalburnbag-lib';
import { CoreLanguageCode } from '@digitaldefiance/i18n-lib';
import { PlatformID } from '@digitaldefiance/node-ecies-lib';
import {
  ApiErrorResponse,
  ApiRequestHandler,
  ControllerRegistry,
  routeConfig,
  TypedHandlers,
} from '@digitaldefiance/node-express-suite';
import { IBrightChainApplication } from '../../interfaces/application';
import { IStatusCodeResponse } from '../../interfaces/responses';
import {
  IUnifiedNotificationCountsApiResponse,
  IUnifiedNotificationsListApiResponse,
} from '../../interfaces/responses/brighthub';
import { MessagePassingService } from '../../services/messagePassingService';
import { DefaultBackendIdType } from '../../shared-types';
import { handleError, validationError } from '../../utils/errorResponse';
import { BaseController } from '../base';

type UnifiedNotificationApiResponse =
  | IUnifiedNotificationCountsApiResponse
  | IUnifiedNotificationsListApiResponse
  | ApiErrorResponse;

interface IUnifiedNotificationHandlers extends TypedHandlers {
  getUnreadCounts: ApiRequestHandler<UnifiedNotificationApiResponse>;
  getRecent: ApiRequestHandler<UnifiedNotificationApiResponse>;
}

export class UnifiedNotificationController<
  TID extends PlatformID = DefaultBackendIdType,
> extends BaseController<
  TID,
  UnifiedNotificationApiResponse,
  IUnifiedNotificationHandlers,
  CoreLanguageCode
> {
  private notificationService: INotificationService | null = null;
  private messagePassingService: MessagePassingService | null = null;
  private burnbagNotificationService: IBurnbagNotificationService<TID> | null =
    null;

  constructor(application: IBrightChainApplication<TID>) {
    super(application);
  }

  public setNotificationService(service: INotificationService): void {
    this.notificationService = service;
  }

  public setMessagePassingService(service: MessagePassingService): void {
    this.messagePassingService = service;
  }

  public setBurnbagNotificationService(
    service: IBurnbagNotificationService<TID>,
  ): void {
    this.burnbagNotificationService = service;
  }

  protected initRouteDefinitions(): void {
    this.routeDefinitions = [
      routeConfig('get', '/unread-counts', {
        handlerKey: 'getUnreadCounts',
        useAuthentication: true,
        useCryptoAuthentication: false,
        openapi: {
          summary: 'Get unified unread notification counts across all modules',
          tags: ['Unified Notifications'],
          responses: {
            200: {
              schema: 'UnifiedNotificationCountsResponse',
              description: 'Aggregated unread counts',
            },
          },
        },
      }),
      routeConfig('get', '/recent', {
        handlerKey: 'getRecent',
        useAuthentication: true,
        useCryptoAuthentication: false,
        openapi: {
          summary: 'Get recent notifications merged across all modules',
          tags: ['Unified Notifications'],
          responses: {
            200: {
              schema: 'UnifiedNotificationsListResponse',
              description: 'Merged recent notifications',
            },
          },
        },
      }),
    ];

    ControllerRegistry.register(
      '/unified-notifications',
      'UnifiedNotificationController',
      this.routeDefinitions,
    );

    this.handlers = {
      getUnreadCounts: this.handleGetUnreadCounts.bind(this),
      getRecent: this.handleGetRecent.bind(this),
    };
  }

  /**
   * GET /api/unified-notifications/unread-counts?userId=...
   */
  private async handleGetUnreadCounts(
    req: unknown,
  ): Promise<IStatusCodeResponse<UnifiedNotificationApiResponse>> {
    try {
      const typedReq = req as { query: Record<string, string | undefined> };
      const userId = typedReq.query['userId'];
      if (!userId)
        return validationError('Missing required query parameter: userId');

      const [hub, mail, chat, pass, burnbag] = await Promise.all([
        this.notificationService
          ? this.notificationService.getUnreadCount(userId).catch(() => 0)
          : Promise.resolve(0),
        this.messagePassingService
          ? this.messagePassingService
              .getUnreadEmailCount(userId)
              .catch(() => 0)
          : Promise.resolve(0),
        // BrightChat — wire when ConversationService gains getUnreadCount
        Promise.resolve(0),
        // BrightPass — wire when pass notification service is available
        Promise.resolve(0),
        this.burnbagNotificationService
          ? this.burnbagNotificationService
              .getUnreadCount(userId as TID)
              .catch(() => 0)
          : Promise.resolve(0),
      ]);

      const total = hub + mail + chat + pass + burnbag;

      return {
        statusCode: 200,
        response: {
          message: 'OK',
          data: { total, hub, mail, chat, pass, burnbag },
        },
      };
    } catch (error) {
      return handleError(error);
    }
  }

  /**
   * GET /api/unified-notifications/recent?userId=...&limit=20&cursor=...
   *
   * Fetches recent notifications from Hub and recent unread emails from Mail,
   * normalizes them into IUnifiedNotificationItem[], merges, sorts by date
   * descending, and returns a paginated slice.
   */
  private async handleGetRecent(
    req: unknown,
  ): Promise<IStatusCodeResponse<UnifiedNotificationApiResponse>> {
    try {
      const typedReq = req as { query: Record<string, string | undefined> };
      const userId = typedReq.query['userId'];
      if (!userId)
        return validationError('Missing required query parameter: userId');

      const limit = Math.min(
        Math.max(1, parseInt(typedReq.query['limit'] ?? '20', 10) || 20),
        50,
      );

      // Fan out to available services
      const [hubItems, mailItems, burnbagItems] = await Promise.all([
        this.fetchHubNotifications(userId, limit),
        this.fetchMailNotifications(userId, limit),
        this.fetchBurnbagNotifications(userId as TID, limit),
      ]);

      // Merge and sort by date descending
      const merged = [...hubItems, ...mailItems, ...burnbagItems].sort(
        (a, b) =>
          new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
      );

      // Apply cursor-based pagination
      let startIndex = 0;
      const cursor = typedReq.query['cursor'];
      if (cursor) {
        const idx = merged.findIndex((item) => item.id === cursor);
        if (idx >= 0) startIndex = idx + 1;
      }

      const sliced = merged.slice(startIndex, startIndex + limit + 1);
      const hasMore = sliced.length > limit;
      const items = sliced.slice(0, limit);
      const nextCursor =
        hasMore && items.length > 0 ? items[items.length - 1].id : undefined;

      return {
        statusCode: 200,
        response: {
          message: 'OK',
          data: { items, hasMore, cursor: nextCursor },
        },
      };
    } catch (error) {
      return handleError(error);
    }
  }

  /**
   * Fetch Hub notifications and normalize to IUnifiedNotificationItem[].
   */
  private async fetchHubNotifications(
    userId: string,
    limit: number,
  ): Promise<IUnifiedNotificationItem[]> {
    if (!this.notificationService) return [];
    try {
      const result = await this.notificationService.getNotifications(userId, {
        limit,
      });
      return result.items.map((n) => ({
        id: n._id,
        source: 'hub' as const,
        type: n.type,
        content: n.content,
        isRead: n.isRead,
        createdAt: n.createdAt,
        clickThroughUrl: n.clickThroughUrl,
        actorId: n.actorId,
      }));
    } catch {
      return [];
    }
  }

  /**
   * Fetch recent unread emails and normalize to IUnifiedNotificationItem[].
   */
  private async fetchMailNotifications(
    userId: string,
    limit: number,
  ): Promise<IUnifiedNotificationItem[]> {
    if (!this.messagePassingService) return [];
    try {
      const result = await this.messagePassingService.queryInbox(userId, {
        readStatus: 'unread',
        sortBy: 'date',
        sortDirection: 'desc',
        pageSize: limit,
      });
      return result.emails.map((email) => ({
        id: email.messageId,
        source: 'mail' as const,
        type: 'email',
        content: email.subject ?? '(no subject)',
        isRead: false,
        createdAt: email.date?.toISOString() ?? new Date().toISOString(),
        clickThroughUrl: `/brightmail/${email.messageId}`,
        actorId: email.from?.address,
      }));
    } catch {
      return [];
    }
  }

  /**
   * Fetch Burnbag notifications and normalize to IUnifiedNotificationItem[].
   */
  private async fetchBurnbagNotifications(
    userId: TID,
    limit: number,
  ): Promise<IUnifiedNotificationItem[]> {
    if (!this.burnbagNotificationService) return [];
    try {
      const notifications =
        await this.burnbagNotificationService.getRecentNotifications(
          userId,
          limit,
        );
      return notifications.map((n) => ({
        id: String(n.id),
        source: 'burnbag' as const,
        type: n.type,
        content: n.message,
        isRead: n.read ?? false,
        createdAt:
          typeof n.createdAt === 'string'
            ? n.createdAt
            : n.createdAt.toISOString(),
        clickThroughUrl: `/burnbag/${n.targetType}/${String(n.targetId)}`,
        actorId: n.actorId ? String(n.actorId) : undefined,
      }));
    } catch {
      return [];
    }
  }
}
