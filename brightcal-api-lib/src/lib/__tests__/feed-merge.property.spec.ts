/**
 * ICS Feed Merge — property-based tests.
 *
 * Property 30: ICS Feed Merge Correctness (Req 3.7)
 *
 * Uses fast-check with the IcsSubscriptionService merge logic.
 */

import {
  EventTransparency,
  EventVisibility,
  type ICalendarEventDTO,
} from '@brightchain/brightcal-lib';
import fc from 'fast-check';
import type { ITypedCalendarEvent } from '../models/calendarEvent.model.ts';
import { IcsSubscriptionService } from '../services/icsSubscriptionService.ts';

// ─── Setup ───────────────────────────────────────────────────────────────────

const service = new IcsSubscriptionService();
const CALENDAR_ID = 'test-calendar-id';
const USER_ID = 'test-user-id';

// ─── Arbitraries ─────────────────────────────────────────────────────────────

/**
 * Generate a unique UID string.
 */
const uidArb = fc.uuid();

/**
 * Generate a valid ISO datetime string within a reasonable range.
 */
const dateMin = new Date('2024-01-01T00:00:00Z').getTime();
const dateMax = new Date('2025-12-31T23:59:59Z').getTime();

const isoDateArb = fc
  .integer({ min: dateMin, max: dateMax })
  .map((ts) => new Date(ts).toISOString());

/**
 * Generate a minimal ICalendarEventDTO with the given UID.
 */
function feedEventArb(uid?: string): fc.Arbitrary<ICalendarEventDTO> {
  const uidSource = uid ? fc.constant(uid) : uidArb;
  return fc.record({
    id: fc.uuid(),
    uid: uidSource,
    calendarId: fc.constant(CALENDAR_ID),
    sequence: fc.nat({ max: 100 }),
    summary: fc.string({ minLength: 1, maxLength: 50 }),
    description: fc.option(fc.string({ maxLength: 100 }), { nil: undefined }),
    location: fc.option(fc.string({ maxLength: 50 }), { nil: undefined }),
    dtstart: isoDateArb,
    dtend: isoDateArb,
    dtstartTzid: fc.constant('UTC'),
    dtendTzid: fc.constant('UTC'),
    allDay: fc.boolean(),
    visibility: fc.constantFrom(
      EventVisibility.Public,
      EventVisibility.Private,
      EventVisibility.Confidential,
    ),
    transparency: fc.constantFrom(
      EventTransparency.Opaque,
      EventTransparency.Transparent,
    ),
    status: fc.constantFrom(
      'CONFIRMED' as const,
      'TENTATIVE' as const,
      'CANCELLED' as const,
    ),
    organizerId: fc.constant(USER_ID),
    attendees: fc.constant([]),
    reminders: fc.constant([]),
    categories: fc.constant([]),
    dateCreated: isoDateArb,
    dateModified: isoDateArb,
  });
}

/**
 * Generate a ITypedCalendarEvent from a feed event DTO (simulating stored form).
 */
function typedEventFromDto(dto: ICalendarEventDTO): ITypedCalendarEvent {
  return {
    id: dto.id as string,
    calendarId: dto.calendarId as string,
    uid: dto.uid,
    sequence: dto.sequence,
    summary: dto.summary,
    dtstart: new Date(dto.dtstart),
    dtend: new Date(dto.dtend ?? dto.dtstart),
    dtstartTzid: dto.dtstartTzid,
    dtendTzid: dto.dtendTzid ?? 'UTC',
    allDay: dto.allDay,
    visibility: dto.visibility,
    transparency: dto.transparency,
    status: dto.status,
    organizerId: dto.organizerId as string,
    attendeeIds: dto.attendees.map((a) => a.email),
    isRecurring: false,
    blockId: 'block-' + dto.uid,
    dateCreated: new Date(dto.dateCreated as string),
    dateModified: new Date(dto.dateModified as string),
    searchText: dto.summary,
  };
}

/**
 * Generate a test scenario with:
 * - Some events that exist both locally and in the new feed (shared UIDs)
 * - Some events only in the existing set (will be removed)
 * - Some events only in the new feed (will be added)
 * - Some shared events with changed content (will be updated)
 */
const mergeScenarioArb = fc
  .record({
    // Events that exist in both (unchanged) — same UID, same content
    sharedUids: fc.array(uidArb, { minLength: 0, maxLength: 5 }),
    // Events only in existing (to be removed)
    existingOnlyCount: fc.nat({ max: 5 }),
    // Events only in new feed (to be added)
    newOnlyCount: fc.nat({ max: 5 }),
    // Events in both but with changed content
    changedUids: fc.array(uidArb, { minLength: 0, maxLength: 5 }),
  })
  .chain((scenario) => {
    // Ensure no UID collisions between shared and changed sets
    const allUids = new Set([...scenario.sharedUids, ...scenario.changedUids]);
    const uniqueShared = [...new Set(scenario.sharedUids)];
    const uniqueChanged = [...new Set(scenario.changedUids)].filter(
      (uid) => !uniqueShared.includes(uid),
    );

    return fc
      .record({
        // Generate shared events (same content in both)
        sharedEvents: fc.tuple(...uniqueShared.map((uid) => feedEventArb(uid))),
        // Generate existing-only events
        existingOnlyEvents: fc.array(feedEventArb(), {
          minLength: scenario.existingOnlyCount,
          maxLength: scenario.existingOnlyCount,
        }),
        // Generate new-only events
        newOnlyEvents: fc.array(feedEventArb(), {
          minLength: scenario.newOnlyCount,
          maxLength: scenario.newOnlyCount,
        }),
        // Generate changed events — two versions per UID
        changedExisting: fc.tuple(
          ...uniqueChanged.map((uid) => feedEventArb(uid)),
        ),
        changedNew: fc.tuple(...uniqueChanged.map((uid) => feedEventArb(uid))),
      })
      .map((generated) => ({
        sharedEvents: generated.sharedEvents as ICalendarEventDTO[],
        existingOnlyEvents: generated.existingOnlyEvents,
        newOnlyEvents: generated.newOnlyEvents,
        changedExisting: generated.changedExisting as ICalendarEventDTO[],
        changedNew: generated.changedNew as ICalendarEventDTO[],
      }));
  });

// ─── Tests ───────────────────────────────────────────────────────────────────

describe('ICS Feed Merge — Property Tests', () => {
  /**
   * **Property 30: ICS Feed Merge Correctness**
   *
   * **Validates: Requirements 3.7**
   *
   * For any external ICS feed subscription refresh, the merge operation
   * SHALL: add events present in the new feed but not local, update
   * matching UIDs with different content, remove local events absent
   * from new feed.
   */
  describe('Property 30: ICS Feed Merge Correctness', () => {
    it('events in new feed but not existing are added', () => {
      fc.assert(
        fc.property(
          fc.array(feedEventArb(), { minLength: 0, maxLength: 5 }),
          fc.array(feedEventArb(), { minLength: 1, maxLength: 5 }),
          (existingDtos, newOnlyDtos) => {
            // Ensure no UID overlap
            const existingUids = new Set(existingDtos.map((e) => e.uid));
            const filteredNew = newOnlyDtos.filter(
              (e) => !existingUids.has(e.uid),
            );
            if (filteredNew.length === 0) return; // skip degenerate case

            const existingEvents = existingDtos.map(typedEventFromDto);
            const allNewFeed = [...existingDtos, ...filteredNew];

            const result = service.mergeEvents(
              existingEvents,
              allNewFeed,
              CALENDAR_ID,
              USER_ID,
            );

            // All new-only UIDs must appear in toAdd
            const addedUids = new Set(result.toAdd.map((e) => e.uid));
            for (const newEvent of filteredNew) {
              expect(addedUids.has(newEvent.uid)).toBe(true);
            }
          },
        ),
        { numRuns: 100 },
      );
    });

    it('events in existing but not in new feed are removed', () => {
      fc.assert(
        fc.property(
          fc.array(feedEventArb(), { minLength: 1, maxLength: 5 }),
          fc.array(feedEventArb(), { minLength: 0, maxLength: 5 }),
          (existingDtos, newFeedDtos) => {
            const existingEvents = existingDtos.map(typedEventFromDto);

            // Ensure some existing UIDs are NOT in the new feed
            const newUids = new Set(newFeedDtos.map((e) => e.uid));
            const expectedRemoved = existingEvents.filter(
              (e) => !newUids.has(e.uid),
            );
            if (expectedRemoved.length === 0) return; // skip degenerate case

            const result = service.mergeEvents(
              existingEvents,
              newFeedDtos,
              CALENDAR_ID,
              USER_ID,
            );

            // All existing-only UIDs must appear in toRemove
            const removedUids = new Set(result.toRemove.map((e) => e.uid));
            for (const removed of expectedRemoved) {
              expect(removedUids.has(removed.uid)).toBe(true);
            }
          },
        ),
        { numRuns: 100 },
      );
    });

    it('events with matching UIDs but different content are updated', () => {
      fc.assert(
        fc.property(
          feedEventArb(),
          fc.string({ minLength: 1, maxLength: 50 }),
          (originalDto, newSummary) => {
            // Create an existing event
            const existingEvent = typedEventFromDto(originalDto);

            // Create a modified version with the same UID but different summary
            const modifiedDto: ICalendarEventDTO = {
              ...originalDto,
              summary: newSummary + '-modified',
            };

            // Only test when content actually differs
            if (existingEvent.summary === modifiedDto.summary) return;

            const result = service.mergeEvents(
              [existingEvent],
              [modifiedDto],
              CALENDAR_ID,
              USER_ID,
            );

            // The event should appear in toUpdate
            expect(result.toUpdate.length).toBe(1);
            expect(result.toUpdate[0].existing.uid).toBe(originalDto.uid);
            expect(result.toUpdate[0].updated.uid).toBe(originalDto.uid);

            // Should NOT appear in toAdd or toRemove
            expect(result.toAdd.length).toBe(0);
            expect(result.toRemove.length).toBe(0);
          },
        ),
        { numRuns: 100 },
      );
    });

    it('merge result categories are mutually exclusive by UID', () => {
      fc.assert(
        fc.property(
          fc.array(feedEventArb(), { minLength: 0, maxLength: 8 }),
          fc.array(feedEventArb(), { minLength: 0, maxLength: 8 }),
          (existingDtos, newFeedDtos) => {
            const existingEvents = existingDtos.map(typedEventFromDto);

            const result = service.mergeEvents(
              existingEvents,
              newFeedDtos,
              CALENDAR_ID,
              USER_ID,
            );

            // Collect all UIDs from each category
            const addedUids = new Set(result.toAdd.map((e) => e.uid));
            const updatedUids = new Set(
              result.toUpdate.map((e) => e.existing.uid),
            );
            const removedUids = new Set(result.toRemove.map((e) => e.uid));

            // No UID should appear in more than one category
            for (const uid of addedUids) {
              expect(updatedUids.has(uid)).toBe(false);
              expect(removedUids.has(uid)).toBe(false);
            }
            for (const uid of updatedUids) {
              expect(addedUids.has(uid)).toBe(false);
              expect(removedUids.has(uid)).toBe(false);
            }
            for (const uid of removedUids) {
              expect(addedUids.has(uid)).toBe(false);
              expect(updatedUids.has(uid)).toBe(false);
            }
          },
        ),
        { numRuns: 100 },
      );
    });
  });
});
