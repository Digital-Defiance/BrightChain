import {
  IUnifiedNotificationCounts,
  IUnifiedNotificationsResult,
} from '@brightchain/brightchain-lib';
import { IApiMessageResponse } from '@digitaldefiance/node-express-suite';

/**
 * API response for unified notification counts across all modules.
 * @see Requirements: 57.2, 13.8
 */
export interface IUnifiedNotificationCountsApiResponse
  extends IApiMessageResponse {
  data: IUnifiedNotificationCounts;
}

/**
 * API response for unified recent notifications list.
 */
export interface IUnifiedNotificationsListApiResponse
  extends IApiMessageResponse {
  data: IUnifiedNotificationsResult;
}
