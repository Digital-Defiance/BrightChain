import type { IBaseUserProfile } from '@brightchain/brighthub-lib';
import type { IApiMessageResponse } from '@digitaldefiance/node-express-suite';

/**
 * API response for a single BrightHub social network user profile
 * @see Requirements: 13.8
 */
export interface IBrightHubUserProfileApiResponse extends IApiMessageResponse {
  data: IBaseUserProfile<string>;
}
