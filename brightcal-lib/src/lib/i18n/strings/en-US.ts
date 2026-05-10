import { ComponentStrings } from '@digitaldefiance/i18n-lib';
import {
  BrightCalStringKey,
  BrightCalStrings,
} from '../../enumerations/brightCalStrings';

export const AmericanEnglishStrings: ComponentStrings<BrightCalStringKey> = {
  // ── Common ──
  [BrightCalStrings.Common_Calendar]: 'Calendar',
  [BrightCalStrings.Common_Event]: 'Event',
  [BrightCalStrings.Common_Booking]: 'Booking',
  [BrightCalStrings.Common_Schedule]: 'Schedule',
  [BrightCalStrings.Common_Invitation]: 'Invitation',

  // ── View modes ──
  [BrightCalStrings.View_Month]: 'Month',
  [BrightCalStrings.View_Week]: 'Week',
  [BrightCalStrings.View_Day]: 'Day',
  [BrightCalStrings.View_Agenda]: 'Agenda',

  // ── Actions ──
  [BrightCalStrings.Action_Create]: 'Create',
  [BrightCalStrings.Action_Save]: 'Save',
  [BrightCalStrings.Action_Cancel]: 'Cancel',
  [BrightCalStrings.Action_Delete]: 'Delete',
  [BrightCalStrings.Action_Edit]: 'Edit',
  [BrightCalStrings.Action_Retry]: 'Retry',
  [BrightCalStrings.Action_Accept]: 'Accept',
  [BrightCalStrings.Action_Decline]: 'Decline',
  [BrightCalStrings.Action_Tentative]: 'Tentative',
  [BrightCalStrings.Action_AddEvent]: 'Add Event',
  [BrightCalStrings.Action_ConfirmBooking]: 'Confirm Booking',
  [BrightCalStrings.Action_GoToToday]: 'Today',
  [BrightCalStrings.Action_PreviousMonth]: 'Previous month',
  [BrightCalStrings.Action_NextMonth]: 'Next month',
  [BrightCalStrings.Action_PreviousDay]: 'Previous day',
  [BrightCalStrings.Action_NextDay]: 'Next day',
  [BrightCalStrings.Action_Close]: 'Close',

  // ── Labels ──
  [BrightCalStrings.Label_Title]: 'Title',
  [BrightCalStrings.Label_Start]: 'Start',
  [BrightCalStrings.Label_End]: 'End',
  [BrightCalStrings.Label_Location]: 'Location',
  [BrightCalStrings.Label_Description]: 'Description',
  [BrightCalStrings.Label_Attendees]: 'Attendees',
  [BrightCalStrings.Label_When]: 'When',
  [BrightCalStrings.Label_Where]: 'Where',
  [BrightCalStrings.Label_Name]: 'Name',
  [BrightCalStrings.Label_Email]: 'Email',
  [BrightCalStrings.Label_Upcoming]: 'Upcoming',
  [BrightCalStrings.Label_Loading]: 'Loading calendar',
  [BrightCalStrings.Label_RsvpActions]: 'RSVP actions',
  [BrightCalStrings.Label_BookingPage]: 'Booking page',
  [BrightCalStrings.Label_BookingForm]: 'Booking form',
  [BrightCalStrings.Label_AvailableSlots]: 'Available time slots',
  [BrightCalStrings.Label_DateNavigation]: 'Date navigation',
  [BrightCalStrings.Label_CalendarSidebar]: 'Calendar sidebar',
  [BrightCalStrings.Label_CreateEvent]: 'Create event',
  [BrightCalStrings.Label_EditEvent]: 'Edit event',
  [BrightCalStrings.Label_AddCalendarEvent]: 'Add calendar event',
  [BrightCalStrings.Label_AllDay]: 'All day',
  [BrightCalStrings.Label_Visibility]: 'Visibility',
  [BrightCalStrings.Label_Calendar]: 'Calendar',

  // ── Status ──
  [BrightCalStrings.Status_Updated]: 'Updated',
  [BrightCalStrings.Status_NoUpcomingEvents]: 'No upcoming events',
  [BrightCalStrings.Status_NoAvailableSlots]:
    'No available slots for this date',

  // ── Validation errors (controllers) ──
  [BrightCalStrings.Error_MissingField_Template]:
    'Missing or invalid required field: {field}',
  [BrightCalStrings.Error_InvalidField_Template]:
    'Invalid value for field: {field}',
  [BrightCalStrings.Error_FieldTooLong_Template]:
    '{field} must be {max} characters or fewer',
  [BrightCalStrings.Error_InvalidHexColor]:
    'color must be a valid hex color code (e.g., "#FF5733")',
  [BrightCalStrings.Error_InvalidISODate_Template]:
    '{field} must be a valid ISO 8601 date/time',
  [BrightCalStrings.Error_EndBeforeStart]: 'dtend must be after dtstart',
  [BrightCalStrings.Error_InvalidVisibility]:
    'visibility must be one of: {values}',
  [BrightCalStrings.Error_InvalidTransparency]:
    'transparency must be one of: {values}',
  [BrightCalStrings.Error_MissingCalendarId]:
    'Missing required query parameter: calendarId',
  [BrightCalStrings.Error_MissingId]: 'Missing required parameter: id',
  [BrightCalStrings.Error_MissingSearchQuery]:
    'Missing or empty required query parameter: q',
  [BrightCalStrings.Error_EmptySummary]: 'summary must be a non-empty string',
  [BrightCalStrings.Error_NoUpdateFields]:
    'At least one field (displayName, color, description) must be provided',
  [BrightCalStrings.Error_InvalidRsvpResponse]:
    'response must be one of: ACCEPTED, DECLINED, TENTATIVE',
  [BrightCalStrings.Error_InvalidDuplicateMode]:
    'duplicateMode must be one of: skip, overwrite, create-new',
  [BrightCalStrings.Error_MissingIcsData]:
    'Missing or invalid required field: icsData',
  [BrightCalStrings.Error_EmptyUserIds]:
    'userIds must be a non-empty array of user IDs',
  [BrightCalStrings.Error_InvalidUserId]:
    'Each userId must be a non-empty string',
  [BrightCalStrings.Error_InvalidDuration]:
    'durationMinutes must be a positive number',
  [BrightCalStrings.Error_NoAttendees]:
    'At least one required or optional attendee must be specified',
  [BrightCalStrings.Error_EmptyAppointmentTypes]:
    'appointmentTypes must be a non-empty array',
  [BrightCalStrings.Error_MissingSlug]:
    'Missing or invalid required field: slug',
  [BrightCalStrings.Error_MissingTitle]:
    'Missing or invalid required field: title',
  [BrightCalStrings.Error_MissingDate]:
    'Missing or invalid required query parameter: date',
  [BrightCalStrings.Error_MissingAppointmentType]:
    'Missing or invalid required query parameter: appointmentType',
  [BrightCalStrings.Error_MissingStartTime]:
    'Missing or invalid required field: startTime',
  [BrightCalStrings.Error_MissingBookerName]:
    'Missing or invalid required field: bookerName',
  [BrightCalStrings.Error_MissingBookerEmail]:
    'Missing or invalid required field: bookerEmail',
  [BrightCalStrings.Error_InvalidComment]: 'comment must be a string',
  [BrightCalStrings.Error_MissingCounterProposalId]:
    'Missing or invalid required field: counterProposalId',
  [BrightCalStrings.Error_MissingEventId]:
    'Missing or invalid required field: eventId',
  [BrightCalStrings.Error_MissingProposedStart]:
    'Missing or invalid required field: proposedStart',
  [BrightCalStrings.Error_MissingProposedEnd]:
    'Missing or invalid required field: proposedEnd',
  [BrightCalStrings.Error_MissingCalendarIdParam]:
    'Missing required parameter: calendarId',
  [BrightCalStrings.Error_DescriptionMustBeString]:
    'description must be a string',
  [BrightCalStrings.Error_InvalidStartDate]:
    'start must be a valid ISO 8601 date/time',
  [BrightCalStrings.Error_InvalidEndDate]:
    'end must be a valid ISO 8601 date/time',

  // ── Permission errors ──
  [BrightCalStrings.Error_Forbidden_CalendarUpdate]:
    'Only the calendar owner can update this calendar',
  [BrightCalStrings.Error_Forbidden_CalendarDelete]:
    'Only the calendar owner can delete this calendar',
  [BrightCalStrings.Error_Forbidden_EventUpdate]:
    'Insufficient permission to update this event',
  [BrightCalStrings.Error_Forbidden_EventDelete]:
    'Insufficient permission to delete this event',
  [BrightCalStrings.Error_Forbidden_Export]:
    'Insufficient permission to export this calendar',
  [BrightCalStrings.Error_Forbidden_Import]:
    'Insufficient permission to import into this calendar',

  // ── Service errors ──
  [BrightCalStrings.Error_ServiceUnavailable_Calendar]:
    'Calendar service is not available',
  [BrightCalStrings.Error_ServiceUnavailable_Event]:
    'Event service is not available',
  [BrightCalStrings.Error_ServiceUnavailable_Scheduling]:
    'Scheduling service is not available',
  [BrightCalStrings.Error_ServiceUnavailable_Invitation]:
    'Invitation service is not available',
  [BrightCalStrings.Error_ServiceUnavailable_Booking]:
    'Booking service is not available',
  [BrightCalStrings.Error_ServiceUnavailable_Search]:
    'Search service is not available',
  [BrightCalStrings.Error_ServiceUnavailable_ExportImport]:
    'Export/Import service is not available',

  // ── Not found ──
  [BrightCalStrings.Error_NotFound_BookingPage]: 'Booking page not found',
  [BrightCalStrings.Error_SlotUnavailable]:
    'The requested time slot is no longer available',
  [BrightCalStrings.Error_NotFound_AppointmentType]:
    'Booking page or appointment type not found',

  // ── Friends ──
  [BrightCalStrings.Friends_SectionTitle]: 'Friends',

  // ── Calendar Sidebar ──
  [BrightCalStrings.Label_MyCalendars]: 'My Calendars',
  [BrightCalStrings.Label_OtherCalendars]: 'Other Calendars',
  [BrightCalStrings.Label_CalendarName]: 'Calendar name',
  [BrightCalStrings.Label_CalendarUrl]: 'Calendar URL',
  [BrightCalStrings.Label_NewName]: 'New name',
  [BrightCalStrings.Label_CalendarColor]: 'Calendar color',
  [BrightCalStrings.Label_CalendarOptions]: 'Calendar options',
  [BrightCalStrings.Label_ConfirmDelete]: 'Confirm delete',
  [BrightCalStrings.Label_DismissError]: 'Dismiss error',
  [BrightCalStrings.Label_AddCalendarForm]: 'Add calendar form',
  [BrightCalStrings.Label_SubscribeToCalendarForm]:
    'Subscribe to calendar form',
  [BrightCalStrings.Label_RenameCalendarForm]: 'Rename calendar form',
  [BrightCalStrings.Label_ChangeCalendarColorForm]:
    'Change calendar color form',
  [BrightCalStrings.Label_NewCalendarName]: 'New calendar name',
  [BrightCalStrings.Label_CalendarControls]: 'Calendar controls',
  [BrightCalStrings.Label_CalendarApplication]: 'Calendar application',
  [BrightCalStrings.Label_CalendarNavigation]: 'Calendar navigation',
  [BrightCalStrings.Label_CalendarContent]: 'Calendar content',
  [BrightCalStrings.Label_WeekView]: 'Week view',
  [BrightCalStrings.Label_DayViewTemplate]: 'Day view for {DATE}',
  [BrightCalStrings.Label_AttendeeAvailability]: 'Attendee availability',
  [BrightCalStrings.Label_Attendee]: 'Attendee',
  [BrightCalStrings.Label_MiniCalendar]: 'Mini calendar',
  [BrightCalStrings.Label_AgendaView]: 'Agenda view',

  // ── Calendar Sidebar Actions ──
  [BrightCalStrings.Action_AddCalendar]: 'Add Calendar',
  [BrightCalStrings.Action_SubscribeToCalendar]: 'Subscribe to Calendar',
  [BrightCalStrings.Action_BrowseHolidayCalendars]: 'Browse Holiday Calendars',
  [BrightCalStrings.Action_Subscribe]: 'Subscribe',
  [BrightCalStrings.Action_Rename]: 'Rename',
  [BrightCalStrings.Action_ChangeColor]: 'Change Color',
  [BrightCalStrings.Action_Share]: 'Share',
  [BrightCalStrings.Action_Revoke]: 'Revoke',
  [BrightCalStrings.Action_CopyPublicLink]: 'Copy Public Link',
  [BrightCalStrings.Action_RevokePublicLink]: 'Revoke Public Link',

  // ── Calendar Sidebar Messages ──
  [BrightCalStrings.Sidebar_CannotDeleteDefault]:
    'Cannot delete the default calendar',
  [BrightCalStrings.Sidebar_ConfirmDeleteMessage]:
    'Are you sure you want to delete this calendar? This action cannot be undone.',

  // ── Sharing Dialog ──
  [BrightCalStrings.Sharing_DialogTitleTemplate]: 'Share "{NAME}"',
  [BrightCalStrings.Sharing_CurrentShares]: 'Current Shares',
  [BrightCalStrings.Sharing_NoShares]:
    'No shares yet. Add a user below to share this calendar.',
  [BrightCalStrings.Sharing_AddShare]: 'Add Share',
  [BrightCalStrings.Sharing_LinkCopied]: 'Link copied to clipboard',
  [BrightCalStrings.Sharing_SelectAndCopy]: 'Select and copy the link above',
  [BrightCalStrings.Label_CloseSharingDialog]: 'Close sharing dialog',
  [BrightCalStrings.Label_SharedUsers]: 'Shared users',
  [BrightCalStrings.Label_ShareCalendarForm]: 'Share calendar form',
  [BrightCalStrings.Label_UserId]: 'User ID',
  [BrightCalStrings.Label_PermissionLevel]: 'Permission level',
  [BrightCalStrings.Label_PublicLink]: 'Public Link',
  [BrightCalStrings.Label_PublicLinkUrl]: 'Public link URL',

  // ── Permission Labels ──
  [BrightCalStrings.Permission_Owner]: 'Owner',
  [BrightCalStrings.Permission_Editor]: 'Editor',
  [BrightCalStrings.Permission_Viewer]: 'Viewer',
  [BrightCalStrings.Permission_FreeBusyOnly]: 'Free/Busy Only',

  // ── Visibility Options ──
  [BrightCalStrings.Visibility_Public]: 'Public',
  [BrightCalStrings.Visibility_Private]: 'Private',
  [BrightCalStrings.Visibility_Confidential]: 'Confidential',

  // ── Weekday Abbreviations ──
  [BrightCalStrings.Weekday_Sun]: 'Sun',
  [BrightCalStrings.Weekday_Mon]: 'Mon',
  [BrightCalStrings.Weekday_Tue]: 'Tue',
  [BrightCalStrings.Weekday_Wed]: 'Wed',
  [BrightCalStrings.Weekday_Thu]: 'Thu',
  [BrightCalStrings.Weekday_Fri]: 'Fri',
  [BrightCalStrings.Weekday_Sat]: 'Sat',

  // ── Holiday Catalog ──
  [BrightCalStrings.Label_HolidayCalendars]: 'Holiday Calendars',
  [BrightCalStrings.Label_SearchHolidayCalendars]: 'Search holiday calendars',
  [BrightCalStrings.Label_CloseHolidayCatalog]: 'Close holiday catalog',
  [BrightCalStrings.Holiday_SearchPlaceholder]: 'Search by name or region...',
  [BrightCalStrings.Holiday_NoCalendarsFound]: 'No holiday calendars found.',
  [BrightCalStrings.Holiday_UnableToLoad]: 'Unable to load holiday calendars',
  [BrightCalStrings.Status_Subscribed]: 'Subscribed',

  // ── Tooltip ──
  [BrightCalStrings.Tooltip_AddEvent]:
    'Create a calendar event with these recipients',
};
