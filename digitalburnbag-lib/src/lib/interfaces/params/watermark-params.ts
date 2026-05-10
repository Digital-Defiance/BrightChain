import { PlatformID } from '@digitaldefiance/ecies-lib';

/**
 * Identity information embedded in watermarks.
 */
export interface IWatermarkIdentity<TID extends PlatformID> {
  userId: TID;
  username: string;
  timestamp: Date | string;
}
