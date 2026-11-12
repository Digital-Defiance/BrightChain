import { digestPayload, encodeMetadata } from './codec';
import type { BrightDbV2DiskWriter, BrightDbV2Storage } from './disk-store';
import { BrightDbV2MissingBlockError } from './disk-store';
import { PortableBrightDb } from './portable-database';

/** A minimal non-disk storage, as an adapter over another block store would be. */
class MemoryStorage implements BrightDbV2Storage {
  readonly blocks = new Map<string, Uint8Array>();
  head = '';
  private chain: Promise<unknown> = Promise.resolve();

  constructor(
    readonly writerId: Uint8Array,
    readonly encryptsAtRest = false,
  ) {}

  static create(databaseId: string, writer: number, encrypts = false): MemoryStorage {
    const storage = new MemoryStorage(Buffer.alloc(16, writer), encrypts);
    const root = encodeMetadata({ kind: 'database', databaseId, clock: 0n, catalog: null });
    storage.head = digestPayload(root);
    storage.blocks.set(storage.head, root);
    return storage;
  }

  copy(writer: number): MemoryStorage {
    const storage = new MemoryStorage(Buffer.alloc(16, writer), this.encryptsAtRest);
    for (const [digest, bytes] of this.blocks) storage.blocks.set(digest, bytes);
    storage.head = this.head;
    return storage;
  }

  async readHead(): Promise<string> {
    return this.head;
  }
  async readBlock(digest: string): Promise<Uint8Array> {
    const bytes = this.blocks.get(digest);
    if (!bytes) throw new BrightDbV2MissingBlockError(digest);
    return bytes;
  }
  async hasBlock(digest: string): Promise<boolean> {
    return this.blocks.has(digest);
  }
  withWriteLock<T>(write: (writer: BrightDbV2DiskWriter) => Promise<T>): Promise<T> {
    const run = this.chain.then(() => {
      const writer: BrightDbV2DiskWriter = {
        writeBlock: async (payload) => {
          const digest = digestPayload(payload);
          this.blocks.set(digest, Buffer.from(payload));
          return digest;
        },
        writeBlocks: async (payloads) => {
          for (const payload of payloads) this.blocks.set(digestPayload(payload), Buffer.from(payload));
        },
        syncBlocks: async () => undefined,
        publishHead: async (digest) => {
          if (!this.blocks.has(digest)) throw new BrightDbV2MissingBlockError(digest);
          this.head = digest;
        },
      };
      return write(writer);
    });
    this.chain = run.catch(() => undefined);
    return run;
  }
}

const DATABASE_ID = '101112131415161718191a1b1c1d1e1f';

describe('BrightDB v2 over another storage', () => {
  it('runs documents, indexes, attachments and merges over a non-disk storage', async () => {
    const storageA = MemoryStorage.create(DATABASE_ID, 1);
    const a = await PortableBrightDb.open({ storage: storageA });
    await a.collection('people').createIndex('by_city', ['city']);
    await a.collection('people').insertMany([
      { _id: 'p1', city: 'Oslo' },
      { _id: 'p2', city: 'Bergen' },
    ]);
    const ref = await a.putAttachment(Buffer.from('file contents'), { type: 'text/plain' });
    await a.collection('people').insertOne({ _id: 'p3', city: 'Oslo', _files: { f: { ...ref } } });
    expect((await a.collection('people').findByIndex('by_city', { equals: ['Oslo'] })).map((d) => d['_id'])).toEqual(['p1', 'p3']);
    expect((await a.getAttachment(ref)).toString()).toBe('file contents');

    const storageB = storageA.copy(2);
    const b = await PortableBrightDb.open({ storage: storageB });
    await a.collection('people').insertOne({ _id: 'from-a', city: 'Oslo' });
    await b.collection('people').insertOne({ _id: 'from-b', city: 'Bergen' });
    await a.merge(b);
    await b.merge(a);
    expect(await a.root()).toBe(await b.root());
    expect((await a.collection('people').findByIndex('by_city', {})).map((d) => d['_id']).sort()).toEqual(['from-a', 'from-b', 'p1', 'p2', 'p3']);
    await expect(a.fork('/tmp/never-created')).rejects.toThrow(/directory store/u);
    a.close();
    b.close();
  });

  it('refuses to add encryption over a storage that already encrypts', async () => {
    const key = Buffer.alloc(32, 7);
    const encrypting = MemoryStorage.create(DATABASE_ID, 1, true);
    await expect(PortableBrightDb.open({ storage: encrypting, encryption: { key } })).rejects.toThrow(/already encrypts/u);
    // Without the option it opens: the storage protects the blocks itself.
    const db = await PortableBrightDb.open({ storage: encrypting });
    await db.collection('c').insertOne({ _id: 'a' });
    expect(await db.collection('c').findById('a')).toEqual({ _id: 'a' });
    db.close();

    // A plain storage cannot take the option either: the cipher belongs to the directory store.
    await expect(
      PortableBrightDb.open({ storage: MemoryStorage.create(DATABASE_ID, 2), encryption: { key } }),
    ).rejects.toThrow(/its own directory store/u);
  });

  it('needs exactly one of a path and a storage', async () => {
    await expect(PortableBrightDb.open({})).rejects.toThrow(/path or a storage/u);
    await expect(
      PortableBrightDb.open({ path: '/tmp/x', storage: MemoryStorage.create(DATABASE_ID, 1) }),
    ).rejects.toThrow(/not both/u);
  });
});
