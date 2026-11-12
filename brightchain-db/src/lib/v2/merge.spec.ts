import { mkdtemp, rm, unlink } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { readdir } from 'node:fs/promises';
import { digestPayload, encodeDocument } from './codec';
import { BrightDbV2MissingBlockError } from './disk-store';
import { PortableBrightDb } from './portable-database';

describe('BrightDB v2 fork and merge', () => {
  let dir: string;
  beforeEach(async () => {
    dir = await mkdtemp(join(tmpdir(), 'brightdb-v2-merge-'));
  });
  afterEach(async () => {
    await rm(dir, { recursive: true, force: true });
  });

  type Doc = { _id: string; v?: number; city?: string; age?: number };
  const open = (name: string) => PortableBrightDb.open({ path: join(dir, name) });
  const dump = async (db: PortableBrightDb) => {
    const out: Record<string, unknown[]> = {};
    for (const name of (await db.listCollections()).sort()) {
      out[name] = (await db.collection(name).find({}).toArray()).sort((a, b) =>
        String(a['_id']) < String(b['_id']) ? -1 : 1,
      );
    }
    return out;
  };

  async function base(): Promise<PortableBrightDb> {
    const a = await open('a');
    await a.collection<Doc>('docs').insertMany([
      { _id: 'one', v: 1 },
      { _id: 'two', v: 2 },
      { _id: 'three', v: 3 },
    ]);
    return a;
  }

  it('forks with the same database but a new writer, and merges both ways to the same root', async () => {
    const a = await base();
    const b = await a.fork(join(dir, 'b'));
    expect(await b.root()).toBe(await a.root());
    await a.collection<Doc>('docs').insertOne({ _id: 'from-a', v: 10 });
    await a.collection<Doc>('docs').replaceById('one', { _id: 'one', v: 100 });
    await b.collection<Doc>('docs').insertOne({ _id: 'from-b', v: 20 });
    await b.collection<Doc>('docs').deleteById('two');
    await b.collection<Doc>('other').insertOne({ _id: 'x' });

    const ab = await a.merge(b);
    expect(ab.root).not.toBe(ab.previous);
    const ba = await b.merge(a);
    expect(ba.root).toBe(ab.root);
    expect(await a.root()).toBe(await b.root());
    expect(await dump(a)).toEqual({
      docs: [
        { _id: 'from-a', v: 10 },
        { _id: 'from-b', v: 20 },
        { _id: 'one', v: 100 },
        { _id: 'three', v: 3 },
      ],
      other: [{ _id: 'x' }],
    });
    // Merging again changes nothing.
    expect((await a.merge(b)).root).toBe(ab.root);
    a.close();
    b.close();
  });

  it('picks the greater version and lets a deletion beat an equal version', async () => {
    const a = await base();
    const b = await a.fork(join(dir, 'b'));
    // Concurrent edits to the same document: the greater (counter, writerId) wins on both sides.
    await a.collection<Doc>('docs').replaceById('one', { _id: 'one', v: 11 });
    await b.collection<Doc>('docs').replaceById('one', { _id: 'one', v: 22 });
    await b.collection<Doc>('docs').replaceById('one', { _id: 'one', v: 23 });
    await a.merge(b);
    await b.merge(a);
    expect(await a.root()).toBe(await b.root());
    expect((await a.collection<Doc>('docs').findById('one'))?.v).toBe(23);

    // A deletion with a greater version beats an older live copy ("stale write after delete").
    const c = await a.fork(join(dir, 'c'));
    await c.collection<Doc>('docs').deleteById('three');
    await a.collection<Doc>('docs').replaceById('two', { _id: 'two', v: 200 });
    await a.merge(c);
    expect(await a.collection<Doc>('docs').findById('three')).toBeNull();
    await c.merge(a);
    expect(await c.root()).toBe(await a.root());
    a.close();
    b.close();
    c.close();
  });

  it('gives the same root whatever order three partitioned replicas merge in', async () => {
    const origin = await base();
    const replicas = [origin, await origin.fork(join(dir, 'r1')), await origin.fork(join(dir, 'r2'))];
    for (const [index, replica] of replicas.entries()) {
      await replica.collection<Doc>('docs').insertMany(
        Array.from({ length: 5 }, (_, i) => ({ _id: `r${index}-${i}`, v: index })),
      );
      await replica.collection<Doc>(`c${index}`).insertOne({ _id: 'only', v: index });
    }
    const [x, y, z] = replicas;
    // Order 1: x <- y, x <- z.  Order 2: z <- y, z <- x.  Order 3: y <- z, y <- x.
    await x.merge(y);
    await x.merge(z);
    await z.merge(y);
    await z.merge(x);
    await y.merge(z);
    await y.merge(x);
    const roots = [await x.root(), await y.root(), await z.root()];
    expect(new Set(roots).size).toBe(1);
    expect((await dump(x))['docs']).toHaveLength(3 + 15);
    for (const r of replicas) r.close();
  });

  it('replaces a collection that was dropped and recreated with a newer generation', async () => {
    const a = await base();
    const b = await a.fork(join(dir, 'b'));
    await a.writeBatch([
      { type: 'dropCollection', collection: 'docs' },
      { type: 'insert', collection: 'docs', document: { _id: 'fresh', v: 1 } },
    ]);
    // b keeps writing into the old generation, including a "stale" write after the drop.
    await b.collection<Doc>('docs').insertOne({ _id: 'stale', v: 9 });
    await a.merge(b);
    await b.merge(a);
    expect(await a.root()).toBe(await b.root());
    expect((await dump(a))['docs']).toEqual([{ _id: 'fresh', v: 1 }]);

    // A plain drop wins over an older generation too.
    const c = await a.fork(join(dir, 'c'));
    await a.writeBatch([{ type: 'dropCollection', collection: 'docs' }]);
    await c.collection<Doc>('docs').insertOne({ _id: 'late', v: 1 });
    await c.merge(a);
    expect(await c.listCollections()).toEqual([]);
    a.close();
    b.close();
    c.close();
  });

  it('merges indexes, including one that exists on only one side', async () => {
    const a = await open('a');
    const people = a.collection<Doc>('people');
    await people.createIndex('by_city', ['city']);
    await people.insertMany([
      { _id: 'p1', city: 'Oslo', age: 30 },
      { _id: 'p2', city: 'Bergen', age: 40 },
    ]);
    const b = await a.fork(join(dir, 'b'));
    await a.collection<Doc>('people').insertOne({ _id: 'p3', city: 'Oslo', age: 20 });
    await a.collection<Doc>('people').replaceById('p2', { _id: 'p2', city: 'Oslo', age: 41 });
    await b.collection<Doc>('people').insertOne({ _id: 'p4', city: 'Bergen', age: 25 });
    await b.collection<Doc>('people').createIndex('by_age', ['age']);
    await b.collection<Doc>('people').deleteById('p1');

    await a.merge(b);
    await b.merge(a);
    expect(await a.root()).toBe(await b.root());
    const ids = async (db: PortableBrightDb, index: string, query: object) =>
      (await db.collection<Doc>('people').findByIndex(index, query)).map((d) => d._id);
    for (const db of [a, b]) {
      expect(await ids(db, 'by_city', { equals: ['Oslo'] })).toEqual(['p2', 'p3']);
      expect(await ids(db, 'by_city', { equals: ['Bergen'] })).toEqual(['p4']);
      expect(await ids(db, 'by_age', { gte: 25 })).toEqual(['p4', 'p2']);
    }
    a.close();
    b.close();
  });

  it('copies attachments referenced by adopted documents', async () => {
    const a = await open('a');
    await a.collection('docs').insertOne({ _id: 'seed' });
    const b = await a.fork(join(dir, 'b'));
    const ref = await b.putAttachment(Buffer.alloc(1_500_000, 3), { type: 'application/octet-stream' });
    await b.collection('docs').insertOne({ _id: 'with-file', _files: { f: { ...ref } } });
    await a.merge(b);
    expect((await a.getAttachment(ref)).length).toBe(1_500_000);
    a.close();
    b.close();
  });

  it('publishes nothing when a needed block is missing, and refuses another database', async () => {
    const a = await base();
    const b = await a.fork(join(dir, 'b'));
    await b.collection<Doc>('docs').insertOne({ _id: 'new', v: 1 });
    const before = await a.root();
    // Remove every block of b that a does not have, except the metadata needed to reach the
    // new document, as if b were only partly copied.
    const files = await readdir(join(dir, 'b', 'blocks'), { recursive: true });
    const aFiles = new Set((await readdir(join(dir, 'a', 'blocks'), { recursive: true })).map(String));
    const documentDigest = digestPayload(encodeDocument({ _id: 'new', v: 1 }));
    let removed = 0;
    for (const file of files) {
      const name = String(file);
      if (name.endsWith(documentDigest) && !aFiles.has(name)) {
        await unlink(join(dir, 'b', 'blocks', name));
        removed++;
      }
    }
    expect(removed).toBeGreaterThan(0);
    await expect(a.merge(b)).rejects.toThrow(BrightDbV2MissingBlockError);
    expect(await a.root()).toBe(before);
    expect((await a.collection<Doc>('docs').find({}).toArray()).length).toBe(3);

    const other = await open('other');
    await other.collection('docs').insertOne({ _id: 'x' });
    await expect(a.merge(other)).rejects.toThrow(/different databases/u);
    for (const db of [a, b, other]) db.close();
  });
});
