/**
 * Search & Filter — property-based tests.
 *
 * Property 21: Search Filter Correctness (Req 15.2, 15.3)
 * Property 22: Full-Text Search Completeness (Req 15.1)
 *
 * Uses fast-check with in-memory BrightDb, mirroring the existing test setup.
 */

import { EventTransparency, EventVisibility } from '@brightchain/brightcal-lib';
import {
  initializeBrightChain,
  MemoryBlockStore,
  ServiceLocator,
  ServiceProvider,
  validBlockSizes,
} from '@brightchain/brightchain-lib';
import { BrightDb, InMemoryHeadRegistry } from '@brightchain/db';
import fc from 'fast-check';
import type { ICreateEventBody } from '../controllers/eventController.ts';
import { createCalendarCollectionModel } from '../models/calendarCollection.model.ts';
import type { ITypedCalendarEvent } from '../models/calendarEvent.model.ts';
import { createCalendarEventModel } from '../models/calendarEvent.model.ts';
import { createCalendarShareModel } from '../models/calendarShare.model.ts';
import { CalendarEngineService } from '../services/calendarEngineService.ts';
import { CalendarPermissionService } from '../services/calendarPermissionService.ts';
import { EncryptionService } from '../services/encryptionService.ts';
import { EventEngineService } from '../services/eventEngineService.ts';
import type { IFilterCriteria } from '../services/searchService.ts';
import { SearchService } from '../services/searchService.ts';

// ─── Setup ───────────────────────────────────────────────────────────────────

beforeAll(() => {
  initializeBrightChain();
  ServiceLocator.setServiceProvider(ServiceProvider.getInstance());
});

function makeDb(name = 'testdb'): BrightDb {
  const store = new MemoryBlockStore(validBlockSizes);
  const registry = InMemoryHeadRegistry.createIsolated();
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return new BrightDb(store as any, { name, headRegistry: registry });
}

function createServices() {
  const db = makeDb();
  const calendarModel = createCalendarCollectionModel(db);
  const shareModel = createCalendarShareModel(db);
  const eventModel = createCalendarEventModel(db);
  const encryption = new EncryptionService();
  const calendarService = new CalendarEngineService(
    calendarModel,
    shareModel,
    encryption,
  );
  const permissionService = new CalendarPermissionService(
    calendarModel,
    shareModel,
  );
  const eventService = new EventEngineService(
    eventModel,
    calendarModel,
    permissionService,
    encryption,
  );
  const searchService = new SearchService(eventModel, permissionService, calendarModel, encryption);
  return {
    eventService,
    calendarService,
    permissionService,
    searchService,
    eventModel,
  };
}

async function setupCalendar(
  calendarService: CalendarEngineService,
  ownerId: string,
  name = 'Test Cal',
) {
  return calendarService.createCalendar(ownerId, name, '#4285F4', '');
}

function makeEventBody(
  calendarId: string,
  overrides: Partial<ICreateEventBody> = {},
): ICreateEventBody {
  return {
    calendarId,
    summary: 'Default Event',
    dtstart: '2024-06-15T09:00:00Z',
    dtend: '2024-06-15T10:00:00Z',
    dtstartTzid: 'America/New_York',
    dtendTzid: 'America/New_York',
    allDay: false,
    visibility: EventVisibility.Public,
    transparency: EventTransparency.Opaque,
    ...overrides,
  };
}

// ─── Arbitraries ─────────────────────────────────────────────────────────────

/** Generate a safe alphanumeric string for event text fields. */
const SAFE_CHARS =
  'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789 ';
const safeCharArb = fc
  .integer({ min: 0, max: SAFE_CHARS.length - 1 })
  .map((i) => SAFE_CHARS[i]);
const safeTextArb = fc
  .array(safeCharArb, { minLength: 2, maxLength: 30 })
  .map((chars) => chars.join('').trim() || 'text');

/** Generate a random event status. */
const statusArb = fc.oneof(
  fc.constant('CONFIRMED' as const),
  fc.constant('TENTATIVE' as const),
  fc.constant('CANCELLED' as const),
);

/** Generate a random date within a 30-day window. */
const dateInRangeArb = fc.integer({ min: 0, max: 29 }).chain((dayOffset) =>
  fc.integer({ min: 0, max: 23 }).map((hour) => {
    const d = new Date(2024, 5, 1 + dayOffset, hour, 0, 0);
    return d.toISOString();
  }),
);

/** Generate a random event configuration for property tests. */
const eventConfigArb = fc.record({
  summary: safeTextArb,
  description: safeTextArb,
  location: safeTextArb,
  status: statusArb,
  isRecurring: fc.boolean(),
  dayOffset: fc.integer({ min: 0, max: 29 }),
  hour: fc.integer({ min: 0, max: 22 }),
  attendeeId: fc.oneof(
    fc.constant('att-1'),
    fc.constant('att-2'),
    fc.constant('att-3'),
  ),
});

// ─── Tests ───────────────────────────────────────────────────────────────────

describe('Search & Filter — Property Tests', () => {
  // ── Property 21: Search Filter Correctness ──────────────────────────

  describe('Property 21: Search Filter Correctness', () => {
    /**
     * **Validates: Requirements 15.2, 15.3**
     *
     * For any filter criteria (date range, calendar, attendee, status,
     * recurrence type), applying the filter SHALL return all and only
     * events matching all specified criteria.
     */
    it('filter returns all and only events matching all specified criteria', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.array(eventConfigArb, { minLength: 2, maxLength: 8 }),
          fc.record({
            filterByStatus: fc.option(statusArb, { nil: undefined }),
            filterByRecurring: fc.option(fc.boolean(), { nil: undefined }),
            filterByAttendee: fc.option(
              fc.oneof(
                fc.constant('att-1'),
                fc.constant('att-2'),
                fc.constant('att-3'),
              ),
              { nil: undefined },
            ),
            filterByDateRange: fc.option(
              fc.record({
                startDay: fc.integer({ min: 0, max: 14 }),
                endDay: fc.integer({ min: 15, max: 29 }),
              }),
              { nil: undefined },
            ),
          }),
          async (eventConfigs, filterConfig) => {
            const { eventService, calendarService, searchService } =
              createServices();
            const userId = 'owner';
            const cal = await setupCalendar(calendarService, userId);

            // Create events
            const createdEvents: ITypedCalendarEvent[] = [];
            for (const config of eventConfigs) {
              const dtstart = new Date(
                2024,
                5,
                1 + config.dayOffset,
                config.hour,
                0,
                0,
              ).toISOString();
              const dtend = new Date(
                2024,
                5,
                1 + config.dayOffset,
                config.hour + 1,
                0,
                0,
              ).toISOString();

              const event = await eventService.createEvent(
                userId,
                makeEventBody(cal.id, {
                  summary: config.summary,
                  description: config.description,
                  location: config.location,
                  dtstart,
                  dtend,
                  attendees: [
                    {
                      email: `${config.attendeeId}@test.com`,
                      userId: config.attendeeId,
                      partstat: 'NEEDS-ACTION' as any,
                      role: 'REQ-PARTICIPANT',
                      rsvp: true,
                    },
                  ],
                  rrule: config.isRecurring
                    ? { freq: 'DAILY' as any, count: 3 }
                    : undefined,
                }),
              );
              createdEvents.push(event);
            }

            // Build filter criteria
            const criteria: IFilterCriteria = {
              calendarId: cal.id,
            };

            if (filterConfig.filterByStatus !== undefined) {
              criteria.status = filterConfig.filterByStatus;
            }
            if (filterConfig.filterByRecurring !== undefined) {
              criteria.recurring = filterConfig.filterByRecurring;
            }
            if (filterConfig.filterByAttendee !== undefined) {
              criteria.attendee = filterConfig.filterByAttendee;
            }
            if (filterConfig.filterByDateRange !== undefined) {
              criteria.start = new Date(
                2024,
                5,
                1 + filterConfig.filterByDateRange.startDay,
              ).toISOString();
              criteria.end = new Date(
                2024,
                5,
                1 + filterConfig.filterByDateRange.endDay,
                23,
                59,
                59,
              ).toISOString();
            }

            // Execute filter
            const results = await searchService.filter(userId, criteria);

            // Compute expected matches manually
            const expected = createdEvents.filter((event) => {
              // Calendar filter (always matches since we use cal.id)
              if (event.calendarId !== cal.id) return false;

              // Status filter
              if (criteria.status) {
                if (event.status !== criteria.status.toUpperCase())
                  return false;
              }

              // Recurring filter
              if (criteria.recurring !== undefined) {
                if (event.isRecurring !== criteria.recurring) return false;
              }

              // Attendee filter
              if (criteria.attendee) {
                if (!event.attendeeIds.includes(criteria.attendee))
                  return false;
              }

              // Date range filter
              if (criteria.start) {
                const startDate = new Date(criteria.start);
                if (event.dtend < startDate) return false;
              }
              if (criteria.end) {
                const endDate = new Date(criteria.end);
                if (event.dtstart > endDate) return false;
              }

              return true;
            });

            // ASSERT: every returned event matches ALL criteria
            const resultIds = new Set(results.map((r) => r.id));
            const expectedIds = new Set(expected.map((e) => e.id));

            // All results should be in expected
            for (const r of results) {
              expect(expectedIds.has(r.id)).toBe(true);
            }

            // No matching event should be missing
            for (const e of expected) {
              expect(resultIds.has(e.id)).toBe(true);
            }

            // Same count
            expect(results.length).toBe(expected.length);
          },
        ),
        { numRuns: 100 },
      );
    });
  });

  // ── Property 22: Full-Text Search Completeness ──────────────────────

  describe('Property 22: Full-Text Search Completeness', () => {
    /**
     * **Validates: Requirements 15.1**
     *
     * For any search query substring that appears in an event's title,
     * description, location, or attendee name, that event SHALL appear
     * in the search results.
     */
    it('event appears in results when searching for a substring of its searchable fields', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.array(
            fc.record({
              summary: safeTextArb,
              description: safeTextArb,
              location: safeTextArb,
            }),
            { minLength: 1, maxLength: 5 },
          ),
          fc.integer({ min: 0, max: 100 }),
          async (eventTexts, targetSeed) => {
            const { eventService, calendarService, searchService } =
              createServices();
            const userId = 'owner';
            const cal = await setupCalendar(calendarService, userId);

            // Create events
            const createdEvents: ITypedCalendarEvent[] = [];
            for (let i = 0; i < eventTexts.length; i++) {
              const config = eventTexts[i];
              const event = await eventService.createEvent(
                userId,
                makeEventBody(cal.id, {
                  summary: config.summary,
                  description: config.description,
                  location: config.location,
                  dtstart: new Date(2024, 5, 1 + i, 9, 0, 0).toISOString(),
                  dtend: new Date(2024, 5, 1 + i, 10, 0, 0).toISOString(),
                }),
              );
              createdEvents.push(event);
            }

            // Pick a target event and extract a substring from one of its fields
            const targetIndex = targetSeed % createdEvents.length;
            const targetEvent = createdEvents[targetIndex];
            const targetConfig = eventTexts[targetIndex];

            // Pick a field to extract substring from
            const fields = [
              targetConfig.summary,
              targetConfig.description,
              targetConfig.location,
            ].filter((f) => f && f.trim().length > 0);

            if (fields.length === 0) return; // skip degenerate case

            const fieldIndex = targetSeed % fields.length;
            const field = fields[fieldIndex];

            // Extract a non-empty substring (at least 1 char)
            if (field.length === 0) return;
            const subStart = targetSeed % field.length;
            const subLen = Math.max(
              1,
              (targetSeed * 7) % (field.length - subStart),
            );
            const substring = field
              .substring(subStart, subStart + subLen)
              .trim();

            if (!substring || substring.length === 0) return;

            // Search for the substring
            const results = await searchService.search(userId, substring);

            // ASSERT: the target event appears in results
            const resultIds = results.map((r) => r.id);
            expect(resultIds).toContain(targetEvent.id);
          },
        ),
        { numRuns: 100 },
      );
    });
  });
});
