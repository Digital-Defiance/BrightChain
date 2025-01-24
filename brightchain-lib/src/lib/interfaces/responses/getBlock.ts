import { IApiMessageResponse } from './apiMessage';

export interface IGetBlockResponse extends IApiMessageResponse {
  data: string; // Base64 encoded buffer
  blockId: string;
}
