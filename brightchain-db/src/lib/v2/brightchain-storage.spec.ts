import { BlockSize, PooledMemoryBlockStore } from '@brightchain/brightchain-lib';
import { InMemoryHeadRegistry } from '../headRegistry';
import { HttpBlockSource, serveBlocks } from './block-source';
import { BrightChainV2Storage, headCollection } from './brightchain-storage';
import { BrightDbV2StorageError } from './disk-store';
import { PortableBrightDb } from './portable-database';

describe('BrightDB v2 over a BrightChain pool', () => {
  const setup = () => {
    const store = new PooledMemoryBlockStore(BlockSize.Small);
    const headRegistry = new InMemoryHeadRegistry();
    const open = async (poolId: string, dbName = 'app', extra: object = {}) => {
      const storage = await BrightChainV2Storage.openOrCreate({ store, poolId, headRegistry, dbName, ...extra });
      return { storage, db: await PortableBrightDb.open({ storage }) };
    };
    return { store, headRegistry, open };
  };

  it('runs documents, indexes, attachments and diffs in a pool and records the head in the registry', async () => {
    const { store, headRegistry, open } = setup();
    const { db } = await open('pool-a');
    await db.collection('people').createIndex('by_city', ['city']);
    await db.collection('people').insertMany([
      { _id: 'p1', city: 'Oslo' },
      { _id: 'p2', city: 'Bergen' },
    ]);
    const before = await db.root();
    const ref = await db.putAttachment(Buffer.alloc(1_500_000, 4));
    await db.collection('people').insertOne({ _id: 'p3', city: 'Oslo', _files: { f: { ...ref } } });
    expect((await db.collection('people').findByIndex('by_city', { equals: ['Oslo'] })).map((d) => d['_id'])).toEqual(['p1', 'p3']);
    expect((await db.getAttachment(ref)).length).toBe(1_500_000);

    // The registry holds the root, and the blocks are in that pool and no other.
    expect(headRegistry.getHead('app', headCollection('pool-a'))).toBe(await db.root());
    expect(await store.hasInPool('pool-a', await db.root())).toBe(true);
    expect(await store.hasInPool('pool-b', await db.root())).toBe(false);
    const changes: string[] = [];
    for await (const change of db.diff(before, await db.root())) changes.push(`${change.id}:${change.type}`);
    expect(changes).toEqual(['p3:added']);
    db.close();
  });

  it('reopens an existing database and keeps two databases and two pools apart', async () => {
    const { open } = setup();
    const first = await open('pool-a', 'one');
    await first.db.collection('c').insertOne({ _id: 'a', v: 1 });
    const root = await first.db.root();
    first.db.close();

    const again = await open('pool-a', 'one');
    expect(await again.db.root()).toBe(root);
    expect(await again.db.collection('c').findById('a')).toEqual({ _id: 'a', v: 1 });

    const other = await open('pool-a', 'two');
    expect(await other.db.collection('c').findById('a')).toBeNull();
    const elsewhere = await open('pool-b', 'one');
    expect(await elsewhere.db.collection('c').findById('a')).toBeNull();
    for (const x of [again, other, elsewhere]) x.db.close();
  });

  it('serialises concurrent writers in one process', async () => {
    const { open } = setup();
    const { db } = await open('pool-a');
    await Promise.all(Array.from({ length: 12 }, (_, i) => db.collection('c').insertOne({ _id: `d${i}`, v: i })));
    expect(await db.collection('c').find({}).toArray()).toHaveLength(12);
    db.close();
  });

  it('lets a second node join, then converges through merge, directly and over HTTP', async () => {
    const nodeOptions = (poolId: string) => ({
      store: new PooledMemoryBlockStore(BlockSize.Small),
      poolId,
      headRegistry: new InMemoryHeadRegistry(),
      dbName: 'app',
    });
    const a = await PortableBrightDb.open({ storage: await BrightChainV2Storage.openOrCreate(nodeOptions('node-a')) });
    await a.collection('docs').createIndex('by_n', ['n']);
    await a.collection('docs').insertMany(Array.from({ length: 50 }, (_, i) => ({ _id: `d${i}`, n: i })));
    const ref = await a.putAttachment(Buffer.alloc(70 * 1_048_576 + 5, 2)); // a depth-1 manifest tree
    await a.collection('docs').insertOne({ _id: 'file', n: -1, _files: { f: { ...ref } } });

    // Node B joins by copying A's state from its block source; same database ID, new pool.
    const b = await PortableBrightDb.open({
      storage: await BrightChainV2Storage.joinFrom(nodeOptions('node-b'), a.blockSource()),
    });
    expect(await b.root()).toBe(await a.root());
    expect((await b.getAttachment(ref)).length).toBe(ref.size);

    await a.collection('docs').insertOne({ _id: 'from-a', n: 100 });
    await b.collection('docs').replaceById('d3', { _id: 'd3', n: 333 });
    await a.merge(b);
    await b.merge(a);
    expect(await a.root()).toBe(await b.root());
    expect((await b.collection('docs').findByIndex('by_n', { gte: 100 })).map((d) => d['_id'])).toEqual(['from-a', 'd3']);

    // Node C joins and syncs over HTTP from A.
    const server = await serveBlocks(a.blockSource(), { token: 't' });
    try {
      const source = new HttpBlockSource(server.url, { token: 't' });
      const c = await PortableBrightDb.open({
        storage: await BrightChainV2Storage.joinFrom(nodeOptions('node-c'), source),
      });
      expect(await c.root()).toBe(await a.root());
      await a.collection('docs').insertOne({ _id: 'late', n: 7 });
      await c.merge(source);
      expect(await c.collection('docs').findById('late')).toEqual({ _id: 'late', n: 7 });
      c.close();
    } finally {
      await server.close();
    }
    a.close();
    b.close();
  });

  it('refuses a pool that names blocks differently, and an encrypting pool', async () => {
    const store = new PooledMemoryBlockStore(BlockSize.Small);
    const headRegistry = new InMemoryHeadRegistry();
    // A pool that stores different bytes than it was given, as an encrypting store would.
    const altering = Object.create(store) as PooledMemoryBlockStore;
    altering.putInPool = async (pool, data, options) =>
      store.putInPool(pool, Buffer.concat([Buffer.from([1]), Buffer.from(data)]), options);
    await expect(
      BrightChainV2Storage.openOrCreate({ store: altering, poolId: 'p', headRegistry, dbName: 'x' }),
    ).rejects.toThrow(/named a block differently/u);

    const encrypted = await BrightChainV2Storage.openOrCreate({ store, poolId: 'plain', headRegistry, dbName: 'ok' });
    const marked = new BrightChainV2Storage({ store, poolId: 'plain', headRegistry, dbName: 'ok', poolEncrypts: true });
    expect(encrypted.encryptsAtRest).toBe(false);
    expect(marked.encryptsAtRest).toBe(true);
    await expect(PortableBrightDb.open({ storage: marked, encryption: { key: Buffer.alloc(32, 1) } })).rejects.toThrow(/already encrypts/u);
    const db = await PortableBrightDb.open({ storage: marked });
    await expect(db.collection('c').insertOne({ _id: 'a' })).rejects.toThrow(/encrypting pool is not supported yet/u);
    db.close();
    expect(() => new BrightChainV2Storage({ store, poolId: 'p', headRegistry, dbName: 'x', writerId: Buffer.alloc(16) })).toThrow(BrightDbV2StorageError);
  });
});
