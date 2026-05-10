/**
 * Availability window for booking
 * @see Requirements 9.1
 */
export interface IAvailabilityWindow {
  dayOfWeek: number; // 0=Sunday, 6=Saturday
  startTime: string; // HH:mm
  endTime: string; // HH:mm
}
