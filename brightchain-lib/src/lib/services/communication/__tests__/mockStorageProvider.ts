/**
 * In-memory IChatStorageProvider for tests.
 */
import type {
  IChatCollection,
  IChatStorageProvider,
} from '../../../interfaces/communication/chatStorageProvider';

/* eslint-disable @typescript-eslint/no-explicit-any */

class InMemoryCollection<T> implements IChatCollection<T> {
  private readonly store = new Map<string, T>();

  constructor(private readonly keyField: string) {}

  async create(doc: T): Promise<void> {
    const key = String((doc as any)[this.keyField]);
    this.store.set(key, doc);
  }

  async findById(key: string): Promise<T | null> {
    return this.store.get(key) ?? null;
  }

  async findMany(_filter?: Partial<T>): Promise<T[]> {
    return Array.from(this.store.values());
  }

  async update(key: string, doc: T): Promise<void> {
    this.store.set(key, doc);
  }

  async delete(key: string): Promise<void> {
    this.store.delete(key);
  }
}

export function createMockStorageProvider(): IChatStorageProvider {
  return {
    conversations: new InMemoryCollection('id'),
    messages: new InMemoryCollection('id'),
    groups: new InMemoryCollection('id'),
    groupMessages: new InMemoryCollection('id'),
    channels: new InMemoryCollection('id'),
    channelMessages: new InMemoryCollection('id'),
    inviteTokens: new InMemoryCollection('token'),
    servers: new InMemoryCollection('id'),
    serverInvites: new InMemoryCollection('token'),
  };
}
