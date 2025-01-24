import {
  ApiRequestHandler,
  IGetBlocksResponse,
  TypedHandlers,
} from '@BrightChain/brightchain-lib';

export interface BlocksHandlers extends TypedHandlers<IGetBlocksResponse> {
  storeCbl: ApiRequestHandler<IGetBlocksResponse>;
  retrieveCbl: ApiRequestHandler<IGetBlocksResponse>;
  storeBlock: ApiRequestHandler<IGetBlocksResponse>;
  getBlock: ApiRequestHandler<IGetBlocksResponse>;
}
