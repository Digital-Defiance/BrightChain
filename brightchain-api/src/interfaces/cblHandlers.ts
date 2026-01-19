/* eslint-disable @nx/enforce-module-boundaries */
import {
  IGetCblResponse,
  IStoreCblResponse,
} from '@brightchain/brightchain-lib';
import {
  ApiRequestHandler,
  TypedHandlers,
} from '@digitaldefiance/node-express-suite';

export interface CblHandlers extends TypedHandlers {
  storeCbl: ApiRequestHandler<IStoreCblResponse>;
  getCbl: ApiRequestHandler<IGetCblResponse>;
}
