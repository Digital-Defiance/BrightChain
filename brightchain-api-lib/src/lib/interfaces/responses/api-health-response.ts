import { IHealthResponseData } from '@brightchain/brightchain-lib';
import { IApiMessageResponse } from '@digitaldefiance/node-express-suite';

export interface IHealthApiResponse
  extends IApiMessageResponse, IHealthResponseData {}
