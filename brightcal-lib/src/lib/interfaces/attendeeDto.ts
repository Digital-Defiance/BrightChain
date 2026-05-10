import { PlatformID } from '@digitaldefiance/ecies-lib';
import { ParticipationStatus } from '../enums';

/**
 * Attendee on an event
 * @see Requirements 4.1
 */
export interface IAttendeeDTO<TID extends PlatformID = string> {
  userId?: TID; // BrightMail user ID (if internal)
  email: string;
  displayName?: string;
  partstat: ParticipationStatus;
  role: 'REQ-PARTICIPANT' | 'OPT-PARTICIPANT' | 'NON-PARTICIPANT' | 'CHAIR';
  rsvp: boolean;
}
