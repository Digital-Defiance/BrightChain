/**
 * Shared i18n mock for brightcal-react-components tests.
 *
 * Maps BrightCalStrings key values to their American English translations
 * so that component tests can assert on human-readable text.
 */

const enUSTranslations: Record<string, string> = {
  // ── Common ──
  Common_Calendar: 'Calendar',
  Common_Event: 'Event',
  Common_Booking: 'Booking',
  Common_Schedule: 'Schedule',
  Common_Invitation: 'Invitation',

  // ── View modes ──
  View_Month: 'Month',
  View_Week: 'Week',
  View_Day: 'Day',
  View_Agenda: 'Agenda',

  // ── Actions ──
  Action_Create: 'Create',
  Action_Save: 'Save',
  Action_Cancel: 'Cancel',
  Action_Delete: 'Delete',
  Action_Edit: 'Edit',
  Action_Retry: 'Retry',
  Action_Accept: 'Accept',
  Action_Decline: 'Decline',
  Action_Tentative: 'Tentative',
  Action_AddEvent: 'Add Event',
  Action_ConfirmBooking: 'Confirm Booking',
  Action_GoToToday: 'Today',
  Action_PreviousMonth: 'Previous month',
  Action_NextMonth: 'Next month',
  Action_PreviousDay: 'Previous day',
  Action_NextDay: 'Next day',
  Action_Close: 'Close',

  // ── Labels ──
  Label_Title: 'Title',
  Label_Start: 'Start',
  Label_End: 'End',
  Label_Location: 'Location',
  Label_Description: 'Description',
  Label_Attendees: 'Attendees',
  Label_When: 'When',
  Label_Where: 'Where',
  Label_Name: 'Name',
  Label_Email: 'Email',
  Label_Upcoming: 'Upcoming',
  Label_Loading: 'Loading calendar',
  Label_RsvpActions: 'RSVP actions',
  Label_BookingPage: 'Booking page',
  Label_BookingForm: 'Booking form',
  Label_AvailableSlots: 'Available time slots',
  Label_DateNavigation: 'Date navigation',
  Label_CalendarSidebar: 'Calendar sidebar',
  Label_CreateEvent: 'Create event',
  Label_EditEvent: 'Edit event',
  Label_AddCalendarEvent: 'Add calendar event',
  Label_AllDay: 'All day',
  Label_Visibility: 'Visibility',
  Label_Calendar: 'Calendar',

  // ── Status ──
  Status_Updated: 'Updated',
  Status_NoUpcomingEvents: 'No upcoming events',
  Status_NoAvailableSlots: 'No available slots for this date',

  // ── Friends ──
  Friends_SectionTitle: 'Friends',

  // ── Calendar Sidebar ──
  Label_MyCalendars: 'My Calendars',
  Label_OtherCalendars: 'Other Calendars',
  Label_CalendarName: 'Calendar name',
  Label_CalendarUrl: 'Calendar URL',
  Label_NewName: 'New name',
  Label_CalendarColor: 'Calendar color',
  Label_CalendarOptions: 'Calendar options',
  Label_ConfirmDelete: 'Confirm delete',
  Label_DismissError: 'Dismiss error',
  Label_AddCalendarForm: 'Add calendar form',
  Label_SubscribeToCalendarForm: 'Subscribe to calendar form',
  Label_RenameCalendarForm: 'Rename calendar form',
  Label_ChangeCalendarColorForm: 'Change calendar color form',
  Label_NewCalendarName: 'New calendar name',
  Label_CalendarControls: 'Calendar controls',
  Label_CalendarApplication: 'Calendar application',
  Label_CalendarNavigation: 'Calendar navigation',
  Label_CalendarContent: 'Calendar content',
  Label_WeekView: 'Week view',
  Label_DayViewTemplate: 'Day view for {DATE}',
  Label_AttendeeAvailability: 'Attendee availability',
  Label_Attendee: 'Attendee',
  Label_MiniCalendar: 'Mini calendar',
  Label_AgendaView: 'Agenda view',

  // ── Calendar Sidebar Actions ──
  Action_AddCalendar: 'Add Calendar',
  Action_SubscribeToCalendar: 'Subscribe to Calendar',
  Action_BrowseHolidayCalendars: 'Browse Holiday Calendars',
  Action_Subscribe: 'Subscribe',
  Action_Rename: 'Rename',
  Action_ChangeColor: 'Change Color',
  Action_Share: 'Share',
  Action_Revoke: 'Revoke',
  Action_CopyPublicLink: 'Copy Public Link',
  Action_RevokePublicLink: 'Revoke Public Link',

  // ── Calendar Sidebar Messages ──
  Sidebar_CannotDeleteDefault: 'Cannot delete the default calendar',
  Sidebar_ConfirmDeleteMessage:
    'Are you sure you want to delete this calendar? This action cannot be undone.',

  // ── Sharing Dialog ──
  Sharing_DialogTitleTemplate: 'Share "{NAME}"',
  Sharing_CurrentShares: 'Current Shares',
  Sharing_NoShares: 'No shares yet. Add a user below to share this calendar.',
  Sharing_AddShare: 'Add Share',
  Sharing_LinkCopied: 'Link copied to clipboard',
  Sharing_SelectAndCopy: 'Select and copy the link above',
  Label_CloseSharingDialog: 'Close sharing dialog',
  Label_SharedUsers: 'Shared users',
  Label_ShareCalendarForm: 'Share calendar form',
  Label_UserId: 'User ID',
  Label_PermissionLevel: 'Permission level',
  Label_PublicLink: 'Public Link',
  Label_PublicLinkUrl: 'Public link URL',

  // ── Permission Labels ──
  Permission_Owner: 'Owner',
  Permission_Editor: 'Editor',
  Permission_Viewer: 'Viewer',
  Permission_FreeBusyOnly: 'Free/Busy Only',

  // ── Visibility Options ──
  Visibility_Public: 'Public',
  Visibility_Private: 'Private',
  Visibility_Confidential: 'Confidential',

  // ── Weekday Abbreviations ──
  Weekday_Sun: 'Sun',
  Weekday_Mon: 'Mon',
  Weekday_Tue: 'Tue',
  Weekday_Wed: 'Wed',
  Weekday_Thu: 'Thu',
  Weekday_Fri: 'Fri',
  Weekday_Sat: 'Sat',

  // ── Holiday Catalog ──
  Label_HolidayCalendars: 'Holiday Calendars',
  Label_SearchHolidayCalendars: 'Search holiday calendars',
  Label_CloseHolidayCatalog: 'Close holiday catalog',
  Holiday_SearchPlaceholder: 'Search by name or region...',
  Holiday_NoCalendarsFound: 'No holiday calendars found.',
  Holiday_UnableToLoad: 'Unable to load holiday calendars',
  Status_Subscribed: 'Subscribed',

  // ── Tooltip ──
  Tooltip_AddEvent: 'Create a calendar event with these recipients',
};

/**
 * Mock tBranded that translates BrightCalStrings key values to English text.
 * Falls back to returning the key itself if no translation is found.
 */
export function mockTBranded(key: string): string {
  return enUSTranslations[key] ?? key;
}

/**
 * The mock object for jest.mock('@digitaldefiance/express-suite-react-components').
 */
export const expressSuiteReactComponentsMock = {
  useI18n: () => ({
    tComponent: (_componentId: string, key: string) =>
      enUSTranslations[key] ?? key,
    tBranded: mockTBranded,
    currentLanguage: 'en-US',
  }),
};
