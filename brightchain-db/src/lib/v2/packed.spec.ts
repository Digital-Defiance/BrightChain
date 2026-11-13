import { appendFile, copyFile, mkdtemp, open, readdir, readFile, rm, truncate, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { BrightDbV2StorageError } from './storage';
import { PortableBrightDb } from './portable-database';

async function filesUnder(root: string): Promise<string[]> {
  const out: string[] = [];
  const walk = async (dir: string) => {
    for (const entry of await readdir(dir, { withFileTypes: true })) {
      const path = join(dir, entry.name);
      if (entry.isDirectory()) await walk(path);
      else out.push(path);
    }
  };
  await walk(root);
  return out;
}

const packsOf = async (path: string) => (await readdir(join(path, 'packs')).catch(() => [])).filter((n) => n.endsWith('.pack'));
const looseOf = async (path: string) => filesUnder(join(path, 'blocks'));

describe('BrightDB v2 packed extension', () => {
  let dir: string;
  beforeEach(async () => {
    dir = await mkdtemp(join(tmpdir(), 'brightdb-v2-packed-'));
  });
  afterEach(async () => {
    await rm(dir, { recursive: true, force: true });
  });

  const docs = (n: number, tag = 'a') => Array.from({ length: n }, (_, i) => ({ _id: `${tag}${i}`, n: i }));

  it('writes a commit as one pack, reads it back, and a second connection sees later commits', async () => {
    const path = join(dir, 'db');
    const db = await PortableBrightDb.open({ path, packed: true });
    const looseBefore = (await looseOf(path)).length; // the initial root is written loose
    await db.collection('c').createIndex('by_n', ['n']);
    await db.collection('c').insertMany(docs(500));
    expect((await looseOf(path)).length).toBe(looseBefore); // nothing new is loose
    expect((await packsOf(path)).length).toBeGreaterThanOrEqual(2);
    expect(await readFile(join(path, 'PACKED'), 'utf8')).toBe('BrightDB packs 1\n');

    const other = await PortableBrightDb.open({ path });
    expect((await other.collection('c').find({}).toArray()).length).toBe(500);
    expect(await other.collection('c').findByIndex('by_n', { equals: [7] })).toEqual([{ _id: 'a7', n: 7 }]);
    await db.collection('c').insertOne({ _id: 'late', n: -1 });
    expect(await other.collection('c').findById('late')).toEqual({ _id: 'late', n: -1 });
    other.close();
    db.close();

    const reopened = await PortableBrightDb.open({ path });
    expect((await reopened.collection('c').find({}).toArray()).length).toBe(501);
    reopened.close();
  });

  it('stores attachments in packs and streams them back', async () => {
    const path = join(dir, 'db');
    const db = await PortableBrightDb.open({ path, packed: true });
    const bytes = Buffer.alloc(2_500_000, 3);
    const ref = await db.putAttachment(bytes);
    await db.collection('c').insertOne({ _id: 'f', _files: { f: { ...ref } } });
    expect((await db.getAttachment(ref)).equals(bytes)).toBe(true);
    db.close();
  });

  it('turns on for a database that already has loose blocks, which keep working', async () => {
    const path = join(dir, 'db');
    const loose = await PortableBrightDb.open({ path });
    await loose.collection('c').insertMany(docs(50));
    loose.close();
    const looseCount = (await looseOf(path)).length;

    const db = await PortableBrightDb.open({ path, packed: true });
    await db.collection('c').insertMany(docs(50, 'b'));
    expect((await looseOf(path)).length).toBe(looseCount);
    expect((await db.collection('c').find({}).toArray()).length).toBe(100);
    db.close();
  });

  it('collects garbage inside packs: rewrites packs, drops dead blocks, keeps live data, honors a dry run', async () => {
    const path = join(dir, 'db');
    const db = await PortableBrightDb.open({ path, packed: true });
    await db.collection('c').insertMany(docs(200));
    for (let round = 0; round < 5; round++) {
      for (let i = 0; i < 10; i++) await db.collection('c').replaceById(`a${i}`, { _id: `a${i}`, n: 1000 * (round + 1) + i });
    }
    await db.collection('c').deleteById('a199');
    const size = async () => (await Promise.all((await packsOf(path)).map(async (p) => (await readFile(join(path, 'packs', p))).length))).reduce((a, b) => a + b, 0);
    const before = await size();

    const dry = await db.collectGarbage({ graceMs: 0, dryRun: true });
    expect(dry.removed).toBeGreaterThan(20);
    expect(await size()).toBe(before);

    const real = await db.collectGarbage({ graceMs: 0 });
    expect(real.removed).toBe(dry.removed);
    expect(await size()).toBeLessThan(before);
    expect((await db.collection('c').find({}).toArray()).length).toBe(199);
    expect(await db.collection('c').findById('a3')).toEqual({ _id: 'a3', n: 5003 });
    expect((await db.collectGarbage({ graceMs: 0 })).removed).toBe(0);
    await db.collection('c').insertOne({ _id: 'after', n: 1 });
    db.close();
    const reopened = await PortableBrightDb.open({ path });
    expect((await reopened.collection('c').find({}).toArray()).length).toBe(200);
    reopened.close();
  });

  it('merges many small packs into one without changing the data', async () => {
    const path = join(dir, 'db');
    const db = await PortableBrightDb.open({ path, packed: true });
    for (let i = 0; i < 12; i++) await db.collection('c').insertOne({ _id: `d${i}`, n: i });
    const root = await db.root();
    expect((await packsOf(path)).length).toBeGreaterThan(5);
    const result = await db.compactPacks();
    expect(result.after).toBe(1);
    expect((await packsOf(path)).length).toBe(1);
    expect(await db.root()).toBe(root);
    expect((await db.collection('c').find({}).toArray()).length).toBe(12);
    db.close();
  });

  it('re-seals blocks inside packs under the new key', async () => {
    const nameSecret = Buffer.alloc(32, 21);
    const k1 = Buffer.alloc(32, 22);
    const k2 = Buffer.alloc(32, 23);
    const ring1 = { nameSecret, dataKeys: { 1: k1 }, currentVersion: 1 };
    const ring2 = { nameSecret, dataKeys: { 1: k1, 2: k2 }, currentVersion: 2 };
    const path = join(dir, 'db');
    const db = await PortableBrightDb.open({ path, packed: true, encryption: { keyRing: ring1 } });
    await db.collection('c').insertMany(docs(60));
    db.close();
    const rotated = await PortableBrightDb.open({ path, encryption: { keyRing: ring2 } });
    await rotated.collection('c').insertOne({ _id: 'late', n: 99 });
    await rotated.collectGarbage({ graceMs: 0 });
    const dry = await rotated.resealBlocks({ dryRun: true });
    expect(dry.resealed).toBeGreaterThan(0);
    const done = await rotated.resealBlocks();
    expect(done.resealed).toBe(dry.resealed);
    expect((await rotated.resealBlocks()).resealed).toBe(0);
    rotated.close();

    const newOnly = await PortableBrightDb.open({ path, encryption: { keyRing: { nameSecret, dataKeys: { 2: k2 }, currentVersion: 2 } } });
    expect((await newOnly.collection('c').find({}).toArray()).length).toBe(61);
    newOnly.close();
  });

  it('fails loudly on a damaged pack and ignores a leftover temporary file', async () => {
    const path = join(dir, 'db');
    const db = await PortableBrightDb.open({ path, packed: true });
    await db.collection('c').insertMany(docs(20));
    db.close();

    // A write that died before the rename leaves only a temporary file.
    await writeFile(join(path, 'packs', '.brightdb-deadbeef.tmp'), 'partial');
    const fine = await PortableBrightDb.open({ path });
    expect((await fine.collection('c').find({}).toArray()).length).toBe(20);
    const swept = await fine.collectGarbage({ graceMs: 0 });
    expect(swept.removed).toBeGreaterThanOrEqual(1);
    expect(await readdir(join(path, 'packs'))).not.toContain('.brightdb-deadbeef.tmp');
    fine.close();

    // A damaged pack is an error, never a silently smaller database.
    const [victim] = await packsOf(path);
    await truncate(join(path, 'packs', victim), 40);
    await expect(
      PortableBrightDb.open({ path }).then((d) => d.collection('c').find({}).toArray()),
    ).rejects.toThrow(BrightDbV2StorageError);
    await appendFile(join(path, 'packs', victim), 'x');
  });

  it('survives a crash between writing a rewritten pack and removing the old one (duplicate blocks)', async () => {
    const path = join(dir, 'db');
    const db = await PortableBrightDb.open({ path, packed: true });
    await db.collection('c').insertMany(docs(100));
    const root = await db.root();
    // Copy every pack under a new name: the state a crash leaves after a rewrite wrote the new pack but not yet removed the old.
    for (const pack of await packsOf(path)) await copyFile(join(path, 'packs', pack), join(path, 'packs', `${'0'.repeat(31)}${pack.slice(0, 1)}.pack`));
    const again = await PortableBrightDb.open({ path });
    expect((await again.collection('c').find({}).toArray()).length).toBe(100);
    expect(await again.root()).toBe(root);
    expect((await again.compactPacks()).after).toBe(1);
    expect((await again.collection('c').find({}).toArray()).length).toBe(100);
    again.close();
    db.close();
  });

  it('never returns wrong data: a flipped byte inside a pack is an error', async () => {
    const path = join(dir, 'db');
    const db = await PortableBrightDb.open({ path, packed: true });
    await db.collection('c').insertMany(docs(30));
    db.close();
    const [victim] = await packsOf(path);
    const handle = await open(join(path, 'packs', victim), 'r+');
    const byte = Buffer.alloc(1);
    await handle.read(byte, 0, 1, 40); // inside the first entry, past the 16-byte header
    byte[0] ^= 0xff;
    await handle.write(byte, 0, 1, 40);
    await handle.close();
    const reopened = await PortableBrightDb.open({ path });
    await expect(reopened.collection('c').find({}).toArray()).rejects.toThrow(/digest mismatch|cannot be decrypted/u);
    reopened.close();
  });

  it('keeps the packed setting through fork and clone', async () => {
    const path = join(dir, 'db');
    const db = await PortableBrightDb.open({ path, packed: true });
    await db.collection('c').insertMany(docs(30));
    const copy = await db.fork(join(dir, 'fork'));
    expect(await readFile(join(dir, 'fork', 'PACKED'), 'utf8')).toBe('BrightDB packs 1\n');
    expect((await copy.collection('c').find({}).toArray()).length).toBe(30);
    await copy.collection('c').insertOne({ _id: 'x', n: 1 });
    await db.merge(copy);
    expect(await db.collection('c').findById('x')).toEqual({ _id: 'x', n: 1 });
    copy.close();
    db.close();
  });
});
