import { IApiMessageResponse } from '@digitaldefiance/node-express-suite';

export interface IStoreCblResponse extends IApiMessageResponse {
  blockId: string;
}
