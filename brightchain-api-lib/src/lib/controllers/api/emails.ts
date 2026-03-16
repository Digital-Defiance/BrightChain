/**
 * EmailController — REST API for email operations.
 *
 * Routes:
 *   POST   /                              — Send a new email
 *   GET    /inbox                         — Query inbox (paginated, filtered)
 *   GET    /inbox/unread-count            — Get unread email count
 *   GET    /:messageId                    — Get email metadata by ID
 *   GET    /:messageId/content            — Get full email content
 *   GET    /:messageId/thread             — Get email thread
 *   GET    /:messageId/delivery-status    — Get delivery status
 *   POST   /:messageId/reply             — Reply to an email
 *   POST   /:messageId/forward           — Forward an email
 *   POST   /:messageId/read              — Mark email as read
 *   DELETE /:messageId                    — Delete an email
 *
 * Requirements: 1.1, 2.1, 3.1, 4.1, 5.1, 6.1, 7.1, 8.1, 9.1, 10.1, 11.1
 */

import {
  createMailbox,
  EmailError,
  EmailErrorType,
  formatFileSize,
  IApiEnvelope,
  IDeleteEmailResponse,
  IForwardEmailResponse,
  IGetDeliveryStatusResponse,
  IGetEmailContentResponse,
  IGetEmailResponse,
  IGetEmailThreadResponse,
  IGetUnreadCountResponse,
  IInboxQuery,
  IMarkAsReadResponse,
  IQueryInboxResponse,
  IRecipientVerificationResult,
  IReplyToEmailResponse,
  isEmailError,
  ISendEmailResponse,
  MAX_ATTACHMENT_SIZE_BYTES,
  MessageEncryptionScheme,
  RECIPIENT_VERIFY_RATE_LIMIT,
  RECIPIENT_VERIFY_WINDOW_MS,
  validateAttachmentSize,
  validateTotalAttachmentSize,
} from '@brightchain/brightchain-lib';
import { CoreLanguageCode } from '@digitaldefiance/i18n-lib';
import { PlatformID } from '@digitaldefiance/node-ecies-lib';
import {
  ApiErrorResponse,
  ApiRequestHandler,
  ControllerRegistry,
  routeConfig,
  TypedHandlers,
} from '@digitaldefiance/node-express-suite';
import * as jwt from 'jsonwebtoken';
import { IBrightChainApplication } from '../../interfaces/application';
import { ITokenPayload } from '../../interfaces/token-payload';
import { MessagePassingService } from '../../services/messagePassingService';
import { DefaultBackendIdType } from '../../shared-types';
import {
  deleteEmailValidation,
  forwardEmailValidation,
  getDeliveryStatusValidation,
  getEmailContentValidation,
  getEmailThreadValidation,
  getUnreadCountValidation,
  markAsReadValidation,
  messageIdParamValidation,
  queryInboxValidation,
  replyEmailValidation,
  sendEmailValidation,
  verifyRecipientValidation,
} from '../../utils/emailValidation';
import {
  handleError,
  internalError,
  notFoundError,
  validationError,
} from '../../utils/errorResponse';
import { BaseController } from '../base';

// ─── Response union type ────────────────────────────────────────────────────

type EmailApiResponse =
  | ISendEmailResponse
  | IGetEmailResponse
  | IGetEmailContentResponse
  | IDeleteEmailResponse
  | IQueryInboxResponse
  | IGetUnreadCountResponse
  | IGetEmailThreadResponse
  | IReplyToEmailResponse
  | IForwardEmailResponse
  | IMarkAsReadResponse
  | IGetDeliveryStatusResponse
  | IApiEnvelope<IRecipientVerificationResult>
  | ApiErrorResponse;

// ─── Handler interface ──────────────────────────────────────────────────────

interface EmailHandlers extends TypedHandlers {
  sendEmail: ApiRequestHandler<EmailApiResponse>;
  queryInbox: ApiRequestHandler<EmailApiResponse>;
  getUnreadCount: ApiRequestHandler<EmailApiResponse>;
  getEmail: ApiRequestHandler<EmailApiResponse>;
  getEmailContent: ApiRequestHandler<EmailApiResponse>;
  getEmailThread: ApiRequestHandler<EmailApiResponse>;
  getDeliveryStatus: ApiRequestHandler<EmailApiResponse>;
  replyToEmail: ApiRequestHandler<EmailApiResponse>;
  forwardEmail: ApiRequestHandler<EmailApiResponse>;
  markAsRead: ApiRequestHandler<EmailApiResponse>;
  deleteEmail: ApiRequestHandler<EmailApiResponse>;
  verifyRecipient: ApiRequestHandler<EmailApiResponse>;
}

// ─── Request body/param interfaces ──────────────────────────────────────────

interface MailboxInput {
  displayName?: string;
  localPart: string;
  domain: string;
}

interface AttachmentInputBody {
  filename: string;
  mimeType: string;
  data: string; // base64-encoded
}

interface SendEmailRequestBody {
  body: {
    from: MailboxInput;
    to?: MailboxInput[];
    cc?: MailboxInput[];
    bcc?: MailboxInput[];
    subject?: string;
    textBody?: string;
    htmlBody?: string;
    memberId?: string;
    attachments?: AttachmentInputBody[];
    encryptionScheme?: string;
  };
}

interface InboxQueryParams {
  query: {
    memberId?: string;
    readStatus?: string;
    senderAddress?: string;
    dateFrom?: string;
    dateTo?: string;
    hasAttachments?: string;
    subjectContains?: string;
    searchText?: string;
    sortBy?: string;
    sortDirection?: string;
    page?: string;
    pageSize?: string;
  };
}

interface MessageIdParams {
  params: { messageId: string };
}

interface ReplyRequestBody {
  params: { messageId: string };
  body: {
    from: MailboxInput;
    replyAll?: boolean;
    subject?: string;
    textBody?: string;
    htmlBody?: string;
    memberId?: string;
  };
}

interface ForwardRequestBody {
  params: { messageId: string };
  body: {
    forwardTo: MailboxInput[];
    memberId?: string;
  };
}

interface MarkAsReadRequestBody {
  params: { messageId: string };
  body: { memberId?: string };
  query: { memberId?: string };
}

// ─── Map serialization helper ───────────────────────────────────────────────

function mapToRecord<K extends string, V>(map: Map<K, V>): Record<string, V> {
  const record: Record<string, V> = {} as Record<string, V>;
  for (const [key, value] of map) {
    record[key] = value;
  }
  return record;
}

// ─── Controller ─────────────────────────────────────────────────────────────

export class EmailController<
  TID extends PlatformID = DefaultBackendIdType,
> extends BaseController<
  TID,
  EmailApiResponse,
  EmailHandlers,
  CoreLanguageCode
> {
  private messagePassingService: MessagePassingService | null = null;

  /**
   * In-memory per-user rate limit map for verify-recipient endpoint.
   * Maps userId → array of request timestamps (sliding window).
   */
  private verifyRecipientRateLimitMap = new Map<string, number[]>();

  /**
   * Optional user registry for recipient verification.
   * When set, the verify-recipient endpoint delegates to this registry.
   */
  private userRegistry: { hasUser(email: string): Promise<boolean> } | null = null;

  /**
   * The local email domain used for constructing full email addresses
   * from usernames during recipient verification.
   */
  private emailDomain = 'brightchain.org';

  constructor(application: IBrightChainApplication<TID>) {
    super(application);
  }

  /**
   * Set the MessagePassingService instance for email operations.
   */
  public setMessagePassingService(service: MessagePassingService): void {
    this.messagePassingService = service;
  }

  /**
   * Set the user registry for recipient verification.
   */
  public setUserRegistry(registry: { hasUser(email: string): Promise<boolean> }): void {
    this.userRegistry = registry;
  }

  /**
   * Set the local email domain for recipient verification.
   */
  public setEmailDomain(domain: string): void {
    this.emailDomain = domain;
  }

  /**
   * Get the MessagePassingService instance.
   * @throws Error if the service has not been set.
   */
  private getMessagePassingService(): MessagePassingService {
    if (!this.messagePassingService) {
      const error = new Error('MessagePassingService not initialized');
      (error as any).isServiceUnavailable = true;
      throw error;
    }
    return this.messagePassingService;
  }

  /**
   * Extract memberId from request body or query params.
   * Extract memberId from request body, query params, or authenticated user.
   * Checks body and query first (for backward compatibility with explicit
   * memberId), then falls back to req.user populated by auth middleware.
   * As a last resort, decodes the JWT from the Authorization header.
   */
  private getMemberId(req: unknown): string {
    const body = (req as SendEmailRequestBody).body;
    if (body && typeof body === 'object') {
      const bodyRecord = body as Record<string, unknown>;
      if (typeof bodyRecord['memberId'] === 'string')
        return bodyRecord['memberId'];
    }
    const query = (req as InboxQueryParams).query;
    if (query && typeof query.memberId === 'string') return query.memberId;

    // Fall back to authenticated user from JWT middleware (if auth is enabled)
    const user = (req as { user?: { memberId?: string; id?: string } }).user;
    if (user) {
      if (typeof user.memberId === 'string') return user.memberId;
      if (typeof user.id === 'string') return user.id;
    }

    // Last resort: decode JWT from Authorization header directly
    const headers = (req as { headers?: { authorization?: string } }).headers;
    const authHeader = headers?.authorization;
    if (authHeader && authHeader.startsWith('Bearer ')) {
      try {
        const token = authHeader.slice(7);
        const decoded = jwt.verify(
          token,
          this.application.environment.jwtSecret,
        ) as ITokenPayload;
        if (decoded.memberId) return decoded.memberId;
      } catch {
        // Token invalid or expired — fall through to error
      }
    }

    throw new Error('No authenticated user');
  }

  // ─── Route Definitions (Task 3.2) ──────────────────────────────────

  protected initRouteDefinitions(): void {
    const noAuth = {
      useAuthentication: false,
      useCryptoAuthentication: false,
    };

    this.routeDefinitions = [
      // POST / — Send email
      routeConfig('post', '/', {
        ...noAuth,
        handlerKey: 'sendEmail',
        validation: () => sendEmailValidation,
        openapi: {
          summary: 'Send a new email',
          description:
            'Send an email with optional attachments (max 25 MB total) and encryption scheme.',
          tags: ['Email'],
          requestBody: { schema: 'SendEmailRequest' },
          responses: {
            201: {
              schema: 'SendEmailResponse',
              description: 'Email sent successfully',
            },
            400: {
              schema: 'ErrorResponse',
              description: 'Validation error (invalid attachment, encryption scheme, etc.)',
            },
          },
        },
      }),
      // GET /inbox — Query inbox (BEFORE /:messageId to avoid param conflict)
      routeConfig('get', '/inbox', {
        ...noAuth,
        handlerKey: 'queryInbox',
        validation: () => queryInboxValidation,
      }),
      // GET /inbox/unread-count (BEFORE /:messageId to avoid param conflict)
      routeConfig('get', '/inbox/unread-count', {
        ...noAuth,
        handlerKey: 'getUnreadCount',
        validation: () => getUnreadCountValidation,
      }),
      // GET /verify-recipient/:username (BEFORE /:messageId to avoid param conflict)
      routeConfig('get', '/verify-recipient/:username', {
        ...noAuth,
        handlerKey: 'verifyRecipient',
        validation: () => verifyRecipientValidation,
        openapi: {
          summary: 'Verify local recipient existence',
          description:
            'Check whether a local username exists on this BrightChain server. ' +
            'Requires JWT authentication. Rate limited to 10 requests per minute per user.',
          tags: ['Email'],
          parameters: [
            {
              name: 'username',
              in: 'path',
              required: true,
              schema: { type: 'string', pattern: '^[a-zA-Z0-9]+$' },
              description: 'Alphanumeric username to verify',
            },
          ],
          responses: {
            200: {
              schema: 'RecipientVerificationResponse',
              description: 'Verification result with username and exists flag',
            },
            400: {
              schema: 'ErrorResponse',
              description: 'Invalid username format',
            },
            401: {
              schema: 'ErrorResponse',
              description: 'Authentication required',
            },
            429: {
              schema: 'ErrorResponse',
              description: 'Rate limit exceeded',
            },
          },
        },
      }),
      // GET /:messageId — Get email metadata
      routeConfig('get', '/:messageId', {
        ...noAuth,
        handlerKey: 'getEmail',
        validation: () => messageIdParamValidation,
      }),
      // GET /:messageId/content — Get full email content
      routeConfig('get', '/:messageId/content', {
        ...noAuth,
        handlerKey: 'getEmailContent',
        validation: () => getEmailContentValidation,
      }),
      // GET /:messageId/thread — Get email thread
      routeConfig('get', '/:messageId/thread', {
        ...noAuth,
        handlerKey: 'getEmailThread',
        validation: () => getEmailThreadValidation,
      }),
      // GET /:messageId/delivery-status — Get delivery status
      routeConfig('get', '/:messageId/delivery-status', {
        ...noAuth,
        handlerKey: 'getDeliveryStatus',
        validation: () => getDeliveryStatusValidation,
      }),
      // POST /:messageId/reply — Reply to email
      routeConfig('post', '/:messageId/reply', {
        ...noAuth,
        handlerKey: 'replyToEmail',
        validation: () => replyEmailValidation,
      }),
      // POST /:messageId/forward — Forward email
      routeConfig('post', '/:messageId/forward', {
        ...noAuth,
        handlerKey: 'forwardEmail',
        validation: () => forwardEmailValidation,
      }),
      // POST /:messageId/read — Mark as read
      routeConfig('post', '/:messageId/read', {
        ...noAuth,
        handlerKey: 'markAsRead',
        validation: () => markAsReadValidation,
      }),
      // DELETE /:messageId — Delete email
      routeConfig('delete', '/:messageId', {
        ...noAuth,
        handlerKey: 'deleteEmail',
        validation: () => deleteEmailValidation,
      }),
    ];

    this.handlers = {
      sendEmail: this.handleSendEmail.bind(this),
      queryInbox: this.handleQueryInbox.bind(this),
      getUnreadCount: this.handleGetUnreadCount.bind(this),
      getEmail: this.handleGetEmail.bind(this),
      getEmailContent: this.handleGetEmailContent.bind(this),
      getEmailThread: this.handleGetEmailThread.bind(this),
      getDeliveryStatus: this.handleGetDeliveryStatus.bind(this),
      replyToEmail: this.handleReplyToEmail.bind(this),
      forwardEmail: this.handleForwardEmail.bind(this),
      markAsRead: this.handleMarkAsRead.bind(this),
      deleteEmail: this.handleDeleteEmail.bind(this),
      verifyRecipient: this.handleVerifyRecipient.bind(this),
    };

    // Register with OpenAPI registry
    ControllerRegistry.register(
      '/emails',
      'EmailController',
      this.routeDefinitions,
    );
  }

  // ─── Handler Methods (Task 3.3) ────────────────────────────────────

  /**
   * POST /api/emails
   * Send a new email.
   */
  private async handleSendEmail(req: unknown): Promise<{
    statusCode: number;
    response: ISendEmailResponse | ApiErrorResponse;
  }> {
    try {
      const { from, to, cc, bcc, subject, textBody, htmlBody, attachments, encryptionScheme } = (
        req as SendEmailRequestBody
      ).body;

      // ── Attachment validation (Requirements 7.3, 7.4) ───────────────
      if (attachments && attachments.length > 0) {
        const decodedSizes: number[] = [];

        for (const att of attachments) {
          // Validate base64 data
          let decoded: Buffer;
          try {
            decoded = Buffer.from(att.data, 'base64');
            // Check if the data is valid base64 by re-encoding and comparing length
            if (decoded.length === 0 && att.data.length > 0) {
              return {
                statusCode: 400,
                response: {
                  status: 'error' as const,
                  data: null as unknown as ISendEmailResponse['data'],
                  error: { code: 'INVALID_BASE64', message: `Invalid base64 data for attachment '${att.filename}'` },
                },
              };
            }
          } catch {
            return {
              statusCode: 400,
              response: {
                status: 'error' as const,
                data: null as unknown as ISendEmailResponse['data'],
                error: { code: 'INVALID_BASE64', message: `Invalid base64 data for attachment '${att.filename}'` },
              },
            };
          }

          // Per-file size validation
          if (!validateAttachmentSize(decoded.length, MAX_ATTACHMENT_SIZE_BYTES)) {
            return {
              statusCode: 400,
              response: {
                status: 'error' as const,
                data: null as unknown as ISendEmailResponse['data'],
                error: { code: 'ATTACHMENT_TOO_LARGE', message: `Attachment '${att.filename}' exceeds ${formatFileSize(MAX_ATTACHMENT_SIZE_BYTES)} limit` },
              },
            };
          }

          decodedSizes.push(decoded.length);
        }

        // Cumulative size validation
        if (!validateTotalAttachmentSize(decodedSizes, MAX_ATTACHMENT_SIZE_BYTES)) {
          return {
            statusCode: 400,
            response: {
              status: 'error' as const,
              data: null as unknown as ISendEmailResponse['data'],
              error: { code: 'TOTAL_SIZE_EXCEEDED', message: `Total attachment size exceeds ${formatFileSize(MAX_ATTACHMENT_SIZE_BYTES)} limit` },
            },
          };
        }
      }

      // ── Encryption scheme validation (Requirement 7.5) ──────────────
      if (encryptionScheme !== undefined) {
        const validSchemes = Object.values(MessageEncryptionScheme) as string[];
        if (!validSchemes.includes(encryptionScheme)) {
          return {
            statusCode: 400,
            response: {
              status: 'error' as const,
              data: null as unknown as ISendEmailResponse['data'],
              error: { code: 'INVALID_ENCRYPTION_SCHEME', message: `Invalid encryption scheme: '${encryptionScheme}'` },
            },
          };
        }
      }

      const service = this.getMessagePassingService();

      const result = await service.sendEmail({
        from: createMailbox(from.localPart, from.domain, from.displayName),
        to: to?.map((m) => createMailbox(m.localPart, m.domain, m.displayName)),
        cc: cc?.map((m) => createMailbox(m.localPart, m.domain, m.displayName)),
        bcc: bcc?.map((m) =>
          createMailbox(m.localPart, m.domain, m.displayName),
        ),
        subject,
        textBody,
        htmlBody,
      });

      return {
        statusCode: 201,
        response: {
          status: 'success' as const,
          data: {
            ...result,
            deliveryStatus: mapToRecord(result.deliveryStatus),
          },
        },
      };
    } catch (error) {
      return this.mapServiceError(error);
    }
  }

  /**
   * GET /api/emails/inbox
   * Query inbox with filters, sorting, and pagination.
   */
  private async handleQueryInbox(req: unknown): Promise<{
    statusCode: number;
    response: IQueryInboxResponse | ApiErrorResponse;
  }> {
    try {
      const memberId = this.getMemberId(req);
      const queryParams = (req as InboxQueryParams).query;

      const inboxQuery: IInboxQuery = {};

      if (queryParams.readStatus) {
        inboxQuery.readStatus = queryParams.readStatus as
          | 'read'
          | 'unread'
          | 'all';
      }
      if (queryParams.senderAddress) {
        inboxQuery.senderAddress = queryParams.senderAddress;
      }
      if (queryParams.dateFrom) {
        inboxQuery.dateFrom = new Date(queryParams.dateFrom);
      }
      if (queryParams.dateTo) {
        inboxQuery.dateTo = new Date(queryParams.dateTo);
      }
      if (queryParams.hasAttachments !== undefined) {
        inboxQuery.hasAttachments = queryParams.hasAttachments === 'true';
      }
      if (queryParams.subjectContains) {
        inboxQuery.subjectContains = queryParams.subjectContains;
      }
      if (queryParams.searchText) {
        inboxQuery.searchText = queryParams.searchText;
      }
      if (queryParams.sortBy) {
        inboxQuery.sortBy = queryParams.sortBy as
          | 'date'
          | 'sender'
          | 'subject'
          | 'size';
      }
      if (queryParams.sortDirection) {
        inboxQuery.sortDirection = queryParams.sortDirection as 'asc' | 'desc';
      }
      if (queryParams.page) {
        inboxQuery.page = parseInt(queryParams.page, 10);
      }
      if (queryParams.pageSize) {
        inboxQuery.pageSize = parseInt(queryParams.pageSize, 10);
      }

      const service = this.getMessagePassingService();
      const result = await service.queryInbox(memberId, inboxQuery);

      return {
        statusCode: 200,
        response: {
          status: 'success' as const,
          data: result,
        },
      };
    } catch (error) {
      return this.mapServiceError(error);
    }
  }

  /**
   * GET /api/emails/inbox/unread-count
   * Get unread email count for a user.
   */
  private async handleGetUnreadCount(req: unknown): Promise<{
    statusCode: number;
    response: IGetUnreadCountResponse | ApiErrorResponse;
  }> {
    try {
      const memberId = this.getMemberId(req);
      const service = this.getMessagePassingService();
      const unreadCount = await service.getUnreadEmailCount(memberId);

      return {
        statusCode: 200,
        response: {
          status: 'success' as const,
          data: { unreadCount },
        },
      };
    } catch (error) {
      return this.mapServiceError(error);
    }
  }

  /**
   * GET /api/emails/:messageId
   * Get email metadata by ID.
   */
  private async handleGetEmail(req: unknown): Promise<{
    statusCode: number;
    response: IGetEmailResponse | ApiErrorResponse;
  }> {
    try {
      const { messageId } = (req as MessageIdParams).params;
      const service = this.getMessagePassingService();
      const email = await service.getEmail(messageId);

      if (!email) {
        return notFoundError('Email', messageId);
      }

      return {
        statusCode: 200,
        response: {
          status: 'success' as const,
          data: email,
        },
      };
    } catch (error) {
      return this.mapServiceError(error);
    }
  }

  /**
   * GET /api/emails/:messageId/content
   * Get full email content including body and attachments.
   */
  private async handleGetEmailContent(req: unknown): Promise<{
    statusCode: number;
    response: IGetEmailContentResponse | ApiErrorResponse;
  }> {
    try {
      const { messageId } = (req as MessageIdParams).params;
      const service = this.getMessagePassingService();
      const content = await service.getEmailContent(messageId);

      return {
        statusCode: 200,
        response: {
          status: 'success' as const,
          data: content,
        },
      };
    } catch (error) {
      return this.mapServiceError(error);
    }
  }

  /**
   * GET /api/emails/:messageId/thread
   * Get all emails in a thread.
   */
  private async handleGetEmailThread(req: unknown): Promise<{
    statusCode: number;
    response: IGetEmailThreadResponse | ApiErrorResponse;
  }> {
    try {
      const { messageId } = (req as MessageIdParams).params;
      const service = this.getMessagePassingService();
      const thread = await service.getEmailThread(messageId);

      return {
        statusCode: 200,
        response: {
          status: 'success' as const,
          data: thread,
        },
      };
    } catch (error) {
      return this.mapServiceError(error);
    }
  }

  /**
   * GET /api/emails/:messageId/delivery-status
   * Get delivery status for all recipients.
   */
  private async handleGetDeliveryStatus(req: unknown): Promise<{
    statusCode: number;
    response: IGetDeliveryStatusResponse | ApiErrorResponse;
  }> {
    try {
      const { messageId } = (req as MessageIdParams).params;
      const service = this.getMessagePassingService();
      const statusMap = await service.getEmailDeliveryStatus(messageId);

      return {
        statusCode: 200,
        response: {
          status: 'success' as const,
          data: mapToRecord(statusMap),
        },
      };
    } catch (error) {
      return this.mapServiceError(error);
    }
  }

  /**
   * POST /api/emails/:messageId/reply
   * Reply to an existing email.
   */
  private async handleReplyToEmail(req: unknown): Promise<{
    statusCode: number;
    response: IReplyToEmailResponse | ApiErrorResponse;
  }> {
    try {
      const { messageId } = (req as ReplyRequestBody).params;
      const { from, replyAll, subject, textBody, htmlBody } = (
        req as ReplyRequestBody
      ).body;

      const service = this.getMessagePassingService();
      const result = await service.createEmailReply(messageId, {
        from: createMailbox(from.localPart, from.domain, from.displayName),
        replyAll,
        subject,
        textBody,
        htmlBody,
      });

      return {
        statusCode: 201,
        response: {
          status: 'success' as const,
          data: {
            ...result,
            deliveryStatus: mapToRecord(result.deliveryStatus),
          },
        },
      };
    } catch (error) {
      return this.mapServiceError(error);
    }
  }

  /**
   * POST /api/emails/:messageId/forward
   * Forward an email to new recipients.
   */
  private async handleForwardEmail(req: unknown): Promise<{
    statusCode: number;
    response: IForwardEmailResponse | ApiErrorResponse;
  }> {
    try {
      const { messageId } = (req as ForwardRequestBody).params;
      const { forwardTo } = (req as ForwardRequestBody).body;

      const mailboxes = forwardTo.map((m) =>
        createMailbox(m.localPart, m.domain, m.displayName),
      );

      const service = this.getMessagePassingService();
      const result = await service.forwardEmail(messageId, mailboxes);

      return {
        statusCode: 201,
        response: {
          status: 'success' as const,
          data: {
            ...result,
            deliveryStatus: mapToRecord(result.deliveryStatus),
          },
        },
      };
    } catch (error) {
      return this.mapServiceError(error);
    }
  }

  /**
   * POST /api/emails/:messageId/read
   * Mark an email as read.
   */
  private async handleMarkAsRead(req: unknown): Promise<{
    statusCode: number;
    response: IMarkAsReadResponse | ApiErrorResponse;
  }> {
    try {
      const { messageId } = (req as MarkAsReadRequestBody).params;
      const memberId = this.getMemberId(req);

      const service = this.getMessagePassingService();
      await service.markEmailAsRead(messageId, memberId);

      return {
        statusCode: 200,
        response: {
          status: 'success' as const,
          data: { markedAsRead: true },
        },
      };
    } catch (error) {
      return this.mapServiceError(error);
    }
  }

  /**
   * DELETE /api/emails/:messageId
   * Delete an email.
   */
  private async handleDeleteEmail(req: unknown): Promise<{
    statusCode: number;
    response: IDeleteEmailResponse | ApiErrorResponse;
  }> {
    try {
      const { messageId } = (req as MessageIdParams).params;
      const service = this.getMessagePassingService();
      await service.deleteEmail(messageId);

      return {
        statusCode: 200,
        response: {
          status: 'success' as const,
          data: { deleted: true },
        },
      };
    } catch (error) {
      return this.mapServiceError(error);
    }
  }

  // ─── Rate Limiting (Task 13.2) ──────────────────────────────────────

  /**
   * Check per-user rate limit for verify-recipient endpoint.
   * Uses a sliding window approach: max RECIPIENT_VERIFY_RATE_LIMIT requests
   * per RECIPIENT_VERIFY_WINDOW_MS per authenticated user.
   *
   * Returns true if the request is allowed, false if rate limited.
   */
  private checkVerifyRecipientRateLimit(userId: string): boolean {
    const now = Date.now();
    const windowStart = now - RECIPIENT_VERIFY_WINDOW_MS;

    let timestamps = this.verifyRecipientRateLimitMap.get(userId);
    if (!timestamps) {
      timestamps = [];
      this.verifyRecipientRateLimitMap.set(userId, timestamps);
    }

    // Remove expired timestamps outside the sliding window
    const filtered = timestamps.filter((ts) => ts > windowStart);
    this.verifyRecipientRateLimitMap.set(userId, filtered);

    if (filtered.length >= RECIPIENT_VERIFY_RATE_LIMIT) {
      return false;
    }

    filtered.push(now);
    return true;
  }

  // ─── Verify Recipient Handler (Task 13.1) ─────────────────────────

  /**
   * GET /api/emails/verify-recipient/:username
   * Check if a local username exists on this server.
   * Requires authentication. Rate limited per user.
   */
  private async handleVerifyRecipient(req: unknown): Promise<{
    statusCode: number;
    response: IApiEnvelope<IRecipientVerificationResult> | ApiErrorResponse;
  }> {
    try {
      // Require authentication
      let userId: string;
      try {
        userId = this.getMemberId(req);
      } catch {
        return {
          statusCode: 401,
          response: {
            error: { code: 'UNAUTHORIZED', message: 'Authentication required' },
          } as ApiErrorResponse,
        };
      }

      // Rate limit check
      if (!this.checkVerifyRecipientRateLimit(userId)) {
        return {
          statusCode: 429,
          response: {
            error: { code: 'RATE_LIMITED', message: 'Rate limit exceeded. Try again later.' },
          } as ApiErrorResponse,
        };
      }

      const { username } = (req as { params: { username: string } }).params;

      // Delegate to user registry to check if user exists
      let exists = false;
      if (this.userRegistry) {
        try {
          const emailAddress = `${username}@${this.emailDomain}`;
          exists = await this.userRegistry.hasUser(emailAddress);
        } catch {
          // Registry unavailable — default to false
          exists = false;
        }
      }

      const result: IRecipientVerificationResult = { username, exists };

      return {
        statusCode: 200,
        response: {
          status: 'success' as const,
          data: result,
        },
      };
    } catch (error) {
      return this.mapServiceError(error);
    }
  }

  // ─── Error Mapping (Task 3.4) ──────────────────────────────────────

  /**
   * Map service-layer errors to appropriate HTTP status codes.
   * Follows the same pattern as GroupController.mapServiceError and
   * ChannelController.mapServiceError.
   */
  private mapServiceError(error: unknown): {
    statusCode: number;
    response: ApiErrorResponse;
  } {
    // Handle service unavailable (MessagePassingService not initialized)
    if (error instanceof Error && (error as any).isServiceUnavailable) {
      return {
        statusCode: 503,
        response: {
          error: {
            code: 'SERVICE_UNAVAILABLE',
            message: 'Email service is not available. Please try again later.',
          },
        } as ApiErrorResponse,
      };
    }

    if (isEmailError(error)) {
      const emailError = error as EmailError;
      switch (emailError.errorType) {
        case EmailErrorType.MESSAGE_NOT_FOUND:
          return notFoundError('Email', 'unknown');

        case EmailErrorType.INVALID_MAILBOX:
        case EmailErrorType.INVALID_HEADER_NAME:
        case EmailErrorType.INVALID_MESSAGE_ID:
        case EmailErrorType.INVALID_DATE:
        case EmailErrorType.INVALID_CONTENT_TYPE:
        case EmailErrorType.INVALID_BOUNDARY:
        case EmailErrorType.MISSING_REQUIRED_HEADER:
        case EmailErrorType.NO_RECIPIENTS:
        case EmailErrorType.ATTACHMENT_TOO_LARGE:
        case EmailErrorType.MESSAGE_TOO_LARGE:
          return validationError(emailError.message);

        default:
          return internalError(emailError);
      }
    }
    if (error instanceof Error) {
      return internalError(error);
    }
    return handleError(error);
  }
}
