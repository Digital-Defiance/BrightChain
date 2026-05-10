import { ComponentStrings } from '@digitaldefiance/i18n-lib';
import {
  BrightCalStringKey,
  BrightCalStrings,
} from '../../enumerations/brightCalStrings';

export const GermanStrings: ComponentStrings<BrightCalStringKey> = {
  // ── Common ──
  [BrightCalStrings.Common_Calendar]: 'Kalender',
  [BrightCalStrings.Common_Event]: 'Termin',
  [BrightCalStrings.Common_Booking]: 'Buchung',
  [BrightCalStrings.Common_Schedule]: 'Zeitplan',
  [BrightCalStrings.Common_Invitation]: 'Einladung',

  // ── View modes ──
  [BrightCalStrings.View_Month]: 'Monat',
  [BrightCalStrings.View_Week]: 'Woche',
  [BrightCalStrings.View_Day]: 'Tag',
  [BrightCalStrings.View_Agenda]: 'Agenda',

  // ── Actions ──
  [BrightCalStrings.Action_Create]: 'Erstellen',
  [BrightCalStrings.Action_Save]: 'Speichern',
  [BrightCalStrings.Action_Cancel]: 'Abbrechen',
  [BrightCalStrings.Action_Delete]: 'Löschen',
  [BrightCalStrings.Action_Edit]: 'Bearbeiten',
  [BrightCalStrings.Action_Retry]: 'Erneut versuchen',
  [BrightCalStrings.Action_Accept]: 'Annehmen',
  [BrightCalStrings.Action_Decline]: 'Ablehnen',
  [BrightCalStrings.Action_Tentative]: 'Vorläufig',
  [BrightCalStrings.Action_AddEvent]: 'Termin hinzufügen',
  [BrightCalStrings.Action_ConfirmBooking]: 'Buchung bestätigen',
  [BrightCalStrings.Action_GoToToday]: 'Heute',
  [BrightCalStrings.Action_PreviousMonth]: 'Vorheriger Monat',
  [BrightCalStrings.Action_NextMonth]: 'Nächster Monat',
  [BrightCalStrings.Action_PreviousDay]: 'Vorheriger Tag',
  [BrightCalStrings.Action_NextDay]: 'Nächster Tag',
  [BrightCalStrings.Action_Close]: 'Schließen',

  // ── Labels ──
  [BrightCalStrings.Label_Title]: 'Titel',
  [BrightCalStrings.Label_Start]: 'Beginn',
  [BrightCalStrings.Label_End]: 'Ende',
  [BrightCalStrings.Label_Location]: 'Ort',
  [BrightCalStrings.Label_Description]: 'Beschreibung',
  [BrightCalStrings.Label_Attendees]: 'Teilnehmer',
  [BrightCalStrings.Label_When]: 'Wann',
  [BrightCalStrings.Label_Where]: 'Wo',
  [BrightCalStrings.Label_Name]: 'Name',
  [BrightCalStrings.Label_Email]: 'E-Mail',
  [BrightCalStrings.Label_Upcoming]: 'Bevorstehend',
  [BrightCalStrings.Label_Loading]: 'Kalender wird geladen',
  [BrightCalStrings.Label_RsvpActions]: 'RSVP-Aktionen',
  [BrightCalStrings.Label_BookingPage]: 'Buchungsseite',
  [BrightCalStrings.Label_BookingForm]: 'Buchungsformular',
  [BrightCalStrings.Label_AvailableSlots]: 'Verfügbare Zeitfenster',
  [BrightCalStrings.Label_DateNavigation]: 'Datumsnavigation',
  [BrightCalStrings.Label_CalendarSidebar]: 'Kalender-Seitenleiste',
  [BrightCalStrings.Label_CreateEvent]: 'Termin erstellen',
  [BrightCalStrings.Label_EditEvent]: 'Termin bearbeiten',
  [BrightCalStrings.Label_AddCalendarEvent]: 'Kalendertermin hinzufügen',
  [BrightCalStrings.Label_AllDay]: 'Ganztägig',
  [BrightCalStrings.Label_Visibility]: 'Sichtbarkeit',
  [BrightCalStrings.Label_Calendar]: 'Kalender',

  // ── Status ──
  [BrightCalStrings.Status_Updated]: 'Aktualisiert',
  [BrightCalStrings.Status_NoUpcomingEvents]: 'Keine bevorstehenden Termine',
  [BrightCalStrings.Status_NoAvailableSlots]:
    'Keine verfügbaren Zeitfenster für dieses Datum',

  // ── Validation errors (controllers) ──
  [BrightCalStrings.Error_MissingField_Template]:
    'Pflichtfeld fehlt oder ist ungültig: {field}',
  [BrightCalStrings.Error_InvalidField_Template]:
    'Ungültiger Wert für Feld: {field}',
  [BrightCalStrings.Error_FieldTooLong_Template]:
    '{field} darf maximal {max} Zeichen lang sein',
  [BrightCalStrings.Error_InvalidHexColor]:
    'color muss ein gültiger hex-Farbcode sein (z. B. „#FF5733")',
  [BrightCalStrings.Error_InvalidISODate_Template]:
    '{field} muss ein gültiges ISO 8601 Datum/Uhrzeit sein',
  [BrightCalStrings.Error_EndBeforeStart]: 'dtend muss nach dtstart liegen',
  [BrightCalStrings.Error_InvalidVisibility]:
    'visibility muss einer der folgenden Werte sein: {values}',
  [BrightCalStrings.Error_InvalidTransparency]:
    'transparency muss einer der folgenden Werte sein: {values}',
  [BrightCalStrings.Error_MissingCalendarId]:
    'Erforderlicher Abfrageparameter fehlt: calendarId',
  [BrightCalStrings.Error_MissingId]: 'Erforderlicher Parameter fehlt: id',
  [BrightCalStrings.Error_MissingSearchQuery]:
    'Erforderlicher Abfrageparameter fehlt oder ist leer: q',
  [BrightCalStrings.Error_EmptySummary]:
    'summary muss eine nicht-leere Zeichenkette sein',
  [BrightCalStrings.Error_NoUpdateFields]:
    'Mindestens ein Feld (displayName, color, description) muss angegeben werden',
  [BrightCalStrings.Error_InvalidRsvpResponse]:
    'response muss einer der folgenden Werte sein: ACCEPTED, DECLINED, TENTATIVE',
  [BrightCalStrings.Error_InvalidDuplicateMode]:
    'duplicateMode muss einer der folgenden Werte sein: skip, overwrite, create-new',
  [BrightCalStrings.Error_MissingIcsData]:
    'Pflichtfeld fehlt oder ist ungültig: icsData',
  [BrightCalStrings.Error_EmptyUserIds]:
    'userIds muss ein nicht-leeres Array von Benutzer-IDs sein',
  [BrightCalStrings.Error_InvalidUserId]:
    'Jede userId muss eine nicht-leere Zeichenkette sein',
  [BrightCalStrings.Error_InvalidDuration]:
    'durationMinutes muss eine positive Zahl sein',
  [BrightCalStrings.Error_NoAttendees]:
    'Es muss mindestens ein erforderlicher oder optionaler Teilnehmer angegeben werden',
  [BrightCalStrings.Error_EmptyAppointmentTypes]:
    'appointmentTypes muss ein nicht-leeres Array sein',
  [BrightCalStrings.Error_MissingSlug]:
    'Pflichtfeld fehlt oder ist ungültig: slug',
  [BrightCalStrings.Error_MissingTitle]:
    'Pflichtfeld fehlt oder ist ungültig: title',
  [BrightCalStrings.Error_MissingDate]:
    'Erforderlicher Abfrageparameter fehlt oder ist ungültig: date',
  [BrightCalStrings.Error_MissingAppointmentType]:
    'Erforderlicher Abfrageparameter fehlt oder ist ungültig: appointmentType',
  [BrightCalStrings.Error_MissingStartTime]:
    'Pflichtfeld fehlt oder ist ungültig: startTime',
  [BrightCalStrings.Error_MissingBookerName]:
    'Pflichtfeld fehlt oder ist ungültig: bookerName',
  [BrightCalStrings.Error_MissingBookerEmail]:
    'Pflichtfeld fehlt oder ist ungültig: bookerEmail',
  [BrightCalStrings.Error_InvalidComment]:
    'comment muss eine Zeichenkette sein',
  [BrightCalStrings.Error_MissingCounterProposalId]:
    'Pflichtfeld fehlt oder ist ungültig: counterProposalId',
  [BrightCalStrings.Error_MissingEventId]:
    'Pflichtfeld fehlt oder ist ungültig: eventId',
  [BrightCalStrings.Error_MissingProposedStart]:
    'Pflichtfeld fehlt oder ist ungültig: proposedStart',
  [BrightCalStrings.Error_MissingProposedEnd]:
    'Pflichtfeld fehlt oder ist ungültig: proposedEnd',
  [BrightCalStrings.Error_MissingCalendarIdParam]:
    'Erforderlicher Parameter fehlt: calendarId',
  [BrightCalStrings.Error_DescriptionMustBeString]:
    'description muss eine Zeichenkette sein',
  [BrightCalStrings.Error_InvalidStartDate]:
    'start muss ein gültiges ISO 8601 Datum/Uhrzeit sein',
  [BrightCalStrings.Error_InvalidEndDate]:
    'end muss ein gültiges ISO 8601 Datum/Uhrzeit sein',

  // ── Permission errors ──
  [BrightCalStrings.Error_Forbidden_CalendarUpdate]:
    'Nur der Kalenderbesitzer kann diesen Kalender aktualisieren',
  [BrightCalStrings.Error_Forbidden_CalendarDelete]:
    'Nur der Kalenderbesitzer kann diesen Kalender löschen',
  [BrightCalStrings.Error_Forbidden_EventUpdate]:
    'Unzureichende Berechtigung zum Aktualisieren dieses Termins',
  [BrightCalStrings.Error_Forbidden_EventDelete]:
    'Unzureichende Berechtigung zum Löschen dieses Termins',
  [BrightCalStrings.Error_Forbidden_Export]:
    'Unzureichende Berechtigung zum Exportieren dieses Kalenders',
  [BrightCalStrings.Error_Forbidden_Import]:
    'Unzureichende Berechtigung zum Importieren in diesen Kalender',

  // ── Service errors ──
  [BrightCalStrings.Error_ServiceUnavailable_Calendar]:
    'Kalenderdienst ist nicht verfügbar',
  [BrightCalStrings.Error_ServiceUnavailable_Event]:
    'Termindienst ist nicht verfügbar',
  [BrightCalStrings.Error_ServiceUnavailable_Scheduling]:
    'Planungsdienst ist nicht verfügbar',
  [BrightCalStrings.Error_ServiceUnavailable_Invitation]:
    'Einladungsdienst ist nicht verfügbar',
  [BrightCalStrings.Error_ServiceUnavailable_Booking]:
    'Buchungsdienst ist nicht verfügbar',
  [BrightCalStrings.Error_ServiceUnavailable_Search]:
    'Suchdienst ist nicht verfügbar',
  [BrightCalStrings.Error_ServiceUnavailable_ExportImport]:
    'Export-/Importdienst ist nicht verfügbar',

  // ── Not found ──
  [BrightCalStrings.Error_NotFound_BookingPage]: 'Buchungsseite nicht gefunden',
  [BrightCalStrings.Error_SlotUnavailable]:
    'Das angeforderte Zeitfenster ist nicht mehr verfügbar',
  [BrightCalStrings.Error_NotFound_AppointmentType]:
    'Buchungsseite oder Terminart nicht gefunden',

  // ── Friends ──
  [BrightCalStrings.Friends_SectionTitle]: 'Freunde',

  // ── Calendar Sidebar ──
  [BrightCalStrings.Label_MyCalendars]: 'Meine Kalender',
  [BrightCalStrings.Label_OtherCalendars]: 'Andere Kalender',
  [BrightCalStrings.Label_CalendarName]: 'Kalendername',
  [BrightCalStrings.Label_CalendarUrl]: 'Kalender-URL',
  [BrightCalStrings.Label_NewName]: 'Neuer Name',
  [BrightCalStrings.Label_CalendarColor]: 'Kalenderfarbe',
  [BrightCalStrings.Label_CalendarOptions]: 'Kalenderoptionen',
  [BrightCalStrings.Label_ConfirmDelete]: 'Löschen bestätigen',
  [BrightCalStrings.Label_DismissError]: 'Fehler schließen',
  [BrightCalStrings.Label_AddCalendarForm]: 'Kalender hinzufügen',
  [BrightCalStrings.Label_SubscribeToCalendarForm]: 'Kalender abonnieren',
  [BrightCalStrings.Label_RenameCalendarForm]: 'Kalender umbenennen',
  [BrightCalStrings.Label_ChangeCalendarColorForm]: 'Kalenderfarbe ändern',
  [BrightCalStrings.Label_NewCalendarName]: 'Neuer Kalendername',
  [BrightCalStrings.Label_CalendarControls]: 'Kalendersteuerung',
  [BrightCalStrings.Label_CalendarApplication]: 'Kalenderanwendung',
  [BrightCalStrings.Label_CalendarNavigation]: 'Kalendernavigation',
  [BrightCalStrings.Label_CalendarContent]: 'Kalenderinhalt',
  [BrightCalStrings.Label_WeekView]: 'Wochenansicht',
  [BrightCalStrings.Label_DayViewTemplate]: 'Tagesansicht für {DATE}',
  [BrightCalStrings.Label_AttendeeAvailability]: 'Verfügbarkeit der Teilnehmer',
  [BrightCalStrings.Label_Attendee]: 'Teilnehmer',
  [BrightCalStrings.Label_MiniCalendar]: 'Mini-Kalender',
  [BrightCalStrings.Label_AgendaView]: 'Terminansicht',
  [BrightCalStrings.Action_AddCalendar]: 'Kalender hinzufügen',
  [BrightCalStrings.Action_SubscribeToCalendar]: 'Kalender abonnieren',
  [BrightCalStrings.Action_BrowseHolidayCalendars]:
    'Feiertagskalender durchsuchen',
  [BrightCalStrings.Action_Subscribe]: 'Abonnieren',
  [BrightCalStrings.Action_Rename]: 'Umbenennen',
  [BrightCalStrings.Action_ChangeColor]: 'Farbe ändern',
  [BrightCalStrings.Action_Share]: 'Teilen',
  [BrightCalStrings.Action_Revoke]: 'Widerrufen',
  [BrightCalStrings.Action_CopyPublicLink]: 'Öffentlichen Link kopieren',
  [BrightCalStrings.Action_RevokePublicLink]: 'Öffentlichen Link widerrufen',
  [BrightCalStrings.Sidebar_CannotDeleteDefault]:
    'Der Standardkalender kann nicht gelöscht werden',
  [BrightCalStrings.Sidebar_ConfirmDeleteMessage]:
    'Möchten Sie diesen Kalender wirklich löschen? Diese Aktion kann nicht rückgängig gemacht werden.',
  [BrightCalStrings.Sharing_DialogTitleTemplate]: '"{NAME}" teilen',
  [BrightCalStrings.Sharing_CurrentShares]: 'Aktuelle Freigaben',
  [BrightCalStrings.Sharing_NoShares]:
    'Noch keine Freigaben. Fügen Sie unten einen Benutzer hinzu.',
  [BrightCalStrings.Sharing_AddShare]: 'Freigabe hinzufügen',
  [BrightCalStrings.Sharing_LinkCopied]: 'Link in die Zwischenablage kopiert',
  [BrightCalStrings.Sharing_SelectAndCopy]: 'Link oben auswählen und kopieren',
  [BrightCalStrings.Label_CloseSharingDialog]: 'Freigabedialog schließen',
  [BrightCalStrings.Label_SharedUsers]: 'Freigegebene Benutzer',
  [BrightCalStrings.Label_ShareCalendarForm]: 'Kalender-Freigabeformular',
  [BrightCalStrings.Label_UserId]: 'Benutzer-ID',
  [BrightCalStrings.Label_PermissionLevel]: 'Berechtigungsstufe',
  [BrightCalStrings.Label_PublicLink]: 'Öffentlicher Link',
  [BrightCalStrings.Label_PublicLinkUrl]: 'URL des öffentlichen Links',
  [BrightCalStrings.Permission_Owner]: 'Eigentümer',
  [BrightCalStrings.Permission_Editor]: 'Bearbeiter',
  [BrightCalStrings.Permission_Viewer]: 'Betrachter',
  [BrightCalStrings.Permission_FreeBusyOnly]: 'Nur Frei/Gebucht',
  [BrightCalStrings.Visibility_Public]: 'Öffentlich',
  [BrightCalStrings.Visibility_Private]: 'Privat',
  [BrightCalStrings.Visibility_Confidential]: 'Vertraulich',
  [BrightCalStrings.Weekday_Sun]: 'So',
  [BrightCalStrings.Weekday_Mon]: 'Mo',
  [BrightCalStrings.Weekday_Tue]: 'Di',
  [BrightCalStrings.Weekday_Wed]: 'Mi',
  [BrightCalStrings.Weekday_Thu]: 'Do',
  [BrightCalStrings.Weekday_Fri]: 'Fr',
  [BrightCalStrings.Weekday_Sat]: 'Sa',
  [BrightCalStrings.Label_HolidayCalendars]: 'Feiertagskalender',
  [BrightCalStrings.Label_SearchHolidayCalendars]: 'Feiertagskalender suchen',
  [BrightCalStrings.Label_CloseHolidayCatalog]: 'Feiertagskatalog schließen',
  [BrightCalStrings.Holiday_SearchPlaceholder]:
    'Nach Name oder Region suchen...',
  [BrightCalStrings.Holiday_NoCalendarsFound]:
    'Keine Feiertagskalender gefunden.',
  [BrightCalStrings.Holiday_UnableToLoad]:
    'Feiertagskalender konnten nicht geladen werden',
  [BrightCalStrings.Status_Subscribed]: 'Abonniert',
  [BrightCalStrings.Tooltip_AddEvent]:
    'Kalenderereignis mit diesen Empfängern erstellen',
};
