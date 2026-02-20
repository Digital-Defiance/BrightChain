import { IApiMessageResponse } from '@digitaldefiance/node-express-suite';

export interface IApiErrorResponse extends IApiMessageResponse {
  error: unknown;
}
