import { IAvailabilityWindow } from './availabilityWindow';

/**
 * Working hours configuration per user
 * @see Requirements 8.1
 */
export interface IWorkingHoursDTO {
  timezone: string; // IANA timezone
  windows: IAvailabilityWindow[];
}
