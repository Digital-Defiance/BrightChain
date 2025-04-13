import { IApiMessageResponse } from '@digitaldefiance/node-express-suite';

/**
 * API response for backup code count queries
 */
export interface IApiCodeCountResponse extends IApiMessageResponse {
  /**
   * Number of remaining backup codes
   */
  count: number;
}
