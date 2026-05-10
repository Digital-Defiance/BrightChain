/**
 * Timezone Storage — property-based tests.
 *
 * Property 20: Timezone Storage Round-Trip (Req 11.1, 11.4)
 *
 * Uses fast-check with the timezone utility functions from brightcal-lib.
 */

import {
  createTimezoneAwareDate,
  getOriginalTzid,
  isValidTimezone,
} from '@brightchain/brightcal-lib';
import fc from 'fast-check';

// ─── Arbitraries ─────────────────────────────────────────────────────────────

/**
 * A representative set of valid IANA timezone identifiers covering
 * different UTC offsets, DST rules, and geographic regions.
 */
const VALID_TIMEZONES = [
  'UTC',
  'America/New_York',
  'America/Chicago',
  'America/Denver',
  'America/Los_Angeles',
  'America/Anchorage',
  'America/Sao_Paulo',
  'America/Argentina/Buenos_Aires',
  'America/Toronto',
  'America/Vancouver',
  'Europe/London',
  'Europe/Paris',
  'Europe/Berlin',
  'Europe/Moscow',
  'Europe/Istanbul',
  'Europe/Helsinki',
  'Asia/Tokyo',
  'Asia/Shanghai',
  'Asia/Kolkata',
  'Asia/Dubai',
  'Asia/Singapore',
  'Asia/Seoul',
  'Asia/Hong_Kong',
  'Australia/Sydney',
  'Australia/Perth',
  'Pacific/Auckland',
  'Pacific/Honolulu',
  'Africa/Cairo',
  'Africa/Johannesburg',
  'Africa/Lagos',
];

/**
 * Arbitrary for a valid IANA timezone from our representative set.
 */
const timezoneArb = fc.constantFrom(...VALID_TIMEZONES);

/**
 * Arbitrary for a random datetime within a reasonable range.
 * Uses integer timestamps to avoid invalid date issues.
 * Range: 2020-01-01 to 2026-12-31
 */
const dateMin = new Date('2020-01-01T00:00:00Z').getTime();
const dateMax = new Date('2026-12-31T23:59:59Z').getTime();

const localDatetimeArb = fc
  .integer({ min: dateMin, max: dateMax })
  .map((ts) => {
    const d = new Date(ts);
    // Format as a local datetime string (no Z suffix)
    const pad = (n: number, w = 2) => String(n).padStart(w, '0');
    return (
      `${pad(d.getUTCFullYear(), 4)}-${pad(d.getUTCMonth() + 1)}-${pad(d.getUTCDate())}` +
      `T${pad(d.getUTCHours())}:${pad(d.getUTCMinutes())}:${pad(d.getUTCSeconds())}`
    );
  });

// ─── Tests ───────────────────────────────────────────────────────────────────

describe('Timezone Storage — Property Tests', () => {
  /**
   * **Property 20: Timezone Storage Round-Trip**
   *
   * **Validates: Requirements 11.1, 11.4**
   *
   * For any valid IANA timezone identifier used in an event's DTSTART or
   * DTEND, storing and retrieving the event SHALL preserve the original
   * TZID exactly, enabling correct timezone conversion on display.
   */
  describe('Property 20: Timezone Storage Round-Trip', () => {
    it('createTimezoneAwareDate then getOriginalTzid returns the same TZID', () => {
      fc.assert(
        fc.property(localDatetimeArb, timezoneArb, (localTime, tzid) => {
          // Precondition: the timezone must be valid
          expect(isValidTimezone(tzid)).toBe(true);

          // Store the datetime with its TZID
          const tzAwareDate = createTimezoneAwareDate(localTime, tzid);

          // Recover the original TZID
          const recoveredTzid = getOriginalTzid(tzAwareDate);

          // The recovered TZID must exactly match the original
          expect(recoveredTzid).toBe(tzid);
        }),
        { numRuns: 100 },
      );
    });

    it('stored timezone-aware date preserves UTC representation', () => {
      fc.assert(
        fc.property(localDatetimeArb, timezoneArb, (localTime, tzid) => {
          const tzAwareDate = createTimezoneAwareDate(localTime, tzid);

          // UTC string must be a valid ISO date
          const utcDate = new Date(tzAwareDate.utc);
          expect(isNaN(utcDate.getTime())).toBe(false);

          // TZID must be preserved
          expect(tzAwareDate.tzid).toBe(tzid);

          // Local string must be present and non-empty
          expect(tzAwareDate.local.length).toBeGreaterThan(0);
        }),
        { numRuns: 100 },
      );
    });

    it('round-trip through JSON serialization preserves TZID', () => {
      fc.assert(
        fc.property(localDatetimeArb, timezoneArb, (localTime, tzid) => {
          const original = createTimezoneAwareDate(localTime, tzid);

          // Simulate JSON storage and retrieval (as would happen in a DB)
          const serialized = JSON.stringify(original);
          const deserialized = JSON.parse(serialized);

          // The TZID must survive JSON round-trip
          expect(getOriginalTzid(deserialized)).toBe(tzid);
          expect(deserialized.utc).toBe(original.utc);
          expect(deserialized.local).toBe(original.local);
        }),
        { numRuns: 100 },
      );
    });
  });
});
