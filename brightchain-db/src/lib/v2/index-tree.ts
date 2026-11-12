/**
 * Canonical ordered tree for secondary-index entries (spec section 7).
 *
 * Keys are prefix-free byte strings. The tree is a path-compressed 16-way trie
 * over key nibbles: equal key sets always give identical bytes, whatever the
 * insertion order, and bytewise key order is traversal order.
 */
import {
  decodeMetadata,
  digestPayload,
  encodeMetadata,
  indexEntryBytes,
  MAX_METADATA_BYTES,
  type Digest,
} from './codec';
import { V2IndexError } from './index-key';
import type { V2TreeBlockStore } from './tree';

const LEAF_BUDGET = BigInt(MAX_METADATA_BYTES - 7);

interface LeafNode {
  kind: 'leaf';
  keys: Buffer[];
}
interface ChildRef {
  nibble: number;
  ref: Ref;
}
interface BranchNode {
  kind: 'branch';
  skip: number[];
  children: ChildRef[];
}
type Node = LeafNode | BranchNode;

interface Draft {
  node: Node;
  bytes: Buffer;
}
interface Ref {
  digest: Digest;
  /** Sum of entry bytes below this page. */
  bytes: bigint;
  /** Present until the page has been written. */
  draft?: Draft;
}

function nibbleAt(key: Uint8Array, index: number): number {
  const byte = key[index >> 1];
  return index % 2 === 0 ? byte >> 4 : byte & 15;
}

const nibbleLength = (key: Uint8Array): number => key.length * 2;

function compareNibbles(a: readonly number[], b: readonly number[]): number {
  const length = Math.min(a.length, b.length);
  for (let i = 0; i < length; i++) {
    if (a[i] !== b[i]) return a[i] < b[i] ? -1 : 1;
  }
  return a.length === b.length ? 0 : a.length < b.length ? -1 : 1;
}

function toNibbles(bytes: Uint8Array): number[] {
  const out: number[] = [];
  for (let i = 0; i < bytes.length * 2; i++) out.push(nibbleAt(bytes, i));
  return out;
}

function leafBytes(keys: readonly Buffer[]): bigint {
  return keys.reduce((sum, key) => sum + BigInt(indexEntryBytes(key)), 0n);
}

export class V2IndexTree {
  constructor(private readonly blocks: V2TreeBlockStore) {}

  /** Insert and delete entries, returning the new root. Absent removes and present adds are ignored. */
  async apply(
    root: Digest | null,
    adds: readonly Buffer[],
    removes: readonly Buffer[],
  ): Promise<Digest | null> {
    const addSet = new Map(adds.map((key) => [key.toString('hex'), key]));
    const removeSet = new Map(
      removes
        .filter((key) => !addSet.has(key.toString('hex')))
        .map((key) => [key.toString('hex'), key]),
    );
    let current: Ref | null = null;
    if (root !== null) {
      const { bytes } = await this.readNode(root, []);
      current = { digest: root, bytes };
    }
    const next = await this.update(
      current,
      [],
      [...addSet.values()].sort(Buffer.compare),
      [...removeSet.values()].sort(Buffer.compare),
    );
    if (next) await this.writeDraft(next);
    return next?.digest ?? null;
  }

  /** Entries with lo <= key < hi (hi null is unbounded), ascending or descending. */
  async *range(
    root: Digest | null,
    lo: Buffer | null,
    hi: Buffer | null,
    reverse = false,
  ): AsyncGenerator<Buffer> {
    if (root === null) return;
    const loNibbles = lo ? toNibbles(lo) : [];
    const hiNibbles = hi ? toNibbles(hi) : null;
    const mayContain = (prefix: number[]): boolean => {
      if (hiNibbles && compareNibbles(prefix, hiNibbles) >= 0) return false;
      if (loNibbles.length > 0) {
        const bound = loNibbles.slice(0, prefix.length);
        if (compareNibbles(prefix, bound) < 0) return false;
      }
      return true;
    };
    const walk = async function* (
      this: V2IndexTree,
      digest: Digest,
      prefix: number[],
      expected?: bigint,
    ): AsyncGenerator<Buffer> {
      const { node, bytes } = await this.readNode(digest, prefix, expected);
      void bytes;
      if (node.kind === 'leaf') {
        const keys = reverse ? [...node.keys].reverse() : node.keys;
        for (const key of keys) {
          if (lo && Buffer.compare(key, lo) < 0) continue;
          if (hi && Buffer.compare(key, hi) >= 0) continue;
          yield key;
        }
        return;
      }
      const path = [...prefix, ...node.skip];
      const children = reverse ? [...node.children].reverse() : node.children;
      for (const { nibble, ref } of children) {
        const childPrefix = [...path, nibble];
        if (!mayContain(childPrefix)) continue;
        yield* walk.call(this, ref.digest, childPrefix, ref.bytes);
      }
    };
    yield* walk.call(this, root, []);
  }

  /** Every entry in key order. */
  entries(root: Digest | null): AsyncGenerator<Buffer> {
    return this.range(root, null, null);
  }

  // ---- reading -------------------------------------------------------------

  private async readNode(
    digest: Digest,
    prefix: readonly number[],
    expected?: bigint,
  ): Promise<{ node: Node; bytes: bigint }> {
    const page = decodeMetadata(await this.blocks.get(digest), digest);
    let node: Node;
    let bytes: bigint;
    if (page.kind === 'index-leaf') {
      node = { kind: 'leaf', keys: [...page.entries] };
      bytes = leafBytes(node.keys);
      for (const key of node.keys) {
        const nibbles = toNibbles(key);
        if (prefix.some((nibble, i) => nibbles[i] !== nibble)) {
          throw new Error('BrightDB v2 index entry is on the wrong path');
        }
      }
    } else if (page.kind === 'index-branch') {
      node = {
        kind: 'branch',
        skip: [...page.skip],
        children: page.children.map((child) => ({
          nibble: child.nibble,
          ref: { digest: child.digest, bytes: child.recordBytes },
        })),
      };
      bytes = page.children.reduce((sum, child) => sum + child.recordBytes, 0n);
    } else {
      throw new Error('BrightDB v2 index tree expected an index leaf or branch');
    }
    if (expected !== undefined && expected !== bytes) {
      throw new Error('BrightDB v2 index child byte count does not match its page');
    }
    return { node, bytes };
  }

  private async loadNode(ref: Ref, prefix: readonly number[]): Promise<Node> {
    if (ref.draft) return ref.draft.node;
    return (await this.readNode(ref.digest, prefix, ref.bytes)).node;
  }

  private async collect(ref: Ref, prefix: readonly number[]): Promise<Buffer[]> {
    const node = await this.loadNode(ref, prefix);
    if (node.kind === 'leaf') return node.keys;
    const path = [...prefix, ...node.skip];
    const keys: Buffer[] = [];
    for (const { nibble, ref: child } of node.children) {
      keys.push(...(await this.collect(child, [...path, nibble])));
    }
    return keys;
  }

  // ---- building ------------------------------------------------------------

  private makeLeaf(keys: Buffer[]): Ref {
    const bytes = encodeMetadata({ kind: 'index-leaf', entries: keys });
    return {
      digest: digestPayload(bytes),
      bytes: leafBytes(keys),
      draft: { node: { kind: 'leaf', keys }, bytes },
    };
  }

  private makeBranch(skip: number[], children: ChildRef[]): Ref {
    const sorted = [...children].sort((a, b) => a.nibble - b.nibble);
    const bytes = encodeMetadata({
      kind: 'index-branch',
      skip,
      children: sorted.map(({ nibble, ref }) => ({
        nibble,
        recordBytes: ref.bytes,
        digest: ref.digest,
      })),
    });
    return {
      digest: digestPayload(bytes),
      bytes: sorted.reduce((sum, child) => sum + child.ref.bytes, 0n),
      draft: { node: { kind: 'branch', skip, children: sorted }, bytes },
    };
  }

  /** The canonical subtree for sorted, unique keys that share their first `depth` nibbles. */
  private build(keys: Buffer[], depth: number): Ref | null {
    if (keys.length === 0) return null;
    if (leafBytes(keys) <= LEAF_BUDGET) return this.makeLeaf(keys);

    const first = keys[0];
    const last = keys[keys.length - 1];
    let shared = 0;
    while (
      depth + shared < nibbleLength(first) &&
      depth + shared < nibbleLength(last) &&
      nibbleAt(first, depth + shared) === nibbleAt(last, depth + shared)
    ) {
      shared++;
    }
    const split = depth + shared;
    const skip: number[] = [];
    for (let i = depth; i < split; i++) skip.push(nibbleAt(first, i));

    const groups = new Map<number, Buffer[]>();
    for (const key of keys) {
      if (nibbleLength(key) <= split) {
        throw new V2IndexError('An index key cannot be a prefix of another');
      }
      const nibble = nibbleAt(key, split);
      const group = groups.get(nibble);
      if (group) group.push(key);
      else groups.set(nibble, [key]);
    }
    const children: ChildRef[] = [];
    for (const [nibble, group] of groups) {
      children.push({ nibble, ref: this.build(group, split + 1) as Ref });
    }
    return this.makeBranch(skip, children);
  }

  private async writeDraft(ref: Ref): Promise<void> {
    if (!ref.draft) return;
    if (ref.draft.node.kind === 'branch') {
      for (const child of ref.draft.node.children) await this.writeDraft(child.ref);
    }
    await this.blocks.put(ref.digest, ref.draft.bytes);
  }

  // ---- updating ------------------------------------------------------------

  private async update(
    ref: Ref | null,
    prefix: number[],
    adds: Buffer[],
    removes: Buffer[],
  ): Promise<Ref | null> {
    if (adds.length === 0 && removes.length === 0) return ref;
    const depth = prefix.length;
    if (ref === null) return this.build(adds, depth);

    const node = await this.loadNode(ref, prefix);
    if (node.kind === 'leaf') {
      const keys = new Map(node.keys.map((key) => [key.toString('hex'), key]));
      for (const key of removes) keys.delete(key.toString('hex'));
      for (const key of adds) keys.set(key.toString('hex'), key);
      return this.build([...keys.values()].sort(Buffer.compare), depth);
    }

    const skipLength = node.skip.length;
    const mismatch = (key: Buffer): number => {
      for (let i = 0; i < skipLength; i++) {
        if (depth + i >= nibbleLength(key) || nibbleAt(key, depth + i) !== node.skip[i]) {
          return i;
        }
      }
      return skipLength;
    };

    const diverging = adds.filter((key) => mismatch(key) < skipLength);
    const children = new Map(node.children.map((child) => [child.nibble, child.ref]));

    if (diverging.length === 0) {
      const split = depth + skipLength;
      const path = [...prefix, ...node.skip];
      const groups = new Map<number, { adds: Buffer[]; removes: Buffer[] }>();
      const place = (key: Buffer, kind: 'adds' | 'removes') => {
        if (nibbleLength(key) <= split) {
          throw new V2IndexError('An index key cannot be a prefix of another');
        }
        const nibble = nibbleAt(key, split);
        let group = groups.get(nibble);
        if (!group) groups.set(nibble, (group = { adds: [], removes: [] }));
        group[kind].push(key);
      };
      adds.forEach((key) => place(key, 'adds'));
      // A remove that leaves this branch's prefix cannot be present here.
      removes.filter((key) => mismatch(key) === skipLength).forEach((key) => place(key, 'removes'));
      for (const [nibble, group] of groups) {
        const next = await this.update(
          children.get(nibble) ?? null,
          [...path, nibble],
          group.adds,
          group.removes,
        );
        if (next) children.set(nibble, next);
        else children.delete(nibble);
      }
      return this.finalize(prefix, node.skip, children);
    }

    // A new key leaves the shared prefix at position j: split the branch there.
    const j = Math.min(...diverging.map(mismatch));
    const split = depth + j;
    const oldNibble = node.skip[j];
    const stillInPrefix = (key: Buffer): boolean => {
      for (let i = 0; i < j; i++) {
        if (nibbleAt(key, depth + i) !== node.skip[i]) return false;
      }
      return true;
    };
    const old = { adds: [] as Buffer[], removes: [] as Buffer[] };
    const others = new Map<number, Buffer[]>();
    for (const key of adds) {
      if (nibbleLength(key) <= split) {
        throw new V2IndexError('An index key cannot be a prefix of another');
      }
      const nibble = nibbleAt(key, split);
      if (nibble === oldNibble) old.adds.push(key);
      else {
        const group = others.get(nibble);
        if (group) group.push(key);
        else others.set(nibble, [key]);
      }
    }
    for (const key of removes) {
      if (nibbleLength(key) > split && stillInPrefix(key) && nibbleAt(key, split) === oldNibble) {
        old.removes.push(key);
      }
    }
    const reduced = this.makeBranch(node.skip.slice(j + 1), node.children);
    const oldPath = [...prefix, ...node.skip.slice(0, j), oldNibble];
    const oldResult = await this.update(reduced, oldPath, old.adds, old.removes);
    const merged = new Map<number, Ref>();
    if (oldResult) merged.set(oldNibble, oldResult);
    for (const [nibble, group] of others) {
      const built = this.build(group, split + 1);
      if (built) merged.set(nibble, built);
    }
    return this.finalize(prefix, node.skip.slice(0, j), merged);
  }

  /** Restore the canonical shape after children changed. */
  private async finalize(
    prefix: number[],
    skip: number[],
    children: Map<number, Ref>,
  ): Promise<Ref | null> {
    if (children.size === 0) return null;
    const entries = [...children.entries()]
      .sort(([a], [b]) => a - b)
      .map(([nibble, ref]) => ({ nibble, ref }));
    const total = entries.reduce((sum, child) => sum + child.ref.bytes, 0n);
    const path = [...prefix, ...skip];

    if (total <= LEAF_BUDGET) {
      const keys: Buffer[] = [];
      for (const { nibble, ref } of entries) {
        keys.push(...(await this.collect(ref, [...path, nibble])));
      }
      return this.build(keys, prefix.length);
    }
    if (entries.length === 1) {
      const [{ nibble, ref }] = entries;
      const child = await this.loadNode(ref, [...path, nibble]);
      if (child.kind !== 'branch') {
        throw new Error('BrightDB v2 index leaf exceeds the leaf budget');
      }
      return this.makeBranch([...skip, nibble, ...child.skip], child.children);
    }
    return this.makeBranch(skip, entries);
  }
}
