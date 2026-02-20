import { IMembersResponseData } from '@brightchain/brightchain-lib';
import { IApiMessageResponse } from '@digitaldefiance/node-express-suite';

/**
 * API response for members operations
 */
export interface MembersResponse
  extends IApiMessageResponse, IMembersResponseData {}
