import { IBasicObjectDTO } from '@brightchain/brightchain-lib';
import { PlatformID } from '@digitaldefiance/ecies-lib';
import { IAppointmentTypeDTO } from './appointmentTypeDto';

/**
 * Booking page configuration
 * @see Requirements 9.1
 */
export interface IBookingPageDTO<
  TID extends PlatformID = string,
  TDate extends Date | string = string,
> extends IBasicObjectDTO<TID, TDate> {
  ownerId: TID;
  slug: string; // URL-friendly identifier
  title: string;
  description?: string;
  appointmentTypes: IAppointmentTypeDTO[];
  minNoticeMinutes: number; // default 240 (4 hours)
  maxAdvanceDays: number; // max days in advance
  active: boolean;
}
