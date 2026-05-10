import { IBasicObjectDTO } from '@brightchain/brightchain-lib';
import { PlatformID } from '@digitaldefiance/ecies-lib';
import { CalendarPermissionLevel } from '../enums';

/**
 * Calendar collection DTO
 * @see Requirements 1.1, 4.1
 */
export interface ICalendarCollectionDTO<
  TID extends PlatformID = string,
  TDate extends Date | string = string,
> extends IBasicObjectDTO<TID, TDate> {
  ownerId: TID;
  displayName: string;
  color: string;
  description: string;
  isDefault: boolean;
  isSubscription: boolean;
  subscriptionUrl?: string;
  subscriptionRefreshInterval?: number; // minutes
  defaultPermission: CalendarPermissionLevel;
}
