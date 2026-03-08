import type {
  IBounceNotification,
  IInboundEmailResult,
  IOutboundEmailStatus,
} from '@brightchain/brightchain-lib';
import type { IApiMessageResponse } from '@digitaldefiance/node-express-suite';

/**
 * API response for outbound email delivery status queries.
 * Wraps the shared IOutboundEmailStatus DTO with the standard API message envelope.
 *
 * @see Requirements 11.2
 */
export interface IOutboundEmailStatusApiResponse extends IApiMessageResponse {
  data: IOutboundEmailStatus<string>;
}

/**
 * API response for bounce notification retrieval.
 * Wraps the shared IBounceNotification DTO with the standard API message envelope.
 *
 * @see Requirements 11.2
 */
export interface IBounceNotificationApiResponse extends IApiMessageResponse {
  data: IBounceNotification<string>;
}

/**
 * API response for inbound email processing results.
 * Wraps the shared IInboundEmailResult DTO with the standard API message envelope.
 *
 * @see Requirements 11.2
 */
export interface IInboundEmailResultApiResponse extends IApiMessageResponse {
  data: IInboundEmailResult<string>;
}
