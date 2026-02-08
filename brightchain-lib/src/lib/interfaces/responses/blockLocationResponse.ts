import { IApiMessageResponse } from '@digitaldefiance/node-express-suite';
import { IBlockLocationInfo } from '../blockLocationInfo';

/**
 * Get block locations response
 */
export interface IBlockLocationsResponse extends IApiMessageResponse {
  blockId: string;
  locations: IBlockLocationInfo[];
  [key: string]: unknown;
}
