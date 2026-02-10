/**
 * ExplodingMessagesController — REST API for self-destructing message operations.
 *
 * Routes:
 *   PUT  /:id/set-expiration   — Set expiration on a message
 *   POST /:id/mark-read        — Mark a message as read by a member
 *   GET  /expired               — List expired messages
 *   POST /:id/explode          — Force-explode a message
 *   GET  /:id/expiration-info  — Get expiration status of a message
 *
 * Requirements: 8.1-8.9
 */

import { ICommunicationMessage } from '@brightchain/brightchain-lib/lib/interfaces/communication';
import type {
  IExplodeMessageResponse,
  IGetExpirationInfoResponse,
  IGetExpiredResponse,
  IMarkReadResponse,
  ISetExpirationResponse,
} from '@brightchain/brightchain-lib/lib/interfaces/responses/explodingMessageResponses';
import {
  ExplodingMessageService,
  InvalidExpirationError,
  MessageAlreadyExplodedError,
} from '@brightchain/brightchain-lib/lib/services/communication/explodingMessageService';
import { PlatformID } from '@digitaldefiance/ecies-lib';
import { CoreLanguageCode } from '@digitaldefiance/i18n-lib';
import {
  ApiErrorResponse,
  ApiRequestHandler,
  TypedHandlers,
  routeConfig,
} from '@digitaldefiance/node-express-suite';
import { IBrightChainApplication } from '../../interfaces/application';
import { DefaultBackendIdType } from '../../shared-types';
import {
  handleError,
  notFoundError,
  validationError,
} from '../../utils/errorResponse';
import { BaseController } from '../base';

// ─── Response union ─────────────────────────────────────────────────────────

type ExplodingMessageApiResponse =
  | ISetExpirationResponse
  | IMarkReadResponse
  | IGetExpiredResponse
  | IExplodeMessageResponse
  | IGetExpirationInfoResponse
  | ApiErrorResponse;

// ─── Handler map ────────────────────────────────────────────────────────────

interface ExplodingMessageHandlers extends TypedHandlers {
  setExpiration: ApiRequestHandler<ISetExpirationResponse | ApiErrorResponse>;
  markRead: ApiRequestHandler<IMarkReadResponse | ApiErrorResponse>;
  getExpired: ApiRequestHandler<IGetExpiredResponse | ApiErrorResponse>;
  explodeMessage: ApiRequestHandler<IExplodeMessageResponse | ApiErrorResponse>;
  getExpirationInfo: ApiRequestHandler<
    IGetExpirationInfoResponse | ApiErrorResponse
  >;
}

// ─── Request shape interfaces ───────────────────────────────────────────────

interface MessageIdParams {
  params: { id: string };
}

interface SetExpirationBody {
  body: {
    expiresAt?: string;
    expiresInMs?: number;
    maxReads?: number;
  };
  params: { id: string };
}

interface MarkReadBody {
  body: { memberId?: string };
  params: { id: string };
}

// ─── Message store (in-memory for now, replaced by persistence layer) ───────

/**
 * Simple in-memory message store for exploding message operations.
 * In production, this would be replaced by the actual message persistence layer.
 */
class ExplodingMessageStore {
  private messages = new Map<string, ICommunicationMessage>();

  get(id: string): ICommunicationMessage | undefined {
    return this.messages.get(id);
  }

  set(message: ICommunicationMessage): void {
    this.messages.set(String(message.id), message);
  }

  getAll(): ICommunicationMessage[] {
    return Array.from(this.messages.values());
  }

  remove(id: string): boolean {
    return this.messages.delete(id);
  }
}

// ─── Controller ─────────────────────────────────────────────────────────────

/**
 * Controller for exploding (self-destructing) message operations.
 *
 * Delegates to {@link ExplodingMessageService} in brightchain-lib for
 * core expiration logic including time-based and read-count-based
 * message self-destruction.
 *
 * @requirements 8.1, 8.2, 8.3, 8.4, 8.5, 8.7, 8.8
 */
export class ExplodingMessagesController<
  TID extends PlatformID = DefaultBackendIdType,
> extends BaseController<
  TID,
  ExplodingMessageApiResponse,
  ExplodingMessageHandlers,
  CoreLanguageCode
> {
  private messageStore = new ExplodingMessageStore();

  constructor(application: IBrightChainApplication<TID>) {
    super(application);
  }

  /**
   * Inject a message into the store (for integration with message passing).
   */
  public registerMessage(message: ICommunicationMessage): void {
    this.messageStore.set(message);
  }

  // ─── Route definitions ──────────────────────────────────────────────────

  protected initRouteDefinitions(): void {
    const noAuth = {
      useAuthentication: false,
      useCryptoAuthentication: false,
    };

    this.routeDefinitions = [
      routeConfig('put', '/:id/set-expiration', {
        ...noAuth,
        handlerKey: 'setExpiration',
        openapi: {
          summary: 'Set message expiration',
          description:
            'Configure time-based or read-count-based expiration on a message.',
          tags: ['Exploding Messages'],
          responses: {
            200: {
              schema: 'SetExpirationResponse',
              description: 'Expiration set successfully',
            },
            400: {
              schema: 'ApiErrorResponse',
              description: 'Invalid expiration settings',
            },
            404: {
              schema: 'ApiErrorResponse',
              description: 'Message not found',
            },
          },
        },
      }),
      routeConfig('post', '/:id/mark-read', {
        ...noAuth,
        handlerKey: 'markRead',
        openapi: {
          summary: 'Mark message as read',
          description:
            'Record that a member has read the message. Returns whether the message should explode.',
          tags: ['Exploding Messages'],
          responses: {
            200: {
              schema: 'MarkReadResponse',
              description: 'Read recorded',
            },
            404: {
              schema: 'ApiErrorResponse',
              description: 'Message not found',
            },
          },
        },
      }),
      routeConfig('get', '/expired', {
        ...noAuth,
        handlerKey: 'getExpired',
        openapi: {
          summary: 'List expired messages',
          description:
            'Returns all messages that have expired and should be deleted.',
          tags: ['Exploding Messages'],
          responses: {
            200: {
              schema: 'GetExpiredResponse',
              description: 'List of expired messages',
            },
          },
        },
      }),
      routeConfig('post', '/:id/explode', {
        ...noAuth,
        handlerKey: 'explodeMessage',
        openapi: {
          summary: 'Force-explode a message',
          description:
            'Immediately explode (permanently delete) a message regardless of expiration settings.',
          tags: ['Exploding Messages'],
          responses: {
            200: {
              schema: 'ExplodeMessageResponse',
              description: 'Message exploded',
            },
            404: {
              schema: 'ApiErrorResponse',
              description: 'Message not found',
            },
          },
        },
      }),
      routeConfig('get', '/:id/expiration-info', {
        ...noAuth,
        handlerKey: 'getExpirationInfo',
        openapi: {
          summary: 'Get expiration info',
          description:
            'Returns the expiration status and remaining time/reads for a message.',
          tags: ['Exploding Messages'],
          responses: {
            200: {
              schema: 'GetExpirationInfoResponse',
              description: 'Expiration info',
            },
            404: {
              schema: 'ApiErrorResponse',
              description: 'Message not found',
            },
          },
        },
      }),
    ];

    this.handlers = {
      setExpiration: this.handleSetExpiration.bind(this),
      markRead: this.handleMarkRead.bind(this),
      getExpired: this.handleGetExpired.bind(this),
      explodeMessage: this.handleExplodeMessage.bind(this),
      getExpirationInfo: this.handleGetExpirationInfo.bind(this),
    };
  }

  // ─── Handlers ─────────────────────────────────────────────────────────

  /**
   * PUT /:id/set-expiration — Set expiration on a message.
   *
   * @requirements 8.1, 8.2, 8.5
   */
  private async handleSetExpiration(req: unknown): Promise<{
    statusCode: number;
    response: ISetExpirationResponse | ApiErrorResponse;
  }> {
    try {
      const { id } = (req as SetExpirationBody).params;
      const { expiresAt, expiresInMs, maxReads } = (req as SetExpirationBody)
        .body;

      if (!id) {
        return validationError('Missing required parameter: id');
      }

      const message = this.messageStore.get(id);
      if (!message) {
        return notFoundError('Message', id);
      }

      ExplodingMessageService.setExpiration(message, {
        expiresAt: expiresAt ? new Date(expiresAt) : undefined,
        expiresInMs,
        maxReads,
      });

      return {
        statusCode: 200,
        response: {
          status: 'success',
          data: {
            messageId: id,
            expiresAt: message.expiresAt?.toISOString(),
            maxReads: message.maxReads,
          },
          message: 'Expiration set successfully',
        } satisfies ISetExpirationResponse,
      };
    } catch (error) {
      return this.mapExplodingError(error);
    }
  }

  /**
   * POST /:id/mark-read — Mark a message as read.
   *
   * @requirements 8.2, 8.3, 8.8
   */
  private async handleMarkRead(req: unknown): Promise<{
    statusCode: number;
    response: IMarkReadResponse | ApiErrorResponse;
  }> {
    try {
      const { id } = (req as MarkReadBody).params;
      const { memberId } = (req as MarkReadBody).body;

      if (!id) {
        return validationError('Missing required parameter: id');
      }
      if (!memberId || typeof memberId !== 'string') {
        return validationError('Missing required field: memberId');
      }

      const message = this.messageStore.get(id);
      if (!message) {
        return notFoundError('Message', id);
      }

      const shouldExplode = ExplodingMessageService.markRead(message, memberId);

      if (shouldExplode) {
        ExplodingMessageService.explode(message);
      }

      return {
        statusCode: 200,
        response: {
          status: 'success',
          data: {
            messageId: id,
            readCount: message.readCount ?? 0,
            shouldExplode,
          },
          message: shouldExplode
            ? 'Message read count exceeded — message exploded'
            : 'Read recorded',
        } satisfies IMarkReadResponse,
      };
    } catch (error) {
      return this.mapExplodingError(error);
    }
  }

  /**
   * GET /expired — List all expired messages.
   *
   * @requirements 8.4, 8.8
   */
  private async handleGetExpired(_req: unknown): Promise<{
    statusCode: number;
    response: IGetExpiredResponse | ApiErrorResponse;
  }> {
    try {
      const allMessages = this.messageStore.getAll();
      const result = ExplodingMessageService.deleteExpired(allMessages);

      return {
        statusCode: 200,
        response: {
          status: 'success',
          data: {
            expired: result.events.map((e) => ({
              messageId: e.messageId,
              reason: e.reason,
            })),
            totalCount: result.expired.length,
          },
          message: `Found ${result.expired.length} expired message(s)`,
        } satisfies IGetExpiredResponse,
      };
    } catch (error) {
      return handleError(error);
    }
  }

  /**
   * POST /:id/explode — Force-explode a message.
   *
   * @requirements 8.4, 8.7
   */
  private async handleExplodeMessage(req: unknown): Promise<{
    statusCode: number;
    response: IExplodeMessageResponse | ApiErrorResponse;
  }> {
    try {
      const { id } = (req as MessageIdParams).params;

      if (!id) {
        return validationError('Missing required parameter: id');
      }

      const message = this.messageStore.get(id);
      if (!message) {
        return notFoundError('Message', id);
      }

      const event = ExplodingMessageService.explode(message);

      return {
        statusCode: 200,
        response: {
          status: 'success',
          data: {
            messageId: id,
            exploded: true,
            explodedAt: event.explodedAt.toISOString(),
          },
          message: 'Message exploded',
        } satisfies IExplodeMessageResponse,
      };
    } catch (error) {
      return this.mapExplodingError(error);
    }
  }

  /**
   * GET /:id/expiration-info — Get expiration status.
   *
   * @requirements 8.8
   */
  private async handleGetExpirationInfo(req: unknown): Promise<{
    statusCode: number;
    response: IGetExpirationInfoResponse | ApiErrorResponse;
  }> {
    try {
      const { id } = (req as MessageIdParams).params;

      if (!id) {
        return validationError('Missing required parameter: id');
      }

      const message = this.messageStore.get(id);
      if (!message) {
        return notFoundError('Message', id);
      }

      return {
        statusCode: 200,
        response: {
          status: 'success',
          data: {
            messageId: id,
            isExploding: ExplodingMessageService.isExplodingMessage(message),
            expiresAt: message.expiresAt?.toISOString(),
            maxReads: message.maxReads,
            readCount: message.readCount,
            remainingTimeMs: ExplodingMessageService.getRemainingTime(message),
            remainingReads: ExplodingMessageService.getRemainingReads(message),
            exploded: message.exploded ?? false,
          },
          message: 'Expiration info retrieved',
        } satisfies IGetExpirationInfoResponse,
      };
    } catch (error) {
      return handleError(error);
    }
  }

  // ─── Error mapping ──────────────────────────────────────────────────

  private mapExplodingError(error: unknown): {
    statusCode: number;
    response: ApiErrorResponse;
  } {
    if (error instanceof MessageAlreadyExplodedError) {
      return {
        statusCode: 400,
        response: {
          message: error.message,
          error: 'MESSAGE_ALREADY_EXPLODED',
        },
      };
    }
    if (error instanceof InvalidExpirationError) {
      return {
        statusCode: 400,
        response: {
          message: error.message,
          error: 'INVALID_EXPIRATION',
        },
      };
    }
    return handleError(error);
  }
}
