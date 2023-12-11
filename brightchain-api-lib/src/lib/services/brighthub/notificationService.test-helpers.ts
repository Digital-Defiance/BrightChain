/**
 * Test helpers for Notification_Service property tests.
 * Provides mock implementations of database collections and application.
 */

/* eslint-disable @typescript-eslint/no-explicit-any */

/**
 * Mock collection that stores data in memory with sorting/pagination support
 */
export class MockCollection<T extends { _id: string }> {
  data: T[] = [];

  async create(record: T): Promise<T> {
    this.data.push(record);
    return record;
  }

  findOne(filter: Partial<T>): { exec(): Promise<T | null> } {
    return {
      exec: async () => {
        return (
          this.data.find((item) =>
            Object.entries(filter).every(
              ([key, value]) => (item as any)[key] === value,
            ),
          ) || null
        );
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
          Object.entries(filter).every(
            ([key, value]) => (item as any)[key] === value,
          ),
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
          Object.entries(filter).every(
            ([key, value]) => (item as any)[key] === value,
          ),
        );
        if (index >= 0) {
          this.data.splice(index, 1);
          return { deletedCount: 1 };
        }
        return { deletedCount: 0 };
      },
    };
  }

  deleteMany(filter: Partial<T>): {
    exec(): Promise<{ deletedCount: number }>;
  } {
    return {
      exec: async () => {
        const before = this.data.length;
        this.data = this.data.filter(
          (item) =>
            !Object.entries(filter).every(
              ([key, value]) => (item as any)[key] === value,
            ),
        );
        return { deletedCount: before - this.data.length };
      },
    };
  }

  countDocuments(filter: Partial<T>): { exec(): Promise<number> } {
    return {
      exec: async () => {
        if (Object.keys(filter).length === 0) return this.data.length;
        return this.data.filter((item) =>
          Object.entries(filter).every(
            ([key, value]) => (item as any)[key] === value,
          ),
        ).length;
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
class MockFindQuery<T extends { _id: string }> {
  private filteredData: T[];
  private sortField?: Record<string, 1 | -1>;
  private skipCount = 0;
  private limitCount?: number;

  constructor(data: T[], filter: Partial<T>) {
    if (Object.keys(filter).length === 0) {
      this.filteredData = [...data];
    } else {
      this.filteredData = data.filter((item) =>
        Object.entries(filter).every(
          ([key, value]) => (item as any)[key] === value,
        ),
      );
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
    if (this.sortField) {
      const [field, direction] = Object.entries(this.sortField)[0];
      result.sort((a, b) => {
        const aVal = (a as any)[field];
        const bVal = (b as any)[field];
        if (aVal < bVal) return -1 * direction;
        if (aVal > bVal) return 1 * direction;
        return 0;
      });
    }
    if (this.skipCount > 0) {
      result = result.slice(this.skipCount);
    }
    if (this.limitCount !== undefined) {
      result = result.slice(0, this.limitCount);
    }
    return result;
  }
}

/**
 * Create a mock application with in-memory collections for notifications
 */
export function createMockNotificationApplication() {
  const collections = new Map<string, MockCollection<any>>();

  // Pre-create all notification-related collections
  collections.set('brighthub_notifications', new MockCollection());
  collections.set('brighthub_notification_preferences', new MockCollection());
  collections.set('brighthub_notification_groups', new MockCollection());
  collections.set('brighthub_connection_list_members', new MockCollection());
  collections.set('brighthub_connection_metadata', new MockCollection());
  collections.set(
    'brighthub_connection_category_assignments',
    new MockCollection(),
  );
  collections.set('brighthub_connection_interactions', new MockCollection());

  return {
    collections,
    getModel<T extends { _id: string }>(name: string): MockCollection<T> {
      if (!collections.has(name)) {
        collections.set(name, new MockCollection<T>());
      }
      return collections.get(name) as any;
    },
  };
}

/**
 * Helper to set up a quiet mode connection metadata record
 */
export async function setupQuietModeConnection(
  app: ReturnType<typeof createMockNotificationApplication>,
  userId: string,
  connectionId: string,
): Promise<void> {
  const metadata = app.collections.get('brighthub_connection_metadata')!;
  const { randomUUID } = await import('crypto');
  const now = new Date().toISOString();
  metadata.data.push({
    _id: randomUUID(),
    userId,
    connectionId,
    isPriority: false,
    isQuiet: true,
    createdAt: now,
    updatedAt: now,
  } as any);
}

/**
 * Helper to add a user to a connection list
 */
export async function setupConnectionListMember(
  app: ReturnType<typeof createMockNotificationApplication>,
  listId: string,
  userId: string,
): Promise<void> {
  const members = app.collections.get('brighthub_connection_list_members')!;
  const { randomUUID } = await import('crypto');
  members.data.push({
    _id: randomUUID(),
    listId,
    userId,
    addedAt: new Date().toISOString(),
  } as any);
}

/**
 * Helper to assign a connection to a category
 */
export async function setupCategoryAssignment(
  app: ReturnType<typeof createMockNotificationApplication>,
  ownerId: string,
  connectionId: string,
  categoryId: string,
): Promise<void> {
  const assignments = app.collections.get(
    'brighthub_connection_category_assignments',
  )!;
  const { randomUUID } = await import('crypto');
  assignments.data.push({
    _id: randomUUID(),
    ownerId,
    connectionId,
    categoryId,
    assignedAt: new Date().toISOString(),
  } as any);
}
