import { IApiMessageResponse } from './apiMessage';

export interface IGetCblResponse extends IApiMessageResponse {
  data: string; // Base64 encoded buffer
  blockId: string;
}
