/**
 * Property-based test for user search filtering logic.
 *
 * Feature: brightchat-navigation-ux, Property 6: User search excludes requesting user
 *
 * **Validates: Requirements 7.6**
 *
 * For any authenticated user and any set of users (including the requesting user),
 * the user search results SHALL never contain the requesting user's ID.
 *
 * Strategy: Use fast-check to generate arrays of IUserSearchRecord that always
 * include the requesting user. Pick one user from the array as the requesting
 * user and verify that filterUsersForSearch never returns that user's ID.
 */

import * as fc from 'fast-check';
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

/**
 * Generate a non-empty user array and pick one user as the requesting user.
 * This ensures the requesting user is always present in the input array.
 */
const usersWithRequestingUserArb = fc
  .array(userRecordArb, { minLength: 1, maxLength: 30 })
  .chain((users) =>
    fc.record({
      users: fc.constant(users),
      requestingUserIndex: fc.nat({ max: users.length - 1 }),
    }),
  );

/** Generate a search query (including empty string for "no filter"). */
const queryArb = fc.oneof(
  fc.constant(''),
  fc.string({ minLength: 1, maxLength: 20 }),
);

// ─── Property 6: User search excludes requesting user ───────────────────────

describe('Feature: brightchat-navigation-ux, Property 6: User search excludes requesting user', () => {
  /**
   * **Validates: Requirements 7.6**
   *
   * For any set of users that includes the requesting user, and for any
   * search query, the requesting user's ID SHALL never appear in the
   * filtered results.
   */
  it('should never include the requesting user in search results', () => {
    fc.assert(
      fc.property(
        usersWithRequestingUserArb,
        queryArb,
        ({ users, requestingUserIndex }, query) => {
          const requestingUser = users[requestingUserIndex];

          const results = filterUsersForSearch(
            users,
            query,
            requestingUser.id,
          );

          // The requesting user's ID must never appear in results
          const resultIds = results.map((r) => r.id);
          expect(resultIds).not.toContain(requestingUser.id);
        },
      ),
      { numRuns: 100 },
    );
  });

  /**
   * **Validates: Requirements 7.6**
   *
   * Even when multiple users share the same ID as the requesting user,
   * ALL of them must be excluded from results.
   */
  it('should exclude all users matching the requesting user ID, even duplicates', () => {
    fc.assert(
      fc.property(
        usersWithRequestingUserArb,
        queryArb,
        ({ users, requestingUserIndex }, query) => {
          const requestingUser = users[requestingUserIndex];

          // Add extra duplicates of the requesting user with different display names
          const duplicateUser: IUserSearchRecord = {
            id: requestingUser.id,
            displayName: 'Duplicate ' + requestingUser.displayName,
          };
          const usersWithDuplicates = [...users, duplicateUser];

          const results = filterUsersForSearch(
            usersWithDuplicates,
            query,
            requestingUser.id,
          );

          // No result should have the requesting user's ID
          for (const result of results) {
            expect(result.id).not.toBe(requestingUser.id);
          }
        },
      ),
      { numRuns: 100 },
    );
  });
});
