import type { IBasePostData } from '@brightchain/brighthub-lib';
import type { IApiMessageResponse } from '@digitaldefiance/node-express-suite';

/**
 * API response for timeline requests with pagination
 * @see Requirements: 13.8
 */
export interface ITimelineApiResponse extends IApiMessageResponse {
  data: {
    posts: IBasePostData<string>[];
    cursor?: string;
    hasMore: boolean;
  };
}
