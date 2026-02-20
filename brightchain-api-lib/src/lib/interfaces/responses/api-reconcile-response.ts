import { IReconcileResponseData } from '@brightchain/brightchain-lib';
import { IApiMessageResponse } from '@digitaldefiance/node-express-suite';

export interface IReconcileApiResponse
  extends IApiMessageResponse, IReconcileResponseData {}
