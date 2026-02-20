import { IListNodesResponseData } from '@brightchain/brightchain-lib';
import { IApiMessageResponse } from '@digitaldefiance/node-express-suite';

export interface IListNodesApiResponse
  extends IApiMessageResponse, IListNodesResponseData {}
