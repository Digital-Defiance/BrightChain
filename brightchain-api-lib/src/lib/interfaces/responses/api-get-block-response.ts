import { IGetBlockResponseData } from '@brightchain/brightchain-lib';
import { IApiMessageResponse } from '@digitaldefiance/node-express-suite';

export interface IGetBlockApiResponse
  extends IApiMessageResponse, IGetBlockResponseData {}
