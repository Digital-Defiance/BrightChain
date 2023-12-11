# Requirements Document

## Introduction

Multi-calendar management for BrightCal — an Outlook-competitive calendar experience that lets users own multiple calendars, toggle their visibility in a unified overlay view, share calendars with granular permissions, subscribe to other users' shared calendars, and browse/add built-in holiday calendars. The backend calendar CRUD, event CRUD, permission service, and ICS subscription merge logic already exist; this spec covers the remaining frontend UI components, frontend hooks, backend route wiring, and holiday catalog seed data needed to deliver the full feature.

## Glossary

- **Calendar_Sidebar**: The left-hand sidebar panel that displays a list of the user's calendar collections with colored checkboxes for toggling visibility, plus controls for creating, managing, and subscribing to calendars.
- **Calendar_Toggle**: A colored checkbox control in the Calendar_Sidebar that enables or disables the display of a specific calendar's events in the overlay view.
- **Calendar_Overlay**: The unified calendar view (month, week, day, or agenda) that renders events from all enabled calendars simultaneously, color-coded by their source calendar.
- **Calendar_Widget**: The existing container component (CalendarWidget) that manages view mode switching and renders the active view component.
- **Visibility_Set**: The set of calendar IDs whose Calendar_Toggles are currently checked (enabled), stored in client-side state and used to filter which events are fetched and displayed.
- **Sharing_Dialog**: A modal dialog that allows a calendar owner to share a calendar with another user or group, set the CalendarPermissionLevel, view existing shares, and revoke access.
- **Holiday_Catalog**: A browsable list of pre-configured holiday ICS feed URLs (e.g., US Holidays, Jewish Holidays) that users can subscribe to with one click.
- **Holiday_Feed_Entry**: A single record in the Holiday_Catalog containing a display name, description, region/category tag, and ICS feed URL.
- **Subscription_Calendar**: A read-only calendar collection created by subscribing to an external ICS feed URL, periodically refreshed via IcsSubscriptionService.
- **CalendarPermissionLevel**: The existing enum (Owner, Editor, Viewer, FreeBusyOnly) that governs what a shared-calendar recipient can see and do.
- **CalendarEngineService**: The existing backend service that handles calendar collection CRUD, default calendar creation, and ICS feed subscription.
- **CalendarPermissionService**: The existing backend service that handles share/revoke operations, public link generation, and permission queries.
- **IcsSubscriptionService**: The existing backend service that merges external ICS feed events with local events by UID.
- **createCalendarRouter**: The existing factory function that wires all BrightCal controllers, services, and middleware together.
- **App**: The main BrightChain API application entry point that mounts Express routers.

## Requirements

### Requirement 1: Calendar Sidebar with Visibility Toggles

**User Story:** As a user, I want an Outlook-style sidebar listing all my calendars with colored checkboxes, so that I can quickly toggle which calendars' events are visible in the main view.

#### Acceptance Criteria

1. WHEN the Calendar_Sidebar renders, THE Calendar_Sidebar SHALL display a list of all calendar collections returned by the useCalendars hook, grouped into "My Calendars" (owned) and "Other Calendars" (shared/subscribed) sections.
2. THE Calendar_Sidebar SHALL render a Calendar_Toggle (colored checkbox) next to each calendar entry, where the checkbox color matches the calendar's hex color property.
3. WHEN a user checks or unchecks a Calendar_Toggle, THE Calendar_Sidebar SHALL add or remove that calendar's ID from the Visibility_Set and emit the updated Visibility_Set to the parent component via a callback prop.
4. WHEN the Calendar_Sidebar first renders, THE Calendar_Sidebar SHALL initialize the Visibility_Set with all non-subscription calendars enabled and all Subscription_Calendars enabled.
5. THE Calendar_Sidebar SHALL persist the Visibility_Set to localStorage so that toggled states survive page reloads.
6. WHEN a calendar collection is added or removed, THE Calendar_Sidebar SHALL update the displayed list within the same render cycle without requiring a full page reload.

### Requirement 2: Calendar Management UI

**User Story:** As a user, I want to create, rename, recolor, and delete calendars from the sidebar, so that I can organize my schedule into meaningful groups.

#### Acceptance Criteria

1. WHEN the user clicks an "Add Calendar" button in the Calendar_Sidebar, THE Calendar_Sidebar SHALL display an inline form requesting a display name and color picker.
2. WHEN the user submits the add-calendar form with a valid display name and hex color, THE Calendar_Sidebar SHALL call the calendar creation API endpoint (POST /api/cal/calendars) and add the new calendar to the list upon success.
3. WHEN the user right-clicks or opens a context menu on a calendar entry, THE Calendar_Sidebar SHALL display options for "Rename", "Change Color", and "Delete".
4. WHEN the user selects "Rename" and submits a new name, THE Calendar_Sidebar SHALL call the calendar update API endpoint (PATCH /api/cal/calendars/:id) with the new displayName.
5. WHEN the user selects "Change Color" and picks a new color, THE Calendar_Sidebar SHALL call the calendar update API endpoint (PATCH /api/cal/calendars/:id) with the new color value.
6. WHEN the user selects "Delete" on a non-default calendar, THE Calendar_Sidebar SHALL display a confirmation dialog and, upon confirmation, call the calendar delete API endpoint (DELETE /api/cal/calendars/:id).
7. IF the user attempts to delete the default calendar, THEN THE Calendar_Sidebar SHALL display an error message indicating that the default calendar cannot be deleted.

### Requirement 3: Calendar Sharing Dialog

**User Story:** As a calendar owner, I want to share my calendar with other users and control their permission level, so that collaborators can view or edit my events as appropriate.

#### Acceptance Criteria

1. WHEN the user selects "Share" from a calendar's context menu, THE Sharing_Dialog SHALL open as a modal displaying the calendar's display name and current shares.
2. THE Sharing_Dialog SHALL display a list of existing shares showing the granted user's identifier and their CalendarPermissionLevel.
3. WHEN the user enters a recipient user ID and selects a CalendarPermissionLevel (Editor, Viewer, or FreeBusyOnly), THE Sharing_Dialog SHALL call the share calendar API to create the share record.
4. WHEN the user clicks "Revoke" next to an existing share, THE Sharing_Dialog SHALL call the revoke share API and remove the entry from the displayed list upon success.
5. IF the share API returns an error (e.g., user not found, duplicate share), THEN THE Sharing_Dialog SHALL display the error message inline without closing the dialog.
6. THE Sharing_Dialog SHALL provide a "Copy Public Link" button that calls the generate-public-link API and copies the resulting URL to the clipboard.
7. WHEN a public link exists, THE Sharing_Dialog SHALL display a "Revoke Public Link" button that calls the revoke-public-link API and removes the link from the display upon success.

### Requirement 4: Subscribe to Shared Calendars

**User Story:** As a user, I want to subscribe to calendars that other users have shared with me, so that their events appear in my calendar overlay.

#### Acceptance Criteria

1. WHEN the user clicks "Subscribe to Calendar" in the Calendar_Sidebar, THE Calendar_Sidebar SHALL display an input field for entering a calendar ID or public link URL.
2. WHEN the user submits a valid public link URL, THE Calendar_Sidebar SHALL call the subscribe-to-feed API (CalendarEngineService.subscribeToFeed) with the URL and a default refresh interval of 60 minutes.
3. WHEN the subscription is created successfully, THE Calendar_Sidebar SHALL add the new Subscription_Calendar to the "Other Calendars" section with its Calendar_Toggle enabled.
4. IF the subscription URL is unreachable or returns invalid ICS data, THEN THE Calendar_Sidebar SHALL display an error message describing the failure.
5. THE Calendar_Sidebar SHALL display a "Refresh" action on each Subscription_Calendar that triggers an immediate re-fetch of the ICS feed.

### Requirement 5: Holiday Calendar Catalog

**User Story:** As a user, I want to browse and subscribe to built-in holiday calendars (e.g., US Holidays, Jewish Holidays), so that holidays appear on my calendar without manual configuration.

#### Acceptance Criteria

1. WHEN the user clicks "Browse Holiday Calendars" in the Calendar_Sidebar, THE Holiday_Catalog SHALL open displaying a list of available Holiday_Feed_Entries grouped by region or category.
2. THE Holiday_Catalog SHALL contain a minimum of 10 pre-configured Holiday_Feed_Entries covering major world regions (US, UK, Canada, EU, Jewish, Islamic, Hindu, Chinese, Japanese, Australian holidays).
3. WHEN the user clicks "Add" on a Holiday_Feed_Entry, THE Holiday_Catalog SHALL call the subscribe-to-feed API with the entry's ICS feed URL and display name.
4. WHEN a holiday calendar is already subscribed, THE Holiday_Catalog SHALL display a "Subscribed" badge instead of the "Add" button for that entry.
5. THE Holiday_Catalog SHALL provide a search/filter input that filters the displayed Holiday_Feed_Entries by name or region tag.
6. THE App SHALL serve the Holiday_Catalog data from a backend endpoint (GET /api/cal/holiday-catalog) that returns the list of Holiday_Feed_Entries.

### Requirement 6: Wire CalendarWidget to Render Actual Views

**User Story:** As a user, I want the calendar widget to render the actual month, week, day, and agenda views based on my selected view mode, so that I can see my events in the layout I prefer.

#### Acceptance Criteria

1. WHEN the current view mode is "month", THE Calendar_Widget SHALL render the MonthView component with the current date, filtered events, and calendar color map.
2. WHEN the current view mode is "week", THE Calendar_Widget SHALL render the WeekView component with the current date, filtered events, and calendar color map.
3. WHEN the current view mode is "day", THE Calendar_Widget SHALL render the DayView component with the current date, filtered events, and calendar color map.
4. WHEN the current view mode is "agenda", THE Calendar_Widget SHALL render the AgendaView component with the current date, filtered events, and calendar color map.
5. WHEN the user switches view modes via the toolbar, THE Calendar_Widget SHALL unmount the previous view and mount the new view without losing the current date context.

### Requirement 7: Multi-Calendar Event Overlay with Color Coding

**User Story:** As a user, I want to see events from all enabled calendars overlaid on a single view with per-calendar color coding, so that I can distinguish which calendar each event belongs to.

#### Acceptance Criteria

1. THE Calendar_Overlay SHALL display events from all calendars in the Visibility_Set simultaneously on the active view (month, week, day, or agenda).
2. THE Calendar_Overlay SHALL color each event's visual indicator (background, border, or dot) using the hex color of the calendar collection the event belongs to.
3. WHEN the Visibility_Set changes (a calendar is toggled on or off), THE Calendar_Overlay SHALL update the displayed events within 100ms without a full page reload.
4. WHEN two or more events from different calendars overlap in time, THE Calendar_Overlay SHALL render the events side-by-side (in week/day view) or stacked (in month/agenda view) so that all overlapping events remain visible.
5. THE Calendar_Overlay SHALL pass only events whose calendarId is in the Visibility_Set to the active view component.

### Requirement 8: Event Filtering by Visibility Set

**User Story:** As a user, I want the event fetch to respect my calendar visibility toggles, so that only events from enabled calendars are loaded and displayed.

#### Acceptance Criteria

1. WHEN the Visibility_Set changes, THE useEvents hook SHALL re-fetch events using only the calendar IDs present in the Visibility_Set.
2. WHEN the Visibility_Set is empty, THE useEvents hook SHALL return an empty array without making an API call.
3. THE useEvents hook SHALL accept the Visibility_Set as its calendarIds parameter so that the API request includes only enabled calendar IDs.

### Requirement 9: Mount Calendar Routes in App

**User Story:** As a developer, I want the calendar API routes to be mounted in the main application, so that the frontend can call the calendar and event endpoints.

#### Acceptance Criteria

1. WHEN the App starts, THE App SHALL call createCalendarRouter to obtain the wired controllers, middleware, and services.
2. THE App SHALL mount the calendar controller's router at /api/cal/calendars.
3. THE App SHALL mount the event controller's router at /api/cal/events.
4. THE App SHALL mount the scheduling controller's router at /api/cal/scheduling.
5. THE App SHALL mount the booking controller's router at /api/cal/booking.
6. THE App SHALL mount the invitation controller's router at /api/cal/invitations.
7. THE App SHALL mount the search controller's router at /api/cal/search.
8. THE App SHALL mount the export/import controller's router at /api/cal/export.
9. THE App SHALL mount the CalDAV middleware at /caldav.

### Requirement 10: Holiday Catalog Seed Data

**User Story:** As a developer, I want a curated catalog of holiday ICS feed URLs stored in the backend, so that the Holiday_Catalog UI can display available holiday calendars.

#### Acceptance Criteria

1. THE App SHALL include a holiday catalog data file containing a minimum of 10 Holiday_Feed_Entries with fields: id, displayName, description, region, category, and icsUrl.
2. WHEN the GET /api/cal/holiday-catalog endpoint is called, THE App SHALL return the full list of Holiday_Feed_Entries as a JSON array.
3. THE Holiday_Feed_Entries SHALL include ICS feed URLs from well-known public sources (e.g., Google Calendar public holiday feeds, iCalShare, or equivalent open feeds).
4. THE holiday catalog data file SHALL be a static JSON or TypeScript constant that can be updated without code changes to the service logic.

### Requirement 11: Calendar Sharing Hook

**User Story:** As a frontend developer, I want a useCalendarSharing hook that encapsulates all sharing API calls, so that sharing UI components have a clean data interface.

#### Acceptance Criteria

1. THE useCalendarSharing hook SHALL expose a shareCalendar function that calls POST to the share endpoint with calendarId, grantedToUserId, and permission level.
2. THE useCalendarSharing hook SHALL expose a revokeShare function that calls DELETE to the revoke endpoint with calendarId and shareId.
3. THE useCalendarSharing hook SHALL expose a getShares function that fetches the list of existing shares for a given calendarId.
4. THE useCalendarSharing hook SHALL expose a generatePublicLink function that calls the public link generation endpoint and returns the link URL.
5. THE useCalendarSharing hook SHALL expose a revokePublicLink function that calls the public link revocation endpoint.
6. THE useCalendarSharing hook SHALL expose loading and error states for each operation.

### Requirement 12: Calendar Subscription Management Hook

**User Story:** As a frontend developer, I want a useCalendarSubscription hook that manages ICS feed subscriptions, so that subscription UI flows have a clean data interface.

#### Acceptance Criteria

1. THE useCalendarSubscription hook SHALL expose a subscribe function that calls the subscribe-to-feed API with a URL, display name, and refresh interval.
2. THE useCalendarSubscription hook SHALL expose a refreshSubscription function that triggers an immediate refresh of a Subscription_Calendar's ICS feed.
3. THE useCalendarSubscription hook SHALL expose an unsubscribe function that calls the calendar delete API to remove a Subscription_Calendar.
4. THE useCalendarSubscription hook SHALL expose loading and error states for each operation.

### Requirement 13: Integrate Calendar Sidebar into BrightMail CalendarPage

**User Story:** As a user of BrightMail, I want the calendar sidebar with visibility toggles to appear in the BrightMail calendar page, so that I can manage multiple calendars from within my mail client.

#### Acceptance Criteria

1. WHEN the CalendarPage renders, THE CalendarPage SHALL render the updated Calendar_Sidebar (with Calendar_Toggles) in the sidebar slot of the ResponsiveCalendarLayout.
2. WHEN the Visibility_Set changes in the Calendar_Sidebar, THE CalendarPage SHALL pass the updated Visibility_Set to the useEvents hook so that only enabled calendars' events are fetched.
3. THE CalendarPage SHALL pass the calendar collections and their colors to the Calendar_Widget so that the Calendar_Overlay can color-code events.
