import { PlatformID } from '@digitaldefiance/ecies-lib';
import { CalendarPermissionLevel, EventVisibility } from '../enums';
import { ICalendarEventDTO } from '../interfaces/calendarEventDto';

/**
 * Result of permission-based filtering. Contains the filtered event data
 * or an access denied indicator.
 */
export interface IPermissionFilterResult<TID extends PlatformID = string> {
  /** Whether access was granted */
  granted: boolean;
  /** The filtered event data (undefined if denied) */
  event?: Partial<ICalendarEventDTO<TID>>;
}

/**
 * Optional context for friendship-aware visibility filtering.
 */
export interface IPermissionFilterOptions {
  /**
   * Whether the viewer is a friend of the event organizer.
   * Required when the event has FriendsOnly visibility.
   * When true, friends see full details; when false, non-friends see free/busy only.
   */
  isFriend?: boolean;
  /**
   * Whether the viewer is the event organizer.
   * Organizers always see full details regardless of visibility.
   */
  isOrganizer?: boolean;
}

/**
 * Filter event data based on the requesting user's permission level.
 *
 * Rules:
 * - Owner/Editor: full access to all event details
 * - Viewer: full details, EXCEPT:
 *   - PRIVATE events show only as "busy" (time range only, no details)
 *   - CONFIDENTIAL events show title only (no description or attendees)
 *   - FRIENDS_ONLY events: friends see full details, non-friends see free/busy only
 * - FreeBusyOnly: time range and busy/free status only (no title, description, attendees)
 * - No permission: access denied
 *
 * @param event - The full event data
 * @param permission - The requesting user's permission level (or undefined for no access)
 * @param options - Optional friendship context for FriendsOnly visibility
 * @returns Filtered event data based on permission
 *
 * @see Requirements 6.5, 6.6, 6.7, 6.8, 18.1
 */
export function filterEventByPermission<TID extends PlatformID = string>(
  event: ICalendarEventDTO<TID>,
  permission: CalendarPermissionLevel | undefined,
  options?: IPermissionFilterOptions,
): IPermissionFilterResult<TID> {
  // No permission: denied
  if (permission === undefined) {
    return { granted: false };
  }

  // Owner or Editor: full access
  if (
    permission === CalendarPermissionLevel.Owner ||
    permission === CalendarPermissionLevel.Editor
  ) {
    return { granted: true, event: { ...event } };
  }

  // Viewer: full details with visibility overrides
  if (permission === CalendarPermissionLevel.Viewer) {
    if (event.visibility === EventVisibility.Private) {
      // Private events show only as "busy" to viewers
      return {
        granted: true,
        event: {
          id: event.id,
          calendarId: event.calendarId,
          uid: event.uid,
          dtstart: event.dtstart,
          dtend: event.dtend,
          dtstartTzid: event.dtstartTzid,
          dtendTzid: event.dtendTzid,
          allDay: event.allDay,
          transparency: event.transparency,
          status: event.status,
          summary: 'Busy',
          visibility: event.visibility,
          sequence: event.sequence,
          organizerId: event.organizerId,
          attendees: [],
          reminders: [],
          dateCreated: event.dateCreated,
          dateModified: event.dateModified,
        },
      };
    }

    if (event.visibility === EventVisibility.Confidential) {
      // Confidential events show title only (no description or attendees)
      return {
        granted: true,
        event: {
          id: event.id,
          calendarId: event.calendarId,
          uid: event.uid,
          dtstart: event.dtstart,
          dtend: event.dtend,
          dtstartTzid: event.dtstartTzid,
          dtendTzid: event.dtendTzid,
          allDay: event.allDay,
          transparency: event.transparency,
          status: event.status,
          summary: event.summary,
          visibility: event.visibility,
          sequence: event.sequence,
          organizerId: event.organizerId,
          attendees: [],
          reminders: [],
          dateCreated: event.dateCreated,
          dateModified: event.dateModified,
        },
      };
    }

    if (event.visibility === EventVisibility.FriendsOnly) {
      // Organizer always sees full details
      if (options?.isOrganizer) {
        return { granted: true, event: { ...event } };
      }
      // Friends see full details; non-friends see free/busy only
      if (options?.isFriend) {
        return { granted: true, event: { ...event } };
      }
      // Non-friend: free/busy only
      return {
        granted: true,
        event: {
          id: event.id,
          calendarId: event.calendarId,
          uid: event.uid,
          dtstart: event.dtstart,
          dtend: event.dtend,
          dtstartTzid: event.dtstartTzid,
          dtendTzid: event.dtendTzid,
          allDay: event.allDay,
          transparency: event.transparency,
          status: event.status,
          sequence: event.sequence,
          organizerId: event.organizerId,
          visibility: event.visibility,
          dateCreated: event.dateCreated,
          dateModified: event.dateModified,
        },
      };
    }

    // Public events: full details
    return { granted: true, event: { ...event } };
  }

  // FreeBusyOnly: time range and status only
  if (permission === CalendarPermissionLevel.FreeBusyOnly) {
    return {
      granted: true,
      event: {
        id: event.id,
        calendarId: event.calendarId,
        uid: event.uid,
        dtstart: event.dtstart,
        dtend: event.dtend,
        dtstartTzid: event.dtstartTzid,
        dtendTzid: event.dtendTzid,
        allDay: event.allDay,
        transparency: event.transparency,
        status: event.status,
        sequence: event.sequence,
        organizerId: event.organizerId,
        visibility: event.visibility,
        dateCreated: event.dateCreated,
        dateModified: event.dateModified,
      },
    };
  }

  return { granted: false };
}
