import {
  decodeMetadata,
  digestPayload,
  encodeKey,
  encodeMetadata,
  type Digest,
  type V2Metadata,
  type V2Record,
} from './codec';
import { V2Tree, type V2TreeBlockStore } from './tree';

const WRITER_ID = '000102030405060708090a0b0c0d0e0f';
const TARGET = 'a'.repeat(128);

class MemoryBlocks implements V2TreeBlockStore {
  private readonly blocks = new Map<Digest, Uint8Array>();
  readonly reads: Digest[] = [];
  readonly writes: Digest[] = [];

  async get(digest: Digest): Promise<Uint8Array> {
    this.reads.push(digest);
    const bytes = this.blocks.get(digest);
    if (!bytes) throw new Error(`Missing block ${digest}`);
    return bytes;
  }

  async put(digest: Digest, bytes: Uint8Array): Promise<void> {
    expect(digestPayload(bytes)).toBe(digest);
    this.writes.push(digest);
    this.blocks.set(digest, bytes);
  }

  async add(block: V2Metadata): Promise<Digest> {
    const bytes = encodeMetadata(block);
    const digest = digestPayload(bytes);
    await this.put(digest, bytes);
    return digest;
  }
}

function record(
  key: string,
  counter = 2n,
  target: Digest | null = TARGET,
): V2Record {
  return { key, version: { counter, writerId: WRITER_ID }, target };
}

function requireRoot(root: Digest | null): Digest {
  if (root === null) throw new Error('Expected a nonempty tree');
  return root;
}

describe('BrightDB v2 metadata tree', () => {
  it('splits and collapses at the exact canonical leaf size', async () => {
    const blocks = new MemoryBlocks();
    const tree = new V2Tree(blocks, 'primary');
    const records = ['a', 'b', 'c', 'd'].map((key) =>
      record(key.repeat(key === 'a' ? 932 : 931)),
    );

    const leaf = requireRoot(await tree.setMany(null, records));
    expect((await blocks.get(leaf)).byteLength).toBe(4096);

    const additional = record('extra', 2n, null);
    const branch = await tree.set(leaf, additional);
    expect(decodeMetadata(await blocks.get(branch)).kind).toBe('branch');
    expect(
      await tree.setMany(null, [additional, ...[...records].reverse()]),
    ).toBe(branch);

    blocks.writes.length = 0;
    const tombstone = record(records[0].key, 3n, null);
    const collapsed = await tree.set(branch, tombstone);
    expect(decodeMetadata(await blocks.get(collapsed)).kind).toBe('primary');
    expect(blocks.writes).toEqual([collapsed]);
    expect(await tree.get(branch, tombstone.key)).toEqual(records[0]);
    expect(await tree.get(collapsed, tombstone.key)).toEqual(tombstone);

    const direct = await tree.setMany(null, [
      tombstone,
      ...records.slice(1),
      additional,
    ]);
    expect(direct).toBe(collapsed);
  });

  it('reads a single path and writes only the changed leaf and root', async () => {
    const blocks = new MemoryBlocks();
    const tree = new V2Tree(blocks, 'catalog');
    const records = Array.from({ length: 140 }, (_, index) =>
      record(`docs-${index}`),
    );
    const root = requireRoot(await tree.setMany(null, records));
    const originalPage = decodeMetadata(await blocks.get(root));
    if (originalPage.kind !== 'branch') throw new Error('Expected a branch');

    blocks.reads.length = 0;
    expect(await tree.get(root, records[0].key)).toEqual(records[0]);
    expect(blocks.reads).toHaveLength(2);

    blocks.writes.length = 0;
    const updated = record(records[0].key, 3n, 'b'.repeat(128));
    const updatedRoot = await tree.set(root, updated);
    expect(blocks.writes).toHaveLength(2);
    expect(blocks.writes[1]).toBe(updatedRoot);
    const updatedPage = decodeMetadata(await blocks.get(updatedRoot));
    if (updatedPage.kind !== 'branch') throw new Error('Expected a branch');
    expect(
      updatedPage.children.filter(
        (child, index) => child.digest !== originalPage.children[index].digest,
      ),
    ).toHaveLength(1);

    blocks.writes.length = 0;
    expect(await tree.set(updatedRoot, updated)).toBe(updatedRoot);
    expect(blocks.writes).toHaveLength(0);

    const all: V2Record[] = [];
    for await (const entry of tree.entries(updatedRoot)) all.push(entry);
    expect(all).toHaveLength(records.length);
    expect(
      new Map(all.map((entry) => [entry.key, entry])).get(updated.key),
    ).toEqual(updated);
  });

  it('rewrites only the affected paths in a multilevel trie', async () => {
    const blocks = new MemoryBlocks();
    const tree = new V2Tree(blocks, 'primary');
    const records: V2Record[] = [];
    for (let index = 0; index < 4096 && records.length < 80; index++) {
      const key = `deep-${index}`;
      if (digestPayload(encodeKey(key)).startsWith('0'))
        records.push(record(key));
    }
    expect(records).toHaveLength(80);

    const root = requireRoot(await tree.setMany(null, records));
    blocks.reads.length = 0;
    expect(await tree.get(root, records[0].key)).toEqual(records[0]);
    expect(blocks.reads).toHaveLength(3);

    blocks.writes.length = 0;
    const tombstone = record(records[0].key, 3n, null);
    const next = await tree.set(root, tombstone);
    expect(blocks.writes).toHaveLength(3);
    expect(blocks.writes[2]).toBe(next);
    expect(await tree.setMany(null, [...records.slice(1), tombstone])).toBe(
      next,
    );
  });

  it('rejects misplaced records and inconsistent branch counts when reading a child', async () => {
    const blocks = new MemoryBlocks();
    const tree = new V2Tree(blocks, 'primary');
    const entry = record('document');
    const rightNibble = Number.parseInt(
      digestPayload(encodeKey(entry.key))[0],
      16,
    );
    const leaf = await blocks.add({ kind: 'primary', records: [entry] });
    const branchWithWrongPath = await blocks.add({
      kind: 'branch',
      children: [
        { nibble: (rightNibble + 1) % 16, digest: leaf, recordBytes: 4090n },
      ],
    });
    await expect(tree.entries(branchWithWrongPath).next()).rejects.toThrow(
      'wrong path',
    );

    const branchWithWrongCount = await blocks.add({
      kind: 'branch',
      children: [{ nibble: rightNibble, digest: leaf, recordBytes: 4090n }],
    });
    await expect(tree.get(branchWithWrongCount, entry.key)).rejects.toThrow(
      'count does not match',
    );

    const catalog = new V2Tree(blocks, 'catalog');
    await expect(catalog.get(leaf, entry.key)).rejects.toThrow(
      'expected a catalog leaf',
    );
  });
});
