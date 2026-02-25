import { IPasswordChangeResponse } from '@brightchain/brightchain-lib';
import { IApiMessageResponse } from '@digitaldefiance/node-express-suite';

/**
 * API response for password change operations
 */
export interface IApiPasswordChangeResponse extends IApiMessageResponse {
  data: IPasswordChangeResponse<string>;
}
