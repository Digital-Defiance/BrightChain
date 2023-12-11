import { ICodeCountResponseData } from '@brightchain/brightchain-lib';
import { IApiMessageResponse } from '@digitaldefiance/node-express-suite';

/** API response for backup code count operations */
export interface IApiCodeCountResponse
  extends IApiMessageResponse,
    ICodeCountResponseData {}
