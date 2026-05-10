import { PlatformID } from '@digitaldefiance/ecies-lib';
import { IFreeBusySlot } from './freeBusySlot';

/**
 * Free/busy data for a user over a time range
 * @see Requirements 8.1
 */
export interface IFreeBusyDataDTO<TID extends PlatformID = string> {
  userId: TID;
  rangeStart: string;
  rangeEnd: string;
  slots: IFreeBusySlot[];
}
