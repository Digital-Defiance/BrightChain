import { IApiMessageResponse } from './apiMessage';

export interface IApiErrorResponse extends IApiMessageResponse {
  error: unknown;
}
