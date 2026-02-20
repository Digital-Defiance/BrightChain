import { IStoreBlockResponseData } from '@brightchain/brightchain-lib';
import { IApiMessageResponse } from '@digitaldefiance/node-express-suite';

export interface IStoreBlockApiResponse
  extends IApiMessageResponse, IStoreBlockResponseData {}
