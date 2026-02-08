import { IApiMessageResponse } from '@digitaldefiance/node-express-suite';

export interface IGetBlockResponse extends IApiMessageResponse {
  data: string; // Base64 encoded buffer
  blockId: string;
}
