import { IBasicObjectDTO } from '@brightchain/brightchain-lib';
import { PlatformID } from '@digitaldefiance/ecies-lib';
import { CalendarPermissionLevel } from '../enums';

/**
 * Calendar sharing record
 * @see Requirements 6.1
 */
export interface ICalendarShareDTO<
  TID extends PlatformID = string,
  TDate extends Date | string = string,
> extends IBasicObjectDTO<TID, TDate> {
  calendarId: TID;
  grantedToUserId?: TID;
  grantedToGroupId?: TID;
  permission: CalendarPermissionLevel;
  publicLink?: string;
  expiresAt?: TDate;
}
