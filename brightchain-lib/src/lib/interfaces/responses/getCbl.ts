import { IApiMessageResponse } from '@digitaldefiance/suite-core-lib';

export interface IGetCblResponse extends IApiMessageResponse {
  data: string; // Base64 encoded buffer
  blockId: string;
}
