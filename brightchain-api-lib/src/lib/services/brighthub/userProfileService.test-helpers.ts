/**
 * Test helpers for User_Profile_Service property tests.
 * Provides mock implementations of database collections and application.
 */

import {
  ApproveFollowersMode,
  IBasePrivacySettings,
} from '@brightchain/brighthub-lib';
import type { UserProfileRecord } from './userProfileService';

/** Read a field from a record by name. */
function fieldOf<T>(item: T, key: string): unknown {
  return (item as Record<string, unknown>)[key];
}

/** True when every entry in the filter equals the record's field. */
function matchesFilter<T>(item: T, filter: object): boolean {
  return Object.entries(filter).every(
    ([key, value]) => fieldOf(item, key) === value,
  );
}

/**
 * Mock collection that stores data in memory with sorting/pagination support
 */
export class MockCollection<T> {
  data: T[] = [];

  async create(record: T): Promise<T> {
    this.data.push(record);
    return record;
  }

  findOne(filter: Partial<T>): { exec(): Promise<T | null> } {
    return {
      exec: async () => {
        return this.data.find((item) => matchesFilter(item, filter)) || null;
      },
    };
  }

  find(filter: Partial<T>): MockFindQuery<T> {
    return new MockFindQuery(this.data, filter);
  }

  updateOne(
    filter: Partial<T>,
    update: Partial<T>,
  ): { exec(): Promise<{ modifiedCount: number }> } {
    return {
      exec: async () => {
        const index = this.data.findIndex((item) =>
          matchesFilter(item, filter),
        );
        if (index >= 0) {
          this.data[index] = { ...this.data[index], ...update };
          return { modifiedCount: 1 };
        }
        return { modifiedCount: 0 };
      },
    };
  }

  deleteOne(filter: Partial<T>): { exec(): Promise<{ deletedCount: number }> } {
    return {
      exec: async () => {
        const index = this.data.findIndex((item) =>
          matchesFilter(item, filter),
        );
        if (index >= 0) {
          this.data.splice(index, 1);
          return { deletedCount: 1 };
        }
        return { deletedCount: 0 };
      },
    };
  }

  clear(): void {
    this.data = [];
  }
}

/**
 * Mock find query with chaining support
 */
class MockFindQuery<T> {
  private filteredData: T[];
  private sortField?: Record<string, 1 | -1>;
  private skipCount = 0;
  private limitCount?: number;

  constructor(data: T[], filter: Partial<T>) {
    if (Object.keys(filter).length === 0) {
      this.filteredData = [...data];
    } else {
      this.filteredData = data.filter((item) => matchesFilter(item, filter));
    }
  }

  sort(field: Record<string, 1 | -1>): MockFindQuery<T> {
    this.sortField = field;
    return this;
  }

  skip(count: number): MockFindQuery<T> {
    this.skipCount = count;
    return this;
  }

  limit(count: number): MockFindQuery<T> {
    this.limitCount = count;
    return this;
  }

  async exec(): Promise<T[]> {
    let result = [...this.filteredData];

    // Apply sorting
    if (this.sortField) {
      const [field, direction] = Object.entries(this.sortField)[0];
      result.sort((a, b) => {
        const aVal = fieldOf(a, field) as string | number;
        const bVal = fieldOf(b, field) as string | number;
        if (aVal < bVal) return direction === 1 ? -1 : 1;
        if (aVal > bVal) return direction === 1 ? 1 : -1;
        return 0;
      });
    }

    // Apply skip
    if (this.skipCount > 0) {
      result = result.slice(this.skipCount);
    }

    // Apply limit
    if (this.limitCount !== undefined) {
      result = result.slice(0, this.limitCount);
    }

    return result;
  }
}

/**
 * Default privacy settings for test users
 */
export const DEFAULT_PRIVACY_SETTINGS: IBasePrivacySettings = {
  hideFollowerCount: false,
  hideFollowingCount: false,
  hideFollowersFromNonFollowers: false,
  hideFollowingFromNonFollowers: false,
  allowDmsFromNonFollowers: true,
  showOnlineStatus: true,
  showReadReceipts: true,
};

/**
 * Create a mock user profile record
 */
export function createMockUserProfile(
  userId: string,
  overrides: Partial<UserProfileRecord> = {},
): UserProfileRecord {
  const now = new Date().toISOString();
  return {
    _id: userId,
    username: `user_${userId.slice(0, 8)}`,
    displayName: `User ${userId.slice(0, 8)}`,
    bio: '',
    followerCount: 0,
    followingCount: 0,
    postCount: 0,
    isVerified: false,
    isProtected: false,
    approveFollowersMode: ApproveFollowersMode.ApproveNone,
    privacySettings: { ...DEFAULT_PRIVACY_SETTINGS },
    createdAt: now,
    updatedAt: now,
    ...overrides,
  };
}

/**
 * Create a mock application with in-memory collections
 */
export function createMockApplication() {
  const collections = new Map<string, MockCollection<unknown>>();

  // Pre-create the collections we need
  collections.set('brighthub_user_profiles', new MockCollection());
  collections.set('brighthub_follows', new MockCollection());
  collections.set('brighthub_follow_requests', new MockCollection());
  collections.set('brighthub_blocks', new MockCollection());
  collections.set('brighthub_mutes', new MockCollection());

  return {
    collections,
    getModel<T>(name: string): MockCollection<T> {
      if (!collections.has(name)) {
        collections.set(name, new MockCollection<unknown>());
      }
      return collections.get(name) as MockCollection<T>;
    },
  };
}
