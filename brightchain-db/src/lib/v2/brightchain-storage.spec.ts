import { BlockSize, PooledMemoryBlockStore } from '@brightchain/brightchain-lib';
import { InMemoryHeadRegistry } from '../headRegistry';
import { HttpBlockSource, serveBlocks } from './block-source';
import { BrightChainV2Storage, headCollection } from './brightchain-storage';
import { BrightDbV2StorageError } from './disk-store';
import { BrightDbV2AesCipher } from './encryption';
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
    await expect(db.collection('c').insertOne({ _id: 'a' })).rejects.toThrow(/ciphertext hash/u);
    db.close();
    expect(() => new BrightChainV2Storage({ store, poolId: 'p', headRegistry, dbName: 'x', writerId: Buffer.alloc(16) })).toThrow(BrightDbV2StorageError);
  });
});

describe('BrightDB v2 over an encrypting BrightChain pool', () => {
  const key = Buffer.alloc(32, 5);
  const options = (extra: object = {}) => ({
    store: new PooledMemoryBlockStore(BlockSize.Small),
    poolId: 'secure',
    headRegistry: new InMemoryHeadRegistry(),
    dbName: 'app',
    poolEncryption: { key },
    ...extra,
  });

  it('keeps sealed blocks under keyed names so the pool never sees a plaintext digest', async () => {
    const opts = options();
    const storage = await BrightChainV2Storage.openOrCreate(opts);
    const db = await PortableBrightDb.open({ storage });
    await db.collection('people').createIndex('by_city', ['city']);
    const secret = 'pool-secret-note';
    await db.collection('people').insertMany([
      { _id: 'a', city: 'Oslo', note: secret },
      { _id: 'b', city: 'Bergen', note: secret },
    ]);
    const ref = await db.putAttachment(Buffer.from(`file ${secret}`));
    await db.collection('people').insertOne({ _id: 'c', city: 'Oslo', _files: { f: { ...ref } } });
    expect((await db.collection('people').findByIndex('by_city', { equals: ['Oslo'] })).map((d) => d['_id'])).toEqual(['a', 'c']);
    expect((await db.getAttachment(ref)).toString()).toContain(secret);

    // Nothing in the pool is named by a plaintext digest or contains plaintext.
    const root = await db.root();
    expect(await opts.store.hasInPool('secure', root)).toBe(false);
    const registryValue = opts.headRegistry.getHead('app', headCollection('secure')) as string;
    expect(registryValue).not.toBe(root);
    expect(registryValue).not.toContain(root);
    let blocks = 0;
    for await (const name of opts.store.listBlocksInPool('secure')) {
      const bytes = await opts.store.getFromPool('secure', name);
      expect(Buffer.from(bytes).includes(Buffer.from(secret))).toBe(false);
      expect(await storage.hasBlock(name)).toBe(false); // names are not digests
      blocks++;
    }
    expect(blocks).toBeGreaterThan(5);
    db.close();

    // Reopening needs the same key.
    const again = await PortableBrightDb.open({ storage: await BrightChainV2Storage.openOrCreate(opts) });
    expect(await again.root()).toBe(root);
    again.close();
    const wrong = new BrightChainV2Storage({ ...opts, poolEncryption: { key: Buffer.alloc(32, 6) } });
    await expect(wrong.readHead()).rejects.toThrow(/Cannot decrypt the database head/u);
  });

  it('detects a block moved to another name, refuses BrightDB encryption, and needs named-block support', async () => {
    const opts = options();
    const storage = await BrightChainV2Storage.openOrCreate(opts);
    await expect(PortableBrightDb.open({ storage, encryption: { key } })).rejects.toThrow(/already encrypts/u);
    const db = await PortableBrightDb.open({ storage });
    await db.collection('c').insertOne({ _id: 'a', v: 1 });
    const older = await db.root();
    await db.collection('c').insertOne({ _id: 'b', v: 2 });
    const newer = await db.root();
    expect((await storage.readBlock(older)).length).toBeGreaterThan(0);

    // Put the newer root's sealed bytes under the older root's name: the seal is bound to the name.
    const cipher = new BrightDbV2AesCipher(key);
    const olderName = cipher.physicalName(older);
    const newerBytes = await opts.store.getFromPool('secure', cipher.physicalName(newer));
    await opts.store.deleteFromPool('secure', olderName);
    await (opts.store.putInPoolWithId as NonNullable<typeof opts.store.putInPoolWithId>)('secure', olderName, newerBytes);
    await expect(storage.readBlock(older)).rejects.toThrow(/cannot be decrypted/u);
    db.close();

    const withoutNamed = Object.create(opts.store) as PooledMemoryBlockStore;
    (withoutNamed as unknown as { putInPoolWithId?: unknown }).putInPoolWithId = undefined;
    expect(() => new BrightChainV2Storage({ ...opts, store: withoutNamed })).toThrow(/named blocks/u);
  });

  it('syncs an encrypting pool node with another node holding the same key, through merge', async () => {
    const a = await PortableBrightDb.open({ storage: await BrightChainV2Storage.openOrCreate(options()) });
    await a.collection('docs').insertMany([{ _id: 'one' }, { _id: 'two' }]);
    const b = await PortableBrightDb.open({
      storage: await BrightChainV2Storage.joinFrom(options(), a.blockSource()),
    });
    expect(await b.root()).toBe(await a.root());
    await a.collection('docs').insertOne({ _id: 'from-a' });
    await b.collection('docs').insertOne({ _id: 'from-b' });
    await a.merge(b);
    await b.merge(a);
    expect(await a.root()).toBe(await b.root());
    expect((await a.collection('docs').find({}).toArray()).map((d) => d['_id']).sort()).toEqual(['from-a', 'from-b', 'one', 'two']);
    a.close();
    b.close();
  });
});

describe('PooledMemoryBlockStore.putInPoolWithId', () => {
  it('stores bytes under the given name, idempotently, and rejects malformed names', async () => {
    const store = new PooledMemoryBlockStore(BlockSize.Small);
    const id = 'cd'.repeat(64);
    await store.putInPoolWithId('p', id, Buffer.from('ciphertext'));
    await store.putInPoolWithId('p', id, Buffer.from('ignored second write'));
    expect(Buffer.from(await store.getFromPool('p', id)).toString()).toBe('ciphertext');
    expect(await store.hasInPool('p', id)).toBe(true);
    expect(await store.hasInPool('other', id)).toBe(false);
    await expect(store.putInPoolWithId('p', 'not-hex', Buffer.from('x'))).rejects.toThrow(/128 lowercase/u);
    await expect(store.putInPoolWithId('bad pool!', id, Buffer.from('x'))).rejects.toThrow(/Invalid pool ID/u);
  });
});

describe('BrightDB v2 in an encrypting pool across a key rotation', () => {
  it('keeps names and old data, seals new data with the new key, and shuts out the old key', async () => {
    const nameSecret = Buffer.alloc(32, 31);
    const ring1 = { nameSecret, dataKeys: { 1: Buffer.alloc(32, 32) }, currentVersion: 1 };
    const ring2 = { nameSecret, dataKeys: { 1: Buffer.alloc(32, 32), 2: Buffer.alloc(32, 33) }, currentVersion: 2 };
    const base = {
      store: new PooledMemoryBlockStore(BlockSize.Small),
      poolId: 'secure',
      headRegistry: new InMemoryHeadRegistry(),
      dbName: 'app',
    };
    const first = await PortableBrightDb.open({
      storage: await BrightChainV2Storage.openOrCreate({ ...base, poolEncryption: { keyRing: ring1 } }),
    });
    await first.collection('c').insertMany([{ _id: 'a' }, { _id: 'b' }]);
    const root = await first.root();
    first.close();

    const rotated = await PortableBrightDb.open({
      storage: await BrightChainV2Storage.openOrCreate({ ...base, poolEncryption: { keyRing: ring2 } }),
    });
    expect(await rotated.root()).toBe(root);
    expect(await rotated.collection('c').findById('a')).toEqual({ _id: 'a' });
    await rotated.collection('c').insertOne({ _id: 'c' });
    expect((await rotated.collection('c').find({}).toArray()).map((d) => d['_id'])).toHaveLength(3);
    rotated.close();

    const old = new BrightChainV2Storage({ ...base, poolEncryption: { keyRing: ring1 } });
    await expect(old.readHead()).rejects.toThrow(/Cannot decrypt the database head/u);
  });
});
