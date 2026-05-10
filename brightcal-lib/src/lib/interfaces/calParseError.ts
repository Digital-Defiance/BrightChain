/**
 * Error encountered during iCalendar parsing
 * @see Requirements 1.5
 */
export interface ICalParseError {
  line: number;
  message: string;
  severity: 'error' | 'warning';
}
