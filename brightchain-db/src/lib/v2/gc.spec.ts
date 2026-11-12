import { mkdtemp, readdir, rm, utimes } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { BrightDbV2MissingBlockError } from './disk-store';
import { PortableBrightDb } from './portable-database';

describe('BrightDB v2 garbage collection', () => {
  let dir: string;
  beforeEach(async () => {
    dir = await mkdtemp(join(tmpdir(), 'brightdb-v2-gc-'));
  });
  afterEach(async () => {
    await rm(dir, { recursive: true, force: true });
  });

  const count = async (path: string) =>
    (await readdir(join(path, 'blocks'), { recursive: true, withFileTypes: true })).filter((e) => e.isFile()).length;

  it('removes blocks no root reaches, keeps the live database intact, and reports a dry run first', async () => {
    const path = join(dir, 'db');
    const db = await PortableBrightDb.open({ path });
    await db.collection('docs').createIndex('by_n', ['n']);
    await db.collection('docs').insertMany(Array.from({ length: 300 }, (_, i) => ({ _id: `d${i}`, n: i })));
    for (let round = 0; round < 5; round++) {
      for (let i = 0; i < 20; i++) await db.collection('docs').replaceById(`d${i}`, { _id: `d${i}`, n: 1000 * (round + 1) + i });
    }
    await db.collection('docs').deleteById('d299');
    const before = await count(path);

    const dry = await db.collectGarbage({ graceMs: 0, dryRun: true });
    expect(dry.removed).toBeGreaterThan(50);
    expect(await count(path)).toBe(before);

    const real = await db.collectGarbage({ graceMs: 0 });
    expect(real.removed).toBe(dry.removed);
    expect(real.bytesFreed).toBeGreaterThan(0);
    expect(await count(path)).toBe(before - real.removed);

    // The live database still reads in full, queries by index, and a second pass finds nothing.
    expect(await db.collection('docs').find({}).toArray()).toHaveLength(299);
    expect((await db.collection('docs').findByIndex('by_n', { gte: 5000, lt: 5020 })).map((d) => d['_id'])).toHaveLength(20);
    expect((await db.collectGarbage({ graceMs: 0 })).removed).toBe(0);
    await db.collection('docs').insertOne({ _id: 'after', n: -1 });
    expect(await db.collection('docs').findById('after')).toEqual({ _id: 'after', n: -1 });
    db.close();
  });

  it('keeps older roots you ask for, and loses the ones you do not', async () => {
    const db = await PortableBrightDb.open({ path: join(dir, 'db') });
    await db.collection('c').insertMany(Array.from({ length: 50 }, (_, i) => ({ _id: `d${i}`, v: 0 })));
    const keep = await db.root();
    const lose = (await db.collection('c').replaceById('d1', { _id: 'd1', v: 1 }), await db.root());
    await db.collection('c').replaceById('d2', { _id: 'd2', v: 2 });
    await db.collectGarbage({ graceMs: 0, keepRoots: [keep] });
    expect(await (await db.at(keep)).collection('c').findById('d1')).toEqual({ _id: 'd1', v: 0 });
    await expect(db.at(lose)).rejects.toThrow(BrightDbV2MissingBlockError);
    expect(await db.collection('c').findById('d1')).toEqual({ _id: 'd1', v: 1 });
    db.close();
  });

  it('keeps attachments a document references, drops unreferenced ones after the grace period, and honours the grace period', async () => {
    const path = join(dir, 'db');
    const db = await PortableBrightDb.open({ path });
    const used = await db.putAttachment(Buffer.alloc(1_500_000, 1));
    const unused = await db.putAttachment(Buffer.alloc(1_500_000, 2));
    await db.collection('docs').insertOne({ _id: 'with-file', _files: { f: { ...used } } });

    // Recent blocks survive a default-grace run, including the unreferenced file.
    const recent = await db.collectGarbage();
    expect(recent.removed).toBe(0);
    expect(recent.keptRecent).toBeGreaterThan(0);
    expect((await db.getAttachment(unused)).length).toBe(unused.size);

    // Old enough, and the unreferenced file goes while the referenced one stays.
    const old = new Date(Date.now() - 2 * 3_600_000);
    for (const entry of await readdir(join(path, 'blocks'), { recursive: true, withFileTypes: true })) {
      if (entry.isFile()) await utimes(join(entry.parentPath, entry.name), old, old);
    }
    const result = await db.collectGarbage();
    expect(result.removed).toBeGreaterThan(0);
    await expect(db.getAttachment(unused)).rejects.toThrow();
    expect((await db.getAttachment(used)).length).toBe(used.size);
    db.close();
  });

  it('collects an encrypted store and leftover temporary files', async () => {
    const path = join(dir, 'db');
    const db = await PortableBrightDb.open({ path, encryption: { key: Buffer.alloc(32, 4) } });
    await db.collection('c').insertMany(Array.from({ length: 40 }, (_, i) => ({ _id: `d${i}`, v: 0 })));
    for (let i = 0; i < 10; i++) await db.collection('c').replaceById(`d${i}`, { _id: `d${i}`, v: 1 });
    const result = await db.collectGarbage({ graceMs: 0 });
    expect(result.removed).toBeGreaterThan(0);
    expect(await db.collection('c').find({}).toArray()).toHaveLength(40);
    db.close();
    const again = await PortableBrightDb.open({ path, encryption: { key: Buffer.alloc(32, 4) } });
    expect(await again.collection('c').findById('d3')).toEqual({ _id: 'd3', v: 1 });
    again.close();
  });
});
