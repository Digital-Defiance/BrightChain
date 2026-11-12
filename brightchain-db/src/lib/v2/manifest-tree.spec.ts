/**
 * Manifest trees (spec section 8): shape at every size boundary, ordering,
 * determinism, tampering, and copying between replicas.
 */
import { copyFile, mkdtemp, readdir, rm, unlink, writeFile, readFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { streamAttachment, writeAttachment } from './attachments';
import { decodeMetadata, digestPayload, type Digest, type V2Blob } from './codec';
import {
  BrightDbV2MissingBlockError,
  type BrightDbV2DiskWriter,
  type BrightDbV2Storage,
} from './disk-store';
import { PortableBrightDb } from './portable-database';

const MIB = 1_048_576;
const FANOUT = 63;

/** An in-memory block map that satisfies what attachments need from a storage. */
const ZEROS = Buffer.alloc(MIB);
const zeroDigests = new Map<number, Digest>();
/** Digest of a block, remembering the answer for all-zero blocks of each length. */
function fastDigest(payload: Uint8Array): Digest {
  if (Buffer.compare(payload, ZEROS.subarray(0, payload.length)) === 0) {
    let digest = zeroDigests.get(payload.length);
    if (!digest) zeroDigests.set(payload.length, (digest = digestPayload(payload)));
    return digest;
  }
  return digestPayload(payload);
}

class Blocks {
  readonly map = new Map<Digest, Uint8Array>();
  writes = 0;
  readonly writer: BrightDbV2DiskWriter = {
    writeBlock: async (payload) => {
      const digest = fastDigest(payload);
      if (!this.map.has(digest)) this.map.set(digest, Buffer.from(payload));
      this.writes++;
      return digest;
    },
    writeBlocks: async (payloads) => {
      for (const payload of payloads) await this.writer.writeBlock(payload);
    },
    syncBlocks: async () => undefined,
    publishHead: async () => undefined,
  };
  readonly storage = {
    readBlock: async (digest: Digest) => {
      const bytes = this.map.get(digest);
      if (!bytes) throw new BrightDbV2MissingBlockError(digest);
      return bytes;
    },
  } as unknown as BrightDbV2Storage;

  manifest(digest: Digest): V2Blob {
    const block = decodeMetadata(this.map.get(digest) as Uint8Array, digest);
    if (block.kind !== 'blob') throw new Error('not a manifest');
    return block;
  }
}

/** A stream of `size` zero bytes in parts of at most 700,000 bytes. */
async function* zeros(size: number): AsyncGenerator<Uint8Array> {
  const part = Buffer.alloc(700_000);
  for (let left = size; left > 0; left -= part.length) {
    yield left >= part.length ? part : part.subarray(0, left);
  }
}

/** Independent of the implementation: the shallowest depth whose manifests can hold `chunks` chunks. */
function expectedDepth(size: number): number {
  const chunks = Math.ceil(size / MIB);
  let depth = 0;
  let capacity = FANOUT;
  while (chunks > capacity) {
    depth++;
    capacity *= FANOUT;
  }
  return depth;
}

/** Walk a tree and return its manifests per depth and its chunk lengths in order. */
function inspect(blocks: Blocks, root: Digest) {
  const manifestsPerDepth = new Map<number, number>();
  const chunks: Array<{ digest: Digest; length: number }> = [];
  const walk = (digest: Digest, expectedSize?: bigint) => {
    const manifest = blocks.manifest(digest);
    if (expectedSize !== undefined) expect(manifest.size).toBe(expectedSize);
    manifestsPerDepth.set(manifest.depth, (manifestsPerDepth.get(manifest.depth) ?? 0) + 1);
    const span = BigInt(MIB) * BigInt(FANOUT) ** BigInt(manifest.depth);
    let remaining = manifest.size;
    for (const entry of manifest.entries) {
      const size = remaining < span ? remaining : span;
      if (manifest.depth === 0) chunks.push({ digest: entry, length: Number(size) });
      else walk(entry, size);
      remaining -= size;
    }
    expect(remaining).toBe(0n);
  };
  walk(root);
  return { manifestsPerDepth, chunks };
}

describe('BrightDB v2 manifest trees', () => {
  jest.setTimeout(240_000);

  // Sizes on both sides of every boundary up to the first depth-2 file.
  const cases: Array<[string, number]> = [
    ['empty', 0],
    ['one byte', 1],
    ['just under a chunk', MIB - 1],
    ['exactly one chunk', MIB],
    ['one chunk and a byte', MIB + 1],
    ['62 chunks and a byte', 62 * MIB + 1],
    ['exactly 63 chunks (a full manifest)', 63 * MIB],
    ['63 chunks and a byte (first depth 1)', 63 * MIB + 1],
    ['64 chunks', 64 * MIB],
    ['two full level-0 manifests', 126 * MIB],
    ['two full manifests and a byte', 126 * MIB + 1],
    ['63 full level-0 manifests (a full depth 1)', 63 * 63 * MIB],
    ['a full depth 1 and a byte (first depth 2)', 63 * 63 * MIB + 1],
  ];

  it.each(cases)('builds the canonical tree for %s', async (_name, size) => {
    const blocks = new Blocks();
    const ref = await writeAttachment(blocks.writer, zeros(size));
    expect(ref.size).toBe(size);
    const root = blocks.manifest(ref.digest);
    expect(root.size).toBe(BigInt(size));
    expect(root.depth).toBe(expectedDepth(size));
    expect(root.entries.length).toBeLessThanOrEqual(FANOUT);

    const { manifestsPerDepth, chunks } = inspect(blocks, ref.digest);
    // Chunk count and lengths: all full except a shorter last one.
    expect(chunks).toHaveLength(Math.ceil(size / MIB));
    chunks.forEach((chunk, index) => {
      expect(chunk.length).toBe(index === chunks.length - 1 && size % MIB ? size % MIB : MIB);
    });
    // Manifest counts per level: ceil(chunks / 63^(level + 1)), and exactly one root.
    for (let level = 0; level <= root.depth; level++) {
      const expected = Math.max(1, Math.ceil(chunks.length / FANOUT ** (level + 1)));
      expect(manifestsPerDepth.get(level)).toBe(expected);
    }
    expect(manifestsPerDepth.get(root.depth)).toBe(1);

    // Reading it back yields every byte, and building twice gives the same reference.
    let streamed = 0;
    for await (const part of streamAttachment(blocks.storage, ref.digest)) streamed += part.length;
    expect(streamed).toBe(size);
    expect((await writeAttachment(blocks.writer, zeros(size))).digest).toBe(ref.digest);
  });

  it('keeps chunks in order and gives one reference for a buffer, a stream and odd stream splits', async () => {
    const blocks = new Blocks();
    const total = 130 * MIB + 321; // depth 1 with 3 level-0 manifests
    const data = Buffer.alloc(total);
    for (let chunk = 0; chunk * MIB < total; chunk++) data.writeUInt32BE(chunk + 1, chunk * MIB);
    data[total - 1] = 0xee;

    const fromBuffer = await writeAttachment(blocks.writer, data);
    const splits = [1, 4095, 65_537, 999_983, MIB, 3 * MIB + 7];
    async function* ragged(): AsyncGenerator<Uint8Array> {
      let at = 0;
      for (let i = 0; at < total; i++) {
        const end = Math.min(total, at + splits[i % splits.length]);
        yield data.subarray(at, end);
        at = end;
      }
    }
    const fromStream = await writeAttachment(blocks.writer, ragged());
    expect(fromStream.digest).toBe(fromBuffer.digest);

    const received: Buffer[] = [];
    for await (const part of streamAttachment(blocks.storage, fromBuffer.digest)) received.push(part);
    expect(received).toHaveLength(131);
    expect(Buffer.concat(received).equals(data)).toBe(true);
    // Chunk order is the file's order.
    received.forEach((part, index) => expect(part.readUInt32BE(0)).toBe(index + 1));

    const { manifestsPerDepth } = inspect(blocks, fromBuffer.digest);
    expect(manifestsPerDepth.get(0)).toBe(3);
    expect(manifestsPerDepth.get(1)).toBe(1);
  });

  it('changing one byte changes only the path from that chunk to the root', async () => {
    const blocks = new Blocks();
    const total = 200 * MIB;
    const data = Buffer.alloc(total);
    for (let chunk = 0; chunk * MIB < total; chunk++) data.writeUInt32BE(chunk + 1, chunk * MIB);
    const original = await writeAttachment(blocks.writer, data);
    const before = new Set(blocks.map.keys());
    data[150 * MIB + 5] ^= 1; // inside chunk 150
    const edited = await writeAttachment(blocks.writer, data);
    expect(edited.digest).not.toBe(original.digest);
    const added = [...blocks.map.keys()].filter((digest) => !before.has(digest));
    expect(added).toHaveLength(3); // the chunk, its level-0 manifest, and the root
  });

  describe('on a directory store', () => {
    let dir: string;
    beforeEach(async () => {
      dir = await mkdtemp(join(tmpdir(), 'brightdb-v2-tree-'));
    });
    afterEach(async () => {
      await rm(dir, { recursive: true, force: true });
    });

    const blockFiles = async (path: string) =>
      (await readdir(join(path, 'blocks'), { recursive: true, withFileTypes: true }))
        .filter((e) => e.isFile())
        .map((e) => join(e.parentPath, e.name));

    async function bigFile(db: PortableBrightDb, chunks: number) {
      async function* data(): AsyncGenerator<Uint8Array> {
        for (let chunk = 0; chunk < chunks; chunk++) {
          const part = Buffer.alloc(MIB);
          part.writeUInt32BE(chunk + 1, 0);
          yield part;
        }
        yield Buffer.from('tail');
      }
      return db.putAttachment(data(), { type: 'application/octet-stream' });
    }

    it('detects a missing chunk, a damaged chunk and a damaged manifest, and refuses to reference them', async () => {
      const path = join(dir, 'db');
      const db = await PortableBrightDb.open({ path });
      const ref = await bigFile(db, 64); // 64 chunks and a 4-byte tail: depth 1
      const store = (db as unknown as { store: BrightDbV2Storage }).store;
      const root = decodeMetadata(await store.readBlock(ref.digest)) as V2Blob;
      expect(root.depth).toBe(1);
      const level0 = decodeMetadata(await store.readBlock(root.entries[0])) as V2Blob;
      expect(level0.depth).toBe(0);
      expect(level0.entries).toHaveLength(63);
      const find = async (digest: string) => {
        const file = (await blockFiles(path)).find((f) => f.endsWith(digest));
        if (!file) throw new Error('block file not found');
        return file;
      };

      // A damaged manifest (bytes of another block) fails its digest.
      const manifestFile = await find(root.entries[0]);
      const manifestBytes = await readFile(manifestFile);
      await copyFile(await find(root.entries[1]), manifestFile);
      await expect(db.getAttachment(ref)).rejects.toThrow(/digest/u);
      await expect(db.collection('c').insertOne({ _id: 'x', _files: { f: { ...ref } } })).rejects.toThrow();
      await writeFile(manifestFile, manifestBytes);

      // A damaged chunk fails its digest.
      const chunkFile = await find(level0.entries[0]);
      const chunkBytes = await readFile(chunkFile);
      const flipped = Buffer.from(chunkBytes);
      flipped[100] ^= 1;
      await writeFile(chunkFile, flipped);
      await expect(db.getAttachment(ref)).rejects.toThrow(/digest/u);
      await writeFile(chunkFile, chunkBytes);

      // A missing deep chunk is reported, and a document cannot reference the file.
      await unlink(await find(level0.entries[2]));
      await expect(db.getAttachment(ref)).rejects.toThrow(BrightDbV2MissingBlockError);
      await expect(db.collection('c').insertOne({ _id: 'x', _files: { f: { ...ref } } })).rejects.toThrow(/missing a chunk/u);
      expect(await db.collection('c').findById('x')).toBeNull();
      db.close();
    });

    it('refuses a root that is deeper than its size needs', async () => {
      const db = await PortableBrightDb.open({ path: join(dir, 'db') });
      const small = await db.putAttachment(Buffer.from('x'));
      const store = (db as unknown as { store: BrightDbV2Storage }).store;
      const smallRoot = decodeMetadata(await store.readBlock(small.digest)) as V2Blob;
      const over = await db.putAttachmentTree({ size: 1n, depth: 1, entries: [small.digest] });
      expect(smallRoot.depth).toBe(0);
      await expect(db.getAttachment({ digest: over })).rejects.toThrow(/deeper than its size needs/u);
      await expect(
        db.collection('c').insertOne({ _id: 'x', _files: { f: { digest: over, size: 1 } } }),
      ).rejects.toThrow(/deeper than its size needs/u);
      db.close();
    });

    it('rejects a reference whose size disagrees with a deep manifest', async () => {
      const db = await PortableBrightDb.open({ path: join(dir, 'db') });
      const ref = await bigFile(db, 64);
      await expect(
        db.collection('c').insertOne({ _id: 'x', _files: { f: { digest: ref.digest, size: ref.size - 1 } } }),
      ).rejects.toThrow(/size/u);
      await db.collection('c').insertOne({ _id: 'ok', _files: { f: { ...ref } } });
      db.close();
    });

    it('copies a deep tree through fork and merge, and refuses a partly copied one', async () => {
      const a = await PortableBrightDb.open({ path: join(dir, 'a') });
      await a.collection('docs').insertOne({ _id: 'seed' });
      const ref = await bigFile(a, 64);
      await a.collection('docs').insertOne({ _id: 'big', _files: { f: { ...ref } } });

      const forked = await a.fork(join(dir, 'forked'));
      expect((await forked.getAttachment(ref)).length).toBe(ref.size);

      const b = await PortableBrightDb.open({ path: join(dir, 'b') }); // different database: fork instead
      b.close();
      const c = await a.fork(join(dir, 'c'));
      const ref2 = await bigFile(c, 65);
      await c.collection('docs').insertOne({ _id: 'bigger', _files: { g: { ...ref2 } } });
      await a.merge(c);
      expect((await a.getAttachment(ref2)).length).toBe(ref2.size);
      let chunks = 0;
      for await (const part of a.streamAttachment(ref2)) chunks += part.length > 0 ? 1 : 0;
      expect(chunks).toBe(66);

      // A source missing a deep chunk stops the merge and leaves the target unchanged.
      const d = await a.fork(join(dir, 'd'));
      const ref3 = await bigFile(d, 66);
      await d.collection('docs').insertOne({ _id: 'broken', _files: { h: { ...ref3 } } });
      const store = (d as unknown as { store: BrightDbV2Storage }).store;
      const root = decodeMetadata(await store.readBlock(ref3.digest)) as V2Blob;
      const level0 = decodeMetadata(await store.readBlock(root.entries[1])) as V2Blob;
      const victim = (await blockFiles(join(dir, 'd'))).find((f) => f.endsWith(level0.entries[2]));
      await unlink(victim as string);
      const before = await a.root();
      await expect(a.merge(d)).rejects.toThrow(BrightDbV2MissingBlockError);
      expect(await a.root()).toBe(before);
      for (const db of [a, forked, c, d]) db.close();
    });
  });
});
