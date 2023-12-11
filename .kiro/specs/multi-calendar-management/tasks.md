# Implementation Plan: Multi-Calendar Management

## Overview

Connect the existing BrightCal backend services (calendar CRUD, event CRUD, permissions, ICS subscriptions) to the frontend by rewriting the CalendarSidebar with visibility toggles and context menus, wiring CalendarWidget to render actual view components, adding sharing/subscription/holiday UI, creating supporting React hooks, mounting calendar routes in the App, and seeding the holiday catalog. All code is TypeScript across the Nx monorepo.

## Tasks

- [ ] 1. Add shared IHolidayFeedEntry interface and Visibility Set helpers
  - [x] 1.1 Create `IHolidayFeedEntry` interface in `brightcal-lib/src/lib/interfaces/holidayFeedEntryDto.ts` with fields: id, displayName, description, region, category, icsUrl
    - Export from `brightcal-lib/src/lib/interfaces/index.ts`
    - _Requirements: 10.1_

  - [x] 1.2 Create Visibility Set utility functions in `brightcal-react-components/src/lib/utils/visibilitySet.ts`
    - Implement `loadVisibilitySet(): Set<string> | null` (reads from localStorage key `brightcal:visibilitySet`)
    - Implement `saveVisibilitySet(set: Set<string>): void` (writes JSON array to localStorage)
    - Implement `toggleVisibility(set: Set<string>, calendarId: string): Set<string>` (returns new set with ID toggled)
    - Implement `filterEventsByVisibility(events: ICalendarEventDTO[], visibilitySet: Set<string>): ICalendarEventDTO[]`
    - Implement `buildCalendarColorMap(calendars: ICalendarCollectionDTO[]): Map<string, string>` (returns calendarId → hex color, default `#3b82f6`)
    - Implement `groupCalendarsByOwnership(calendars: ICalendarCollectionDTO[], userId: string): { owned: ICalendarCollectionDTO[]; other: ICalendarCollectionDTO[] }`
    - _Requirements: 1.1, 1.3, 1.5, 7.2, 7.5, 8.1_

  - [x] 1.3 Write property tests for Visibility Set utilities in `brightcal-react-components/src/lib/__tests__/visibilitySet.property.test.ts`
    - **Property 2: Visibility Set toggle correctness** — toggling an ID flips its membership; all other IDs unchanged
    - **Property 3: Visibility Set serialization round-trip** — serialize then deserialize produces identical set membership
    - **Validates: Requirements 1.3, 1.5**

  - [x] 1.4 Write property tests for calendar grouping in `brightcal-react-components/src/lib/__tests__/calendarGrouping.property.test.ts`
    - **Property 1: Calendar grouping by ownership** — partitions into exactly two disjoint groups whose union equals the input
    - **Validates: Requirements 1.1**

  - [x] 1.5 Write property tests for event filtering and color map in `brightcal-react-components/src/lib/__tests__/eventFiltering.property.test.ts`
    - **Property 4: Event filtering by Visibility Set** — filtered array contains exactly events whose calendarId is in the set
    - **Property 5: Calendar color map correctness** — lookup returns exact hex color for known IDs, default for unknown
    - **Validates: Requirements 7.1, 7.2, 7.5, 8.1**

- [x] 2. Checkpoint — Ensure all tests pass
  - Ensure all tests pass, ask the user if questions arise.

- [ ] 3. Create frontend hooks for calendar management, sharing, and subscriptions
  - [x] 3.1 Create `useCalendarManagement` hook in `brightcal-react-components/src/lib/hooks/useCalendarManagement.ts`
    - Implement `createCalendar(displayName, color, description?)` → POST `/api/cal/calendars`
    - Implement `updateCalendar(id, { displayName?, color?, description? })` → PATCH `/api/cal/calendars/:id`
    - Implement `deleteCalendar(id)` → DELETE `/api/cal/calendars/:id`
    - Expose `loading` and `error` states
    - Accept `onSuccess` callback for triggering parent refetch
    - _Requirements: 2.2, 2.4, 2.5, 2.6_

  - [x] 3.2 Create `useCalendarSharing` hook in `brightcal-react-components/src/lib/hooks/useCalendarSharing.ts`
    - Implement `shareCalendar(calendarId, grantedToUserId, permission)` → POST share endpoint
    - Implement `revokeShare(calendarId, shareId)` → DELETE revoke endpoint
    - Implement `getShares(calendarId)` → GET shares endpoint
    - Implement `generatePublicLink(calendarId)` → POST public link endpoint
    - Implement `revokePublicLink(calendarId)` → DELETE public link endpoint
    - Expose `loading` and `error` states for each operation
    - _Requirements: 11.1, 11.2, 11.3, 11.4, 11.5, 11.6_

  - [x] 3.3 Create `useCalendarSubscription` hook in `brightcal-react-components/src/lib/hooks/useCalendarSubscription.ts`
    - Implement `subscribe(url, displayName, refreshInterval?)` → POST subscribe-to-feed endpoint (default 60 min interval)
    - Implement `refreshSubscription(calendarId)` → POST refresh endpoint
    - Implement `unsubscribe(calendarId)` → DELETE calendar endpoint
    - Expose `loading` and `error` states
    - _Requirements: 12.1, 12.2, 12.3, 12.4_

  - [x] 3.4 Export all new hooks from `brightcal-react-components/src/lib/hooks/index.ts`
    - _Requirements: 11.1, 12.1_

  - [x] 3.5 Write unit tests for hooks in `brightcal-react-components/src/lib/__tests__/useCalendarManagement.spec.ts`
    - Test create, update, delete flows with mocked fetch
    - Test error state handling
    - _Requirements: 2.2, 2.4, 2.5, 2.6_

- [ ] 4. Rewrite CalendarSidebar with visibility toggles and context menus
  - [x] 4.1 Rewrite `CalendarSidebar` in `brightcal-react-components/src/lib/components/CalendarSidebar.tsx`
    - Update props interface to accept `calendars`, `visibilitySet`, `onVisibilityChange`, `apiBaseUrl`, `authToken`, `onCalendarsChanged`, and optional `strings`
    - Render MiniCalendar at top
    - Group calendars into "My Calendars" (owned) and "Other Calendars" (shared/subscribed) sections using `groupCalendarsByOwnership`
    - Render colored checkbox (Calendar_Toggle) next to each calendar entry matching the calendar's hex color
    - Implement toggle handler that calls `onVisibilityChange` with updated set
    - Add "⋯" context menu button per calendar entry with "Rename", "Change Color", "Delete", and "Share" options
    - Add "Add Calendar" button that shows inline form (display name + color picker)
    - Add "Subscribe to Calendar" button that shows URL input field
    - Add "Browse Holiday Calendars" button
    - Wire create/update/delete actions to `useCalendarManagement` hook
    - Block deletion of default calendar with error message
    - Show confirmation dialog before delete
    - _Requirements: 1.1, 1.2, 1.3, 1.4, 1.6, 2.1, 2.2, 2.3, 2.4, 2.5, 2.6, 2.7, 4.1, 4.2, 4.3, 4.4, 4.5_

  - [x] 4.2 Update `brightcal-react-components/src/lib/components/index.ts` to export the updated CalendarSidebar with its new props interface
    - _Requirements: 1.1_

  - [x] 4.3 Write unit tests for CalendarSidebar in `brightcal-react-components/src/lib/__tests__/CalendarSidebar.spec.tsx`
    - Test calendar grouping renders "My Calendars" and "Other Calendars" sections
    - Test toggle checkbox calls onVisibilityChange
    - Test context menu opens with correct options
    - Test "Add Calendar" inline form submission
    - Test default calendar delete is blocked
    - _Requirements: 1.1, 1.2, 1.3, 2.1, 2.3, 2.7_

- [ ] 5. Create SharingDialog component
  - [x] 5.1 Create `SharingDialog` in `brightcal-react-components/src/lib/components/SharingDialog.tsx`
    - Accept props: `calendarId`, `calendarName`, `isOpen`, `onClose`, `apiBaseUrl`, `authToken`
    - Render as modal dialog
    - On open, fetch existing shares via `useCalendarSharing.getShares`
    - Display list of shares (user ID + permission level + "Revoke" button)
    - Provide input for new share: user ID field + CalendarPermissionLevel dropdown (Editor, Viewer, FreeBusyOnly) + "Share" button
    - Wire share creation to `useCalendarSharing.shareCalendar`
    - Wire revoke to `useCalendarSharing.revokeShare`
    - Add "Copy Public Link" button → calls `generatePublicLink`, copies to clipboard (fallback to text selection if clipboard API unavailable)
    - Add "Revoke Public Link" button (shown when public link exists)
    - Display API errors inline without closing the dialog
    - _Requirements: 3.1, 3.2, 3.3, 3.4, 3.5, 3.6, 3.7_

  - [x] 5.2 Export SharingDialog from `brightcal-react-components/src/lib/components/index.ts`
    - _Requirements: 3.1_

  - [x] 5.3 Write unit tests for SharingDialog in `brightcal-react-components/src/lib/__tests__/SharingDialog.spec.tsx`
    - Test share list renders existing shares
    - Test share creation flow
    - Test revoke flow
    - Test error display inline
    - Test public link copy and revoke
    - _Requirements: 3.1, 3.2, 3.3, 3.4, 3.5, 3.6, 3.7_

- [ ] 6. Create HolidayCatalog component
  - [x] 6.1 Create `HolidayCatalog` in `brightcal-react-components/src/lib/components/HolidayCatalog.tsx`
    - Accept props: `isOpen`, `onClose`, `subscribedCalendarUrls: Set<string>`, `apiBaseUrl`, `authToken`, `onSubscribed`
    - Fetch holiday entries from GET `/api/cal/holiday-catalog`
    - Group entries by region/category
    - Render search/filter input that filters by displayName or region (case-insensitive substring)
    - Render "Add" button per entry, or "Subscribed" badge if entry's icsUrl is in `subscribedCalendarUrls`
    - Wire "Add" to `useCalendarSubscription.subscribe` with the entry's icsUrl and displayName
    - _Requirements: 5.1, 5.2, 5.3, 5.4, 5.5_

  - [x] 6.2 Export HolidayCatalog from `brightcal-react-components/src/lib/components/index.ts`
    - _Requirements: 5.1_

  - [x] 6.3 Write property tests for holiday catalog filtering in `brightcal-react-components/src/lib/__tests__/holidayCatalog.property.test.ts`
    - **Property 6: Holiday catalog search filter** — filtered results contain only entries where displayName or region contains query as case-insensitive substring; no matching entries excluded
    - **Property 7: Holiday catalog subscription badge state** — entries with icsUrl in subscribed set are marked "subscribed"; others marked "available"
    - **Validates: Requirements 5.4, 5.5**

  - [x] 6.4 Write unit tests for HolidayCatalog in `brightcal-react-components/src/lib/__tests__/HolidayCatalog.spec.tsx`
    - Test entries grouped by region
    - Test search filter narrows results
    - Test "Add" button calls subscribe
    - Test "Subscribed" badge shown for already-subscribed entries
    - _Requirements: 5.1, 5.2, 5.3, 5.4, 5.5_

- [x] 7. Checkpoint — Ensure all tests pass
  - Ensure all tests pass, ask the user if questions arise.

- [ ] 8. Wire CalendarWidget to render actual view components
  - [x] 8.1 Update `CalendarWidget` in `brightcal-react-components/src/lib/components/CalendarWidget.tsx`
    - Replace the placeholder `<div>` in the view container with conditional rendering of MonthView, WeekView, DayView, and AgendaView based on `currentView` state
    - Pass `currentDate`, `events`, `calendars`, `onEventClick`, and `onDayClick`/`onTimeSlotClick` to each view
    - Ensure view switch unmounts previous view and mounts new view without losing `currentDate` context
    - _Requirements: 6.1, 6.2, 6.3, 6.4, 6.5_

  - [x] 8.2 Write unit tests for CalendarWidget view rendering in `brightcal-react-components/src/lib/__tests__/CalendarWidget.spec.tsx`
    - Test each view mode renders the correct component
    - Test view mode switch preserves current date
    - _Requirements: 6.1, 6.2, 6.3, 6.4, 6.5_

- [ ] 9. Create holiday catalog backend endpoint and seed data
  - [x] 9.1 Create holiday catalog data file at `brightcal-api-lib/src/lib/data/holidayCatalogData.ts`
    - Export a static TypeScript constant array of `IHolidayFeedEntry` objects
    - Include minimum 10 entries covering: US Holidays, UK Holidays, Canadian Holidays, EU/German Holidays, French Holidays, Jewish Holidays, Islamic Holidays, Hindu Holidays, Chinese Holidays, Japanese Holidays, Australian Holidays
    - Use well-known public ICS feed URLs (Google Calendar public holiday feeds or equivalent)
    - _Requirements: 10.1, 10.3, 10.4, 5.2_

  - [x] 9.2 Create `HolidayCatalogController` at `brightcal-api-lib/src/lib/controllers/holidayCatalogController.ts`
    - Single GET `/` route that returns the static holiday catalog array as JSON
    - Import and serve the data from `holidayCatalogData.ts`
    - _Requirements: 10.2, 5.6_

  - [x] 9.3 Export the new controller from `brightcal-api-lib/src/lib/controllers/index.ts`
    - _Requirements: 10.2_

  - [x] 9.4 Write unit test for HolidayCatalogController in `brightcal-api-lib/src/lib/__tests__/holidayCatalogController.spec.ts`
    - Test GET returns JSON array with >= 10 entries
    - Test each entry has required fields (id, displayName, description, region, category, icsUrl)
    - _Requirements: 10.1, 10.2_

- [ ] 10. Mount calendar routes in App
  - [x] 10.1 Update the App startup in `brightchain-api-lib` to call `createCalendarRouter` and mount all routes
    - Mount `controllers.calendar.router` at `/api/cal/calendars`
    - Mount `controllers.event.router` at `/api/cal/events`
    - Mount `controllers.scheduling.router` at `/api/cal/scheduling`
    - Mount `controllers.booking.router` at `/api/cal/booking`
    - Mount `controllers.invitation.router` at `/api/cal/invitations`
    - Mount `controllers.search.router` at `/api/cal/search`
    - Mount `controllers.exportImport.router` at `/api/cal/export`
    - Mount `middleware.caldav.middleware()` at `/caldav`
    - Create and mount `HolidayCatalogController` at `/api/cal/holiday-catalog`
    - _Requirements: 9.1, 9.2, 9.3, 9.4, 9.5, 9.6, 9.7, 9.8, 9.9_

  - [x] 10.2 Write integration test for route mounting in `brightcal-api-lib/src/lib/__tests__/api-routing.integration.spec.ts`
    - Verify all `/api/cal/*` endpoints respond (not 404) after App starts
    - Verify `/api/cal/holiday-catalog` returns valid JSON array with >= 10 entries
    - _Requirements: 9.1, 9.2, 9.3, 9.4, 9.5, 9.6, 9.7, 9.8, 9.9, 10.2_

- [x] 11. Checkpoint — Ensure all tests pass
  - Ensure all tests pass, ask the user if questions arise.

- [ ] 12. Integrate CalendarSidebar into CalendarPage and wire Visibility Set
  - [x] 12.1 Update `CalendarPage` in `brightchain-react/src/app/components/CalendarPage.tsx`
    - Add `visibilitySet` state via `useState<Set<string>>`
    - Initialize from localStorage on mount (via `loadVisibilitySet`); default to all calendar IDs if null
    - Persist to localStorage on every change (via `saveVisibilitySet`)
    - Replace `MiniCalendar`-only sidebar with full `CalendarSidebar` component
    - Pass `calendars`, `visibilitySet`, `onVisibilityChange`, `apiBaseUrl`, `onCalendarsChanged: refetchCalendars` to CalendarSidebar
    - Update `calendarIds` derivation to use `visibilitySet` instead of all calendar IDs
    - Pass calendar collections and colors through to CalendarWidget for color-coded overlay
    - Handle empty Visibility Set: useEvents returns empty array without API call (already implemented in useEvents)
    - _Requirements: 13.1, 13.2, 13.3, 1.4, 1.5, 7.1, 7.3, 7.5, 8.1, 8.2, 8.3_

  - [x] 12.2 Write unit tests for CalendarPage integration in `brightchain-react/src/app/components/__tests__/CalendarPage.spec.tsx`
    - Test CalendarSidebar renders in sidebar slot
    - Test Visibility Set changes propagate to useEvents calendarIds
    - Test localStorage persistence of Visibility Set
    - _Requirements: 13.1, 13.2, 13.3_

- [x] 13. Final checkpoint — Ensure all tests pass
  - Ensure all tests pass, ask the user if questions arise.

## Notes

- Tasks marked with `*` are optional and can be skipped for faster MVP
- Each task references specific requirements for traceability
- Checkpoints ensure incremental validation
- Property tests validate universal correctness properties from the design document (Properties 1–7)
- Unit tests validate specific examples and edge cases
- All commands should be run via `yarn nx` per workspace conventions
- Shared interfaces go in `brightcal-lib`; backend-specific code in `brightcal-api-lib`; frontend components/hooks in `brightcal-react-components`; app integration in `brightchain-react`
