import {
  ApiRequestHandler,
  ApiResponse,
  IGetBlockResponse,
  IStoreBlockResponse,
  TypedHandlers,
} from '@brightchain/brightchain-lib';

export interface BlocksHandlers extends TypedHandlers<ApiResponse> {
  storeBlock: ApiRequestHandler<IStoreBlockResponse>;
  getBlock: ApiRequestHandler<IGetBlockResponse>;
}
