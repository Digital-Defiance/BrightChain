import type { ICalendarCollectionDTO } from '@brightchain/brightcal-lib';
import * as fc from 'fast-check';
import { groupCalendarsByOwnership } from '../utils/visibilitySet';

/**
 * Arbitrary generator for a minimal ICalendarCollectionDTO with string IDs.
 */
function calendarArb(
  ownerIdArb: fc.Arbitrary<string>,
): fc.Arbitrary<ICalendarCollectionDTO> {
  return fc.record({
    id: fc.uuid(),
    ownerId: ownerIdArb,
    displayName: fc.string({ minLength: 1, maxLength: 50 }),
    color: fc.stringMatching(/^#[0-9a-f]{6}$/),
    description: fc.string({ maxLength: 100 }),
    isDefault: fc.boolean(),
    isSubscription: fc.boolean(),
    defaultPermission: fc.constant('viewer' as any),
    dateCreated: fc
      .integer({
        min: new Date('2000-01-01').getTime(),
        max: new Date('2099-12-31').getTime(),
      })
      .map((ts) => new Date(ts).toISOString()),
  }) as fc.Arbitrary<ICalendarCollectionDTO>;
}

/**
 * Feature: multi-calendar-management
 * Property 1: Calendar grouping by ownership
 * Validates: Requirements 1.1
 *
 * For any array of calendar collections and any user ID, the grouping function
 * SHALL partition calendars into exactly two groups: "My Calendars" containing
 * only calendars where ownerId equals the user ID, and "Other Calendars"
 * containing all remaining calendars. The union of both groups SHALL equal the
 * original array, and their intersection SHALL be empty.
 */
describe('Property 1: Calendar grouping by ownership', () => {
  it('partitions into exactly two disjoint groups whose union equals the input', () => {
    fc.assert(
      fc.property(
        fc.uuid(),
        fc.array(calendarArb(fc.uuid()), { minLength: 0, maxLength: 20 }),
        (userId, calendars) => {
          const { owned, other } = groupCalendarsByOwnership(calendars, userId);

          // Union equals input: total count matches
          expect(owned.length + other.length).toBe(calendars.length);

          // Owned group contains only calendars where ownerId === userId
          for (const cal of owned) {
            expect(cal.ownerId).toBe(userId);
          }

          // Other group contains only calendars where ownerId !== userId
          for (const cal of other) {
            expect(cal.ownerId).not.toBe(userId);
          }

          // Disjoint: no calendar appears in both groups
          const ownedIds = new Set(owned.map((c) => c.id));
          const otherIds = new Set(other.map((c) => c.id));
          for (const id of ownedIds) {
            expect(otherIds.has(id)).toBe(false);
          }

          // Union contains every original calendar
          const allGroupedIds = new Set([...ownedIds, ...otherIds]);
          for (const cal of calendars) {
            expect(allGroupedIds.has(cal.id)).toBe(true);
          }
        },
      ),
      { numRuns: 100 },
    );
  });
});
