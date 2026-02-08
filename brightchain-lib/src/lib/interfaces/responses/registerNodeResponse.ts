import { IApiMessageResponse } from '@digitaldefiance/node-express-suite';

/**
 * Register node response
 */
export interface IRegisterNodeResponse extends IApiMessageResponse {
  success: boolean;
  nodeId: string;
  [key: string]: unknown;
}
