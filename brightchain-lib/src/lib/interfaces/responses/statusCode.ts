import { ApiResponse } from '@digitaldefiance/node-express-suite';

export interface IStatusCodeResponse<T extends ApiResponse> {
  statusCode: number;
  response: T;
  headers?: Record<string, string>;
}
