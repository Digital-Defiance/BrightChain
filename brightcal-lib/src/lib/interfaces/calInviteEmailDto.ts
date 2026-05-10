import { PlatformID } from '@digitaldefiance/ecies-lib';
import { ITipMethod, ParticipationStatus } from '../enums';
import { IAttendeeDTO } from './attendeeDto';

/**
 * Represents the structured data extracted from a calendar invite (iTIP) email
 * attachment (MIME type `text/calendar; method=<METHOD>`).
 *
 * This DTO is shared between brightcal-lib and brightmail-lib so that
 * the mail layer can detect and display invite cards, and the calendar layer
 * can import/update events from inbound emails.
 *
 * @see RFC 5546 – iCalendar Transport-Independent Interoperability Protocol
 * @see Requirements 10.1, 10.2, 10.3
 */
export interface ICalInviteEmailDTO<
  TID extends PlatformID = string,
  TDate extends Date | string = string,
> {
  /** iTIP method that determines the action to take (REQUEST, REPLY, CANCEL, …). */
  method: ITipMethod;

  /** RFC 4122 globally unique event identifier. */
  uid: string;

  /** Monotonically increasing revision counter for this event. */
  sequence: number;

  /** Event title / subject line. */
  summary: string;

  /** Optional long-form description. */
  description?: string;

  /** Location string (address, URL, or room name). */
  location?: string;

  /** ISO 8601 start datetime with TZID qualifier. */
  dtstart: string;

  /** ISO 8601 end datetime (absent for all-day events with no explicit end). */
  dtend?: string;

  /** IANA timezone for the start datetime. */
  dtstartTzid: string;

  /** Whether this is an all-day event. */
  allDay: boolean;

  /**
   * The organizer's email address (ORGANIZER:mailto:… line from the iCalendar
   * data).  Typed as string because the mail layer may not resolve it to a
   * BrightChain user ID.
   */
  organizerEmail: string;

  /**
   * Display name of the organizer (CN= parameter), if present.
   */
  organizerName?: string;

  /**
   * Full attendee list as parsed from the iCalendar ATTENDEE properties.
   * `userId` may be absent when the attendee is an external address.
   */
  attendees: IAttendeeDTO<TID>[];

  /**
   * The raw iCalendar (ICS) text of the VCALENDAR component.  Stored so the
   * calendar layer can round-trip the data without re-serialising.
   */
  rawIcs: string;

  /**
   * When this invite was received (taken from the email's Date header or
   * server-assigned receipt timestamp).
   */
  receivedAt: TDate;

  /**
   * ID of the email message that carried this invite, for linking the
   * CalendarInviteCard back to the originating thread.
   */
  sourceEmailId: TID;
}
