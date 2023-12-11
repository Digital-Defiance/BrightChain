/**
 * Property-based test for user search filtering logic.
 *
 * Property 5: User search returns matching users with correct fields
 * Tests the pure `filterUsersForSearch` function directly.
 *
 * Feature: brightchat-navigation-ux, Property 5: User search returns matching users with correct fields
 */

import fc from 'fast-check';
import {
  filterUsersForSearch,
  IUserSearchRecord,
} from '../controllers/api/userSearch';

// ─── Arbitraries ────────────────────────────────────────────────────────────

/** Generate a valid IUserSearchRecord. */
const userRecordArb: fc.Arbitrary<IUserSearchRecord> = fc.record({
  id: fc.uuid(),
  displayName: fc.string({ minLength: 1, maxLength: 50 }),
  avatarUrl: fc.option(fc.webUrl(), { nil: undefined }),
});

/** Generate an array of user records (0 to 20). */
const usersArb = fc.array(userRecordArb, { minLength: 0, maxLength: 20 });

/** Generate a search query string (may be empty). */
const queryArb = fc.string({ minLength: 0, maxLength: 30 });

/**
 * A UUID that is guaranteed NOT to appear in a given user array.
 * We use a fixed sentinel UUID for the requesting user to isolate
 * Property 5 from Property 6 (self-exclusion).
 */
const NON_COLLIDING_REQUESTING_USER_ID =
  '00000000-0000-4000-a000-000000000000';

// ─── Property 5: User search returns matching users with correct fields ─────

describe('Feature: brightchat-navigation-ux, Property 5: User search returns matching users with correct fields', () => {
  /**
   * **Validates: Requirements 7.2, 7.4**
   *
   * For any set of users and any search query string, the user search function
   * SHALL return only users whose `displayName` contains the query
   * (case-insensitive), and each returned user SHALL have `id` (string),
   * `displayName` (string), and optionally `avatarUrl` (string) fields.
   */
  it('should return only users whose displayName contains the query (case-insensitive) with correct fields', () => {
    fc.assert(
      fc.property(usersArb, queryArb, (users, query) => {
        // Ensure no user has the sentinel requesting user ID so self-exclusion
        // doesn't interfere with this property.
        const safeUsers = users.filter(
          (u) => u.id !== NON_COLLIDING_REQUESTING_USER_ID,
        );

        const results = filterUsersForSearch(
          safeUsers,
          query,
          NON_COLLIDING_REQUESTING_USER_ID,
        );

        const lowerQuery = query.toLowerCase();

        // 1. Every returned user's displayName contains the query (case-insensitive)
        for (const user of results) {
          if (query !== '') {
            expect(user.displayName.toLowerCase()).toContain(lowerQuery);
          }
        }

        // 2. Every user in the input that matches the query IS in the results
        //    (up to the default limit of 20)
        const expectedMatches = safeUsers.filter((u) =>
          query === ''
            ? true
            : u.displayName.toLowerCase().includes(lowerQuery),
        );
        // Results should be a prefix of expectedMatches (respecting limit)
        expect(results.length).toBeLessThanOrEqual(20);
        expect(results.length).toBe(
          Math.min(expectedMatches.length, 20),
        );

        // 3. Each returned user has the correct field types
        for (const user of results) {
          expect(typeof user.id).toBe('string');
          expect(typeof user.displayName).toBe('string');
          if (user.avatarUrl !== undefined) {
            expect(typeof user.avatarUrl).toBe('string');
          }
        }
      }),
      { numRuns: 100 },
    );
  });
});
