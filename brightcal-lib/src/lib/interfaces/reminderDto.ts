/**
 * Reminder/alarm definition
 * @see Requirements 4.1
 */
export interface IReminderDTO {
  action: 'DISPLAY' | 'EMAIL' | 'AUDIO';
  triggerMinutesBefore: number;
  duration?: string; // ISO 8601 duration
  repeat?: number;
}
