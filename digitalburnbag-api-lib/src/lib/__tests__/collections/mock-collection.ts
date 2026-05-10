/**
 * Lightweight in-memory mock of BrightDB Collection for unit testing
 * BrightDB repository classes.
 */

export interface MockCollection {
  findOne: jest.Mock;
  find: jest.Mock;
  insertOne: jest.Mock;
  updateOne: jest.Mock;
  deleteOne: jest.Mock;
  countDocuments: jest.Mock;
}

/**
 * Create an in-memory mock Collection backed by a simple Map.
 * Supports basic CRUD operations matching the BrightDB Collection API.
 */
export function createMockCollection(): MockCollection {
  const store = new Map<string, Record<string, unknown>>();

  const matchesFilter = (
    doc: Record<string, unknown>,
    filter: Record<string, unknown>,
  ): boolean => {
    for (const [key, value] of Object.entries(filter)) {
      const docVal = doc[key];
      if (value && typeof value === 'object' && !Array.isArray(value)) {
        const ops = value as Record<string, unknown>;
        if ('$ne' in ops && docVal === ops['$ne']) return false;
        if ('$in' in ops && !(ops['$in'] as unknown[]).includes(docVal))
          return false;
        if ('$gte' in ops && (docVal as number) < (ops['$gte'] as number))
          return false;
        if ('$lte' in ops && (docVal as number) > (ops['$lte'] as number))
          return false;
        if ('$regex' in ops) {
          const re = new RegExp(
            ops['$regex'] as string,
            (ops['$options'] as string) ?? '',
          );
          if (!re.test(docVal as string)) return false;
        }
        continue;
      }
      if (docVal !== value) return false;
    }
    return true;
  };

  const findOne = jest.fn(async (filter: Record<string, unknown>) => {
    for (const doc of store.values()) {
      if (matchesFilter(doc, filter)) return { ...doc };
    }
    return null;
  });

  const find = jest.fn((filter: Record<string, unknown>) => ({
    toArray: async () => {
      const results: Record<string, unknown>[] = [];
      for (const doc of store.values()) {
        if (matchesFilter(doc, filter)) results.push({ ...doc });
      }
      return results;
    },
  }));

  const insertOne = jest.fn(async (doc: Record<string, unknown>) => {
    const id = (doc['_id'] as string) ?? `auto-${store.size}`;
    store.set(id, { ...doc, _id: id });
    return { acknowledged: true, insertedId: id };
  });

  const updateOne = jest.fn(
    async (
      filter: Record<string, unknown>,
      update: Record<string, unknown>,
    ) => {
      for (const [id, doc] of store.entries()) {
        if (matchesFilter(doc, filter)) {
          const $set = (update['$set'] ?? {}) as Record<string, unknown>;
          const updated = { ...doc, ...$set };
          store.set(id, updated);
          return { acknowledged: true, matchedCount: 1, modifiedCount: 1 };
        }
      }
      return { acknowledged: true, matchedCount: 0, modifiedCount: 0 };
    },
  );

  const deleteOne = jest.fn(async (filter: Record<string, unknown>) => {
    for (const [id, doc] of store.entries()) {
      if (matchesFilter(doc, filter)) {
        store.delete(id);
        return { acknowledged: true, deletedCount: 1 };
      }
    }
    return { acknowledged: true, deletedCount: 0 };
  });

  const countDocuments = jest.fn(async (filter: Record<string, unknown>) => {
    let count = 0;
    for (const doc of store.values()) {
      if (matchesFilter(doc, filter)) count++;
    }
    return count;
  });

  return { findOne, find, insertOne, updateOne, deleteOne, countDocuments };
}
