import type { IBaseConnectionList } from '@brightchain/brighthub-lib';
import type { IApiMessageResponse } from '@digitaldefiance/node-express-suite';

/**
 * API response for a single connection list
 * @see Requirements: 36.11
 */
export interface IConnectionListApiResponse extends IApiMessageResponse {
  data: IBaseConnectionList<string>;
}

/**
 * API response for a list of connection lists with pagination
 * @see Requirements: 36.11
 */
export interface IConnectionListsApiResponse extends IApiMessageResponse {
  data: {
    lists: IBaseConnectionList<string>[];
    cursor?: string;
    hasMore: boolean;
  };
}
