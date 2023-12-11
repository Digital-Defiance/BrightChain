# Requirements Document

## Introduction

BrightCal is a shared calendar system integrated with BrightMail, providing feature parity with competitive email platforms (Gmail, ProtonMail, Outlook). BrightCal supports iCalendar (RFC 5545) protocol compatibility, calendar sharing with granular permissions, event scheduling with conflict detection, booking/availability management, and rich UI widgets. BrightCal operates within the BrightChain ecosystem, leveraging existing identity, encryption, and storage infrastructure while exposing standard CalDAV and iCal interfaces for interoperability with external calendar clients.

## Glossary

- **BrightCal**: The shared calendar subsystem of BrightMail, providing event management, scheduling, and calendar sharing capabilities.
- **Calendar_Engine**: The backend service responsible for storing, querying, and managing calendar events, recurrence expansion, and conflict detection.
- **CalDAV_Server**: The server component implementing the CalDAV protocol (RFC 4791) for interoperability with external calendar clients (Apple Calendar, Thunderbird, etc.).
- **iCal_Parser**: The component responsible for parsing and serializing iCalendar (RFC 5545) data, including VEVENT, VTODO, VJOURNAL, VFREEBUSY, and VALARM components.
- **iCal_Serializer**: The component responsible for serializing internal calendar event representations into valid iCalendar (RFC 5545) format.
- **Scheduling_Engine**: The component responsible for evaluating participant availability, detecting conflicts, and proposing optimal meeting times.
- **Permission_Manager**: The component responsible for enforcing access control on calendars and events, supporting owner, editor, viewer, and free-busy-only permission levels.
- **Notification_Service**: The component responsible for sending event invitations, updates, cancellations, and reminders via BrightMail and in-app notifications.
- **Booking_Page**: A publicly shareable page that exposes a user's available time slots for external parties to book appointments.
- **Calendar_Widget**: A React UI component that renders calendar views (day, week, month, agenda) with event display and interaction capabilities.
- **Event**: A calendar entry with a start time, end time, title, description, location, attendees, and recurrence rules.
- **Recurrence_Rule**: An RRULE specification (RFC 5545 Section 3.3.10) defining how an event repeats over time.
- **Attendee**: A participant in a calendar event, identified by a BrightMail address or external email, with an RSVP status (accepted, declined, tentative, needs-action).
- **Free_Busy_Data**: Aggregated availability information for a user showing occupied and free time slots without exposing event details.
- **Calendar_Collection**: A named grouping of events belonging to a user or organization, analogous to a folder in email.
- **Time_Zone_Database**: The IANA Time Zone Database (tzdata) used for all time zone conversions and DST handling.
- **Conflict**: A scheduling overlap where two or more events occupy the same time range for the same attendee.
- **iTIP**: The iCalendar Transport-Independent Interoperability Protocol (RFC 5546) used for scheduling messages (REQUEST, REPLY, CANCEL, COUNTER, DECLINECOUNTER).
- **iMIP**: The iCalendar Message-Based Interoperability Protocol (RFC 6047) for transporting iTIP messages via email.
- **BrightCal_API**: The REST API layer exposing calendar operations to the BrightChain frontend and third-party integrations.
- **Reminder**: A VALARM component attached to an event that triggers a notification at a specified offset before the event start.

## Requirements

### Requirement 1: iCalendar Protocol Parsing and Serialization

**User Story:** As a developer integrating BrightCal with external systems, I want full iCalendar (RFC 5545) parsing and serialization, so that BrightCal can import, export, and exchange calendar data with any standards-compliant calendar application.

#### Acceptance Criteria

1. WHEN a valid iCalendar stream containing VEVENT components is provided, THE iCal_Parser SHALL parse each VEVENT into an internal Event representation preserving all standard properties (DTSTART, DTEND, SUMMARY, DESCRIPTION, LOCATION, RRULE, ATTENDEE, ORGANIZER, STATUS, TRANSP, SEQUENCE, UID).
2. WHEN a valid iCalendar stream containing VTODO components is provided, THE iCal_Parser SHALL parse each VTODO into an internal Task representation preserving DUE, COMPLETED, PERCENT-COMPLETE, and PRIORITY properties.
3. WHEN a valid iCalendar stream containing VFREEBUSY components is provided, THE iCal_Parser SHALL parse each VFREEBUSY into an internal Free_Busy_Data representation.
4. WHEN a valid iCalendar stream containing VALARM components is provided, THE iCal_Parser SHALL parse each VALARM into an internal Reminder representation preserving ACTION, TRIGGER, DURATION, and REPEAT properties.
5. IF an iCalendar stream contains syntax errors or violates RFC 5545 structure, THEN THE iCal_Parser SHALL return a descriptive error indicating the line number and nature of the violation.
6. THE iCal_Serializer SHALL format internal Event representations into valid iCalendar streams that pass validation against RFC 5545.
7. FOR ALL valid Event representations, parsing then serializing then parsing SHALL produce an equivalent Event object (round-trip property).
8. WHEN an iCalendar stream contains RRULE properties, THE iCal_Parser SHALL parse all recurrence rule parts (FREQ, UNTIL, COUNT, INTERVAL, BYSECOND, BYMINUTE, BYHOUR, BYDAY, BYMONTHDAY, BYYEARDAY, BYWEEKNO, BYMONTH, BYSETPOS, WKST).
9. WHEN an iCalendar stream contains EXDATE or RDATE properties, THE iCal_Parser SHALL parse exception dates and additional recurrence dates respectively.
10. THE iCal_Parser SHALL handle multi-valued properties, property parameters (TZID, VALUE, ENCODING), and folded lines per RFC 5545 Section 3.1.

### Requirement 2: CalDAV Server Implementation

**User Story:** As a user with existing calendar clients (Apple Calendar, Thunderbird, GNOME Calendar), I want BrightCal to expose a CalDAV endpoint, so that I can access my BrightCal calendars from any standards-compliant client.

#### Acceptance Criteria

1. THE CalDAV_Server SHALL implement RFC 4791 (CalDAV) resource discovery, allowing clients to locate calendar home sets and calendar collections via PROPFIND requests.
2. THE CalDAV_Server SHALL support REPORT requests with calendar-query and calendar-multiget report types for efficient event retrieval.
3. THE CalDAV_Server SHALL support PUT requests to create and update individual calendar objects (events, tasks) within a calendar collection.
4. THE CalDAV_Server SHALL support DELETE requests to remove individual calendar objects from a calendar collection.
5. THE CalDAV_Server SHALL support GET requests to retrieve individual calendar objects in iCalendar format.
6. THE CalDAV_Server SHALL implement ETag-based conditional requests (If-Match, If-None-Match) for optimistic concurrency control.
7. THE CalDAV_Server SHALL implement RFC 6638 (CalDAV Scheduling) for server-side scheduling operations including free-busy queries and invitation delivery.
8. WHEN a CalDAV client sends a scheduling request, THE CalDAV_Server SHALL deliver iTIP messages to attendees via the Notification_Service.
9. THE CalDAV_Server SHALL authenticate requests using BrightChain identity tokens and enforce permissions via the Permission_Manager.
10. IF a CalDAV request targets a calendar the authenticated user lacks permission to access, THEN THE CalDAV_Server SHALL return HTTP 403 Forbidden with a DAV:error element describing the permission violation.

### Requirement 3: Calendar Management and Collections

**User Story:** As a BrightMail user, I want to create, organize, and manage multiple calendars, so that I can separate personal, work, and shared events.

#### Acceptance Criteria

1. THE BrightCal_API SHALL allow authenticated users to create new Calendar_Collection instances with a display name, color, and description.
2. THE BrightCal_API SHALL allow authenticated users to rename, recolor, and update the description of Calendar_Collection instances they own.
3. THE BrightCal_API SHALL allow authenticated users to delete Calendar_Collection instances they own, including all contained events.
4. WHEN a new BrightMail account is created, THE Calendar_Engine SHALL automatically create a default Calendar_Collection named "Personal" for the user.
5. THE BrightCal_API SHALL allow authenticated users to list all Calendar_Collection instances they own or have been shared with them, including the permission level for each.
6. THE BrightCal_API SHALL allow authenticated users to subscribe to external iCalendar feeds (ICS URLs) as read-only Calendar_Collection instances that refresh on a configurable interval.
7. WHEN an external ICS feed subscription is refreshed, THE Calendar_Engine SHALL merge updated events, add new events, and remove events no longer present in the feed.

### Requirement 4: Event Creation and Management

**User Story:** As a BrightMail user, I want to create, edit, and delete calendar events with rich metadata, so that I can manage my schedule effectively.

#### Acceptance Criteria

1. THE BrightCal_API SHALL allow authenticated users to create events with title, start time, end time, description, location, attendees, recurrence rules, reminders, and visibility (public, private, confidential).
2. THE BrightCal_API SHALL allow authenticated users to create all-day events by specifying DATE values without time components.
3. THE BrightCal_API SHALL allow authenticated users to edit any property of events they own or have editor permission on.
4. THE BrightCal_API SHALL allow authenticated users to delete events they own or have editor permission on.
5. WHEN an event with attendees is created or modified, THE Notification_Service SHALL send iTIP REQUEST messages to all attendees via iMIP (email) and in-app notification.
6. WHEN an event is cancelled by the organizer, THE Notification_Service SHALL send iTIP CANCEL messages to all attendees.
7. THE BrightCal_API SHALL support event attachments (files, links) stored via the BrightChain block store.
8. THE BrightCal_API SHALL assign a globally unique UID (RFC 4122 UUID) to each event upon creation.
9. THE BrightCal_API SHALL increment the SEQUENCE number each time an event is modified by the organizer.
10. WHEN an event spans multiple time zones (different DTSTART and DTEND time zones), THE Calendar_Engine SHALL store and display both time zones correctly.

### Requirement 5: Recurrence and Exception Handling

**User Story:** As a user with recurring meetings, I want to define complex recurrence patterns and modify individual occurrences, so that my repeating events accurately reflect my schedule.

#### Acceptance Criteria

1. THE Calendar_Engine SHALL expand RRULE definitions into individual occurrences for display, supporting all RFC 5545 recurrence frequencies (SECONDLY, MINUTELY, HOURLY, DAILY, WEEKLY, MONTHLY, YEARLY).
2. THE Calendar_Engine SHALL respect UNTIL and COUNT limits when expanding recurrence rules.
3. THE Calendar_Engine SHALL apply EXDATE exclusions to remove specific occurrences from a recurrence set.
4. THE Calendar_Engine SHALL apply RDATE additions to include additional occurrences in a recurrence set.
5. WHEN a user modifies a single occurrence of a recurring event, THE Calendar_Engine SHALL create a RECURRENCE-ID exception for that occurrence while preserving the parent recurrence rule.
6. WHEN a user modifies "this and future" occurrences, THE Calendar_Engine SHALL split the recurrence into two series: the original ending before the modification date, and a new series starting from the modification date.
7. WHEN a user deletes a single occurrence, THE Calendar_Engine SHALL add an EXDATE for that occurrence rather than deleting the entire series.
8. THE Calendar_Engine SHALL correctly handle recurrence expansion across daylight saving time transitions, adjusting occurrence times according to the IANA Time_Zone_Database.

### Requirement 6: Calendar Sharing and Permissions

**User Story:** As a team member, I want to share my calendar with colleagues at different permission levels, so that we can coordinate schedules while maintaining privacy control.

#### Acceptance Criteria

1. THE Permission_Manager SHALL support four permission levels for shared calendars: owner (full control including sharing), editor (create/edit/delete events), viewer (read-only access to event details), and free-busy-only (see occupied time slots without event details).
2. THE BrightCal_API SHALL allow calendar owners to share a Calendar_Collection with specific BrightMail users or groups at a specified permission level.
3. THE BrightCal_API SHALL allow calendar owners to revoke sharing permissions from specific users or groups.
4. THE BrightCal_API SHALL allow calendar owners to generate a public sharing link that grants viewer or free-busy-only access without requiring authentication.
5. WHEN a user with viewer permission requests event details, THE Permission_Manager SHALL return full event details including title, time, location, and description.
6. WHEN a user with free-busy-only permission requests event details, THE Permission_Manager SHALL return only the time range and busy/free status without title, description, or attendee information.
7. WHEN a user without any permission attempts to access a calendar, THE Permission_Manager SHALL deny the request and return an authorization error.
8. THE Permission_Manager SHALL support per-event visibility overrides: events marked "private" SHALL display only as "busy" to viewers, and events marked "confidential" SHALL display title only without description or attendees to viewers.
9. THE BrightCal_API SHALL allow calendar owners to set a default permission level for new shares.

### Requirement 7: Conflict Detection and Resolution

**User Story:** As a busy professional, I want the system to detect scheduling conflicts and help me resolve them, so that I avoid double-booking myself or my team.

#### Acceptance Criteria

1. WHEN a new event is created or an existing event is modified, THE Scheduling_Engine SHALL check for time overlaps with all other events on the same attendee's calendars.
2. WHEN a conflict is detected, THE Scheduling_Engine SHALL return a conflict notification identifying the overlapping events, their time ranges, and their calendars.
3. THE Scheduling_Engine SHALL classify conflicts by severity: hard conflict (both events require attendance), soft conflict (one event is tentative or marked as free), and informational (all-day event overlapping with a timed event).
4. WHEN a user attempts to accept an invitation that conflicts with an existing event, THE Calendar_Engine SHALL warn the user about the conflict before confirming the RSVP.
5. THE Scheduling_Engine SHALL exclude events with TRANSP=TRANSPARENT from conflict detection.
6. WHEN multiple attendees are involved, THE Scheduling_Engine SHALL aggregate conflicts across all attendees and report per-attendee conflict status.

### Requirement 8: Free/Busy and Availability Queries

**User Story:** As a meeting organizer, I want to query attendee availability before scheduling, so that I can find times when all participants are free.

#### Acceptance Criteria

1. THE Scheduling_Engine SHALL compute Free_Busy_Data for any user over a specified time range by aggregating all non-transparent events across all of the user's calendars.
2. WHEN a free-busy query is received for a user, THE Scheduling_Engine SHALL respect that user's sharing permissions: only users with at least free-busy-only access SHALL receive availability data.
3. THE Scheduling_Engine SHALL support group free-busy queries that aggregate availability across multiple attendees and return common free slots.
4. THE BrightCal_API SHALL expose a "find available times" endpoint that accepts a list of required attendees, optional attendees, meeting duration, and time range, and returns ranked time slot suggestions.
5. WHEN ranking suggested time slots, THE Scheduling_Engine SHALL prefer slots where all required attendees are free, then maximize optional attendee availability, then prefer slots during configured working hours.
6. THE Scheduling_Engine SHALL support configurable working hours per user (default: Monday–Friday, 09:00–17:00 in the user's local time zone).
7. THE BrightCal_API SHALL support VFREEBUSY request/response via the CalDAV scheduling interface per RFC 6638.

### Requirement 9: Booking Pages and Appointment Scheduling

**User Story:** As a professional who takes appointments, I want to publish a booking page showing my available slots, so that external parties can schedule time with me without back-and-forth emails.

#### Acceptance Criteria

1. THE BrightCal_API SHALL allow authenticated users to create Booking_Page configurations specifying available days, time ranges, appointment durations, buffer time between appointments, and maximum advance booking window.
2. THE Booking_Page SHALL display available time slots computed by subtracting the user's existing calendar events from the configured availability windows.
3. WHEN an external party selects a time slot on the Booking_Page, THE Calendar_Engine SHALL create an event on the host's calendar with the booker's name and email as an attendee.
4. WHEN a booking is confirmed, THE Notification_Service SHALL send a confirmation email with an iCalendar attachment to both the host and the booker.
5. THE Booking_Page SHALL support configurable booking questions (name, email, phone, custom text fields) that are stored as event description metadata.
6. THE Booking_Page SHALL enforce a minimum scheduling notice period (configurable, default: 4 hours) preventing bookings too close to the current time.
7. THE Booking_Page SHALL support multiple appointment types per user, each with independent duration, availability, and question configurations.
8. WHEN a host's calendar event is created or modified to overlap with a previously available booking slot, THE Booking_Page SHALL immediately remove that slot from availability.
9. THE Booking_Page SHALL be accessible without BrightMail authentication, requiring only the booker's name and email address.

### Requirement 10: Event Invitations and RSVP

**User Story:** As a meeting organizer, I want to send invitations and track attendee responses, so that I know who will attend my events.

#### Acceptance Criteria

1. WHEN an event with attendees is created, THE Notification_Service SHALL send an iTIP REQUEST message to each attendee containing the event details and RSVP options (Accept, Decline, Tentative).
2. WHEN an attendee responds to an invitation, THE Calendar_Engine SHALL update the attendee's PARTSTAT (ACCEPTED, DECLINED, TENTATIVE) on the organizer's event.
3. WHEN an attendee responds, THE Notification_Service SHALL send an iTIP REPLY message to the organizer confirming the response.
4. THE BrightCal_API SHALL allow attendees to propose a new time (iTIP COUNTER) which the organizer can accept or decline (DECLINECOUNTER).
5. WHEN an event is updated by the organizer (time change, location change), THE Notification_Service SHALL send an updated iTIP REQUEST with an incremented SEQUENCE number to all attendees.
6. THE Calendar_Engine SHALL track RSVP status for each attendee and expose an attendee summary (accepted count, declined count, tentative count, no-response count) via the BrightCal_API.
7. WHEN an invitation is received from an external email system via iMIP, THE Calendar_Engine SHALL parse the iTIP message and present it to the BrightMail user as an actionable invitation.
8. THE Notification_Service SHALL support configurable reminder notifications (email and in-app) at user-specified intervals before event start (default: 30 minutes, 10 minutes).

### Requirement 11: Time Zone Handling

**User Story:** As a user collaborating across time zones, I want all events to display correctly in my local time zone, so that I never miss a meeting due to time zone confusion.

#### Acceptance Criteria

1. THE Calendar_Engine SHALL store all event times with explicit TZID references to IANA time zone identifiers.
2. WHEN displaying events to a user, THE Calendar_Widget SHALL convert event times to the user's configured local time zone.
3. THE Calendar_Engine SHALL correctly handle daylight saving time transitions when expanding recurring events, ensuring occurrences maintain their wall-clock time (e.g., a 9:00 AM daily meeting stays at 9:00 AM local time across DST changes).
4. THE BrightCal_API SHALL accept event times in any valid IANA time zone and store them with the original TZID for round-trip fidelity.
5. WHEN creating an event with attendees in multiple time zones, THE Calendar_Widget SHALL display the event time in each attendee's local time zone in the event detail view.
6. THE Calendar_Engine SHALL update its Time_Zone_Database reference when IANA publishes updates, ensuring correct conversions for newly modified time zone rules.

### Requirement 12: Calendar UI Widgets

**User Story:** As a BrightMail user, I want rich calendar views integrated into the BrightMail interface, so that I can manage my schedule without leaving the application.

#### Acceptance Criteria

1. THE Calendar_Widget SHALL render a month view displaying event indicators (colored dots or bars) on days with events, with the ability to click a day to see event details.
2. THE Calendar_Widget SHALL render a week view displaying events as time-blocked rectangles positioned according to their start and end times, with overlapping events displayed side-by-side.
3. THE Calendar_Widget SHALL render a day view displaying events as time-blocked rectangles on a vertical timeline with 15-minute granularity.
4. THE Calendar_Widget SHALL render an agenda view displaying a chronological list of upcoming events with title, time, location, and calendar color.
5. THE Calendar_Widget SHALL support drag-and-drop event rescheduling in week and day views, updating the event start and end times accordingly.
6. THE Calendar_Widget SHALL support drag-to-create new events in week and day views by clicking and dragging across a time range.
7. THE Calendar_Widget SHALL display events from multiple calendars simultaneously, distinguished by calendar color.
8. THE Calendar_Widget SHALL provide a mini-calendar (date picker) for quick navigation to specific dates.
9. THE Calendar_Widget SHALL support keyboard navigation (arrow keys for date navigation, Enter to select, Escape to close popovers) for accessibility compliance.
10. THE Calendar_Widget SHALL render responsively, adapting layout for desktop (full multi-column week view) and mobile (single-column day view with swipe navigation) viewports.
11. WHEN an event is clicked, THE Calendar_Widget SHALL display an event detail popover showing title, time, location, description, attendees, and RSVP status with action buttons (Edit, Delete, RSVP).
12. THE Calendar_Widget SHALL display a loading skeleton while calendar data is being fetched, and an error state with retry action if the fetch fails.

### Requirement 13: BrightMail Integration

**User Story:** As a BrightMail user, I want calendar features seamlessly integrated with my email experience, so that I can manage events directly from email conversations.

#### Acceptance Criteria

1. WHEN a BrightMail message contains an iCalendar attachment (text/calendar MIME type), THE BrightMail interface SHALL render an inline event card with event details and RSVP action buttons.
2. WHEN a user clicks an RSVP button on an inline event card, THE Calendar_Engine SHALL update the attendee's participation status and send an iTIP REPLY via BrightMail.
3. THE BrightMail sidebar SHALL include a "Calendar" navigation item that opens the Calendar_Widget in the main content area.
4. THE BrightMail compose interface SHALL include an "Add Event" action that creates a calendar event and attaches an iCalendar invitation to the outgoing message.
5. WHEN a user receives a meeting update (iTIP REQUEST with SEQUENCE > 0), THE BrightMail interface SHALL display the changes (time change, location change) highlighted in the inline event card.
6. THE Calendar_Widget SHALL be accessible as a sidebar panel in BrightMail for quick schedule reference while reading or composing emails.
7. WHEN a user creates an event from BrightMail, THE Calendar_Engine SHALL pre-populate attendees from the email's To and CC fields.

### Requirement 14: Notifications and Reminders

**User Story:** As a user with a busy schedule, I want configurable reminders and real-time notifications, so that I never miss an upcoming event.

#### Acceptance Criteria

1. THE Notification_Service SHALL support event reminders via email (BrightMail message) and in-app push notification at user-configurable intervals before event start.
2. THE BrightCal_API SHALL allow users to configure default reminder settings (e.g., 30 minutes before, 10 minutes before) that apply to all new events.
3. THE BrightCal_API SHALL allow users to override default reminders on a per-event basis, adding or removing reminder intervals.
4. WHEN a reminder trigger time is reached, THE Notification_Service SHALL deliver the reminder via all configured channels (email, in-app) within 60 seconds of the trigger time.
5. WHEN an event is cancelled after reminders have been scheduled, THE Notification_Service SHALL cancel all pending reminders for that event.
6. THE Notification_Service SHALL send real-time notifications for event invitations, RSVP responses, event updates, and event cancellations via the BrightMail in-app notification system.
7. WHEN a user has multiple devices, THE Notification_Service SHALL deliver in-app notifications to all active sessions.

### Requirement 15: Search and Filtering

**User Story:** As a user with many events, I want to search and filter my calendar, so that I can quickly find specific events.

#### Acceptance Criteria

1. THE BrightCal_API SHALL support full-text search across event titles, descriptions, locations, and attendee names within a user's accessible calendars.
2. THE BrightCal_API SHALL support filtering events by date range, calendar, attendee, and event status (confirmed, tentative, cancelled).
3. THE BrightCal_API SHALL support filtering events by recurrence (show only recurring events, show only single events).
4. WHEN a search query is submitted, THE BrightCal_API SHALL return results ranked by relevance with the most recent and upcoming events prioritized.
5. THE Calendar_Widget SHALL provide a search input that filters the current view and displays matching events highlighted.

### Requirement 16: Data Export and Import

**User Story:** As a user migrating to or from BrightCal, I want to import and export my calendar data in standard formats, so that I am not locked into a single platform.

#### Acceptance Criteria

1. THE BrightCal_API SHALL support exporting an entire Calendar_Collection as a single iCalendar (.ics) file containing all events.
2. THE BrightCal_API SHALL support importing an iCalendar (.ics) file containing multiple events into a specified Calendar_Collection.
3. WHEN importing events, THE Calendar_Engine SHALL detect duplicate events by UID and offer to skip, overwrite, or create as new.
4. THE BrightCal_API SHALL support exporting calendar data in JSON format for programmatic access and backup.
5. WHEN exporting, THE iCal_Serializer SHALL produce valid iCalendar output that imports successfully into Google Calendar, Apple Calendar, and Microsoft Outlook.

### Requirement 17: Event Privacy and Encryption

**User Story:** As a privacy-conscious user on the BrightChain network, I want my calendar data encrypted at rest and in transit, so that only authorized parties can read my event details.

#### Acceptance Criteria

1. THE Calendar_Engine SHALL encrypt all calendar data at rest using the user's BrightChain encryption keys before storing in the block store.
2. WHEN a calendar is shared with another user, THE Calendar_Engine SHALL re-encrypt shared event data with the recipient's public key, ensuring only the recipient can decrypt event details.
3. THE CalDAV_Server SHALL require TLS for all connections, rejecting unencrypted requests.
4. WHEN a user revokes sharing permissions, THE Calendar_Engine SHALL remove the recipient's encrypted copy and rotate encryption keys for the calendar.
5. THE Calendar_Engine SHALL store Free_Busy_Data separately from event details, allowing free-busy sharing without exposing encrypted event content.

