import { ISyncRequestResponseData } from '@brightchain/brightchain-lib';
import { IApiMessageResponse } from '@digitaldefiance/node-express-suite';

export interface ISyncRequestApiResponse
  extends IApiMessageResponse, ISyncRequestResponseData {}
