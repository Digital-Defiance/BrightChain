/* eslint-disable @nx/enforce-module-boundaries */
import {
  ApiRequestHandler,
  TypedHandlers,
} from '@brightchain/brightchain-api-lib';
import {
  IGetCblResponse,
  IStoreCblResponse,
} from '@brightchain/brightchain-lib';

export interface CblHandlers extends TypedHandlers {
  storeCbl: ApiRequestHandler<IStoreCblResponse>;
  getCbl: ApiRequestHandler<IGetCblResponse>;
}
