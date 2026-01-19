/* eslint-disable @nx/enforce-module-boundaries */
import {
  IGetBlockResponse,
  IStoreBlockResponse,
} from '@brightchain/brightchain-lib';
import {
  ApiRequestHandler,
  TypedHandlers,
} from '@digitaldefiance/node-express-suite';

export interface BlocksHandlers extends TypedHandlers {
  storeBlock: ApiRequestHandler<IStoreBlockResponse>;
  getBlock: ApiRequestHandler<IGetBlockResponse>;
}
