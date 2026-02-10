/**
 * Email API response interfaces.
 * All responses use the IApiEnvelope wrapper defined in communication.ts.
 *
 * These are the data-shape types that live in brightchain-lib so both
 * frontend and backend can consume them. The Express-specific wrappers
 * (extending Response) live in brightchain-api-lib.
 *
 * Note: The underlying email interfaces (IEmailMetadata, ISendEmailResult,
 * IEmailContent, IInboxResult, IDeliveryReceipt) are not currently generic
 * over TId/TData. When those interfaces gain generic parameters in the future,
 * these response types should be updated to thread them through.
 *
 * Requirements: 12.1, 12.2
 */

import {
  IEmailContent,
  IInboxResult,
  ISendEmailResult,
} from '../../services/messaging/emailMessageService';
import { IApiEnvelope } from '../communication';
import { IDeliveryReceipt } from '../messaging/emailDelivery';
import { IEmailMetadata } from '../messaging/emailMetadata';

// ─── JSON-serializable send result ─────────────────────────────────────────
// ISendEmailResult uses Map<string, IDeliveryReceipt> for deliveryStatus,
// but JSON.stringify converts Maps to `{}`. The controller converts the Map
// to a Record before responding, so the *response* type must reflect that.

export interface ISendEmailResultSerialized extends Omit<
  ISendEmailResult,
  'deliveryStatus'
> {
  deliveryStatus: Record<string, IDeliveryReceipt>;
}

// ─── Send / Reply / Forward responses ───────────────────────────────────────

export type ISendEmailResponse = IApiEnvelope<ISendEmailResultSerialized>;

export type IReplyToEmailResponse = IApiEnvelope<ISendEmailResultSerialized>;

export type IForwardEmailResponse = IApiEnvelope<ISendEmailResultSerialized>;

// ─── Get email responses ────────────────────────────────────────────────────

export type IGetEmailResponse = IApiEnvelope<IEmailMetadata>;

export type IGetEmailContentResponse = IApiEnvelope<IEmailContent>;

export type IGetEmailThreadResponse = IApiEnvelope<IEmailMetadata[]>;

// ─── Inbox responses ────────────────────────────────────────────────────────

export type IQueryInboxResponse = IApiEnvelope<IInboxResult>;

export type IGetUnreadCountResponse = IApiEnvelope<{ unreadCount: number }>;

// ─── Mutation responses ─────────────────────────────────────────────────────

export type IDeleteEmailResponse = IApiEnvelope<{ deleted: boolean }>;

export type IMarkAsReadResponse = IApiEnvelope<{ markedAsRead: boolean }>;

// ─── Delivery status response ───────────────────────────────────────────────

export type IGetDeliveryStatusResponse = IApiEnvelope<
  Record<string, IDeliveryReceipt>
>;
