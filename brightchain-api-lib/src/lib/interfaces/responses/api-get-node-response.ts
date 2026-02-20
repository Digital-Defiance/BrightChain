import { IGetNodeResponseData } from '@brightchain/brightchain-lib';
import { IApiMessageResponse } from '@digitaldefiance/node-express-suite';

export interface IGetNodeApiResponse
  extends IApiMessageResponse, IGetNodeResponseData {}
