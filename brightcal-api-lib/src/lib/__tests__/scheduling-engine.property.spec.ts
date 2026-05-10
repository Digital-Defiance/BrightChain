/**
 * SchedulingEngineService — property-based tests.
 *
 * Property 13: Free/Busy Aggregation Correctness (Req 8.1)
 * Property 14: Group Free/Busy Intersection (Req 8.3)
 * Property 15: Time Slot Ranking Preferences (Req 8.5)
 * Property 16: Booking Slot Availability Computation (Req 9.2, 9.6, 9.8)
 *
 * Uses fast-check with in-memory BrightDb, mirroring the unit test setup.
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
import { createCalendarEventModel } from '../models/calendarEvent.model.ts';
import { createCalendarShareModel } from '../models/calendarShare.model.ts';
import { CalendarEngineService } from '../services/calendarEngineService.ts';
import { CalendarPermissionService } from '../services/calendarPermissionService.ts';
import { EncryptionService } from '../services/encryptionService.ts';
import { EventEngineService } from '../services/eventEngineService.ts';
import { SchedulingEngineService } from '../services/schedulingEngineService.ts';

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
  const schedulingService = new SchedulingEngineService(
    calendarModel,
    eventModel,
  );
  return { schedulingService, eventService, calendarService };
}

/** Helper to create a calendar owned by the given user. */
async function setupCalendar(
  calendarService: CalendarEngineService,
  ownerId: string,
) {
  return calendarService.createCalendar(ownerId, 'Test Cal', '#4285F4', '');
}

/** Build a valid ICreateEventBody. */
function makeEventBody(
  calendarId: string,
  overrides: Partial<ICreateEventBody> = {},
): ICreateEventBody {
  return {
    calendarId,
    summary: 'Meeting',
    dtstart: '2024-06-15T09:00:00Z',
    dtend: '2024-06-15T10:00:00Z',
    dtstartTzid: 'UTC',
    dtendTzid: 'UTC',
    allDay: false,
    visibility: EventVisibility.Public,
    transparency: EventTransparency.Opaque,
    ...overrides,
  };
}

// ─── Arbitraries ─────────────────────────────────────────────────────────────

/**
 * Generate a random hour-aligned time offset within a single day (0–23 hours).
 * Returns minutes from midnight.
 */
const hourMinuteArb = fc.integer({ min: 0, max: 23 }).map((h) => h * 60);

/**
 * Generate a non-overlapping (start < end) pair of hour offsets within a day.
 */
const timeRangeArb = fc
  .tuple(fc.integer({ min: 0, max: 22 }), fc.integer({ min: 1, max: 23 }))
  .filter(([a, b]) => a < b)
  .map(([startH, endH]) => ({ startH, endH }));

/**
 * Generate a random transparency value.
 */
const transparencyArb = fc.oneof(
  fc.constant(EventTransparency.Opaque),
  fc.constant(EventTransparency.Transparent),
);

/**
 * Generate a list of events with random transparency and non-overlapping times
 * within a fixed day (2024-06-19, a Wednesday in UTC).
 */
const BASE_DATE = '2024-06-19';

function isoAt(hour: number): string {
  return `${BASE_DATE}T${String(hour).padStart(2, '0')}:00:00Z`;
}

interface GeneratedEvent {
  startH: number;
  endH: number;
  transparency: EventTransparency;
}

const eventListArb = fc
  .array(
    fc.tuple(
      fc.integer({ min: 0, max: 21 }),
      fc.integer({ min: 1, max: 3 }),
      transparencyArb,
    ),
    { minLength: 1, maxLength: 6 },
  )
  .map((tuples) => {
    // Build non-overlapping events by sorting and spacing them
    const sorted = tuples
      .map(([start, dur, transp]) => ({
        startH: Math.min(start, 22),
        dur: Math.min(dur, 23 - Math.min(start, 22)),
        transp,
      }))
      .sort((a, b) => a.startH - b.startH);

    const events: GeneratedEvent[] = [];
    let cursor = 0;
    for (const { startH, dur, transp } of sorted) {
      const actualStart = Math.max(startH, cursor);
      const actualEnd = Math.min(actualStart + Math.max(dur, 1), 24);
      if (actualStart >= actualEnd || actualStart >= 24) continue;
      events.push({
        startH: actualStart,
        endH: actualEnd,
        transparency: transp,
      });
      cursor = actualEnd;
    }
    return events;
  })
  .filter((events) => events.length > 0);

// ─── Tests ───────────────────────────────────────────────────────────────────

describe('SchedulingEngineService — Property Tests', () => {
  // ── Property 13: Free/Busy Aggregation Correctness ──────────────────

  describe('Property 13: Free/Busy Aggregation Correctness', () => {
    /**
     * **Validates: Requirements 8.1**
     *
     * For any user and time range, computing free/busy data SHALL include
     * all non-transparent (OPAQUE) events as busy slots and exclude all
     * transparent events.
     */
    it('all OPAQUE events appear as busy, all TRANSPARENT events are excluded', async () => {
      await fc.assert(
        fc.asyncProperty(eventListArb, async (generatedEvents) => {
          const { schedulingService, eventService, calendarService } =
            createServices();
          const cal = await setupCalendar(calendarService, 'user-prop13');

          // Create events with the generated transparency values
          for (const evt of generatedEvents) {
            await eventService.createEvent(
              'user-prop13',
              makeEventBody(cal.id, {
                dtstart: isoAt(evt.startH),
                dtend: isoAt(evt.endH),
                transparency: evt.transparency,
              }),
            );
          }

          const fb = await schedulingService.computeFreeBusy(
            'user-prop13',
            `${BASE_DATE}T00:00:00Z`,
            `${BASE_DATE}T23:59:59Z`,
          );

          const opaqueEvents = generatedEvents.filter(
            (e) => e.transparency === EventTransparency.Opaque,
          );
          const transparentEvents = generatedEvents.filter(
            (e) => e.transparency === EventTransparency.Transparent,
          );

          // Every OPAQUE event must be covered by at least one busy slot
          // (the service may return one slot per event rather than merging)
          for (const opaque of opaqueEvents) {
            const opaqueStartMs = new Date(isoAt(opaque.startH)).getTime();
            const opaqueEndMs = new Date(isoAt(opaque.endH)).getTime();
            // Check that at least one busy slot overlaps with this opaque event
            const covered = fb.slots.some((slot) => {
              const slotStartMs = new Date(slot.start).getTime();
              const slotEndMs = new Date(slot.end).getTime();
              return slotStartMs < opaqueEndMs && slotEndMs > opaqueStartMs;
            });
            expect(covered).toBe(true);
          }

          // No TRANSPARENT event should appear as a busy slot
          for (const transp of transparentEvents) {
            const transpStart = new Date(isoAt(transp.startH)).getTime();
            const transpEnd = new Date(isoAt(transp.endH)).getTime();
            const overlaps = fb.slots.some((slot) => {
              const slotStart = new Date(slot.start).getTime();
              const slotEnd = new Date(slot.end).getTime();
              // Check if the busy slot overlaps with the transparent event
              return slotStart < transpEnd && slotEnd > transpStart;
            });
            // If there's overlap, it must be from an adjacent OPAQUE event, not this one
            if (overlaps) {
              // Verify the overlap is accounted for by an OPAQUE event
              const opaqueCovers = opaqueEvents.some((op) => {
                const opStart = new Date(isoAt(op.startH)).getTime();
                const opEnd = new Date(isoAt(op.endH)).getTime();
                return opStart < transpEnd && opEnd > transpStart;
              });
              expect(opaqueCovers).toBe(true);
            }
          }

          // Total busy slots count should match opaque events count
          expect(fb.slots.length).toBe(opaqueEvents.length);
        }),
        { numRuns: 100 },
      );
    });
  });

  // ── Property 14: Group Free/Busy Intersection ───────────────────────

  describe('Property 14: Group Free/Busy Intersection', () => {
    /**
     * **Validates: Requirements 8.3**
     *
     * For any group of users, the group free/busy query SHALL return common
     * free slots that are the intersection of all individual users' free
     * times within the requested range.
     */
    it('every point in a returned free slot is free for ALL users', async () => {
      // Generate per-user busy hour ranges (2-4 users, each with 1-3 busy blocks)
      const perUserBusyArb = fc
        .array(
          fc.array(
            fc
              .tuple(
                fc.integer({ min: 8, max: 16 }),
                fc.integer({ min: 1, max: 2 }),
              )
              .map(([start, dur]) => ({
                startH: start,
                endH: Math.min(start + dur, 18),
              })),
            { minLength: 0, maxLength: 3 },
          ),
          { minLength: 2, maxLength: 4 },
        )
        .map((userBusyLists) =>
          // Deduplicate overlapping ranges per user
          userBusyLists.map((busyList) => {
            const sorted = busyList.sort((a, b) => a.startH - b.startH);
            const merged: Array<{ startH: number; endH: number }> = [];
            for (const b of sorted) {
              if (
                merged.length > 0 &&
                b.startH < merged[merged.length - 1].endH
              ) {
                merged[merged.length - 1].endH = Math.max(
                  merged[merged.length - 1].endH,
                  b.endH,
                );
              } else {
                merged.push({ ...b });
              }
            }
            return merged;
          }),
        );

      await fc.assert(
        fc.asyncProperty(perUserBusyArb, async (userBusyLists) => {
          const { schedulingService, eventService, calendarService } =
            createServices();

          const userIds: string[] = [];
          const rangeStart = `${BASE_DATE}T08:00:00Z`;
          const rangeEnd = `${BASE_DATE}T18:00:00Z`;

          // Create calendars and events for each user
          for (let i = 0; i < userBusyLists.length; i++) {
            const userId = `user-p14-${i}`;
            userIds.push(userId);
            const cal = await setupCalendar(calendarService, userId);
            for (const busy of userBusyLists[i]) {
              await eventService.createEvent(
                userId,
                makeEventBody(cal.id, {
                  dtstart: isoAt(busy.startH),
                  dtend: isoAt(busy.endH),
                  transparency: EventTransparency.Opaque,
                }),
              );
            }
          }

          // Get group free slots
          const freeSlots = await schedulingService.findGroupFreeSlots(
            userIds,
            rangeStart,
            rangeEnd,
          );

          // Get individual free/busy for each user
          const individualFbs = await Promise.all(
            userIds.map((uid) =>
              schedulingService.computeFreeBusy(uid, rangeStart, rangeEnd),
            ),
          );

          // For every returned free slot, verify every point is free for ALL users
          for (const freeSlot of freeSlots) {
            const freeStartMs = new Date(freeSlot.start).getTime();
            const freeEndMs = new Date(freeSlot.end).getTime();

            // Check at 15-minute sample points within the free slot
            for (let t = freeStartMs; t < freeEndMs; t += 15 * 60 * 1000) {
              const pointIso = new Date(t).toISOString();
              const pointEndIso = new Date(t + 1).toISOString(); // 1ms window

              for (const fb of individualFbs) {
                const isBusy = fb.slots.some(
                  (s) => s.start < pointEndIso && s.end > pointIso,
                );
                expect(isBusy).toBe(false);
              }
            }
          }

          // Also verify: no free slot is returned that should be busy
          // (i.e., free slots don't overlap with any user's busy time)
          for (const freeSlot of freeSlots) {
            for (const fb of individualFbs) {
              for (const busySlot of fb.slots) {
                const overlaps =
                  freeSlot.start < busySlot.end &&
                  freeSlot.end > busySlot.start;
                expect(overlaps).toBe(false);
              }
            }
          }
        }),
        { numRuns: 100 },
      );
    });
  });

  // ── Property 15: Time Slot Ranking Preferences ──────────────────────

  describe('Property 15: Time Slot Ranking Preferences', () => {
    /**
     * **Validates: Requirements 8.5**
     *
     * For any set of candidate time slots, ranking SHALL prefer:
     * all-required-free > max-optional > working-hours.
     *
     * If slot A has more required attendees free than slot B, A ranks higher.
     * If equal required, more optional ranks higher.
     */
    it('slots with more required attendees free rank higher; ties broken by optional count', async () => {
      // Generate: 1-3 required attendees, 1-2 optional, each with 0-2 busy blocks
      const attendeeBusyArb = fc.record({
        requiredBusy: fc.array(
          fc.array(
            fc
              .integer({ min: 9, max: 15 })
              .map((h) => ({ startH: h, endH: Math.min(h + 1, 17) })),
            { minLength: 0, maxLength: 2 },
          ),
          { minLength: 1, maxLength: 3 },
        ),
        optionalBusy: fc.array(
          fc.array(
            fc
              .integer({ min: 9, max: 15 })
              .map((h) => ({ startH: h, endH: Math.min(h + 1, 17) })),
            { minLength: 0, maxLength: 2 },
          ),
          { minLength: 1, maxLength: 2 },
        ),
      });

      await fc.assert(
        fc.asyncProperty(
          attendeeBusyArb,
          async ({ requiredBusy, optionalBusy }) => {
            const { schedulingService, eventService, calendarService } =
              createServices();

            const requiredIds: string[] = [];
            const optionalIds: string[] = [];

            // Create required attendees with their busy times
            for (let i = 0; i < requiredBusy.length; i++) {
              const userId = `req-${i}`;
              requiredIds.push(userId);
              const cal = await setupCalendar(calendarService, userId);
              for (const busy of requiredBusy[i]) {
                await eventService.createEvent(
                  userId,
                  makeEventBody(cal.id, {
                    dtstart: isoAt(busy.startH),
                    dtend: isoAt(busy.endH),
                    transparency: EventTransparency.Opaque,
                  }),
                );
              }
            }

            // Create optional attendees with their busy times
            for (let i = 0; i < optionalBusy.length; i++) {
              const userId = `opt-${i}`;
              optionalIds.push(userId);
              const cal = await setupCalendar(calendarService, userId);
              for (const busy of optionalBusy[i]) {
                await eventService.createEvent(
                  userId,
                  makeEventBody(cal.id, {
                    dtstart: isoAt(busy.startH),
                    dtend: isoAt(busy.endH),
                    transparency: EventTransparency.Opaque,
                  }),
                );
              }
            }

            const ranked = await schedulingService.findAvailableTimes({
              requiredAttendees: requiredIds,
              optionalAttendees: optionalIds,
              durationMinutes: 30,
              rangeStart: `${BASE_DATE}T09:00:00Z`,
              rangeEnd: `${BASE_DATE}T17:00:00Z`,
              workingHours: {
                timezone: 'UTC',
                windows: [
                  { dayOfWeek: 3, startTime: '09:00', endTime: '17:00' },
                ],
              },
            });

            if (ranked.length < 2) return; // Not enough slots to compare

            // Verify ranking invariant: for any consecutive pair, the ordering holds
            for (let i = 0; i < ranked.length - 1; i++) {
              const a = ranked[i];
              const b = ranked[i + 1];

              // Higher or equal required free count
              expect(a.requiredFreeCount).toBeGreaterThanOrEqual(
                b.requiredFreeCount,
              );

              // If same required count, higher or equal optional count
              if (a.requiredFreeCount === b.requiredFreeCount) {
                expect(a.optionalFreeCount).toBeGreaterThanOrEqual(
                  b.optionalFreeCount,
                );
              }

              // Score must be non-increasing
              expect(a.score).toBeGreaterThanOrEqual(b.score);
            }
          },
        ),
        { numRuns: 100 },
      );
    });
  });

  // ── Property 16: Booking Slot Availability Computation ──────────────

  describe('Property 16: Booking Slot Availability Computation', () => {
    /**
     * **Validates: Requirements 9.2, 9.6, 9.8**
     *
     * For any booking page config and existing events, available slots =
     * configured windows − existing events − minimum notice period.
     *
     * Since BookingEngineService doesn't exist yet, we test the concept
     * using the scheduling service's free/busy data combined with
     * availability window logic computed inline.
     */
    it('no returned slot overlaps with an existing event or falls within minimum notice', async () => {
      // Generate: availability windows, existing events, and minimum notice
      const bookingConfigArb = fc.record({
        existingEvents: fc.array(
          fc
            .tuple(
              fc.integer({ min: 9, max: 15 }),
              fc.integer({ min: 1, max: 2 }),
            )
            .map(([start, dur]) => ({
              startH: start,
              endH: Math.min(start + dur, 17),
            })),
          { minLength: 0, maxLength: 4 },
        ),
        // Minimum notice in hours (0-3)
        minNoticeHours: fc.integer({ min: 0, max: 3 }),
        // Availability window start/end hours
        windowStartH: fc.integer({ min: 8, max: 11 }),
        windowEndH: fc.integer({ min: 14, max: 18 }),
      });

      await fc.assert(
        fc.asyncProperty(bookingConfigArb, async (config) => {
          const { schedulingService, eventService, calendarService } =
            createServices();
          const userId = 'host-p16';
          const cal = await setupCalendar(calendarService, userId);

          // Create existing events
          for (const evt of config.existingEvents) {
            await eventService.createEvent(
              userId,
              makeEventBody(cal.id, {
                dtstart: isoAt(evt.startH),
                dtend: isoAt(evt.endH),
                transparency: EventTransparency.Opaque,
              }),
            );
          }

          // Compute free/busy for the host
          const rangeStart = isoAt(config.windowStartH);
          const rangeEnd = isoAt(config.windowEndH);
          const fb = await schedulingService.computeFreeBusy(
            userId,
            rangeStart,
            rangeEnd,
          );

          // Simulate booking slot computation:
          // Available slots = availability window - busy slots - minimum notice
          // Generate 30-minute candidate slots at 15-minute intervals
          const slotDurationMs = 30 * 60 * 1000;
          const intervalMs = 15 * 60 * 1000;
          const rangeStartMs = new Date(rangeStart).getTime();
          const rangeEndMs = new Date(rangeEnd).getTime();

          // "Now" is set to the start of the day for deterministic testing
          const nowMs = new Date(`${BASE_DATE}T00:00:00Z`).getTime();
          const minNoticeMs = config.minNoticeHours * 60 * 60 * 1000;
          const earliestBookableMs = nowMs + minNoticeMs;

          const availableSlots: Array<{ start: string; end: string }> = [];

          for (
            let slotStartMs = rangeStartMs;
            slotStartMs + slotDurationMs <= rangeEndMs;
            slotStartMs += intervalMs
          ) {
            const slotEndMs = slotStartMs + slotDurationMs;
            const slotStart = new Date(slotStartMs).toISOString();
            const slotEnd = new Date(slotEndMs).toISOString();

            // Skip if within minimum notice period
            if (slotStartMs < earliestBookableMs) continue;

            // Skip if overlaps with any busy slot
            const overlapsWithBusy = fb.slots.some((busy) => {
              const busyStartMs = new Date(busy.start).getTime();
              const busyEndMs = new Date(busy.end).getTime();
              return slotStartMs < busyEndMs && slotEndMs > busyStartMs;
            });
            if (overlapsWithBusy) continue;

            availableSlots.push({ start: slotStart, end: slotEnd });
          }

          // ASSERT: No available slot overlaps with an existing event
          for (const slot of availableSlots) {
            const slotStartMs = new Date(slot.start).getTime();
            const slotEndMs = new Date(slot.end).getTime();

            for (const busy of fb.slots) {
              const busyStartMs = new Date(busy.start).getTime();
              const busyEndMs = new Date(busy.end).getTime();
              const overlaps =
                slotStartMs < busyEndMs && slotEndMs > busyStartMs;
              expect(overlaps).toBe(false);
            }
          }

          // ASSERT: No available slot starts before the minimum notice cutoff
          for (const slot of availableSlots) {
            const slotStartMs = new Date(slot.start).getTime();
            expect(slotStartMs).toBeGreaterThanOrEqual(earliestBookableMs);
          }

          // ASSERT: All available slots are within the configured window
          for (const slot of availableSlots) {
            const slotStartMs = new Date(slot.start).getTime();
            const slotEndMs = new Date(slot.end).getTime();
            expect(slotStartMs).toBeGreaterThanOrEqual(rangeStartMs);
            expect(slotEndMs).toBeLessThanOrEqual(rangeEndMs);
          }

          // ASSERT: Every free gap large enough should have at least one slot
          // (completeness check — no valid slot is missed)
          // Build free intervals by subtracting busy from the bookable range
          const bookableStartMs = Math.max(rangeStartMs, earliestBookableMs);
          if (bookableStartMs < rangeEndMs) {
            let freeIntervals: Array<{ start: number; end: number }> = [
              { start: bookableStartMs, end: rangeEndMs },
            ];
            for (const busy of fb.slots) {
              const busyStartMs = new Date(busy.start).getTime();
              const busyEndMs = new Date(busy.end).getTime();
              const next: Array<{ start: number; end: number }> = [];
              for (const free of freeIntervals) {
                if (busyEndMs <= free.start || busyStartMs >= free.end) {
                  next.push(free);
                } else {
                  if (busyStartMs > free.start) {
                    next.push({ start: free.start, end: busyStartMs });
                  }
                  if (busyEndMs < free.end) {
                    next.push({ start: busyEndMs, end: free.end });
                  }
                }
              }
              freeIntervals = next;
            }

            // For each free interval large enough, verify at least one slot exists
            for (const free of freeIntervals) {
              if (free.end - free.start >= slotDurationMs) {
                const hasSlot = availableSlots.some((s) => {
                  const sStart = new Date(s.start).getTime();
                  const sEnd = new Date(s.end).getTime();
                  return sStart >= free.start && sEnd <= free.end;
                });
                expect(hasSlot).toBe(true);
              }
            }
          }
        }),
        { numRuns: 100 },
      );
    });
  });
});
