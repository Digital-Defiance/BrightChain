import {
  IBaseNotificationPreferences,
  IDoNotDisturbConfig,
  INotificationListOptions,
  INotificationService,
  IQuietHoursConfig,
  NotificationCategory,
  NotificationErrorCode,
  NotificationServiceError,
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
  INotificationApiResponse,
  INotificationsApiResponse,
  IUnreadCountApiResponse,
} from '../../../interfaces/responses/brighthub';
import { DefaultBackendIdType } from '../../../shared-types';
import {
  forbiddenError,
  handleError,
  notFoundError,
  validationError,
} from '../../../utils/errorResponse';
import { BaseController } from '../../base';

type NotificationApiResponseType =
  | INotificationApiResponse
  | INotificationsApiResponse
  | IUnreadCountApiResponse
  | IApiMessageResponse
  | ApiErrorResponse;

interface INotificationHandlers extends TypedHandlers {
  getNotifications: ApiRequestHandler<
    INotificationsApiResponse | ApiErrorResponse
  >;
  getUnreadCount: ApiRequestHandler<IUnreadCountApiResponse | ApiErrorResponse>;
  markAsRead: ApiRequestHandler<IApiMessageResponse | ApiErrorResponse>;
  markAllAsRead: ApiRequestHandler<IApiMessageResponse | ApiErrorResponse>;
  deleteNotification: ApiRequestHandler<IApiMessageResponse | ApiErrorResponse>;
  deleteAllNotifications: ApiRequestHandler<
    IApiMessageResponse | ApiErrorResponse
  >;
  getPreferences: ApiRequestHandler<IApiMessageResponse | ApiErrorResponse>;
  updatePreferences: ApiRequestHandler<IApiMessageResponse | ApiErrorResponse>;
  setQuietHours: ApiRequestHandler<IApiMessageResponse | ApiErrorResponse>;
  setDoNotDisturb: ApiRequestHandler<IApiMessageResponse | ApiErrorResponse>;
}

/**
 * Controller for BrightHub notification operations.
 *
 * Provides REST API endpoints for notification CRUD, preferences,
 * quiet hours, and Do Not Disturb configuration.
 *
 * @requirements 57.1-57.12
 */
export class BrightHubNotificationController<
  TID extends PlatformID = DefaultBackendIdType,
> extends BaseController<
  TID,
  NotificationApiResponseType,
  INotificationHandlers,
  CoreLanguageCode
> {
  private notificationService: INotificationService | null = null;

  constructor(application: IBrightChainApplication<TID>) {
    super(application);
  }

  public setNotificationService(service: INotificationService): void {
    this.notificationService = service;
  }

  private getNotificationService(): INotificationService {
    if (!this.notificationService)
      throw new Error('NotificationService not initialized');
    return this.notificationService;
  }

  private mapNotificationError(
    error: NotificationServiceError,
  ): IStatusCodeResponse<ApiErrorResponse> {
    switch (error.code) {
      case NotificationErrorCode.NotificationNotFound:
      case NotificationErrorCode.PreferencesNotFound:
        return notFoundError('Notification', 'unknown');
      case NotificationErrorCode.Unauthorized:
        return forbiddenError(error.message);
      case NotificationErrorCode.InvalidQuietHoursConfig:
      case NotificationErrorCode.InvalidDndConfig:
      case NotificationErrorCode.InvalidInput:
        return validationError(error.message);
      default:
        return handleError(error);
    }
  }

  protected initRouteDefinitions(): void {
    this.routeDefinitions = [
      routeConfig('get', '/', {
        handlerKey: 'getNotifications',
        useAuthentication: true,
        useCryptoAuthentication: false,
        openapi: {
          summary: 'Get notifications',
          tags: ['BrightHub Notifications'],
          responses: {
            200: {
              schema: 'NotificationsResponse',
              description: 'Notifications retrieved',
            },
          },
        },
      }),
      routeConfig('get', '/unread-count', {
        handlerKey: 'getUnreadCount',
        useAuthentication: true,
        useCryptoAuthentication: false,
        openapi: {
          summary: 'Get unread notification count',
          tags: ['BrightHub Notifications'],
          responses: {
            200: {
              schema: 'UnreadCountResponse',
              description: 'Unread count retrieved',
            },
          },
        },
      }),
      routeConfig('post', '/:id/read', {
        handlerKey: 'markAsRead',
        useAuthentication: true,
        useCryptoAuthentication: false,
        openapi: {
          summary: 'Mark notification as read',
          tags: ['BrightHub Notifications'],
          responses: {
            200: {
              schema: 'MessageResponse',
              description: 'Notification marked as read',
            },
          },
        },
      }),
      routeConfig('post', '/read-all', {
        handlerKey: 'markAllAsRead',
        useAuthentication: true,
        useCryptoAuthentication: false,
        openapi: {
          summary: 'Mark all notifications as read',
          tags: ['BrightHub Notifications'],
          responses: {
            200: {
              schema: 'MessageResponse',
              description: 'All notifications marked as read',
            },
          },
        },
      }),
      routeConfig('delete', '/:id', {
        handlerKey: 'deleteNotification',
        useAuthentication: true,
        useCryptoAuthentication: false,
        openapi: {
          summary: 'Delete a notification',
          tags: ['BrightHub Notifications'],
          responses: {
            204: {
              schema: 'EmptyResponse',
              description: 'Notification deleted',
            },
          },
        },
      }),
      routeConfig('delete', '/', {
        handlerKey: 'deleteAllNotifications',
        useAuthentication: true,
        useCryptoAuthentication: false,
        openapi: {
          summary: 'Delete all notifications',
          tags: ['BrightHub Notifications'],
          responses: {
            204: {
              schema: 'EmptyResponse',
              description: 'All notifications deleted',
            },
          },
        },
      }),
      routeConfig('get', '/preferences', {
        handlerKey: 'getPreferences',
        useAuthentication: true,
        useCryptoAuthentication: false,
        openapi: {
          summary: 'Get notification preferences',
          tags: ['BrightHub Notifications'],
          responses: {
            200: {
              schema: 'PreferencesResponse',
              description: 'Preferences retrieved',
            },
          },
        },
      }),
      routeConfig('put', '/preferences', {
        handlerKey: 'updatePreferences',
        useAuthentication: true,
        useCryptoAuthentication: false,
        openapi: {
          summary: 'Update notification preferences',
          tags: ['BrightHub Notifications'],
          responses: {
            200: {
              schema: 'PreferencesResponse',
              description: 'Preferences updated',
            },
          },
        },
      }),
      routeConfig('post', '/preferences/quiet-hours', {
        handlerKey: 'setQuietHours',
        useAuthentication: true,
        useCryptoAuthentication: false,
        openapi: {
          summary: 'Set quiet hours',
          tags: ['BrightHub Notifications'],
          responses: {
            200: { schema: 'MessageResponse', description: 'Quiet hours set' },
          },
        },
      }),
      routeConfig('post', '/preferences/dnd', {
        handlerKey: 'setDoNotDisturb',
        useAuthentication: true,
        useCryptoAuthentication: false,
        openapi: {
          summary: 'Set Do Not Disturb',
          tags: ['BrightHub Notifications'],
          responses: {
            200: { schema: 'MessageResponse', description: 'DND set' },
          },
        },
      }),
    ];

    ControllerRegistry.register(
      '/brighthub/notifications',
      'BrightHubNotificationController',
      this.routeDefinitions,
    );

    this.handlers = {
      getNotifications: this.handleGetNotifications.bind(this),
      getUnreadCount: this.handleGetUnreadCount.bind(this),
      markAsRead: this.handleMarkAsRead.bind(this),
      markAllAsRead: this.handleMarkAllAsRead.bind(this),
      deleteNotification: this.handleDeleteNotification.bind(this),
      deleteAllNotifications: this.handleDeleteAllNotifications.bind(this),
      getPreferences: this.handleGetPreferences.bind(this),
      updatePreferences: this.handleUpdatePreferences.bind(this),
      setQuietHours: this.handleSetQuietHours.bind(this),
      setDoNotDisturb: this.handleSetDoNotDisturb.bind(this),
    };
  }

  /**
   * GET /api/brighthub/notifications
   * @requirements 57.1
   */
  private async handleGetNotifications(
    req: unknown,
  ): Promise<
    IStatusCodeResponse<INotificationsApiResponse | ApiErrorResponse>
  > {
    try {
      const typedReq = req as { query: Record<string, string | undefined> };
      const userId = typedReq.query['userId'];
      if (!userId)
        return validationError('Missing required query parameter: userId');

      const options: INotificationListOptions = {};
      if (typedReq.query['cursor']) options.cursor = typedReq.query['cursor'];
      if (typedReq.query['limit'])
        options.limit = parseInt(typedReq.query['limit'], 10);
      if (typedReq.query['category'])
        options.category = typedReq.query['category'] as NotificationCategory;
      if (typedReq.query['isRead'] !== undefined)
        options.isRead = typedReq.query['isRead'] === 'true';

      const result = await this.getNotificationService().getNotifications(
        userId,
        options,
      );
      return {
        statusCode: 200,
        response: {
          message: 'OK',
          data: {
            notifications: result.items,
            cursor: result.cursor,
            hasMore: result.hasMore,
          },
        },
      };
    } catch (error) {
      if (error instanceof NotificationServiceError)
        return this.mapNotificationError(error);
      return handleError(error);
    }
  }

  /**
   * GET /api/brighthub/notifications/unread-count
   * @requirements 57.2
   */
  private async handleGetUnreadCount(
    req: unknown,
  ): Promise<IStatusCodeResponse<IUnreadCountApiResponse | ApiErrorResponse>> {
    try {
      const typedReq = req as { query: Record<string, string | undefined> };
      const userId = typedReq.query['userId'];
      if (!userId)
        return validationError('Missing required query parameter: userId');

      const unreadCount =
        await this.getNotificationService().getUnreadCount(userId);
      return {
        statusCode: 200,
        response: { message: 'OK', data: { unreadCount } },
      };
    } catch (error) {
      if (error instanceof NotificationServiceError)
        return this.mapNotificationError(error);
      return handleError(error);
    }
  }

  /**
   * POST /api/brighthub/notifications/:id/read
   * @requirements 57.3
   */
  private async handleMarkAsRead(
    req: unknown,
  ): Promise<IStatusCodeResponse<IApiMessageResponse | ApiErrorResponse>> {
    try {
      const { id } = (req as { params: { id: string } }).params;
      const { userId } = (
        req as { body: { userId: string }; params: { id: string } }
      ).body;
      if (!id) return validationError('Missing required parameter: id');
      if (!userId) return validationError('Missing required field: userId');

      await this.getNotificationService().markAsRead(id, userId);
      return {
        statusCode: 200,
        response: { message: 'Notification marked as read' },
      };
    } catch (error) {
      if (error instanceof NotificationServiceError)
        return this.mapNotificationError(error);
      return handleError(error);
    }
  }

  /**
   * POST /api/brighthub/notifications/read-all
   * @requirements 57.4
   */
  private async handleMarkAllAsRead(
    req: unknown,
  ): Promise<IStatusCodeResponse<IApiMessageResponse | ApiErrorResponse>> {
    try {
      const { userId } = (req as { body: { userId: string } }).body;
      if (!userId) return validationError('Missing required field: userId');

      await this.getNotificationService().markAllAsRead(userId);
      return {
        statusCode: 200,
        response: { message: 'All notifications marked as read' },
      };
    } catch (error) {
      if (error instanceof NotificationServiceError)
        return this.mapNotificationError(error);
      return handleError(error);
    }
  }

  /**
   * DELETE /api/brighthub/notifications/:id
   * @requirements 57.5
   */
  private async handleDeleteNotification(
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

      await this.getNotificationService().deleteNotification(id, userId);
      return { statusCode: 204, response: { message: 'Notification deleted' } };
    } catch (error) {
      if (error instanceof NotificationServiceError)
        return this.mapNotificationError(error);
      return handleError(error);
    }
  }

  /**
   * DELETE /api/brighthub/notifications
   * @requirements 57.6
   */
  private async handleDeleteAllNotifications(
    req: unknown,
  ): Promise<IStatusCodeResponse<IApiMessageResponse | ApiErrorResponse>> {
    try {
      const typedReq = req as { query: Record<string, string | undefined> };
      const userId = typedReq.query['userId'];
      if (!userId)
        return validationError('Missing required query parameter: userId');

      await this.getNotificationService().deleteAllNotifications(userId);
      return {
        statusCode: 204,
        response: { message: 'All notifications deleted' },
      };
    } catch (error) {
      if (error instanceof NotificationServiceError)
        return this.mapNotificationError(error);
      return handleError(error);
    }
  }

  /**
   * GET /api/brighthub/notifications/preferences
   * @requirements 57.7
   */
  private async handleGetPreferences(
    req: unknown,
  ): Promise<IStatusCodeResponse<IApiMessageResponse | ApiErrorResponse>> {
    try {
      const typedReq = req as { query: Record<string, string | undefined> };
      const userId = typedReq.query['userId'];
      if (!userId)
        return validationError('Missing required query parameter: userId');

      const preferences =
        await this.getNotificationService().getPreferences(userId);
      return {
        statusCode: 200,
        response: { message: 'OK', data: preferences } as IApiMessageResponse,
      };
    } catch (error) {
      if (error instanceof NotificationServiceError)
        return this.mapNotificationError(error);
      return handleError(error);
    }
  }

  /**
   * PUT /api/brighthub/notifications/preferences
   * @requirements 57.8
   */
  private async handleUpdatePreferences(
    req: unknown,
  ): Promise<IStatusCodeResponse<IApiMessageResponse | ApiErrorResponse>> {
    try {
      const { userId, ...preferences } = (
        req as {
          body: { userId: string } & Partial<
            IBaseNotificationPreferences<string>
          >;
        }
      ).body;
      if (!userId) return validationError('Missing required field: userId');

      const updated = await this.getNotificationService().updatePreferences(
        userId,
        preferences,
      );
      return {
        statusCode: 200,
        response: {
          message: 'Preferences updated',
          data: updated,
        } as IApiMessageResponse,
      };
    } catch (error) {
      if (error instanceof NotificationServiceError)
        return this.mapNotificationError(error);
      return handleError(error);
    }
  }

  /**
   * POST /api/brighthub/notifications/preferences/quiet-hours
   * @requirements 57.9
   */
  private async handleSetQuietHours(
    req: unknown,
  ): Promise<IStatusCodeResponse<IApiMessageResponse | ApiErrorResponse>> {
    try {
      const { userId, ...config } = (
        req as { body: { userId: string } & IQuietHoursConfig }
      ).body;
      if (!userId) return validationError('Missing required field: userId');

      await this.getNotificationService().setQuietHours(userId, config);
      return {
        statusCode: 200,
        response: { message: 'Quiet hours configured' },
      };
    } catch (error) {
      if (error instanceof NotificationServiceError)
        return this.mapNotificationError(error);
      return handleError(error);
    }
  }

  /**
   * POST /api/brighthub/notifications/preferences/dnd
   * @requirements 57.10
   */
  private async handleSetDoNotDisturb(
    req: unknown,
  ): Promise<IStatusCodeResponse<IApiMessageResponse | ApiErrorResponse>> {
    try {
      const { userId, ...config } = (
        req as { body: { userId: string } & IDoNotDisturbConfig }
      ).body;
      if (!userId) return validationError('Missing required field: userId');

      await this.getNotificationService().setDoNotDisturb(userId, config);
      return {
        statusCode: 200,
        response: { message: 'Do Not Disturb configured' },
      };
    } catch (error) {
      if (error instanceof NotificationServiceError)
        return this.mapNotificationError(error);
      return handleError(error);
    }
  }
}
