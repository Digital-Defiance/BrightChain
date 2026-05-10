import type { IHolidayFeedEntry } from '@brightchain/brightcal-lib';
import * as fc from 'fast-check';
import {
  filterHolidayEntries,
  getSubscriptionStatus,
} from '../components/HolidayCatalog';

/**
 * Arbitrary generator for a minimal IHolidayFeedEntry.
 */
function holidayEntryArb(): fc.Arbitrary<IHolidayFeedEntry> {
  return fc.record({
    id: fc.uuid(),
    displayName: fc.string({ minLength: 1, maxLength: 60 }),
    description: fc.string({ maxLength: 100 }),
    region: fc.string({ minLength: 1, maxLength: 30 }),
    category: fc.string({ minLength: 1, maxLength: 30 }),
    icsUrl: fc.webUrl(),
  });
}

/**
 * Feature: multi-calendar-management
 * Property 6: Holiday catalog search filter
 * Validates: Requirements 5.5
 *
 * For any array of Holiday Feed Entries and any non-empty search query string,
 * the filtered results SHALL contain only entries where the displayName or
 * region field contains the query as a case-insensitive substring. No matching
 * entries SHALL be excluded from the results.
 */
describe('Property 6: Holiday catalog search filter', () => {
  it('filtered results contain only entries matching query; no matching entries excluded', () => {
    fc.assert(
      fc.property(
        fc.array(holidayEntryArb(), { minLength: 0, maxLength: 30 }),
        fc.string({ minLength: 1, maxLength: 20 }),
        (entries, query) => {
          const filtered = filterHolidayEntries(entries, query);
          const lowerQuery = query.toLowerCase();

          // Every filtered entry must match the query
          for (const entry of filtered) {
            const nameMatch = entry.displayName
              .toLowerCase()
              .includes(lowerQuery);
            const regionMatch = entry.region.toLowerCase().includes(lowerQuery);
            expect(nameMatch || regionMatch).toBe(true);
          }

          // Every matching entry from the original must be in filtered
          const filteredIds = new Set(filtered.map((e) => e.id));
          for (const entry of entries) {
            const nameMatch = entry.displayName
              .toLowerCase()
              .includes(lowerQuery);
            const regionMatch = entry.region.toLowerCase().includes(lowerQuery);
            if (nameMatch || regionMatch) {
              expect(filteredIds.has(entry.id)).toBe(true);
            }
          }

          // Filtered is a subset of original
          expect(filtered.length).toBeLessThanOrEqual(entries.length);
        },
      ),
      { numRuns: 100 },
    );
  });

  it('returns all entries when query is empty', () => {
    fc.assert(
      fc.property(
        fc.array(holidayEntryArb(), { minLength: 0, maxLength: 20 }),
        (entries) => {
          const filtered = filterHolidayEntries(entries, '');
          expect(filtered.length).toBe(entries.length);
        },
      ),
      { numRuns: 100 },
    );
  });
});

/**
 * Feature: multi-calendar-management
 * Property 7: Holiday catalog subscription badge state
 * Validates: Requirements 5.4
 *
 * For any set of subscribed ICS URLs and any array of Holiday Feed Entries,
 * each entry whose icsUrl is in the subscribed set SHALL be marked as
 * "subscribed", and each entry whose icsUrl is NOT in the subscribed set
 * SHALL be marked as "available". No entry SHALL have an incorrect badge state.
 */
describe('Property 7: Holiday catalog subscription badge state', () => {
  it('entries with icsUrl in subscribed set are "subscribed"; others are "available"', () => {
    fc.assert(
      fc.property(
        fc.array(holidayEntryArb(), { minLength: 0, maxLength: 30 }),
        fc.uniqueArray(fc.webUrl(), { minLength: 0, maxLength: 15 }),
        (entries, subscribedUrlList) => {
          const subscribedUrls = new Set(subscribedUrlList);

          for (const entry of entries) {
            const status = getSubscriptionStatus(entry.icsUrl, subscribedUrls);

            if (subscribedUrls.has(entry.icsUrl)) {
              expect(status).toBe('subscribed');
            } else {
              expect(status).toBe('available');
            }
          }
        },
      ),
      { numRuns: 100 },
    );
  });
});
