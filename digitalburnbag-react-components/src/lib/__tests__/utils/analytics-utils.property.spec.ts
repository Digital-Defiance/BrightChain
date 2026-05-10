/**
 * Property-based tests for analytics utility functions.
 * Tests Property 17 from the design document.
 */
import * as fc from 'fast-check';
import { IStatusHistoryEntryDTO } from '../../components/ProviderDetailView';
import { filterLedgerEntries } from '../../utils/analytics-utils';

// ---------------------------------------------------------------------------
// Arbitraries
// ---------------------------------------------------------------------------

const signalTypeArb = fc.constantFrom(
  'presence',
  'absence',
  'duress',
  'check_failed',
);

const statusHistoryEntryDTOArb: fc.Arbitrary<IStatusHistoryEntryDTO> =
  fc.record({
    id: fc.uuid(),
    timestamp: fc
      .integer({ min: 946684800000, max: 1893456000000 })
      .map((ts) => new Date(ts).toISOString()),
    signalType: signalTypeArb,
    eventCount: fc.nat({ max: 1000 }),
    confidence: fc.double({ min: 0, max: 1, noNaN: true }),
    timeSinceLastActivityMs: fc.option(fc.nat({ max: 86400000 }), {
      nil: null,
    }),
    httpStatusCode: fc.option(
      fc.constantFrom(200, 401, 403, 404, 500, 502, 503),
      {
        nil: undefined,
      },
    ),
    errorMessage: fc.option(fc.string({ minLength: 1, maxLength: 100 }), {
      nil: undefined,
    }),
  });

// ---------------------------------------------------------------------------
// Helper: determine if an entry matches a query (reference implementation)
// ---------------------------------------------------------------------------

function entryMatchesQuery(
  entry: IStatusHistoryEntryDTO,
  query: string,
): boolean {
  if (query === '') return true;
  const lq = query.toLowerCase();
  if (entry.signalType.toLowerCase().includes(lq)) return true;
  if (
    entry.errorMessage !== undefined &&
    entry.errorMessage.toLowerCase().includes(lq)
  )
    return true;
  if (
    entry.httpStatusCode !== undefined &&
    String(entry.httpStatusCode).toLowerCase().includes(lq)
  )
    return true;
  return false;
}

// ---------------------------------------------------------------------------
// Property 17: Ledger search filtering correctness
// ---------------------------------------------------------------------------

describe('Feature: heartbeat-history-analytics, Property 17: Ledger search filtering correctness', () => {
  /**
   * **Validates: Requirements 2.3**
   *
   * For any entries and query string, filtered result contains only matching
   * entries and excludes no matching entry. A matching entry is one where
   * signalType, errorMessage, or httpStatusCode (as string) contains the
   * query as a case-insensitive substring.
   */
  it('returns exactly the entries matching the query and excludes none', () => {
    fc.assert(
      fc.property(
        fc.array(statusHistoryEntryDTOArb, { minLength: 0, maxLength: 50 }),
        fc.string({ maxLength: 20 }),
        (entries, query) => {
          const result = filterLedgerEntries(entries, query);

          // Every returned entry must match the query
          for (const entry of result) {
            expect(entryMatchesQuery(entry, query)).toBe(true);
          }

          // No matching entry is excluded
          const expectedMatching = entries.filter((e) =>
            entryMatchesQuery(e, query),
          );
          expect(result.length).toBe(expectedMatching.length);

          // The result preserves order and identity
          const resultIds = result.map((e) => e.id);
          const expectedIds = expectedMatching.map((e) => e.id);
          expect(resultIds).toEqual(expectedIds);
        },
      ),
      { numRuns: 100 },
    );
  });

  it('returns all entries when query is empty', () => {
    fc.assert(
      fc.property(
        fc.array(statusHistoryEntryDTOArb, { minLength: 0, maxLength: 50 }),
        (entries) => {
          const result = filterLedgerEntries(entries, '');
          expect(result.length).toBe(entries.length);
        },
      ),
      { numRuns: 100 },
    );
  });
});
