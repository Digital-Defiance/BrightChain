/**
 * Test helpers for Post_Service property tests.
 * Provides mock implementations of database collections and application.
 */

/** True when every entry in the filter equals the record's field. */
function matchesFilter<T>(item: T, filter: object): boolean {
  return Object.entries(filter).every(
    ([key, value]) => (item as Record<string, unknown>)[key] === value,
  );
}

/**
 * Mock collection that stores data in memory
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

  find(filter: Partial<T>): { exec(): Promise<T[]> } {
    return {
      exec: async () => {
        if (Object.keys(filter).length === 0) {
          return [...this.data];
        }
        return this.data.filter((item) => matchesFilter(item, filter));
      },
    };
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
 * Create a mock application with in-memory collections
 */
export function createMockApplication() {
  const collections = new Map<string, MockCollection<unknown>>();

  // Pre-create the collections we need
  collections.set('brighthub_posts', new MockCollection());
  collections.set('brighthub_likes', new MockCollection());
  collections.set('brighthub_reposts', new MockCollection());

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
