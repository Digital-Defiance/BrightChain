import { IRequestUserResponseData } from '@brightchain/brightchain-lib';
import { IApiMessageResponse } from '@digitaldefiance/node-express-suite';

/**
 * API response containing user information
 */
export interface IApiRequestUserResponse
  extends IApiMessageResponse, IRequestUserResponseData {}
