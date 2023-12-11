import { IGetCblResponse } from '@brightchain/brightchain-lib';
import {
  ApiRequestHandler,
  TypedHandlers,
} from '@digitaldefiance/node-express-suite';
import { IStoreCblApiResponse } from './responses';

export interface CblHandlers extends TypedHandlers {
  storeCbl: ApiRequestHandler<IStoreCblApiResponse>;
  getCbl: ApiRequestHandler<IGetCblResponse>;
}
