import type {
  HeadRecord,
  IHeadRegistryDriver,
} from '../interfaces/storage/headRegistryDriver';

/**
 * InMemoryHeadRegistryDriver — Map-backed driver, no I/O.
 * Used for tests and as a fallback when no persistent store is available.
 */
export class InMemoryHeadRegistryDriver implements IHeadRegistryDriver {
  private readonly store = new Map<string, HeadRecord>();

  async readRecord(key: string): Promise<HeadRecord | null> {
    return this.store.get(key) ?? null;
  }

  async writeRecord(key: string, record: HeadRecord): Promise<void> {
    this.store.set(key, record);
  }

  async deleteRecord(key: string): Promise<void> {
    this.store.delete(key);
  }

  async listKeys(): Promise<string[]> {
    return Array.from(this.store.keys());
  }
}
