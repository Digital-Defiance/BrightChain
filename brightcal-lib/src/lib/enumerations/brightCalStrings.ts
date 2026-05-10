import {
  type BrandedStringKeys,
  BrandedStringKeyValue,
  createI18nStringKeys,
} from '@digitaldefiance/i18n-lib';

export const BrightCalComponentId = 'BrightCal';

const _brightCalKeys = {
  // ── Common ──
  Common_Calendar: 'Common_Calendar',
  Common_Event: 'Common_Event',
  Common_Booking: 'Common_Booking',
  Common_Schedule: 'Common_Schedule',
  Common_Invitation: 'Common_Invitation',

  // ── View modes ──
  View_Month: 'View_Month',
  View_Week: 'View_Week',
  View_Day: 'View_Day',
  View_Agenda: 'View_Agenda',

  // ── Actions ──
  Action_Create: 'Action_Create',
  Action_Save: 'Action_Save',
  Action_Cancel: 'Action_Cancel',
  Action_Delete: 'Action_Delete',
  Action_Edit: 'Action_Edit',
  Action_Retry: 'Action_Retry',
  Action_Accept: 'Action_Accept',
  Action_Decline: 'Action_Decline',
  Action_Tentative: 'Action_Tentative',
  Action_AddEvent: 'Action_AddEvent',
  Action_ConfirmBooking: 'Action_ConfirmBooking',
  Action_GoToToday: 'Action_GoToToday',
  Action_PreviousMonth: 'Action_PreviousMonth',
  Action_NextMonth: 'Action_NextMonth',
  Action_PreviousDay: 'Action_PreviousDay',
  Action_NextDay: 'Action_NextDay',
  Action_Close: 'Action_Close',

  // ── Labels ──
  Label_Title: 'Label_Title',
  Label_Start: 'Label_Start',
  Label_End: 'Label_End',
  Label_Location: 'Label_Location',
  Label_Description: 'Label_Description',
  Label_Attendees: 'Label_Attendees',
  Label_When: 'Label_When',
  Label_Where: 'Label_Where',
  Label_Name: 'Label_Name',
  Label_Email: 'Label_Email',
  Label_Upcoming: 'Label_Upcoming',
  Label_Loading: 'Label_Loading',
  Label_RsvpActions: 'Label_RsvpActions',
  Label_BookingPage: 'Label_BookingPage',
  Label_BookingForm: 'Label_BookingForm',
  Label_AvailableSlots: 'Label_AvailableSlots',
  Label_DateNavigation: 'Label_DateNavigation',
  Label_CalendarSidebar: 'Label_CalendarSidebar',
  Label_CreateEvent: 'Label_CreateEvent',
  Label_EditEvent: 'Label_EditEvent',
  Label_AddCalendarEvent: 'Label_AddCalendarEvent',
  Label_AllDay: 'Label_AllDay',
  Label_Visibility: 'Label_Visibility',
  Label_Calendar: 'Label_Calendar',

  // ── Status ──
  Status_Updated: 'Status_Updated',
  Status_NoUpcomingEvents: 'Status_NoUpcomingEvents',
  Status_NoAvailableSlots: 'Status_NoAvailableSlots',

  // ── Validation errors (controllers) ──
  Error_MissingField_Template: 'Error_MissingField_Template',
  Error_InvalidField_Template: 'Error_InvalidField_Template',
  Error_FieldTooLong_Template: 'Error_FieldTooLong_Template',
  Error_InvalidHexColor: 'Error_InvalidHexColor',
  Error_InvalidISODate_Template: 'Error_InvalidISODate_Template',
  Error_EndBeforeStart: 'Error_EndBeforeStart',
  Error_InvalidVisibility: 'Error_InvalidVisibility',
  Error_InvalidTransparency: 'Error_InvalidTransparency',
  Error_MissingCalendarId: 'Error_MissingCalendarId',
  Error_MissingId: 'Error_MissingId',
  Error_MissingSearchQuery: 'Error_MissingSearchQuery',
  Error_EmptySummary: 'Error_EmptySummary',
  Error_NoUpdateFields: 'Error_NoUpdateFields',
  Error_InvalidRsvpResponse: 'Error_InvalidRsvpResponse',
  Error_InvalidDuplicateMode: 'Error_InvalidDuplicateMode',
  Error_MissingIcsData: 'Error_MissingIcsData',
  Error_EmptyUserIds: 'Error_EmptyUserIds',
  Error_InvalidUserId: 'Error_InvalidUserId',
  Error_InvalidDuration: 'Error_InvalidDuration',
  Error_NoAttendees: 'Error_NoAttendees',
  Error_EmptyAppointmentTypes: 'Error_EmptyAppointmentTypes',
  Error_MissingSlug: 'Error_MissingSlug',
  Error_MissingTitle: 'Error_MissingTitle',
  Error_MissingDate: 'Error_MissingDate',
  Error_MissingAppointmentType: 'Error_MissingAppointmentType',
  Error_MissingStartTime: 'Error_MissingStartTime',
  Error_MissingBookerName: 'Error_MissingBookerName',
  Error_MissingBookerEmail: 'Error_MissingBookerEmail',
  Error_InvalidComment: 'Error_InvalidComment',
  Error_MissingCounterProposalId: 'Error_MissingCounterProposalId',
  Error_MissingEventId: 'Error_MissingEventId',
  Error_MissingProposedStart: 'Error_MissingProposedStart',
  Error_MissingProposedEnd: 'Error_MissingProposedEnd',
  Error_MissingCalendarIdParam: 'Error_MissingCalendarIdParam',
  Error_DescriptionMustBeString: 'Error_DescriptionMustBeString',
  Error_InvalidStartDate: 'Error_InvalidStartDate',
  Error_InvalidEndDate: 'Error_InvalidEndDate',

  // ── Permission errors ──
  Error_Forbidden_CalendarUpdate: 'Error_Forbidden_CalendarUpdate',
  Error_Forbidden_CalendarDelete: 'Error_Forbidden_CalendarDelete',
  Error_Forbidden_EventUpdate: 'Error_Forbidden_EventUpdate',
  Error_Forbidden_EventDelete: 'Error_Forbidden_EventDelete',
  Error_Forbidden_Export: 'Error_Forbidden_Export',
  Error_Forbidden_Import: 'Error_Forbidden_Import',

  // ── Service errors ──
  Error_ServiceUnavailable_Calendar: 'Error_ServiceUnavailable_Calendar',
  Error_ServiceUnavailable_Event: 'Error_ServiceUnavailable_Event',
  Error_ServiceUnavailable_Scheduling: 'Error_ServiceUnavailable_Scheduling',
  Error_ServiceUnavailable_Invitation: 'Error_ServiceUnavailable_Invitation',
  Error_ServiceUnavailable_Booking: 'Error_ServiceUnavailable_Booking',
  Error_ServiceUnavailable_Search: 'Error_ServiceUnavailable_Search',
  Error_ServiceUnavailable_ExportImport:
    'Error_ServiceUnavailable_ExportImport',

  // ── Not found ──
  Error_NotFound_BookingPage: 'Error_NotFound_BookingPage',
  Error_SlotUnavailable: 'Error_SlotUnavailable',
  Error_NotFound_AppointmentType: 'Error_NotFound_AppointmentType',

  // ── Friends ──
  Friends_SectionTitle: 'Friends_SectionTitle',

  // ── Calendar Sidebar ──
  Label_MyCalendars: 'Label_MyCalendars',
  Label_OtherCalendars: 'Label_OtherCalendars',
  Label_CalendarName: 'Label_CalendarName',
  Label_CalendarUrl: 'Label_CalendarUrl',
  Label_NewName: 'Label_NewName',
  Label_CalendarColor: 'Label_CalendarColor',
  Label_CalendarOptions: 'Label_CalendarOptions',
  Label_ConfirmDelete: 'Label_ConfirmDelete',
  Label_DismissError: 'Label_DismissError',
  Label_AddCalendarForm: 'Label_AddCalendarForm',
  Label_SubscribeToCalendarForm: 'Label_SubscribeToCalendarForm',
  Label_RenameCalendarForm: 'Label_RenameCalendarForm',
  Label_ChangeCalendarColorForm: 'Label_ChangeCalendarColorForm',
  Label_NewCalendarName: 'Label_NewCalendarName',
  Label_CalendarControls: 'Label_CalendarControls',
  Label_CalendarApplication: 'Label_CalendarApplication',
  Label_CalendarNavigation: 'Label_CalendarNavigation',
  Label_CalendarContent: 'Label_CalendarContent',
  Label_WeekView: 'Label_WeekView',
  Label_DayViewTemplate: 'Label_DayViewTemplate',
  Label_AttendeeAvailability: 'Label_AttendeeAvailability',
  Label_Attendee: 'Label_Attendee',
  Label_MiniCalendar: 'Label_MiniCalendar',
  Label_AgendaView: 'Label_AgendaView',

  // ── Calendar Sidebar Actions ──
  Action_AddCalendar: 'Action_AddCalendar',
  Action_SubscribeToCalendar: 'Action_SubscribeToCalendar',
  Action_BrowseHolidayCalendars: 'Action_BrowseHolidayCalendars',
  Action_Subscribe: 'Action_Subscribe',
  Action_Rename: 'Action_Rename',
  Action_ChangeColor: 'Action_ChangeColor',
  Action_Share: 'Action_Share',
  Action_Revoke: 'Action_Revoke',
  Action_CopyPublicLink: 'Action_CopyPublicLink',
  Action_RevokePublicLink: 'Action_RevokePublicLink',

  // ── Calendar Sidebar Messages ──
  Sidebar_CannotDeleteDefault: 'Sidebar_CannotDeleteDefault',
  Sidebar_ConfirmDeleteMessage: 'Sidebar_ConfirmDeleteMessage',

  // ── Sharing Dialog ──
  Sharing_DialogTitleTemplate: 'Sharing_DialogTitleTemplate',
  Sharing_CurrentShares: 'Sharing_CurrentShares',
  Sharing_NoShares: 'Sharing_NoShares',
  Sharing_AddShare: 'Sharing_AddShare',
  Sharing_LinkCopied: 'Sharing_LinkCopied',
  Sharing_SelectAndCopy: 'Sharing_SelectAndCopy',
  Label_CloseSharingDialog: 'Label_CloseSharingDialog',
  Label_SharedUsers: 'Label_SharedUsers',
  Label_ShareCalendarForm: 'Label_ShareCalendarForm',
  Label_UserId: 'Label_UserId',
  Label_PermissionLevel: 'Label_PermissionLevel',
  Label_PublicLink: 'Label_PublicLink',
  Label_PublicLinkUrl: 'Label_PublicLinkUrl',

  // ── Permission Labels ──
  Permission_Owner: 'Permission_Owner',
  Permission_Editor: 'Permission_Editor',
  Permission_Viewer: 'Permission_Viewer',
  Permission_FreeBusyOnly: 'Permission_FreeBusyOnly',

  // ── Visibility Options ──
  Visibility_Public: 'Visibility_Public',
  Visibility_Private: 'Visibility_Private',
  Visibility_Confidential: 'Visibility_Confidential',

  // ── Weekday Abbreviations ──
  Weekday_Sun: 'Weekday_Sun',
  Weekday_Mon: 'Weekday_Mon',
  Weekday_Tue: 'Weekday_Tue',
  Weekday_Wed: 'Weekday_Wed',
  Weekday_Thu: 'Weekday_Thu',
  Weekday_Fri: 'Weekday_Fri',
  Weekday_Sat: 'Weekday_Sat',

  // ── Holiday Catalog ──
  Label_HolidayCalendars: 'Label_HolidayCalendars',
  Label_SearchHolidayCalendars: 'Label_SearchHolidayCalendars',
  Label_CloseHolidayCatalog: 'Label_CloseHolidayCatalog',
  Holiday_SearchPlaceholder: 'Holiday_SearchPlaceholder',
  Holiday_NoCalendarsFound: 'Holiday_NoCalendarsFound',
  Holiday_UnableToLoad: 'Holiday_UnableToLoad',
  Status_Subscribed: 'Status_Subscribed',

  // ── Tooltip ──
  Tooltip_AddEvent: 'Tooltip_AddEvent',
} as const;

export const BrightCalStrings: BrandedStringKeys<typeof _brightCalKeys> =
  createI18nStringKeys(BrightCalComponentId, _brightCalKeys);

export type BrightCalStringKey = BrandedStringKeyValue<typeof BrightCalStrings>;
