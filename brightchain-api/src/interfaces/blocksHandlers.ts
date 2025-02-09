import {
  ApiRequestHandler,
  ApiResponse,
  IGetBlockResponse,
  IStoreBlockResponse,
  TypedHandlers,
} from '@BrightChain/brightchain-lib';

export interface BlocksHandlers extends TypedHandlers<ApiResponse> {
  storeBlock: ApiRequestHandler<IStoreBlockResponse>;
  getBlock: ApiRequestHandler<IGetBlockResponse>;
}
