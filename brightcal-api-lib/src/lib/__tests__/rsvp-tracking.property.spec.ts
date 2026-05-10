/**
 * RSVP Tracking — property-based tests.
 *
 * Property 17: RSVP Tracking Correctness (Req 10.2, 10.6)
 * Property 18: SEQUENCE Monotonic Increment (Req 4.9, 10.5)
 * Property 19: Unique UID Assignment (Req 4.8)
 *
 * Uses fast-check with in-memory BrightDb, mirroring the unit test setup.
 */

import {
  EventTransparency,
  EventVisibility,
  ITipMethod,
  ParticipationStatus,
} from '@brightchain/brightcal-lib';
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
import { CalendarNotificationService } from '../services/calendarNotificationService.ts';
import { CalendarPermissionService } from '../services/calendarPermissionService.ts';
import { EncryptionService } from '../services/encryptionService.ts';
import { EventEngineService } from '../services/eventEngineService.ts';

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
  const notificationService = new CalendarNotificationService(
    eventModel,
    undefined,
    calendarModel,
    encryption,
  );
  return {
    eventService,
    calendarService,
    notificationService,
    eventModel,
  };
}

async function setupCalendar(
  calendarService: CalendarEngineService,
  ownerId: string,
) {
  return calendarService.createCalendar(ownerId, 'Test Cal', '#4285F4', '');
}

function makeEventBody(
  calendarId: string,
  overrides: Partial<ICreateEventBody> = {},
): ICreateEventBody {
  return {
    calendarId,
    summary: 'Team Standup',
    dtstart: '2024-06-15T09:00:00Z',
    dtend: '2024-06-15T09:30:00Z',
    dtstartTzid: 'America/New_York',
    dtendTzid: 'America/New_York',
    allDay: false,
    visibility: EventVisibility.Public,
    transparency: EventTransparency.Opaque,
    ...overrides,
  };
}

// ─── Arbitraries ─────────────────────────────────────────────────────────────

/** Generate a random RSVP response (excluding NeedsAction — that's the default). */
const rsvpResponseArb = fc.oneof(
  fc.constant(ParticipationStatus.Accepted),
  fc.constant(ParticipationStatus.Declined),
  fc.constant(ParticipationStatus.Tentative),
);

/**
 * Generate a random set of attendee RSVP actions.
 * Returns: { attendeeCount: 2-6, rsvps: array of { attendeeIndex, response } }
 * A random subset of attendees will RSVP.
 */
const rsvpScenarioArb = fc.integer({ min: 2, max: 6 }).chain((attendeeCount) =>
  fc
    .array(
      fc.record({
        attendeeIndex: fc.integer({ min: 0, max: attendeeCount - 1 }),
        response: rsvpResponseArb,
      }),
      { minLength: 0, maxLength: attendeeCount },
    )
    .map((rsvps) => ({ attendeeCount, rsvps })),
);

/** Generate a random number of modifications (1-10). */
const modificationCountArb = fc.integer({ min: 1, max: 10 });

/** Generate a random number of events to create (2-20). */
const eventCountArb = fc.integer({ min: 2, max: 20 });

// ─── Tests ───────────────────────────────────────────────────────────────────

describe('RSVP Tracking — Property Tests', () => {
  // ── Property 17: RSVP Tracking Correctness ──────────────────────────

  describe('Property 17: RSVP Tracking Correctness', () => {
    /**
     * **Validates: Requirements 10.2, 10.6**
     *
     * For any set of attendee RSVP responses, processing each response
     * SHALL correctly update the attendee's PARTSTAT, and the summary
     * counts SHALL always equal the total number of attendees.
     */
    it('summary counts always equal total attendees after any RSVP sequence', async () => {
      await fc.assert(
        fc.asyncProperty(rsvpScenarioArb, async ({ attendeeCount, rsvps }) => {
          const { eventService, calendarService, notificationService } =
            createServices();
          const cal = await setupCalendar(calendarService, 'organizer');

          // Build attendee list
          const attendees = Array.from({ length: attendeeCount }, (_, i) => ({
            email: `attendee${i}@test.com`,
            userId: `att-${i}`,
            partstat: ParticipationStatus.NeedsAction,
            role: 'REQ-PARTICIPANT' as const,
            rsvp: true,
          }));

          const event = await eventService.createEvent(
            'organizer',
            makeEventBody(cal.id, { attendees }),
          );

          // Track the last RSVP response per attendee (last write wins)
          const lastResponse = new Map<string, ParticipationStatus>();

          // Process each RSVP
          for (const { attendeeIndex, response } of rsvps) {
            const userId = `att-${attendeeIndex}`;
            await notificationService.rsvp(userId, event.id, response);
            lastResponse.set(userId, response);
          }

          // Get the summary
          const summary = await notificationService.getAttendeeSummary(
            event.id,
          );

          // ASSERT: summary counts always equal total attendees
          expect(
            summary.accepted +
              summary.declined +
              summary.tentative +
              summary.noResponse,
          ).toBe(summary.total);
          expect(summary.total).toBe(attendeeCount);

          // ASSERT: counts match the expected state
          let expectedAccepted = 0;
          let expectedDeclined = 0;
          let expectedTentative = 0;
          let expectedNoResponse = 0;

          for (let i = 0; i < attendeeCount; i++) {
            const userId = `att-${i}`;
            const status = lastResponse.get(userId);
            if (status === ParticipationStatus.Accepted) expectedAccepted++;
            else if (status === ParticipationStatus.Declined)
              expectedDeclined++;
            else if (status === ParticipationStatus.Tentative)
              expectedTentative++;
            else expectedNoResponse++;
          }

          expect(summary.accepted).toBe(expectedAccepted);
          expect(summary.declined).toBe(expectedDeclined);
          expect(summary.tentative).toBe(expectedTentative);
          expect(summary.noResponse).toBe(expectedNoResponse);
        }),
        { numRuns: 100 },
      );
    });
  });

  // ── Property 18: SEQUENCE Monotonic Increment ───────────────────────

  describe('Property 18: SEQUENCE Monotonic Increment', () => {
    /**
     * **Validates: Requirements 4.9, 10.5**
     *
     * For any event modified N times, the SEQUENCE number SHALL increment
     * by exactly 1 per modification, and the outgoing iTIP REQUEST SHALL
     * carry the new SEQUENCE value.
     */
    it('SEQUENCE increments by exactly 1 per modification and iTIP carries new value', async () => {
      await fc.assert(
        fc.asyncProperty(modificationCountArb, async (modificationCount) => {
          const { eventService, calendarService, notificationService } =
            createServices();
          const cal = await setupCalendar(calendarService, 'organizer');

          const event = await eventService.createEvent(
            'organizer',
            makeEventBody(cal.id, {
              attendees: [
                {
                  email: 'a@test.com',
                  userId: 'att-1',
                  partstat: ParticipationStatus.NeedsAction,
                  role: 'REQ-PARTICIPANT',
                  rsvp: true,
                },
              ],
            }),
          );

          // Initial sequence should be 0
          expect(event.sequence).toBe(0);

          let currentEventId = event.id;

          for (let i = 1; i <= modificationCount; i++) {
            // Modify the event
            const updated = await eventService.updateEvent(
              currentEventId,
              'organizer',
              { summary: `Updated ${i}` },
              'all',
            );

            expect(updated).not.toBeNull();

            // ASSERT: SEQUENCE incremented by exactly 1
            expect(updated!.sequence).toBe(i);

            // Generate iTIP REQUEST and verify it carries the new SEQUENCE
            notificationService.clearMessageQueue();
            const msg = notificationService.generateRequest(updated!);

            expect(msg.sequence).toBe(i);
            expect(msg.icalData).toContain(`SEQUENCE:${i}`);
            expect(msg.method).toBe(ITipMethod.Request);
          }

          // Final SEQUENCE should equal the number of modifications
          const finalEvent = await eventService.getEventById(
            currentEventId,
            'organizer',
          );
          expect(finalEvent).not.toBeNull();
          expect(finalEvent!.sequence).toBe(modificationCount);
        }),
        { numRuns: 100 },
      );
    });
  });

  // ── Property 19: Unique UID Assignment ──────────────────────────────

  describe('Property 19: Unique UID Assignment', () => {
    /**
     * **Validates: Requirements 4.8**
     *
     * For any set of events created, all assigned UIDs SHALL be unique
     * and conform to RFC 4122 UUID format.
     */
    it('all UIDs are unique and match UUID format', async () => {
      const UUID_REGEX =
        /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

      await fc.assert(
        fc.asyncProperty(eventCountArb, async (eventCount) => {
          const { eventService, calendarService } = createServices();
          const cal = await setupCalendar(calendarService, 'organizer');

          const uids: string[] = [];

          for (let i = 0; i < eventCount; i++) {
            const event = await eventService.createEvent(
              'organizer',
              makeEventBody(cal.id, {
                summary: `Event ${i}`,
                dtstart: `2024-06-${String(15 + (i % 10)).padStart(2, '0')}T09:00:00Z`,
                dtend: `2024-06-${String(15 + (i % 10)).padStart(2, '0')}T10:00:00Z`,
              }),
            );
            uids.push(event.uid);
          }

          // ASSERT: all UIDs are unique
          const uniqueUids = new Set(uids);
          expect(uniqueUids.size).toBe(eventCount);

          // ASSERT: all UIDs conform to RFC 4122 UUID format
          for (const uid of uids) {
            expect(uid).toMatch(UUID_REGEX);
          }
        }),
        { numRuns: 100 },
      );
    });
  });
});
