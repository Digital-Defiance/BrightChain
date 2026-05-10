import { IAvailabilityWindow } from './availabilityWindow';
import { IBookingQuestion } from './bookingQuestion';

/**
 * Appointment type within a booking page
 * @see Requirements 9.1
 */
export interface IAppointmentTypeDTO {
  name: string;
  durationMinutes: number;
  bufferMinutes: number;
  availableWindows: IAvailabilityWindow[];
  questions: IBookingQuestion[];
  color?: string;
}
