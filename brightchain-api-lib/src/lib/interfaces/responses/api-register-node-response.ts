import { IRegisterNodeResponseData } from '@brightchain/brightchain-lib';
import { IApiMessageResponse } from '@digitaldefiance/node-express-suite';

export interface IRegisterNodeApiResponse
  extends IApiMessageResponse, IRegisterNodeResponseData {}
