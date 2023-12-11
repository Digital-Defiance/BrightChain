---
title: "BrightCal API Reference"
parent: "API Reference"
nav_order: 17
permalink: /api-reference/brightcal-api/
---
# BrightCal API Reference

## Overview

The BrightCal API provides endpoints for managing calendar collections, events, bookings, invitations, scheduling, and calendar export/import. Most endpoints require authentication, while public booking page and holiday catalog endpoints are available without authentication.

## Endpoints Overview

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| POST | `/api/cal/calendars` | Yes | Create a new calendar collection |
| GET | `/api/cal/calendars` | Yes | List calendars owned by or shared with the authenticated user |
| GET | `/api/cal/calendars/:id` | Yes | Get a calendar by ID |
| PATCH | `/api/cal/calendars/:id` | Yes | Update a calendar |
| DELETE | `/api/cal/calendars/:id` | Yes | Delete a calendar |
| POST | `/api/cal/events` | Yes | Create a new calendar event |
| GET | `/api/cal/events` | Yes | List events for a calendar |
| GET | `/api/cal/events/:id` | Yes | Get an event by ID |
| PATCH | `/api/cal/events/:id` | Yes | Update an event |
| DELETE | `/api/cal/events/:id` | Yes | Delete an event |
| POST | `/api/cal/booking/pages` | Yes | Create a booking page |
| GET | `/api/cal/booking/pages/:slug` | No | Retrieve a public booking page |
| GET | `/api/cal/booking/pages/:slug/slots` | No | Get available booking slots for a page |
| POST | `/api/cal/booking/pages/:slug/book` | No | Book an appointment on a booking page |
| POST | `/api/cal/scheduling/free-busy` | Yes | Query free/busy availability |
| POST | `/api/cal/scheduling/find-available-times` | Yes | Find available meeting times |
| POST | `/api/cal/invitations/rsvp` | Yes | RSVP to an event invitation |
| POST | `/api/cal/invitations/counter` | Yes | Propose a counter time for an event |
| POST | `/api/cal/invitations/decline-counter` | Yes | Decline a counter proposal |
| GET | `/api/cal/export/:calendarId/ics` | Yes | Export a calendar as an ICS file |
| GET | `/api/cal/export/:calendarId/json` | Yes | Export a calendar as JSON |
| POST | `/api/cal/export/:calendarId/import` | Yes | Import ICS events into a calendar |
| GET | `/api/cal/search` | Yes | Search calendar events |
| GET | `/api/cal/search/filter` | Yes | Filter events using structured criteria |
| GET | `/api/cal/holiday-catalog` | No | Retrieve the public holiday catalog |

---

## Calendar Collection Endpoints

### POST `/api/cal/calendars`

Create a new calendar collection.

**Request Body:**

- `displayName` (string, required): Display name for the calendar
- `color` (string, required): Hex color code (e.g., "#FF5733")
- `description` (string, optional): Calendar description

**Response:**

- `calendar`: The created calendar object

**Errors:**

- 400: Validation error
- 401: Unauthorized

---

### GET `/api/cal/calendars`

List all calendars the authenticated user owns or has been shared with.

**Response:**

- `calendars`: Array of calendars with permission level for each

**Errors:**

- 401: Unauthorized

---

### GET `/api/cal/calendars/:id`

Get a specific calendar by ID.

**Response:**

- `calendar`: Calendar object
- `permission`: User's permission level

**Errors:**

- 401: Unauthorized
- 404: Calendar not found

---

### PATCH `/api/cal/calendars/:id`

Update a calendar (rename, recolor, update description). Only the calendar owner can update.

**Request Body:**

- `displayName` (string, optional): New display name
- `color` (string, optional): New hex color code
- `description` (string, optional): New description

**Response:**

- `calendar`: The updated calendar object

**Errors:**

- 400: Validation error
- 401: Unauthorized
- 403: Forbidden — not the owner
- 404: Calendar not found

---

### DELETE `/api/cal/calendars/:id`

Delete a calendar and all its events. Only the calendar owner can delete.

**Response:**

- `success`: Confirmation of deletion

**Errors:**

- 401: Unauthorized
- 403: Forbidden — not the owner
- 404: Calendar not found
