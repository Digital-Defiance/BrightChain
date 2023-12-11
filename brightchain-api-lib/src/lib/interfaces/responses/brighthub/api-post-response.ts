import type { IBasePostData, IBaseThread } from '@brightchain/brighthub-lib';
import type { IApiMessageResponse } from '@digitaldefiance/node-express-suite';

/**
 * API response for a single post
 * @see Requirements: 13.8
 */
export interface IPostApiResponse extends IApiMessageResponse {
  data: IBasePostData<string>;
}

/**
 * API response for a list of posts with pagination
 * @see Requirements: 13.8
 */
export interface IPostListApiResponse extends IApiMessageResponse {
  data: {
    posts: IBasePostData<string>[];
    cursor?: string;
    hasMore: boolean;
  };
}

/**
 * API response for a thread (root post + replies)
 * @see Requirements: 2.2
 */
export interface IThreadApiResponse extends IApiMessageResponse {
  data: IBaseThread<string>;
}
