/**
 * Represents a VTODO component parsed from an iCalendar stream.
 * @see Requirements 1.2
 */
export interface ICalendarTodoDTO {
  uid: string;
  summary: string;
  description?: string;
  due?: string; // ISO 8601 datetime
  completed?: string; // ISO 8601 datetime
  percentComplete?: number;
  priority?: number;
  status: 'NEEDS-ACTION' | 'COMPLETED' | 'IN-PROCESS' | 'CANCELLED';
}
