import { ApiResponse } from '../../sharedTypes';

export interface IStatusCodeResponse<T extends ApiResponse> {
  statusCode: number;
  response: T;
  headers?: Record<string, string>;
}
