import { IBasicObjectDTO } from '@brightchain/brightchain-lib';
import { PlatformID } from '@digitaldefiance/ecies-lib';
import { EventTransparency, EventVisibility } from '../enums';
import { IAttendeeDTO } from './attendeeDto';
import { IRecurrenceRule } from './recurrenceRule';
import { IReminderDTO } from './reminderDto';

/**
 * Calendar event DTO
 * @see Requirements 1.1, 4.1
 */
export interface ICalendarEventDTO<
  TID extends PlatformID = string,
  TDate extends Date | string = string,
> extends IBasicObjectDTO<TID, TDate> {
  calendarId: TID;
  uid: string; // RFC 4122 UUID, globally unique
  sequence: number;
  summary: string;
  description?: string;
  location?: string;
  dtstart: string; // ISO 8601 with TZID
  dtend?: string; // ISO 8601 with TZID
  dtstartTzid: string; // IANA timezone identifier
  dtendTzid?: string;
  allDay: boolean;
  visibility: EventVisibility;
  transparency: EventTransparency;
  status: 'CONFIRMED' | 'TENTATIVE' | 'CANCELLED';
  organizerId: TID;
  attendees: IAttendeeDTO<TID>[];
  rrule?: IRecurrenceRule;
  exdates?: string[]; // ISO 8601 datetimes
  rdates?: string[]; // ISO 8601 datetimes
  recurrenceId?: string; // For exception instances
  reminders: IReminderDTO[];
  attachmentIds?: TID[]; // Block store references
  categories?: string[];
  dateModified: TDate;
}
