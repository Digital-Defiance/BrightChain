import { mkdtemp, readdir, readFile, rm, writeFile, copyFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { digestPayload } from './codec';
import { BrightDbV2AesCipher, SEAL_OVERHEAD } from './encryption';
import { PortableBrightDb } from './portable-database';

const KEY = Buffer.from(Array.from({ length: 32 }, (_, i) => i));
const OTHER_KEY = Buffer.from(Array.from({ length: 32 }, (_, i) => 255 - i));

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

describe('BrightDB v2 encrypted block-store profile', () => {
  let dir: string;
  beforeEach(async () => {
    dir = await mkdtemp(join(tmpdir(), 'brightdb-v2-enc-'));
  });
  afterEach(async () => {
    await rm(dir, { recursive: true, force: true });
  });

  it('seals and opens blocks, binds them to their digest and rejects tampering', () => {
    const cipher = new BrightDbV2AesCipher(KEY);
    const plaintext = Buffer.from('some block payload');
    const digest = digestPayload(plaintext);
    const sealed = cipher.seal(digest, plaintext);
    expect(sealed.length).toBe(plaintext.length + SEAL_OVERHEAD);
    expect(cipher.open(digest, sealed).equals(plaintext)).toBe(true);
    // A fresh nonce each time.
    expect(cipher.seal(digest, plaintext).equals(sealed)).toBe(false);
    // Another digest, another key, or a changed byte all fail closed.
    expect(() => cipher.open(digestPayload(Buffer.from('other')), sealed)).toThrow();
    expect(() => new BrightDbV2AesCipher(OTHER_KEY).open(digest, sealed)).toThrow();
    const flipped = Buffer.from(sealed);
    flipped[20] ^= 1;
    expect(() => cipher.open(digest, flipped)).toThrow();
    expect(() => cipher.open(digest, sealed.subarray(0, 10))).toThrow();
    // Physical names are keyed and do not reveal the digest.
    const name = cipher.physicalName(digest);
    expect(name).toMatch(/^[0-9a-f]{128}$/u);
    expect(name).not.toBe(digest);
    expect(new BrightDbV2AesCipher(OTHER_KEY).physicalName(digest)).not.toBe(name);
    expect(() => new BrightDbV2AesCipher(Buffer.alloc(16))).toThrow(/32 bytes/u);
  });

  it('stores nothing readable and survives reopening with the key', async () => {
    const path = join(dir, 'db');
    const db = await PortableBrightDb.open({ path, encryption: { key: KEY } });
    const secret = 'a-very-distinctive-secret-string';
    await db.collection('people').createIndex('by_city', ['city']);
    await db.collection('people').insertMany([
      { _id: 'alice', city: 'Oslo', note: secret },
      { _id: 'bob', city: 'Bergen', note: secret },
    ]);
    const ref = await db.putAttachment(Buffer.from(`attachment ${secret}`), { type: 'text/plain' });
    await db.collection('people').replaceById('bob', { _id: 'bob', city: 'Oslo', _files: { f: { ...ref } } });
    const root = await db.root();
    db.close();

    const reopened = await PortableBrightDb.open({ path, encryption: { key: KEY } });
    expect(await reopened.root()).toBe(root);
    expect((await reopened.collection('people').findByIndex('by_city', { equals: ['Oslo'] })).map((d) => d['_id'])).toEqual(['alice', 'bob']);
    expect((await reopened.getAttachment(ref)).toString()).toContain(secret);
    reopened.close();

    for (const file of await filesUnder(path)) {
      const bytes = await readFile(file);
      expect(bytes.includes(Buffer.from(secret))).toBe(false);
      expect(bytes.includes(Buffer.from(root))).toBe(false); // the head digest is not visible either
    }
    // No block is stored under its logical (plaintext) digest.
    const names = (await filesUnder(join(path, 'blocks'))).map((f) => f.split('/').pop() as string);
    expect(names.includes(root)).toBe(false);
    expect(names.every((n) => /^[0-9a-f]{128}$/u.test(n))).toBe(true);
    expect((await readFile(join(path, 'ENCRYPTION'), 'utf8'))).toBe('BrightDB encryption 1\n');
  });

  it('refuses a missing key, a wrong key and a mismatched directory', async () => {
    const path = join(dir, 'db');
    const db = await PortableBrightDb.open({ path, encryption: { key: KEY } });
    await db.collection('c').insertOne({ _id: 'a' });
    db.close();
    await expect(PortableBrightDb.open({ path })).rejects.toThrow(/encrypted; open it with an encryption key/u);
    await expect(PortableBrightDb.open({ path, encryption: { key: OTHER_KEY } })).rejects.toThrow(/cannot decrypt|Wrong key/iu);

    const plain = join(dir, 'plain');
    (await PortableBrightDb.open({ path: plain })).close();
    await expect(PortableBrightDb.open({ path: plain, encryption: { key: KEY } })).rejects.toThrow(/not encrypted/u);
  });

  it('detects a changed block and a block swapped for another', async () => {
    const path = join(dir, 'db');
    const db = await PortableBrightDb.open({ path, encryption: { key: KEY } });
    await db.collection('c').insertMany([{ _id: 'a', v: 1 }, { _id: 'b', v: 2 }]);
    const root = await db.root();
    db.close();
    const blocks = await filesUnder(join(path, 'blocks'));
    const sizes = new Map<number, string[]>();
    for (const file of blocks) {
      const size = (await readFile(file)).length;
      sizes.set(size, [...(sizes.get(size) ?? []), file]);
    }
    // Two document blocks have the same size; swap them.
    const pair = [...sizes.values()].find((files) => files.length >= 2);
    expect(pair).toBeTruthy();
    const [first, second] = pair as string[];
    const original = await readFile(first);
    await copyFile(second, first);
    const swapped = await PortableBrightDb.open({ path, encryption: { key: KEY } });
    expect(await swapped.root()).toBe(root);
    await expect(swapped.collection('c').find({}).toArray()).rejects.toThrow(/cannot be decrypted/u);
    swapped.close();

    await writeFile(first, original);
    const tampered = Buffer.from(original);
    tampered[tampered.length - 1] ^= 1;
    await writeFile(first, tampered);
    const again = await PortableBrightDb.open({ path, encryption: { key: KEY } });
    await expect(again.collection('c').find({}).toArray()).rejects.toThrow(/cannot be decrypted/u);
    again.close();
  });

  it('forks and merges encrypted replicas under the same key', async () => {
    const a = await PortableBrightDb.open({ path: join(dir, 'a'), encryption: { key: KEY } });
    await a.collection('docs').insertMany([{ _id: 'one' }, { _id: 'two' }]);
    const b = await a.fork(join(dir, 'b')); // the fork keeps the key
    await expect(PortableBrightDb.open({ path: join(dir, 'b') })).rejects.toThrow(/encrypted/u);
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
