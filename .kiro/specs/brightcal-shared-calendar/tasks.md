# Implementation Plan: BrightCal Shared Calendar

## Overview

Implement the BrightCal shared calendar subsystem as three Nx libraries (`brightcal-lib`, `brightcal-api-lib`, `brightcal-react-components`) following the established BrightChain monorepo patterns. Tasks proceed from core shared logic through API services to frontend components, with property-based tests validating the 31 correctness properties defined in the design.

## Tasks

- [x] 1. Scaffold Nx libraries and project structure
  - [x] 1.1 Generate `brightcal-lib` library
    - Run `yarn nx g @nx/js:lib brightcal-lib --unitTestRunner=jest --bundler=tsc`
    - Configure `tsconfig.json` paths alias `@brightchain/brightcal-lib`
    - Add `fast-check` as a dev dependency
    - _Requirements: N/A (infrastructure)_

  - [x] 1.2 Generate `brightcal-api-lib` library
    - Run `yarn nx g @nx/js:lib brightcal-api-lib --unitTestRunner=jest --bundler=tsc`
    - Configure `tsconfig.json` paths alias `@brightchain/brightcal-api-lib`
    - Add dependency on `brightcal-lib`, `brightchain-api-lib`, `brightchain-db`
    - _Requirements: N/A (infrastructure)_

  - [x] 1.3 Generate `brightcal-react-components` library
    - Run `yarn nx g @nx/react:lib brightcal-react-components --unitTestRunner=jest --bundler=rollup`
    - Configure `tsconfig.json` paths alias `@brightchain/brightcal-react-components`
    - Add dependency on `brightcal-lib`
    - _Requirements: N/A (infrastructure)_

- [x] 2. Core interfaces and enumerations in brightcal-lib
  - [x] 2.1 Define all enumerations
    - Create `brightcal-lib/src/lib/enums/` with: `CalendarPermissionLevel`, `EventVisibility`, `EventTransparency`, `ParticipationStatus`, `RecurrenceFrequency`, `ConflictSeverity`, `ITipMethod`
    - _Requirements: 6.1, 7.3, 5.1, 10.1_

  - [x] 2.2 Define all DTO interfaces
    - Create `brightcal-lib/src/lib/interfaces/` with: `ICalendarCollectionDTO`, `IRecurrenceRule`, `IAttendeeDTO`, `IReminderDTO`, `ICalendarEventDTO`, `IFreeBusySlot`, `IFreeBusyDataDTO`, `IConflictResult`, `IBookingPageDTO`, `IAppointmentTypeDTO`, `IAvailabilityWindow`, `IBookingQuestion`, `ICalendarShareDTO`, `IWorkingHoursDTO`
    - Use generic `<TID, TDate>` pattern per AGENTS.md guidance
    - _Requirements: 1.1, 4.1, 6.1, 8.1, 9.1_

  - [x] 2.3 Define parser result interfaces
    - Create `ICalParseResult`, `ICalParseError`, `ICalendarTodoDTO` interfaces
    - _Requirements: 1.1, 1.2, 1.3, 1.5_

- [x] 3. iCal parser and serializer
  - [x] 3.1 Implement `parseICalendar` function
    - Parse VEVENT, VTODO, VFREEBUSY, VALARM components
    - Handle line unfolding (RFC 5545 Section 3.1), multi-valued properties, property parameters (TZID, VALUE, ENCODING)
    - Return `ICalParseResult` with errors array for malformed input
    - _Requirements: 1.1, 1.2, 1.3, 1.4, 1.5, 1.8, 1.9, 1.10_

  - [x] 3.2 Implement `serializeToICalendar` function
    - Serialize internal event representations to valid RFC 5545 iCalendar format
    - Implement proper line folding, BEGIN/END blocks, required properties
    - _Requirements: 1.6, 1.7_

  - [x] 3.3 Write property test: iCalendar Round-Trip Fidelity
    - **Property 1: iCalendar Round-Trip Fidelity**
    - Create custom fast-check arbitrary for valid iCal streams with VEVENT, VTODO, VFREEBUSY, VALARM, RRULE, EXDATE, RDATE, multi-valued properties, folded lines
    - Assert: parse → serialize → parse produces equivalent internal representation
    - File: `brightcal-lib/src/lib/__tests__/ical-parser.property.spec.ts`
    - **Validates: Requirements 1.1, 1.2, 1.3, 1.4, 1.7, 1.8, 1.9, 1.10**

  - [x] 3.4 Write property test: iCal Serializer Structural Validity
    - **Property 2: iCal Serializer Structural Validity**
    - Create custom fast-check arbitrary for valid internal Event representations
    - Assert: serialized output has proper BEGIN/END blocks, required properties, correct line folding, valid property value formats
    - File: `brightcal-lib/src/lib/__tests__/ical-parser.property.spec.ts`
    - **Validates: Requirements 1.6**

- [x] 4. Checkpoint - Ensure all tests pass
  - Ensure all tests pass, ask the user if questions arise.

- [x] 5. Recurrence expander
  - [x] 5.1 Implement `expandRecurrence` function
    - Support all RFC 5545 frequencies (SECONDLY through YEARLY)
    - Implement UNTIL and COUNT limit enforcement
    - Apply EXDATE exclusions and RDATE additions
    - Handle DST transitions preserving wall-clock time via IANA timezone data
    - Lazy expansion within requested time window only
    - _Requirements: 5.1, 5.2, 5.3, 5.4, 5.8_

  - [x] 5.2 Write property test: Recurrence Expansion Respects Limits
    - **Property 3: Recurrence Expansion Respects Limits**
    - Assert: occurrences never exceed UNTIL date or COUNT number
    - File: `brightcal-lib/src/lib/__tests__/recurrence-expander.property.spec.ts`
    - **Validates: Requirements 5.1, 5.2**

  - [x] 5.3 Write property test: EXDATE Exclusions Remove Occurrences
    - **Property 4: EXDATE Exclusions Remove Occurrences**
    - Assert: expanded set does not contain any excluded dates
    - File: `brightcal-lib/src/lib/__tests__/recurrence-expander.property.spec.ts`
    - **Validates: Requirements 5.3**

  - [x] 5.4 Write property test: RDATE Additions Include Occurrences
    - **Property 5: RDATE Additions Include Occurrences**
    - Assert: expanded set contains all RDATE dates within the window
    - File: `brightcal-lib/src/lib/__tests__/recurrence-expander.property.spec.ts`
    - **Validates: Requirements 5.4**

  - [x] 5.5 Write property test: Single Occurrence Modification Preserves Parent Rule
    - **Property 6: Single Occurrence Modification Preserves Parent Rule**
    - Assert: modifying one occurrence creates RECURRENCE-ID exception, parent RRULE unchanged, other occurrences unaffected
    - File: `brightcal-lib/src/lib/__tests__/recurrence-expander.property.spec.ts`
    - **Validates: Requirements 5.5**

  - [x] 5.6 Write property test: This-and-Future Split Produces Two Valid Series
    - **Property 7: This-and-Future Split Produces Two Valid Series**
    - Assert: original series has UNTIL before split, new series starts at split, union equals original occurrences
    - File: `brightcal-lib/src/lib/__tests__/recurrence-expander.property.spec.ts`
    - **Validates: Requirements 5.6**

  - [x] 5.7 Write property test: Single Occurrence Deletion Adds EXDATE
    - **Property 8: Single Occurrence Deletion Adds EXDATE**
    - Assert: deleting one occurrence adds EXDATE, series continues producing all other occurrences
    - File: `brightcal-lib/src/lib/__tests__/recurrence-expander.property.spec.ts`
    - **Validates: Requirements 5.7**

  - [x] 5.8 Write property test: DST-Correct Recurrence Expansion
    - **Property 9: DST-Correct Recurrence Expansion**
    - Assert: wall-clock time maintained across DST transitions (e.g., 9:00 AM stays 9:00 AM local)
    - File: `brightcal-lib/src/lib/__tests__/recurrence-expander.property.spec.ts`
    - **Validates: Requirements 5.8, 11.3**

- [x] 6. Conflict detector
  - [x] 6.1 Implement `detectConflicts` function
    - Detect time overlaps between candidate event and existing events
    - Classify severity: hard, soft, informational
    - Exclude TRANSP=TRANSPARENT events
    - _Requirements: 7.1, 7.2, 7.3, 7.5_

  - [x] 6.2 Write property test: Conflict Detection Correctness
    - **Property 11: Conflict Detection Correctness**
    - Assert: reports all and only overlaps, correct severity classification, transparent events excluded
    - File: `brightcal-lib/src/lib/__tests__/conflict-detector.property.spec.ts`
    - **Validates: Requirements 7.1, 7.2, 7.3, 7.5**

  - [x] 6.3 Write property test: Multi-Attendee Conflict Aggregation
    - **Property 12: Multi-Attendee Conflict Aggregation**
    - Assert: per-attendee conflict status checked independently and aggregated
    - File: `brightcal-lib/src/lib/__tests__/conflict-detector.property.spec.ts`
    - **Validates: Requirements 7.6**

- [x] 7. Permission filtering logic
  - [x] 7.1 Implement permission-based data filtering in brightcal-lib
    - Filter event data based on permission level (owner/editor → full, viewer → full except private events show as busy, freebusy → time only, none → denied)
    - Handle per-event visibility overrides (PRIVATE → busy only, CONFIDENTIAL → title only)
    - _Requirements: 6.5, 6.6, 6.7, 6.8_

  - [x] 7.2 Write property test: Permission-Based Data Filtering
    - **Property 10: Permission-Based Data Filtering**
    - Assert: viewer gets full details, freebusy gets time only, no-permission denied, private shows as busy, confidential shows title only
    - File: `brightcal-lib/src/lib/__tests__/permission-filter.property.spec.ts`
    - **Validates: Requirements 6.5, 6.6, 6.7, 6.8**

- [x] 8. Checkpoint - Ensure all tests pass
  - Ensure all tests pass, ask the user if questions arise.

- [ ] 9. BrightDB models and schemas in brightcal-api-lib
  - [x] 9.1 Create CalendarCollection model
    - Define BrightDB schema with indexes, owner reference, subscription config
    - Implement BrightDb integration pattern
    - _Requirements: 3.1, 3.2, 3.3, 3.4, 3.5, 3.6_

  - [x] 9.2 Create CalendarEvent model (metadata index)
    - Define schema with compound indexes: `{ calendarId, dtstart, dtend }`, `{ organizerId }`, `{ attendeeIds }`, `{ uid }`, text index on `searchText`
    - Store block reference for encrypted event body
    - _Requirements: 4.1, 4.8, 15.1_

  - [x] 9.3 Create CalendarShare model
    - Define schema with user/group grant, permission level, expiration, public link
    - _Requirements: 6.1, 6.2, 6.3, 6.4_

  - [x] 9.4 Create CalendarReminder model
    - Define schema with trigger time, channels, delivered flag
    - Index: `{ triggerAt, delivered }` for polling
    - _Requirements: 14.1, 14.4_

  - [x] 9.5 Create BookingPage and BookingAppointment models
    - Define schemas for booking configuration and confirmed appointments
    - Unique index on slug
    - _Requirements: 9.1, 9.3, 9.5_

  - [x] 9.6 Create FreeBusySummary model
    - Define schema with userId, date, slots at 15-min resolution
    - Index: `{ userId, date }`
    - _Requirements: 8.1, 17.5_

- [ ] 10. Calendar CRUD API controllers
  - [x] 10.1 Implement CalendarController
    - Extend `BaseController` with OpenAPI metadata
    - Endpoints: POST (create), GET (list), GET/:id, PATCH/:id, DELETE/:id
    - Register on ApiRouter at `/api/cal/calendars`
    - _Requirements: 3.1, 3.2, 3.3, 3.5_

  - [x] 10.2 Implement CalendarEngineService (calendar operations)
    - Calendar CRUD with permission checks
    - Auto-create default "Personal" calendar on new account
    - Subscription management for external ICS feeds
    - _Requirements: 3.4, 3.6, 3.7_

  - [x] 10.3 Implement CalendarPermissionService
    - Share/revoke calendar with users or groups
    - Generate public sharing links
    - Enforce permission levels on all calendar/event access
    - _Requirements: 6.1, 6.2, 6.3, 6.4, 6.9_

  - [x] 10.4 Write unit tests for CalendarController and CalendarPermissionService
    - Test CRUD operations, permission enforcement, default calendar creation
    - _Requirements: 3.1, 3.2, 3.3, 3.4, 3.5, 6.1, 6.2, 6.3_

- [ ] 11. Event CRUD API controllers
  - [x] 11.1 Implement EventController
    - Extend `BaseController` with OpenAPI metadata
    - Endpoints: POST (create), GET (list by calendar/range), GET/:id, PATCH/:id, DELETE/:id
    - Support recurrence modification modes: single, this-and-future, all
    - Register on ApiRouter at `/api/cal/events`
    - _Requirements: 4.1, 4.2, 4.3, 4.4, 4.7, 4.8, 4.9_

  - [x] 11.2 Implement CalendarEngineService (event operations)
    - Event CRUD with encryption via ECIES and block store
    - UID assignment (RFC 4122 UUID), SEQUENCE increment on modification
    - Recurrence exception handling (RECURRENCE-ID, EXDATE addition, series split)
    - _Requirements: 4.8, 4.9, 5.5, 5.6, 5.7_

  - [x] 11.3 Write unit tests for EventController
    - Test event creation, modification, deletion, recurrence modifications
    - _Requirements: 4.1, 4.3, 4.4, 5.5, 5.6, 5.7_

- [ ] 12. Scheduling engine (free/busy, availability)
  - [x] 12.1 Implement SchedulingEngineService
    - Compute free/busy data by aggregating non-transparent events
    - Group free/busy intersection across multiple users
    - "Find available times" with ranking: all-required-free → max-optional → working-hours
    - Configurable working hours per user
    - _Requirements: 8.1, 8.2, 8.3, 8.4, 8.5, 8.6_

  - [x] 12.2 Implement SchedulingController
    - Extend `BaseController` with OpenAPI metadata
    - Endpoints: POST /free-busy, POST /find-available-times
    - Register on ApiRouter at `/api/cal/scheduling`
    - _Requirements: 8.4, 8.7_

  - [x] 12.3 Write property test: Free/Busy Aggregation Correctness
    - **Property 13: Free/Busy Aggregation Correctness**
    - Assert: all OPAQUE events appear as busy, TRANSPARENT excluded
    - File: `brightcal-api-lib/src/lib/__tests__/scheduling-engine.property.spec.ts`
    - **Validates: Requirements 8.1**

  - [x] 12.4 Write property test: Group Free/Busy Intersection
    - **Property 14: Group Free/Busy Intersection**
    - Assert: common free slots are intersection of all individual free times
    - File: `brightcal-api-lib/src/lib/__tests__/scheduling-engine.property.spec.ts`
    - **Validates: Requirements 8.3**

  - [x] 12.5 Write property test: Time Slot Ranking Preferences
    - **Property 15: Time Slot Ranking Preferences**
    - Assert: ranking prefers all-required-free, then max-optional, then working-hours
    - File: `brightcal-api-lib/src/lib/__tests__/scheduling-engine.property.spec.ts`
    - **Validates: Requirements 8.5**

  - [x] 12.6 Write property test: Booking Slot Availability Computation
    - **Property 16: Booking Slot Availability Computation**
    - Assert: available slots = configured windows − existing events − minimum notice period
    - File: `brightcal-api-lib/src/lib/__tests__/scheduling-engine.property.spec.ts`
    - **Validates: Requirements 9.2, 9.6, 9.8**

- [x] 13. Checkpoint - Ensure all tests pass
  - Ensure all tests pass, ask the user if questions arise.

- [ ] 14. CalDAV server middleware
  - [x] 14.1 Implement CalDavMiddleware
    - Express middleware handling WebDAV methods: PROPFIND, REPORT, GET, PUT, DELETE, MKCALENDAR, POST
    - URL structure: `/caldav/{userId}/calendars/{calendarId}/{eventUid}.ics`
    - ETag-based conditional requests (If-Match, If-None-Match)
    - Authentication via BrightChain identity tokens
    - _Requirements: 2.1, 2.2, 2.3, 2.4, 2.5, 2.6, 2.9, 2.10_

  - [x] 14.2 Implement CalDavService
    - CalDAV protocol logic: resource discovery, calendar-query/calendar-multiget REPORT handling
    - ETag management for optimistic concurrency
    - RFC 6638 scheduling outbox (POST) for free-busy queries and invitation delivery
    - _Requirements: 2.2, 2.6, 2.7, 2.8_

  - [x] 14.3 Write unit tests for CalDavMiddleware
    - Test PROPFIND responses, PUT/DELETE operations, ETag handling, permission enforcement
    - _Requirements: 2.1, 2.3, 2.4, 2.5, 2.6, 2.9, 2.10_

- [ ] 15. Invitation and RSVP system
  - [x] 15.1 Implement InvitationController
    - Extend `BaseController` with OpenAPI metadata
    - Endpoints: POST /rsvp, POST /counter, POST /decline-counter
    - Register on ApiRouter at `/api/cal/invitations`
    - _Requirements: 10.1, 10.2, 10.3, 10.4_

  - [x] 15.2 Implement iTIP message handling in CalendarNotificationService
    - Generate iTIP REQUEST on event create/modify with attendees
    - Generate iTIP REPLY on RSVP response
    - Generate iTIP CANCEL on event cancellation
    - Handle iTIP COUNTER and DECLINECOUNTER
    - Track PARTSTAT per attendee, expose summary counts
    - Increment SEQUENCE on organizer modifications
    - _Requirements: 4.5, 4.6, 10.1, 10.2, 10.3, 10.4, 10.5, 10.6, 10.7_

  - [x] 15.3 Write property test: RSVP Tracking Correctness
    - **Property 17: RSVP Tracking Correctness**
    - Assert: each RSVP updates PARTSTAT correctly, summary counts always equal total attendees
    - File: `brightcal-api-lib/src/lib/__tests__/rsvp-tracking.property.spec.ts`
    - **Validates: Requirements 10.2, 10.6**

  - [x] 15.4 Write property test: SEQUENCE Monotonic Increment
    - **Property 18: SEQUENCE Monotonic Increment**
    - Assert: SEQUENCE increments by exactly 1 per modification, outgoing iTIP carries new value
    - File: `brightcal-api-lib/src/lib/__tests__/rsvp-tracking.property.spec.ts`
    - **Validates: Requirements 4.9, 10.5**

  - [x] 15.5 Write property test: Unique UID Assignment
    - **Property 19: Unique UID Assignment**
    - Assert: all assigned UIDs are unique and conform to RFC 4122 UUID format
    - File: `brightcal-api-lib/src/lib/__tests__/rsvp-tracking.property.spec.ts`
    - **Validates: Requirements 4.8**

- [ ] 16. Booking engine
  - [x] 16.1 Implement BookingEngineService
    - Compute available slots from configured windows minus existing events minus minimum notice
    - Create event on host calendar when booking confirmed
    - Confirmation flow with notification to host and booker
    - Support multiple appointment types per booking page
    - _Requirements: 9.1, 9.2, 9.3, 9.4, 9.6, 9.7, 9.8_

  - [x] 16.2 Implement BookingController
    - Extend `BaseController` with OpenAPI metadata
    - Endpoints: POST /pages (create), GET /pages/:slug (public), GET /pages/:slug/slots, POST /pages/:slug/book
    - Public endpoints (no auth required for booking)
    - Register on ApiRouter at `/api/cal/booking`
    - _Requirements: 9.1, 9.3, 9.5, 9.9_

  - [x] 16.3 Write unit tests for BookingEngineService
    - Test slot computation, minimum notice enforcement, booking creation
    - _Requirements: 9.2, 9.6, 9.8_

- [ ] 17. Notification service
  - [x] 17.1 Implement CalendarNotificationService (reminders and real-time)
    - Schedule reminders at configured intervals before event start
    - Deliver via email (SES/BrightMail) and in-app (WebSocket via ClientWebSocketServer)
    - Cancel pending reminders when event is cancelled
    - Real-time notifications for invitations, RSVPs, updates, cancellations
    - Multi-device delivery to all active sessions
    - _Requirements: 14.1, 14.2, 14.3, 14.4, 14.5, 14.6, 14.7_

  - [x] 17.2 Write property test: Reminder Cancellation on Event Cancellation
    - **Property 31: Reminder Cancellation on Event Cancellation**
    - Assert: all pending (undelivered) reminders cancelled when event is cancelled
    - File: `brightcal-api-lib/src/lib/__tests__/reminder-cancel.property.spec.ts`
    - **Validates: Requirements 14.5**

- [ ] 18. Search and filtering
  - [x] 18.1 Implement SearchController
    - Extend `BaseController` with OpenAPI metadata
    - Endpoints: GET /search (full-text), GET /filter (structured)
    - Full-text search across title, description, location, attendee names
    - Filter by date range, calendar, attendee, status, recurrence type
    - Results ranked by relevance with recent/upcoming prioritized
    - Register on ApiRouter at `/api/cal/search`
    - _Requirements: 15.1, 15.2, 15.3, 15.4_

  - [x] 18.2 Write property test: Search Filter Correctness
    - **Property 21: Search Filter Correctness**
    - Assert: filter returns all and only events matching all specified criteria
    - File: `brightcal-api-lib/src/lib/__tests__/search-filter.property.spec.ts`
    - **Validates: Requirements 15.2, 15.3**

  - [x] 18.3 Write property test: Full-Text Search Completeness
    - **Property 22: Full-Text Search Completeness**
    - Assert: any substring in title/description/location/attendee name appears in results
    - File: `brightcal-api-lib/src/lib/__tests__/search-filter.property.spec.ts`
    - **Validates: Requirements 15.1**

- [x] 19. Checkpoint - Ensure all tests pass
  - Ensure all tests pass, ask the user if questions arise.

- [ ] 20. Export and import
  - [x] 20.1 Implement ExportImportController
    - Extend `BaseController` with OpenAPI metadata
    - Endpoints: GET /export/:calendarId/ics, GET /export/:calendarId/json, POST /import/:calendarId
    - Export entire calendar collection as single .ics file or JSON
    - Import .ics with duplicate detection by UID (skip/overwrite/create-new options)
    - Register on ApiRouter at `/api/cal/export`
    - _Requirements: 16.1, 16.2, 16.3, 16.4, 16.5_

  - [x] 20.2 Write property test: Export/Import Round-Trip
    - **Property 23: Export/Import Round-Trip**
    - Assert: export to ICS then import produces equivalent events (matching by UID, all properties preserved)
    - File: `brightcal-api-lib/src/lib/__tests__/export-import.property.spec.ts`
    - **Validates: Requirements 16.1, 16.2**

  - [x] 20.3 Write property test: Duplicate Detection on Import
    - **Property 24: Duplicate Detection on Import**
    - Assert: events with matching UIDs are detected and reported as duplicates
    - File: `brightcal-api-lib/src/lib/__tests__/export-import.property.spec.ts`
    - **Validates: Requirements 16.3**

  - [x] 20.4 Write property test: JSON Export Completeness
    - **Property 25: JSON Export Completeness**
    - Assert: JSON export contains all event data fields for every event in the collection
    - File: `brightcal-api-lib/src/lib/__tests__/export-import.property.spec.ts`
    - **Validates: Requirements 16.4**

- [ ] 21. Encryption integration
  - [x] 21.1 Implement event encryption in CalendarEngineService
    - Encrypt event body with owner's ECIES key before block store write
    - Re-encrypt with recipient's public key on share
    - Decrypt on read with appropriate key
    - Key rotation on share revocation (new events only)
    - Store free/busy data separately (unencrypted) for availability queries
    - _Requirements: 17.1, 17.2, 17.4, 17.5_

  - [x] 21.2 Write property test: Encryption at Rest
    - **Property 26: Encryption at Rest**
    - Assert: raw block store content is encrypted (not readable as plaintext)
    - File: `brightcal-api-lib/src/lib/__tests__/encryption.property.spec.ts`
    - **Validates: Requirements 17.1**

  - [x] 21.3 Write property test: Recipient Re-Encryption
    - **Property 27: Recipient Re-Encryption**
    - Assert: recipient can decrypt with their key, other users cannot
    - File: `brightcal-api-lib/src/lib/__tests__/encryption.property.spec.ts`
    - **Validates: Requirements 17.2**

  - [x] 21.4 Write property test: Key Rotation on Revocation
    - **Property 28: Key Rotation on Revocation**
    - Assert: new events after revocation not decryptable by previously-shared key
    - File: `brightcal-api-lib/src/lib/__tests__/encryption.property.spec.ts`
    - **Validates: Requirements 17.4**

  - [x] 21.5 Write property test: Free/Busy Separation from Encrypted Events
    - **Property 29: Free/Busy Separation from Encrypted Events**
    - Assert: free/busy queryable without event encryption key, event details remain encrypted
    - File: `brightcal-api-lib/src/lib/__tests__/encryption.property.spec.ts`
    - **Validates: Requirements 17.5**

- [ ] 22. Timezone handling
  - [x] 22.1 Implement timezone utilities in brightcal-lib
    - IANA timezone conversion functions
    - Store event times with explicit TZID references
    - Round-trip preservation of original TZID
    - Multi-timezone event display support
    - _Requirements: 11.1, 11.2, 11.4, 11.5_

  - [x] 22.2 Write property test: Timezone Storage Round-Trip
    - **Property 20: Timezone Storage Round-Trip**
    - Assert: storing and retrieving preserves original TZID exactly
    - File: `brightcal-api-lib/src/lib/__tests__/timezone-storage.property.spec.ts`
    - **Validates: Requirements 11.1, 11.4**

- [ ] 23. ICS feed subscription
  - [x] 23.1 Implement IcsSubscriptionService
    - Poll external ICS feeds on configurable interval
    - Merge logic: add new events, update changed events (by UID), remove deleted events
    - Store as read-only calendar collection
    - _Requirements: 3.6, 3.7_

  - [x] 23.2 Write property test: ICS Feed Merge Correctness
    - **Property 30: ICS Feed Merge Correctness**
    - Assert: add events in new feed but not local, update matching UIDs with different content, remove local events absent from new feed
    - File: `brightcal-api-lib/src/lib/__tests__/feed-merge.property.spec.ts`
    - **Validates: Requirements 3.7**

- [x] 24. Checkpoint - Ensure all tests pass
  - Ensure all tests pass, ask the user if questions arise.

- [ ] 25. React calendar widgets
  - [x] 25.1 Implement CalendarWidget container with view switching
    - View modes: month, week, day, agenda
    - Calendar color overlay for multi-calendar display
    - Loading skeleton and error states
    - _Requirements: 12.1, 12.2, 12.3, 12.4, 12.7, 12.12_

  - [x] 25.2 Implement MonthView component
    - Month grid with event indicators (colored dots/bars)
    - Click day to see event details
    - _Requirements: 12.1_

  - [x] 25.3 Implement WeekView component
    - 7-column time grid with event blocks positioned by start/end time
    - Overlapping events displayed side-by-side
    - Drag-and-drop rescheduling, drag-to-create
    - _Requirements: 12.2, 12.5, 12.6_

  - [x] 25.4 Implement DayView component
    - Single-column time grid with 15-minute granularity
    - Drag-and-drop rescheduling, drag-to-create
    - _Requirements: 12.3, 12.5, 12.6_

  - [x] 25.5 Implement AgendaView component
    - Chronological event list with title, time, location, calendar color
    - _Requirements: 12.4_

  - [x] 25.6 Implement MiniCalendar and navigation
    - Compact date picker for quick navigation
    - Keyboard navigation (arrow keys, Enter, Escape)
    - _Requirements: 12.8, 12.9_

  - [x] 25.7 Implement EventDetailPopover and EventEditor
    - Popover showing title, time, location, description, attendees, RSVP status with action buttons
    - Create/edit event form with all fields
    - _Requirements: 12.11, 4.1_

  - [x] 25.8 Implement FreeBusyGrid component
    - Attendee availability visualization for scheduling
    - _Requirements: 8.3, 8.4_

  - [x] 25.9 Implement responsive layout and accessibility
    - Desktop: full multi-column week view; Mobile: single-column day view with swipe
    - Keyboard navigation, ARIA attributes
    - _Requirements: 12.9, 12.10_

  - [x] 25.10 Implement React hooks
    - `useCalendars`, `useEvents`, `useFreeBusy`, `useBookingSlots`, `useEventMutation`, `useCalendarDragDrop`, `useCalendarKeyboard`
    - _Requirements: 12.5, 12.6, 12.9_

  - [x] 25.11 Write unit tests for calendar widget components
    - Test rendering of each view, event display, drag-and-drop, keyboard navigation
    - _Requirements: 12.1, 12.2, 12.3, 12.4, 12.5, 12.9_

- [ ] 26. Booking page UI
  - [x] 26.1 Implement BookingPageView component
    - Public booking page with slot selection
    - Display available time slots computed from host availability
    - _Requirements: 9.2, 9.9_

  - [x] 26.2 Implement BookingForm component
    - Booker information form (name, email, custom questions)
    - Confirmation flow
    - _Requirements: 9.3, 9.5, 9.9_

  - [x] 26.3 Write unit tests for booking page components
    - Test slot display, form validation, booking submission
    - _Requirements: 9.2, 9.5, 9.9_

- [ ] 27. BrightMail integration
  - [x] 27.1 Implement InlineEventCard component
    - Render inline event card when email contains text/calendar MIME attachment
    - Display event details with RSVP action buttons (Accept, Decline, Tentative)
    - Show change highlights for meeting updates (SEQUENCE > 0)
    - _Requirements: 13.1, 13.2, 13.5_

  - [x] 27.2 Implement CalendarSidebar component
    - Calendar navigation item in BrightMail sidebar
    - Quick schedule reference panel while reading/composing emails
    - _Requirements: 13.3, 13.6_

  - [x] 27.3 Implement compose integration
    - "Add Event" action in BrightMail compose that creates event and attaches iCal invitation
    - Pre-populate attendees from To/CC fields
    - _Requirements: 13.4, 13.7_

  - [x] 27.4 Write unit tests for BrightMail integration components
    - Test inline event card rendering, RSVP actions, sidebar panel
    - _Requirements: 13.1, 13.2, 13.5, 13.6_

- [ ] 28. API router registration and wiring
  - [x] 28.1 Register all controllers on ApiRouter
    - Mount CalendarController, EventController, SchedulingController, BookingController, InvitationController, SearchController, ExportImportController
    - Mount CalDavMiddleware at `/caldav`
    - Register services in application service container
    - _Requirements: All API requirements_

  - [x] 28.2 Wire WebSocket notifications
    - Connect CalendarNotificationService to ClientWebSocketServer for real-time push
    - Event types: invitation, rsvp, update, cancel, reminder
    - _Requirements: 14.6, 14.7_

  - [x] 28.3 Write integration tests for API routing
    - Test route registration, authentication middleware, permission enforcement across endpoints
    - _Requirements: 2.9, 6.7_

- [x] 29. Final checkpoint - Ensure all tests pass
  - Ensure all tests pass, ask the user if questions arise.

## Notes

- Tasks marked with `*` are optional and can be skipped for faster MVP
- Each task references specific requirements for traceability
- Checkpoints ensure incremental validation
- Property tests validate the 31 universal correctness properties defined in the design
- Unit tests validate specific examples and edge cases
- All libraries use TypeScript with the existing Nx monorepo patterns (`yarn nx` commands)
- Use `fast-check` for all property-based tests with minimum 100 iterations per property
- Use `@digitaldefiance/ecies-lib` for encryption operations
- BrightDB via BrightDb patterns established in existing codebase
