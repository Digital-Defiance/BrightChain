import {
  ApiRequestHandler,
  ApiResponse,
  IGetCblResponse,
  IStoreCblResponse,
  TypedHandlers,
} from '@BrightChain/brightchain-lib';

export interface CblHandlers extends TypedHandlers<ApiResponse> {
  storeCbl: ApiRequestHandler<IStoreCblResponse>;
  getCbl: ApiRequestHandler<IGetCblResponse>;
}
