import { digestPayload, type Digest } from './codec';
import {
  decodeIndexId,
  encodeIndexValue,
  extractIndexKeys,
  indexRange,
  type IndexScalar,
} from './index-key';
import { V2IndexTree } from './index-tree';
import type { V2TreeBlockStore } from './tree';

class MemoryBlocks implements V2TreeBlockStore {
  readonly blocks = new Map<Digest, Uint8Array>();
  reads = 0;
  async get(digest: Digest): Promise<Uint8Array> {
    this.reads++;
    const bytes = this.blocks.get(digest);
    if (!bytes) throw new Error(`Missing block ${digest}`);
    return bytes;
  }
  async put(digest: Digest, bytes: Uint8Array): Promise<void> {
    expect(digestPayload(bytes)).toBe(digest);
    this.blocks.set(digest, bytes);
  }
}

/** Small deterministic generator so failures reproduce. */
function rng(seed: number): () => number {
  let state = seed >>> 0;
  return () => {
    state = (Math.imul(state, 1664525) + 1013904223) >>> 0;
    return state / 0x100000000;
  };
}

function key(value: IndexScalar, id: string): Buffer {
  return Buffer.concat([encodeIndexValue(value), encodeIndexValue(id)]);
}

async function collect(iterable: AsyncIterable<Buffer>): Promise<Buffer[]> {
  const out: Buffer[] = [];
  for await (const item of iterable) out.push(item);
  return out;
}

describe('BrightDB v2 index keys', () => {
  it('orders values by type, then numerically and by UTF-8 bytes', () => {
    const ordered: IndexScalar[] = [
      null,
      false,
      true,
      -1e300,
      -2.5,
      -0.0001,
      0,
      0.0001,
      7,
      1e300,
      '',
      'a',
      'a\u0000',
      'a\u0000b',
      'ab',
      'b',
      'é',
      '\u{10000}',
    ];
    const encoded = ordered.map((value) => encodeIndexValue(value));
    const sorted = [...encoded].sort(Buffer.compare);
    expect(sorted.map((b) => b.toString('hex'))).toEqual(encoded.map((b) => b.toString('hex')));
    expect(encodeIndexValue(0).equals(encodeIndexValue(-0))).toBe(true);
    expect(Buffer.compare(encodeIndexValue(undefined), encodeIndexValue(null))).toBeLessThan(0);
  });

  it('is prefix-free and round-trips the document id', () => {
    const ids = ['a', 'ab', 'a\u0000b', '\u{1F600}'];
    for (const id of ids) {
      const entry = key('x\u0000y', id);
      expect(decodeIndexId(entry, 1)).toBe(id);
    }
    const keys = ['a', 'ab', 'abc'].map((v) => key(v, 'id'));
    for (const a of keys) {
      for (const b of keys) {
        if (a !== b) expect(b.subarray(0, a.length).equals(a)).toBe(false);
      }
    }
  });

  it('extracts one entry per array element and indexes absent fields', () => {
    const keys = extractIndexKeys({ _id: 'd', tags: ['x', 'y', 'x'], n: 1 }, ['tags', 'n'], 'd');
    expect(keys).toHaveLength(2);
    expect(extractIndexKeys({ _id: 'd' }, ['missing'], 'd')).toHaveLength(1);
    expect(extractIndexKeys({ _id: 'd', a: { b: 5 } }, ['a.b'], 'd')[0].equals(key(5, 'd'))).toBe(true);
    expect(() => extractIndexKeys({ _id: 'd', a: { b: 1 } }, ['a'], 'd')).toThrow();
    expect(() => extractIndexKeys({ _id: 'd', a: [[1]] }, ['a'], 'd')).toThrow();
  });
});

describe('BrightDB v2 index tree', () => {
  it('gives the same root as a fresh build after random batches of adds and removes', async () => {
    const random = rng(7);
    const blocks = new MemoryBlocks();
    const tree = new V2IndexTree(blocks);
    const model = new Map<string, Buffer>();
    let root: Digest | null = null;

    const makeKey = (): Buffer => {
      // Clustered values force long shared prefixes and many splits and merges.
      const mode = Math.floor(random() * 3);
      const value: IndexScalar =
        mode === 0
          ? `user-000000${Math.floor(random() * 400)}`
          : mode === 1
            ? 1_700_000_000_000 + Math.floor(random() * 3000)
            : random() < 0.02
              ? 'zzzz'
              : `k${Math.floor(random() * 50)}`;
      return key(value, `id${Math.floor(random() * 600)}`);
    };

    for (let round = 0; round < 60; round++) {
      const adds = Array.from({ length: Math.floor(random() * 120) }, makeKey);
      const removes: Buffer[] = [];
      for (const [, existing] of model) {
        if (random() < (round % 7 === 6 ? 0.7 : 0.08)) removes.push(existing);
      }
      removes.push(...Array.from({ length: 5 }, makeKey)); // some absent
      root = await tree.apply(root, adds, removes);
      for (const remove of removes) model.delete(remove.toString('hex'));
      for (const add of adds) model.set(add.toString('hex'), add);
      // a key both added and removed in one batch survives (adds win)

      const expected = [...model.values()].sort(Buffer.compare);
      expect((await collect(tree.entries(root))).map((b) => b.toString('hex'))).toEqual(
        expected.map((b) => b.toString('hex')),
      );
      const fresh: Digest | null = await new V2IndexTree(new MemoryBlocks()).apply(null, expected, []);
      expect(root).toBe(fresh);
    }
  });

  it('empties to null and rebuilds identically', async () => {
    const blocks = new MemoryBlocks();
    const tree = new V2IndexTree(blocks);
    const keys = Array.from({ length: 500 }, (_, i) => key(`name-${i}`, `id${i}`));
    const full = await tree.apply(null, keys, []);
    expect(full).not.toBeNull();
    expect(await tree.apply(full, [], keys)).toBeNull();
    expect(await tree.apply(null, [...keys].reverse(), [])).toBe(full);
  });

  it('answers range queries in order, ascending and descending', async () => {
    const random = rng(11);
    const blocks = new MemoryBlocks();
    const tree = new V2IndexTree(blocks);
    const docs: Array<{ id: string; n: number; s: string }> = [];
    for (let i = 0; i < 1500; i++) {
      docs.push({ id: `d${i}`, n: Math.floor(random() * 200) - 100, s: `s${Math.floor(random() * 80)}` });
    }
    const entries = docs.flatMap((d) => extractIndexKeys({ n: d.n, s: d.s }, ['n', 's'], d.id));
    const root = await tree.apply(null, entries, []);

    const query = async (q: Parameters<typeof indexRange>[1]) => {
      const { lo, hi } = indexRange(2, q);
      const ids = (await collect(tree.range(root, lo, hi, q.descending))).map((k) => decodeIndexId(k, 2));
      return ids;
    };
    const model = (predicate: (d: (typeof docs)[number]) => boolean, descending = false) => {
      const sorted = docs
        .filter(predicate)
        .sort((a, b) => a.n - b.n || (a.s < b.s ? -1 : a.s > b.s ? 1 : 0) || (a.id < b.id ? -1 : 1));
      return (descending ? sorted.reverse() : sorted).map((d) => d.id);
    };

    expect(await query({ equals: [5] })).toEqual(model((d) => d.n === 5));
    expect(await query({ gt: 10 })).toEqual(model((d) => d.n > 10));
    expect(await query({ gte: 10, lt: 30 })).toEqual(model((d) => d.n >= 10 && d.n < 30));
    expect(await query({ lte: -50 })).toEqual(model((d) => d.n <= -50));
    expect(await query({ gt: -5, lte: 5, descending: true })).toEqual(model((d) => d.n > -5 && d.n <= 5, true));
    expect(await query({ equals: [7], prefix: 's1' })).toEqual(model((d) => d.n === 7 && d.s.startsWith('s1')));
    expect(await query({ equals: [7], gte: 's2', lt: 's4' })).toEqual(
      model((d) => d.n === 7 && d.s >= 's2' && d.s < 's4'),
    );
    expect(await query({ equals: [7, 's9'] })).toEqual(model((d) => d.n === 7 && d.s === 's9'));
    expect(await query({})).toEqual(model(() => true));
  });

  it('reads few blocks for a narrow range in a large index', async () => {
    const blocks = new MemoryBlocks();
    const tree = new V2IndexTree(blocks);
    const entries = Array.from({ length: 20_000 }, (_, i) => key(1_700_000_000_000 + i, `id${i}`));
    const root = await tree.apply(null, entries, []);
    blocks.reads = 0;
    const { lo, hi } = indexRange(1, { gte: 1_700_000_005_000, lt: 1_700_000_005_010 });
    const found = await collect(tree.range(root, lo, hi));
    expect(found).toHaveLength(10);
    expect(blocks.reads).toBeLessThan(25);

    // Updating one entry rewrites only a path of pages.
    const before = blocks.blocks.size;
    await tree.apply(root, [key(5, 'new')], [entries[12345]]);
    expect(blocks.blocks.size - before).toBeLessThan(25);
  });
});
