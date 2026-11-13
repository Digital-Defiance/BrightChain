import { MemoryV2Storage } from './memory-storage';
import { PortableBrightDb } from './portable-database';

const DATABASE_ID = '101112131415161718191a1b1c1d1e1f';

describe('BrightDB v2 over another storage', () => {
  it('runs documents, indexes, attachments and merges over a non-disk storage', async () => {
    const storageA = MemoryV2Storage.create(DATABASE_ID, Buffer.alloc(16, 1));
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

    const storageB = storageA.copy(Buffer.alloc(16, 2));
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
    const encrypting = MemoryV2Storage.create(DATABASE_ID, Buffer.alloc(16, 1), true);
    await expect(PortableBrightDb.open({ storage: encrypting, encryption: { key } })).rejects.toThrow(/already encrypts/u);
    // Without the option it opens: the storage protects the blocks itself.
    const db = await PortableBrightDb.open({ storage: encrypting });
    await db.collection('c').insertOne({ _id: 'a' });
    expect(await db.collection('c').findById('a')).toEqual({ _id: 'a' });
    db.close();

    // A plain storage cannot take the option either: the cipher belongs to the directory store.
    await expect(
      PortableBrightDb.open({ storage: MemoryV2Storage.create(DATABASE_ID, Buffer.alloc(16, 2)), encryption: { key } }),
    ).rejects.toThrow(/its own directory store/u);
  });

  it('needs exactly one of a path and a storage', async () => {
    await expect(PortableBrightDb.open({})).rejects.toThrow(/path or a storage/u);
    await expect(
      PortableBrightDb.open({ path: '/tmp/x', storage: MemoryV2Storage.create(DATABASE_ID, Buffer.alloc(16, 1)) }),
    ).rejects.toThrow(/not both/u);
  });
});
