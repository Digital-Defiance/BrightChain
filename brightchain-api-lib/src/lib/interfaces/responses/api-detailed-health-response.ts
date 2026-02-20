import { IDetailedHealthResponseData } from '@brightchain/brightchain-lib';
import { IApiMessageResponse } from '@digitaldefiance/node-express-suite';

export interface IDetailedHealthApiResponse
  extends IApiMessageResponse, IDetailedHealthResponseData {}
