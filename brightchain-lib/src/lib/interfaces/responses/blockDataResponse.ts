import { IApiMessageResponse } from '@digitaldefiance/node-express-suite';

/**
 * Response for GET /api/sync/blocks/:blockId
 * Returns raw block data as base64-encoded string.
 */
export interface IBlockDataResponse extends IApiMessageResponse {
  blockId: string;
  data: string; // base64-encoded block data
  [key: string]: unknown;
}
