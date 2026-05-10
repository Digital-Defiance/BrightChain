import { ICalParseError } from './calParseError';
import { ICalendarEventDTO } from './calendarEventDto';
import { ICalendarTodoDTO } from './calendarTodoDto';
import { IFreeBusyDataDTO } from './freeBusyDataDto';

/**
 * Result of parsing an iCalendar stream, containing events, todos,
 * free/busy data, and any errors encountered.
 * @see Requirements 1.1, 1.2, 1.3
 */
export interface ICalParseResult {
  events: ICalendarEventDTO[];
  todos: ICalendarTodoDTO[];
  freeBusy: IFreeBusyDataDTO[];
  errors: ICalParseError[];
}
