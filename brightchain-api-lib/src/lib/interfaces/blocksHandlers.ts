import {
  ApiRequestHandler,
  TypedHandlers,
} from '@digitaldefiance/node-express-suite';
import { IGetBlockApiResponse, IStoreBlockApiResponse } from './responses';

export interface BlocksHandlers extends TypedHandlers {
  storeBlock: ApiRequestHandler<IStoreBlockApiResponse>;
  getBlock: ApiRequestHandler<IGetBlockApiResponse>;
}
