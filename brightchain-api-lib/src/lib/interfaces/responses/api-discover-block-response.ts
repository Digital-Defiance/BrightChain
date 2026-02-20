import { IDiscoverBlockResponseData } from '@brightchain/brightchain-lib';
import { IApiMessageResponse } from '@digitaldefiance/node-express-suite';

export interface IDiscoverBlockApiResponse
  extends IApiMessageResponse, IDiscoverBlockResponseData {}
