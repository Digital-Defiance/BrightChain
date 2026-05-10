import { RecurrenceFrequency } from '../enums';

/**
 * Recurrence rule definition (maps to RRULE)
 * @see Requirements 1.1
 */
export interface IRecurrenceRule {
  freq: RecurrenceFrequency;
  until?: string; // ISO 8601 datetime
  count?: number;
  interval?: number;
  bySecond?: number[];
  byMinute?: number[];
  byHour?: number[];
  byDay?: string[]; // e.g., ['MO', '2TU', '-1FR']
  byMonthDay?: number[];
  byYearDay?: number[];
  byWeekNo?: number[];
  byMonth?: number[];
  bySetPos?: number[];
  wkst?: string; // e.g., 'MO'
}
