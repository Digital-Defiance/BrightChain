import { IChallengeResponseData } from '@brightchain/brightchain-lib';
import { IApiMessageResponse } from '@digitaldefiance/node-express-suite';

/**
 * API response for login challenge generation
 */
export interface IApiChallengeResponse
  extends IApiMessageResponse, IChallengeResponseData {}
