import { IStoreCblResponseData } from '@brightchain/brightchain-lib';
import { IApiMessageResponse } from '@digitaldefiance/node-express-suite';

export interface IStoreCblApiResponse
  extends IApiMessageResponse, IStoreCblResponseData {}
