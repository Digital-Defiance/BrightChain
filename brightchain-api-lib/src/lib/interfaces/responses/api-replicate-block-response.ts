import { IReplicateBlockResponseData } from '@brightchain/brightchain-lib';
import { IApiMessageResponse } from '@digitaldefiance/node-express-suite';

export interface IReplicateBlockApiResponse
  extends IApiMessageResponse, IReplicateBlockResponseData {}
