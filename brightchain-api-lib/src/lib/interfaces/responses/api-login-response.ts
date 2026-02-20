import { ILoginResponseData } from '@brightchain/brightchain-lib';
import { IApiMessageResponse } from '@digitaldefiance/node-express-suite';

/**
 * API response for successful login operations
 */
export interface IApiLoginResponse
  extends IApiMessageResponse, ILoginResponseData {}
