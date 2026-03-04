/**
 * EmailApiClient — typed service wrapping all 11 Email Controller endpoints.
 *
 * Accepts an AxiosInstance (provided via useAuthenticatedApi from
 * @digitaldefiance/express-suite-react-components) so the component library
 * has no hardcoded API configuration.
 *
 * Requirements: 2.1, 2.2, 2.3, 2.4, 8.3
 */

import {
  IApiEnvelope,
  IDeleteEmailResponse,
  IForwardEmailResponse,
  IGetDeliveryStatusResponse,
  IGetEmailContentResponse,
  IGetEmailResponse,
  IGetEmailThreadResponse,
  IGetUnreadCountResponse,
  IMarkAsReadResponse,
  IQueryInboxResponse,
  IReplyToEmailResponse,
  ISendEmailResponse,
} from '@brightchain/brightchain-lib';
import { AxiosInstance, AxiosResponse, isAxiosError } from 'axios';

// ─── Request param interfaces ───────────────────────────────────────────────

export interface MailboxInput {
  displayName?: string;
  localPart: string;
  domain: string;
}

export interface SendEmailParams {
  from: MailboxInput;
  to?: MailboxInput[];
  cc?: MailboxInput[];
  bcc?: MailboxInput[];
  subject?: string;
  textBody?: string;
  htmlBody?: string;
}

export interface InboxQueryParams {
  readStatus?: 'read' | 'unread' | 'all';
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
}

export interface ReplyParams {
  from: MailboxInput;
  replyAll?: boolean;
  subject?: string;
  textBody?: string;
  htmlBody?: string;
}

export interface ForwardParams {
  forwardTo: MailboxInput[];
}

// ─── Error envelope extraction ──────────────────────────────────────────────

/**
 * Wraps an Axios call that returns an IApiEnvelope<T>, extracts the data
 * payload on success, and propagates the server-provided error message on
 * failure.
 */
export async function handleApiCall<T>(
  call: () => Promise<AxiosResponse<IApiEnvelope<T>>>,
): Promise<T> {
  try {
    const response = await call();
    if (response.data.status === 'error') {
      throw new Error(response.data.error?.message ?? 'Unknown error');
    }
    return response.data.data as T;
  } catch (error) {
    if (isAxiosError(error) && error.response?.data?.error?.message) {
      throw new Error(error.response.data.error.message);
    }
    throw error;
  }
}

// ─── EmailApiClient factory ─────────────────────────────────────────────────

export function createEmailApiClient(api: AxiosInstance) {
  return {
    sendEmail: (params: SendEmailParams) =>
      handleApiCall<
        ISendEmailResponse extends IApiEnvelope<infer D> ? D : never
      >(() => api.post<ISendEmailResponse>('/emails', params)),

    queryInbox: (params?: InboxQueryParams) =>
      handleApiCall<
        IQueryInboxResponse extends IApiEnvelope<infer D> ? D : never
      >(() => api.get<IQueryInboxResponse>('/emails/inbox', { params })),

    getUnreadCount: () =>
      handleApiCall<
        IGetUnreadCountResponse extends IApiEnvelope<infer D> ? D : never
      >(() => api.get<IGetUnreadCountResponse>('/emails/inbox/unread-count')),

    getEmail: (messageId: string) =>
      handleApiCall<
        IGetEmailResponse extends IApiEnvelope<infer D> ? D : never
      >(() =>
        api.get<IGetEmailResponse>(`/emails/${encodeURIComponent(messageId)}`),
      ),

    getEmailContent: (messageId: string) =>
      handleApiCall<
        IGetEmailContentResponse extends IApiEnvelope<infer D> ? D : never
      >(() =>
        api.get<IGetEmailContentResponse>(
          `/emails/${encodeURIComponent(messageId)}/content`,
        ),
      ),

    getEmailThread: (messageId: string) =>
      handleApiCall<
        IGetEmailThreadResponse extends IApiEnvelope<infer D> ? D : never
      >(() =>
        api.get<IGetEmailThreadResponse>(
          `/emails/${encodeURIComponent(messageId)}/thread`,
        ),
      ),

    getDeliveryStatus: (messageId: string) =>
      handleApiCall<
        IGetDeliveryStatusResponse extends IApiEnvelope<infer D> ? D : never
      >(() =>
        api.get<IGetDeliveryStatusResponse>(
          `/emails/${encodeURIComponent(messageId)}/delivery-status`,
        ),
      ),

    replyToEmail: (messageId: string, body: ReplyParams) =>
      handleApiCall<
        IReplyToEmailResponse extends IApiEnvelope<infer D> ? D : never
      >(() =>
        api.post<IReplyToEmailResponse>(
          `/emails/${encodeURIComponent(messageId)}/reply`,
          body,
        ),
      ),

    forwardEmail: (messageId: string, body: ForwardParams) =>
      handleApiCall<
        IForwardEmailResponse extends IApiEnvelope<infer D> ? D : never
      >(() =>
        api.post<IForwardEmailResponse>(
          `/emails/${encodeURIComponent(messageId)}/forward`,
          body,
        ),
      ),

    markAsRead: (messageId: string) =>
      handleApiCall<
        IMarkAsReadResponse extends IApiEnvelope<infer D> ? D : never
      >(() =>
        api.post<IMarkAsReadResponse>(
          `/emails/${encodeURIComponent(messageId)}/read`,
        ),
      ),

    deleteEmail: (messageId: string) =>
      handleApiCall<
        IDeleteEmailResponse extends IApiEnvelope<infer D> ? D : never
      >(() =>
        api.delete<IDeleteEmailResponse>(
          `/emails/${encodeURIComponent(messageId)}`,
        ),
      ),
  };
}

export type EmailApiClient = ReturnType<typeof createEmailApiClient>;
