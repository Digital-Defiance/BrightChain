import type {
  ICalendarCollectionDTO,
  ICalendarEventDTO,
} from '@brightchain/brightcal-lib';
import * as fc from 'fast-check';
import {
  buildCalendarColorMap,
  filterEventsByVisibility,
} from '../utils/visibilitySet';

const DEFAULT_COLOR = '#3b82f6';

/** Constrained date arbitrary that only produces valid ISO-serializable dates */
const validDateStr = fc
  .integer({
    min: new Date('2000-01-01').getTime(),
    max: new Date('2099-12-31').getTime(),
  })
  .map((ts) => new Date(ts).toISOString());

/**
 * Arbitrary generator for a minimal ICalendarEventDTO with a given calendarId.
 */
function eventArb(
  calendarIdArb: fc.Arbitrary<string>,
): fc.Arbitrary<ICalendarEventDTO> {
  return fc.record({
    id: fc.uuid(),
    calendarId: calendarIdArb,
    uid: fc.uuid(),
    sequence: fc.nat(),
    summary: fc.string({ minLength: 1, maxLength: 50 }),
    dtstart: validDateStr,
    dtend: validDateStr,
    dtstartTzid: fc.constant('UTC'),
    allDay: fc.boolean(),
    visibility: fc.constant('PUBLIC'),
    transparency: fc.constant('OPAQUE'),
    status: fc.constant('CONFIRMED' as const),
    organizerId: fc.uuid(),
    attendees: fc.constant([]),
    reminders: fc.constant([]),
    dateModified: validDateStr,
    dateCreated: validDateStr,
  }) as unknown as fc.Arbitrary<ICalendarEventDTO>;
}

/**
 * Feature: multi-calendar-management
 * Property 4: Event filtering by Visibility Set
 * Validates: Requirements 7.1, 7.5, 8.1
 *
 * For any array of calendar events and any Visibility Set, the filtered event
 * array SHALL contain exactly those events whose calendarId is a member of the
 * Visibility Set. No events with a calendarId outside the set SHALL appear,
 * and no events with a calendarId inside the set SHALL be excluded.
 */
describe('Property 4: Event filtering by Visibility Set', () => {
  it('filtered array contains exactly events whose calendarId is in the set', () => {
    fc.assert(
      fc.property(
        fc.array(eventArb(fc.uuid()), { minLength: 0, maxLength: 30 }),
        fc.uniqueArray(fc.uuid(), { minLength: 0, maxLength: 10 }),
        (events, visibleIds) => {
          const visibilitySet = new Set(visibleIds);
          const filtered = filterEventsByVisibility(events, visibilitySet);

          // Every filtered event has a calendarId in the visibility set
          for (const event of filtered) {
            expect(visibilitySet.has(event.calendarId as string)).toBe(true);
          }

          // Every event in the original with calendarId in the set is in filtered
          const filteredIds = new Set(filtered.map((e) => e.id));
          for (const event of events) {
            if (visibilitySet.has(event.calendarId as string)) {
              expect(filteredIds.has(event.id)).toBe(true);
            }
          }

          // No extra events: filtered is a subset of original
          expect(filtered.length).toBeLessThanOrEqual(events.length);

          // Count check: filtered count equals events with calendarId in set
          const expectedCount = events.filter((e) =>
            visibilitySet.has(e.calendarId as string),
          ).length;
          expect(filtered.length).toBe(expectedCount);
        },
      ),
      { numRuns: 100 },
    );
  });
});

/** Hex color arbitrary */
const hexColorArb = fc.stringMatching(/^#[0-9a-f]{6}$/);

/**
 * Arbitrary generator for a minimal ICalendarCollectionDTO.
 */
function calendarArb(
  idArb: fc.Arbitrary<string>,
  colorArb: fc.Arbitrary<string>,
): fc.Arbitrary<ICalendarCollectionDTO> {
  return fc.record({
    id: idArb,
    ownerId: fc.uuid(),
    displayName: fc.string({ minLength: 1, maxLength: 50 }),
    color: colorArb,
    description: fc.string({ maxLength: 100 }),
    isDefault: fc.boolean(),
    isSubscription: fc.boolean(),
    defaultPermission: fc.constant('viewer' as any),
    dateCreated: validDateStr,
  }) as fc.Arbitrary<ICalendarCollectionDTO>;
}

/**
 * Feature: multi-calendar-management
 * Property 5: Calendar color map correctness
 * Validates: Requirements 7.2, 8.1
 *
 * For any array of calendar collections with distinct IDs and hex color values,
 * building a color map and looking up any event's calendarId SHALL return the
 * exact hex color string of that event's parent calendar. If the calendarId is
 * not in the map, the lookup SHALL return the default color #3b82f6.
 */
describe('Property 5: Calendar color map correctness', () => {
  it('lookup returns exact hex color for known IDs, default for unknown', () => {
    fc.assert(
      fc.property(
        fc.uniqueArray(calendarArb(fc.uuid(), hexColorArb), {
          minLength: 0,
          maxLength: 20,
          selector: (cal) => cal.id as string,
        }),
        fc.uuid(),
        (calendars, unknownId) => {
          const colorMap = buildCalendarColorMap(calendars);

          // Every calendar's color is correctly mapped
          for (const cal of calendars) {
            const color = colorMap.get(cal.id as string);
            expect(color).toBe(cal.color);
          }

          // Unknown ID returns undefined from the map (caller uses default)
          const knownIds = new Set(calendars.map((c) => c.id as string));
          if (!knownIds.has(unknownId)) {
            const color = colorMap.get(unknownId) ?? DEFAULT_COLOR;
            expect(color).toBe(DEFAULT_COLOR);
          }

          // Map size equals number of calendars
          expect(colorMap.size).toBe(calendars.length);
        },
      ),
      { numRuns: 100 },
    );
  });
});
