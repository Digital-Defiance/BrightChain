/**
 * Test helpers for FriendsService property tests.
 * Provides mock implementations of database collections and application.
 */

/* eslint-disable @typescript-eslint/no-explicit-any */

import { MockCollection, createMockApplication as createMockUserProfileApplication } from './userProfileService.test-helpers';

export { MockCollection };

/**
 * Create a mock application with in-memory collections for the friends system.
 */
export function createMockFriendsApplication() {
  const collections = new Map<string, MockCollection<any>>();

  collections.set('brightchain_friendships', new MockCollection());
  collections.set('brightchain_friend_requests', new MockCollection());

  return {
    collections,
    getModel<T extends { _id: string }>(name: string): MockCollection<T> {
      if (!collections.has(name)) {
        collections.set(name, new MockCollection<T>());
      }
      return collections.get(name) as MockCollection<T>;
    },
  };
}

/**
 * Create a mock isBlocked function that always returns false (no blocks).
 */
export function createMockIsBlocked(
  blockedPairs: Array<[string, string]> = [],
): (a: string, b: string) => Promise<boolean> {
  return async (a: string, b: string): Promise<boolean> => {
    return blockedPairs.some(
      ([x, y]) => (x === a && y === b) || (x === b && y === a),
    );
  };
}
