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
import { IBrightChainApplication } from '../../interfaces/application';
import { DefaultBackendIdType } from '../../shared-types';
import {
  handleError,
  notFoundError,
  validationError,
} from '../../utils/errorResponse';
import { BaseController } from '../base';

type AdminMailApiResponse = IApiMessageResponse | ApiErrorResponse;

interface AdminMailHandlers extends TypedHandlers {
  listEmails: ApiRequestHandler<AdminMailApiResponse>;
  deleteEmail: ApiRequestHandler<AdminMailApiResponse>;
}

/**
 * Admin-only BrightMail email management controller.
 *
 * ## Endpoints
 *
 * ### GET /api/admin/mail/emails
 * Paginated email list with id, senderId, senderUsername, recipientCount,
 * subject preview (first 100 chars), createdAt, deliveryStatus.
 *
 * ### DELETE /api/admin/mail/emails/:emailId
 * Delete an email.
 *
 * @requirements 17.2, 17.3
 */
export class AdminMailController<
  TID extends PlatformID = DefaultBackendIdType,
> extends BaseController<
  TID,
  AdminMailApiResponse,
  AdminMailHandlers,
  CoreLanguageCode
> {
  constructor(application: IBrightChainApplication<TID>) {
    super(application);
  }

  protected initRouteDefinitions(): void {
    this.routeDefinitions = [
      routeConfig('get', '/emails', {
        handlerKey: 'listEmails',
        useAuthentication: true,
        useCryptoAuthentication: false,
      }),
      routeConfig('delete', '/emails/:emailId', {
        handlerKey: 'deleteEmail',
        useAuthentication: true,
        useCryptoAuthentication: false,
      }),
    ];

    this.handlers = {
      listEmails: this.handleListEmails.bind(this),
      deleteEmail: this.handleDeleteEmail.bind(this),
    };
  }

  /**
   * GET /api/admin/mail/emails?page=1&limit=20
   */
  private async handleListEmails(
    req: unknown,
  ): Promise<{ statusCode: number; response: AdminMailApiResponse }> {
    try {
      const request = req as {
        query?: { page?: string; limit?: string };
      };
      const page = Math.max(1, parseInt(request.query?.page ?? '1', 10) || 1);
      const limit = Math.min(
        100,
        Math.max(1, parseInt(request.query?.limit ?? '20', 10) || 20),
      );

      const mailService = this.application.services.has('messagePassingService')
        ? (this.application.services.get('messagePassingService') as {
            listEmails?: (options: { page: number; limit: number }) => Promise<{
              emails: Record<string, unknown>[];
              total: number;
            }>;
          })
        : undefined;

      if (mailService?.listEmails) {
        const result = await mailService.listEmails({ page, limit });

        const emails = result.emails.map((email: Record<string, unknown>) => ({
          id: email['_id'] ?? email['id'],
          senderId: email['senderId'] ?? '',
          senderUsername: email['senderUsername'] ?? '',
          recipientCount: Array.isArray(email['recipients'])
            ? (email['recipients'] as unknown[]).length
            : (email['recipientCount'] ?? 0),
          subjectPreview: String(email['subject'] ?? '').slice(0, 100),
          createdAt: email['createdAt'] ?? null,
          deliveryStatus: email['deliveryStatus'] ?? 'unknown',
        }));

        return {
          statusCode: 200,
          response: {
            message: 'OK',
            emails,
            total: result.total,
            page,
            limit,
          } as IApiMessageResponse & Record<string, unknown>,
        };
      }

      // Fallback: direct DB access
      const brightDb = this.application.services.has('db')
        ? (this.application.services.get('db') as BrightDb)
        : undefined;
      if (brightDb) {
        const collection = brightDb.collection('brightmail_emails');
        const total = await collection.countDocuments();
        const skip = (page - 1) * limit;
        const docs = await collection.find().skip(skip).limit(limit).toArray();

        const emails = docs.map((doc: Record<string, unknown>) => ({
          id: doc['_id'] ?? doc['id'],
          senderId: doc['senderId'] ?? '',
          senderUsername: doc['senderUsername'] ?? '',
          recipientCount: Array.isArray(doc['recipients'])
            ? (doc['recipients'] as unknown[]).length
            : (doc['recipientCount'] ?? 0),
          subjectPreview: String(doc['subject'] ?? '').slice(0, 100),
          createdAt: doc['createdAt'] ?? null,
          deliveryStatus: doc['deliveryStatus'] ?? 'unknown',
        }));

        return {
          statusCode: 200,
          response: {
            message: 'OK',
            emails,
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
          emails: [],
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
   * DELETE /api/admin/mail/emails/:emailId
   */
  private async handleDeleteEmail(
    req: unknown,
  ): Promise<{ statusCode: number; response: AdminMailApiResponse }> {
    try {
      const request = req as { params?: { emailId?: string } };
      const emailId = request.params?.emailId;

      if (!emailId) {
        return validationError('emailId is required');
      }

      const mailService = this.application.services.has('messagePassingService')
        ? (this.application.services.get('messagePassingService') as {
            deleteEmail?: (emailId: string) => Promise<boolean>;
          })
        : undefined;

      if (mailService?.deleteEmail) {
        const deleted = await mailService.deleteEmail(emailId);
        if (!deleted) {
          return notFoundError('Email', emailId);
        }
        return {
          statusCode: 200,
          response: {
            message: 'Email deleted successfully',
          } as IApiMessageResponse,
        };
      }

      // Fallback: direct DB delete
      const brightDb = this.application.services.has('db')
        ? (this.application.services.get('db') as BrightDb)
        : undefined;
      if (brightDb) {
        const collection = brightDb.collection('brightmail_emails');
        const result = await collection.deleteOne({ _id: emailId });
        if (!result.deletedCount) {
          return notFoundError('Email', emailId);
        }
        return {
          statusCode: 200,
          response: {
            message: 'Email deleted successfully',
          } as IApiMessageResponse,
        };
      }

      return notFoundError('Email', emailId);
    } catch (error) {
      return handleError(error);
    }
  }
}
