import {
  compareKeys,
  decodeMetadata,
  digestPayload,
  encodeKey,
  encodeMetadata,
  MAX_METADATA_BYTES,
  MAX_U64,
  recordByteLength,
  type Digest,
  type V2Branch,
  type V2Leaf,
  type V2Record,
} from './codec';

const LEAF_HEADER_BYTES = 7;
const LEAF_RECORD_BUDGET = BigInt(MAX_METADATA_BYTES - LEAF_HEADER_BYTES);
const ROUTE_LENGTH = 128;

type LeafKind = V2Leaf['kind'];
type TreePage = V2Branch | V2Leaf;

export interface V2TreeBlockStore {
  get(digest: Digest): Promise<Uint8Array>;
  put(digest: Digest, bytes: Uint8Array): Promise<void>;
}

interface RoutedRecord {
  record: V2Record;
  route: string;
  recordBytes: bigint;
}

interface PageReference {
  digest: Digest;
  recordBytes: bigint;
  draft?: PageDraft;
}

interface ChildReference {
  nibble: number;
  page: PageReference;
}

interface PageDraft {
  page: TreePage;
  bytes: Uint8Array;
  children: readonly ChildReference[];
}

function keyRoute(key: string): string {
  return digestPayload(encodeKey(key));
}

function routeRecord(record: V2Record): RoutedRecord {
  return {
    record,
    route: keyRoute(record.key),
    recordBytes: BigInt(recordByteLength(record)),
  };
}

function childPrefix(prefix: string, nibble: number): string {
  return prefix + nibble.toString(16);
}

function partition(
  records: readonly RoutedRecord[],
  depth: number,
): Map<number, RoutedRecord[]> {
  const groups = new Map<number, RoutedRecord[]>();
  for (const entry of records) {
    const nibble = Number.parseInt(entry.route.charAt(depth), 16);
    const group = groups.get(nibble);
    if (group) {
      group.push(entry);
    } else {
      groups.set(nibble, [entry]);
    }
  }
  return groups;
}

function childRecordBytes(children: readonly ChildReference[]): bigint {
  const total = children.reduce(
    (sum, child) => sum + child.page.recordBytes,
    0n,
  );
  if (total > MAX_U64) {
    throw new Error('BrightDB v2 trie record byte count exceeds u64');
  }
  return total;
}

/** An immutable v2 catalog or primary trie. Null represents an empty tree. */
export class V2Tree {
  constructor(
    private readonly blocks: V2TreeBlockStore,
    private readonly leafKind: LeafKind,
  ) {}

  async get(root: Digest | null, key: string): Promise<V2Record | undefined> {
    const route = keyRoute(key);
    let digest = root;
    let expectedBytes: bigint | undefined;
    let prefix = '';

    while (digest !== null) {
      const { page } = await this.readPage(digest, prefix, expectedBytes);
      if (page.kind !== 'branch') {
        return page.records.find((record) => record.key === key);
      }

      const nibble = Number.parseInt(route.charAt(prefix.length), 16);
      const child = page.children.find((entry) => entry.nibble === nibble);
      if (!child) return undefined;
      digest = child.digest;
      expectedBytes = child.recordBytes;
      prefix = childPrefix(prefix, nibble);
    }

    return undefined;
  }

  async set(root: Digest | null, record: V2Record): Promise<Digest> {
    const next = await this.stageUpdate(root, '', [routeRecord(record)]);
    await this.writeDraft(next);
    return next.digest;
  }

  /** Later records for the same key replace earlier records in this batch. */
  async setMany(
    root: Digest | null,
    records: readonly V2Record[],
  ): Promise<Digest | null> {
    if (records.length === 0) return root;

    const updates = new Map<string, RoutedRecord>();
    for (const record of records) {
      updates.set(record.key, routeRecord(record));
    }
    const next = await this.stageUpdate(root, '', [...updates.values()]);
    await this.writeDraft(next);
    return next.digest;
  }

  /** Visit all records, including tombstones, in deterministic trie order. */
  async *entries(root: Digest | null): AsyncIterableIterator<V2Record> {
    if (root !== null) yield* this.iterate(root, '');
  }

  private async readPage(
    digest: Digest,
    prefix: string,
    expectedBytes?: bigint,
  ): Promise<{ page: TreePage; recordBytes: bigint }> {
    const bytes = await this.blocks.get(digest);
    const page = decodeMetadata(bytes, digest);
    let recordBytes: bigint;

    if (page.kind === 'branch') {
      if (prefix.length >= ROUTE_LENGTH) {
        throw new Error('BrightDB v2 trie branch exceeds the maximum depth');
      }
      recordBytes = page.children.reduce(
        (sum, child) => sum + child.recordBytes,
        0n,
      );
      if (recordBytes <= LEAF_RECORD_BUDGET || recordBytes > MAX_U64) {
        throw new Error(
          'BrightDB v2 trie branch has a noncanonical record byte count',
        );
      }
    } else if (page.kind === this.leafKind) {
      recordBytes = BigInt(bytes.byteLength - LEAF_HEADER_BYTES);
      if (prefix.length > 0) {
        for (const record of page.records) {
          if (!keyRoute(record.key).startsWith(prefix)) {
            throw new Error('BrightDB v2 trie record is on the wrong path');
          }
        }
      }
    } else {
      throw new Error(
        `BrightDB v2 trie expected a ${this.leafKind} leaf or branch`,
      );
    }

    if (expectedBytes !== undefined && expectedBytes !== recordBytes) {
      throw new Error(
        'BrightDB v2 trie child record byte count does not match its page',
      );
    }
    return { page, recordBytes };
  }

  private async stageUpdate(
    digest: Digest | null,
    prefix: string,
    updates: readonly RoutedRecord[],
    expectedBytes?: bigint,
  ): Promise<PageReference> {
    if (digest === null) return this.build(prefix, updates);

    const { page, recordBytes } = await this.readPage(
      digest,
      prefix,
      expectedBytes,
    );
    let next: PageReference;
    if (page.kind === 'branch') {
      next = await this.updateBranch(page, prefix, updates);
    } else {
      const records = new Map(
        page.records.map((record) => [record.key, routeRecord(record)]),
      );
      for (const entry of updates) records.set(entry.record.key, entry);
      next = this.build(prefix, [...records.values()]);
    }
    return next.digest === digest ? { digest, recordBytes } : next;
  }

  private async updateBranch(
    page: V2Branch,
    prefix: string,
    updates: readonly RoutedRecord[],
  ): Promise<PageReference> {
    const children = new Map<number, PageReference>();
    for (const child of page.children) {
      children.set(child.nibble, {
        digest: child.digest,
        recordBytes: child.recordBytes,
      });
    }
    for (const [nibble, records] of partition(updates, prefix.length)) {
      const previous = children.get(nibble);
      const next = await this.stageUpdate(
        previous?.digest ?? null,
        childPrefix(prefix, nibble),
        records,
        previous?.recordBytes,
      );
      children.set(nibble, next);
    }

    const references = Array.from(children, ([nibble, child]) => ({
      nibble,
      page: child,
    }));
    references.sort((a, b) => a.nibble - b.nibble);
    const recordBytes = childRecordBytes(references);
    if (recordBytes > LEAF_RECORD_BUDGET) {
      return this.stageBranch(references, recordBytes);
    }

    const records: V2Record[] = [];
    for (const child of references) {
      const nextPrefix = childPrefix(prefix, child.nibble);
      const { digest, draft, recordBytes: childBytes } = child.page;
      const childPage =
        draft?.page ??
        (await this.readPage(digest, nextPrefix, childBytes)).page;
      // The entire subtree fits in a leaf, so every direct child must be a leaf.
      if (childPage.kind === 'branch') {
        throw new Error('BrightDB v2 trie cannot collapse a branch child');
      }
      records.push(...childPage.records);
    }
    return this.stageLeaf(records, recordBytes);
  }

  private build(
    prefix: string,
    entries: readonly RoutedRecord[],
  ): PageReference {
    const recordBytes = entries.reduce(
      (sum, entry) => sum + entry.recordBytes,
      0n,
    );
    if (recordBytes <= LEAF_RECORD_BUDGET) {
      return this.stageLeaf(
        entries.map((entry) => entry.record),
        recordBytes,
      );
    }
    if (prefix.length === ROUTE_LENGTH) {
      throw new Error('BrightDB v2 trie hash-collision capacity exceeded');
    }

    const children = Array.from(
      partition(entries, prefix.length),
      ([nibble, records]) => ({
        nibble,
        page: this.build(childPrefix(prefix, nibble), records),
      }),
    );
    children.sort((a, b) => a.nibble - b.nibble);
    return this.stageBranch(children, childRecordBytes(children));
  }

  private stageLeaf(records: V2Record[], recordBytes: bigint): PageReference {
    records.sort((a, b) => compareKeys(a.key, b.key));
    return this.stagePage({ kind: this.leafKind, records }, recordBytes);
  }

  private stageBranch(
    children: readonly ChildReference[],
    recordBytes: bigint,
  ): PageReference {
    return this.stagePage(
      {
        kind: 'branch',
        children: children.map(({ nibble, page }) => ({
          nibble,
          digest: page.digest,
          recordBytes: page.recordBytes,
        })),
      },
      recordBytes,
      children,
    );
  }

  private stagePage(
    page: TreePage,
    recordBytes: bigint,
    children: readonly ChildReference[] = [],
  ): PageReference {
    const bytes = encodeMetadata(page);
    return {
      digest: digestPayload(bytes),
      recordBytes,
      draft: { page, bytes, children },
    };
  }

  private async writeDraft({ digest, draft }: PageReference): Promise<void> {
    if (!draft) return;
    for (const child of draft.children) await this.writeDraft(child.page);
    await this.blocks.put(digest, draft.bytes);
  }

  private async *iterate(
    digest: Digest,
    prefix: string,
    expectedBytes?: bigint,
  ): AsyncIterableIterator<V2Record> {
    const { page } = await this.readPage(digest, prefix, expectedBytes);
    if (page.kind !== 'branch') {
      yield* page.records;
      return;
    }

    for (const child of page.children) {
      yield* this.iterate(
        child.digest,
        childPrefix(prefix, child.nibble),
        child.recordBytes,
      );
    }
  }
}
