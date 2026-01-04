import {
  ApiRequestHandler,
  TypedHandlers,
} from '@brightchain/brightchain-api-lib';
import {
  IGetBlockResponse,
  IStoreBlockResponse,
} from '@brightchain/brightchain-lib';

export interface BlocksHandlers extends TypedHandlers {
  storeBlock: ApiRequestHandler<IStoreBlockResponse>;
  getBlock: ApiRequestHandler<IGetBlockResponse>;
}
