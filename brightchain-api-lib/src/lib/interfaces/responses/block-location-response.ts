import type { BlockId } from '@brightchain/brightchain-lib';
import { IBlockLocationInfo } from '@brightchain/brightchain-lib';
import { IApiMessageResponse } from '@digitaldefiance/node-express-suite';

/**
 * Get block locations response
 */
export interface IBlockLocationsResponse extends IApiMessageResponse {
  blockId: BlockId;
  locations: IBlockLocationInfo[];
  [key: string]: unknown;
}
