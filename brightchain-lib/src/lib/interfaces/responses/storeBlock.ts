import { IApiMessageResponse } from '@digitaldefiance/node-express-suite';

export interface IStoreBlockResponse extends IApiMessageResponse {
  blockId: string;
}
