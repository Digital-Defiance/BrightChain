import { digestPayload } from './codec';
import { BrightDbV2AesCipher } from './encryption';
import { MemoryV2Storage } from './memory-storage';
import { PortableBrightDbCore } from './portable-core';
import { BrightDbV2WebCipher } from './web-cipher';

const nameSecret = Buffer.alloc(32, 21);
const k1 = Buffer.alloc(32, 22);
const k2 = Buffer.alloc(32, 23);
const ring = { nameSecret, dataKeys: { 1: k1, 2: k2 }, currentVersion: 2 };

describe('BrightDB v2 WebCrypto cipher', () => {
  const plaintext = Buffer.from('a block of data');
  const digest = digestPayload(plaintext);
  const nonce = Buffer.from('0102030405060708090a0b0c', 'hex');

  it('produces exactly the bytes of the Node cipher (names, sealed blocks, sealed head)', async () => {
    const web = await BrightDbV2WebCipher.create(ring);
    const node = new BrightDbV2AesCipher(ring);
    expect(await web.physicalName(digest)).toBe(node.physicalName(digest));
    expect(Buffer.from(await web.seal(digest, plaintext, nonce)).equals(node.seal(digest, plaintext, nonce))).toBe(true);
    expect(Buffer.from(await web.sealHead(digest, nonce)).equals(node.sealHead(digest, nonce))).toBe(true);
  });

  it('opens what the Node cipher sealed, and the other way round, across key versions', async () => {
    const web = await BrightDbV2WebCipher.create(ring);
    const node = new BrightDbV2AesCipher(ring);
    const old = new BrightDbV2AesCipher({ nameSecret, dataKeys: { 1: k1 }, currentVersion: 1 });
    expect(Buffer.from(await web.open(digest, old.seal(digest, plaintext))).equals(plaintext)).toBe(true); // version 1 still opens
    expect(node.open(digest, await web.seal(digest, plaintext)).equals(plaintext)).toBe(true);
    expect(await web.openHead(node.sealHead(digest))).toBe(digest);
    expect(node.openHead(Buffer.from(await web.sealHead(digest)))).toBe(digest);
  });

  it('accepts a single 32-byte master key like the Node cipher', async () => {
    const web = await BrightDbV2WebCipher.create(k1);
    const node = new BrightDbV2AesCipher(k1);
    expect(await web.physicalName(digest)).toBe(node.physicalName(digest));
    expect(Buffer.from(await web.seal(digest, plaintext, nonce)).equals(node.seal(digest, plaintext, nonce))).toBe(true);
  });

  it('rejects a wrong key, a changed block and a block moved to another name', async () => {
    const web = await BrightDbV2WebCipher.create(ring);
    const other = await BrightDbV2WebCipher.create(Buffer.alloc(32, 99));
    const sealed = await web.seal(digest, plaintext);
    await expect(other.open(digest, sealed)).rejects.toThrow(/Wrong key|No key/u);
    const changed = Uint8Array.from(sealed);
    changed[20] ^= 1;
    await expect(web.open(digest, changed)).rejects.toThrow(/Wrong key/u);
    await expect(web.open(digestPayload(Buffer.from('another')), sealed)).rejects.toThrow(/Wrong key/u);
  });

  it('rejects malformed key material', async () => {
    await expect(BrightDbV2WebCipher.create(Buffer.alloc(8))).rejects.toThrow(/32 bytes/u);
    await expect(BrightDbV2WebCipher.create({ nameSecret, dataKeys: { 1: k1 }, currentVersion: 2 })).rejects.toThrow(/current key version/u);
  });
});

describe('BrightDB v2 core garbage collection and fork (in-memory storage)', () => {
  it('collects unreachable blocks, honors the grace period and a dry run, and keeps live data', async () => {
    const db = await PortableBrightDbCore.fromStorage(MemoryV2Storage.create());
    await db.collection('c').insertMany(Array.from({ length: 100 }, (_, i) => ({ _id: `d${i}`, n: i })));
    for (let i = 0; i < 10; i++) await db.collection('c').replaceById(`d${i}`, { _id: `d${i}`, n: 1000 + i });
    await db.collection('c').deleteById('d99');

    const kept = await db.collectGarbage(); // default grace of an hour keeps everything just written
    expect(kept.removed).toBeLessThanOrEqual(1); // only the initial empty root, which was never timestamped
    expect(kept.keptRecent).toBeGreaterThan(0);

    const dry = await db.collectGarbage({ graceMs: 0, dryRun: true });
    expect(dry.removed).toBeGreaterThan(10);
    const real = await db.collectGarbage({ graceMs: 0 });
    expect(real.removed).toBe(dry.removed);
    expect((await db.collection('c').find({}).toArray()).length).toBe(99);
    expect(await db.collection('c').findById('d3')).toEqual({ _id: 'd3', n: 1003 });
    expect((await db.collectGarbage({ graceMs: 0 })).removed).toBe(0);
  });

  it('keeps an older root readable when asked to', async () => {
    const storage = MemoryV2Storage.create();
    const db = await PortableBrightDbCore.fromStorage(storage);
    await db.collection('c').insertOne({ _id: 'a', v: 1 });
    const before = await db.root();
    await db.collection('c').replaceById('a', { _id: 'a', v: 2 });
    await db.collectGarbage({ graceMs: 0, keepRoots: [before] });
    expect(await (await db.at(before)).collection('c').findById('a')).toEqual({ _id: 'a', v: 1 });
  });

  it('forks into an independent replica that merges back', async () => {
    const db = await PortableBrightDbCore.fromStorage(MemoryV2Storage.create());
    await db.collection('c').insertMany([{ _id: 'a', v: 1 }, { _id: 'b', v: 2 }]);
    const copy = await db.forkInto(MemoryV2Storage.create());
    expect(await copy.root()).toBe(await db.root());
    await copy.collection('c').insertOne({ _id: 'from-copy', v: 3 });
    await db.collection('c').insertOne({ _id: 'from-original', v: 4 });
    await db.merge(copy);
    expect((await db.collection('c').find({}).toArray()).map((d) => d['_id']).sort()).toEqual(['a', 'b', 'from-copy', 'from-original']);
  });
});
