import { IApiMessageResponse } from './apiMessage';

export interface IStoreBlockResponse extends IApiMessageResponse {
  blockId: string;
}
