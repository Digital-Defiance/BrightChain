import { IApiMessageResponse } from '@digitaldefiance/node-express-suite';

/**
 * Sync request response
 */
export interface ISyncRequestResponse extends IApiMessageResponse {
  available: string[];
  missing: string[];
  unknown: string[];
  [key: string]: unknown;
}
