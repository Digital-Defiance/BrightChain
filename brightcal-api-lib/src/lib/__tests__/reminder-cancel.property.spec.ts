/**
 * Reminder Cancellation — property-based test.
 *
 * Property 31: Reminder Cancellation on Event Cancellation (Req 14.5)
 *
 * For any event with scheduled reminders that is subsequently cancelled,
 * all pending (undelivered) reminders for that event SHALL be cancelled.
 *
 * Uses fast-check with in-memory BrightDb.
 */

import { type IReminderDTO } from '@brightchain/brightcal-lib';
import {
  initializeBrightChain,
  MemoryBlockStore,
  ServiceLocator,
  ServiceProvider,
  validBlockSizes,
} from '@brightchain/brightchain-lib';
import { BrightDb, InMemoryHeadRegistry } from '@brightchain/db';
import fc from 'fast-check';
import { createCalendarEventModel } from '../models/calendarEvent.model.ts';
import type { IStoredCalendarReminder } from '../models/calendarReminder.model.ts';
import { createCalendarReminderModel } from '../models/calendarReminder.model.ts';
import { CalendarNotificationService } from '../services/calendarNotificationService.ts';

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
  const eventModel = createCalendarEventModel(db);
  const reminderModel = createCalendarReminderModel(db);
  const notificationService = new CalendarNotificationService(
    eventModel,
    reminderModel,
  );
  return { notificationService, reminderModel };
}

// ─── Arbitraries ─────────────────────────────────────────────────────────────

/** Generate a valid reminder action type. */
const reminderActionArb = fc.oneof(
  fc.constant('DISPLAY' as const),
  fc.constant('EMAIL' as const),
  fc.constant('AUDIO' as const),
);

/** Generate a valid triggerMinutesBefore (1 to 1440 = 24 hours). */
const triggerMinutesArb = fc.integer({ min: 1, max: 1440 });

/** Generate a single reminder DTO. */
const reminderArb: fc.Arbitrary<IReminderDTO> = fc.record({
  action: reminderActionArb,
  triggerMinutesBefore: triggerMinutesArb,
});

/** Generate 1-5 reminders for an event. */
const remindersArb = fc.array(reminderArb, { minLength: 1, maxLength: 5 });

/** Generate a future event start time (1-30 days from a fixed base). */
const eventStartArb = fc
  .integer({ min: 1, max: 30 })
  .map(
    (daysAhead) =>
      new Date(Date.UTC(2024, 5, 15) + daysAhead * 24 * 60 * 60 * 1000),
  );

/** Generate a unique event ID. */
const eventIdArb = fc.uuid().map((u) => u.replace(/-/g, ''));

/**
 * Generate a scenario with 1-4 events, each with their own reminders.
 * One event (the target) will be cancelled; others should be unaffected.
 */
const multiEventScenarioArb = fc
  .integer({ min: 1, max: 4 })
  .chain((eventCount) =>
    fc
      .tuple(
        // Guarantee unique event IDs so cancelling one does not affect others.
        fc.uniqueArray(eventIdArb, {
          minLength: eventCount,
          maxLength: eventCount,
        }),
        fc.array(
          fc.record({
            eventStart: eventStartArb,
            reminders: remindersArb,
          }),
          { minLength: eventCount, maxLength: eventCount },
        ),
        fc.integer({ min: 0, max: eventCount - 1 }),
      )
      .map(([uniqueEventIds, eventData, cancelIndex]) => ({
        events: eventData.map((data, i) => ({
          eventId: uniqueEventIds[i],
          ...data,
        })),
        cancelIndex,
      })),
  );

// ─── Tests ───────────────────────────────────────────────────────────────────

describe('Reminder Cancellation — Property Tests', () => {
  /**
   * **Property 31: Reminder Cancellation on Event Cancellation**
   *
   * **Validates: Requirements 14.5**
   *
   * For any event with scheduled reminders that is subsequently cancelled,
   * all pending (undelivered) reminders for that event SHALL be cancelled.
   */
  describe('Property 31: Reminder Cancellation on Event Cancellation', () => {
    it('all pending reminders are cancelled when event is cancelled', async () => {
      await fc.assert(
        fc.asyncProperty(
          multiEventScenarioArb,
          async ({ events, cancelIndex }) => {
            const { notificationService, reminderModel } = createServices();

            // Schedule reminders for all events
            for (const { eventId, eventStart, reminders } of events) {
              await notificationService.scheduleReminders(
                eventId,
                eventStart,
                reminders,
                'user-1',
              );
            }

            // Count total reminders and reminders for the target event
            const targetEventId = events[cancelIndex].eventId;
            const targetReminderCount = events[cancelIndex].reminders.length;
            const otherReminderCount = events.reduce(
              (sum, e, i) =>
                i === cancelIndex ? sum : sum + e.reminders.length,
              0,
            );

            // Verify all reminders were created
            const allBefore = await reminderModel
              .find({} as Partial<IStoredCalendarReminder>)
              .toArray();
            expect(allBefore).toHaveLength(
              targetReminderCount + otherReminderCount,
            );

            // Cancel reminders for the target event
            await notificationService.cancelReminders(targetEventId);

            // ASSERT: no pending reminders remain for the cancelled event
            const allAfter = await reminderModel
              .find({} as Partial<IStoredCalendarReminder>)
              .toArray();
            const remainingForTarget = allAfter.filter(
              (r) => r.eventId === targetEventId,
            );
            expect(remainingForTarget).toHaveLength(0);

            // ASSERT: reminders for other events are unaffected
            const remainingForOthers = allAfter.filter(
              (r) => r.eventId !== targetEventId,
            );
            expect(remainingForOthers).toHaveLength(otherReminderCount);
          },
        ),
        { numRuns: 100 },
      );
    });
  });
});
