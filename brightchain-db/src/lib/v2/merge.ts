/**
 * Replica merge (spec section 6): fork a database, write on both sides, and
 * merge one side into the other. The result is deterministic, so merging in
 * either direction, or in any order, gives the same root.
 */
import {
  compareVersions,
  decodeDocument,
  decodeMetadata,
  encodeMetadata,
  type Digest,
  type V2CollectionRoot,
  type V2DatabaseRoot,
  type V2IndexDefinition,
  type V2Record,
} from './codec';
import type { BrightDbV2BlockSource } from './block-source';
import type { BrightDbV2DiskWriter, BrightDbV2Storage } from './storage';
import { extractIndexKeys } from './index-key';
import { V2IndexTree } from './index-tree';
import { V2Tree, type V2TreeBlockStore } from './tree';

export interface PortableMergeResult {
  /** The local root before the merge. */
  previous: string;
  /** The local root after the merge. Equal to `previous` when nothing changed. */
  root: string;
  /** Records taken from the other replica (documents and collections). */
  adopted: number;
}

export class V2MergeError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'V2MergeError';
  }
}

type TreeKind = 'catalog' | 'primary';

/** Copies a block graph from one store to another, children before parents. */
class ClosureCopier {
  constructor(
    private readonly local: BrightDbV2Storage,
    private readonly writer: BrightDbV2DiskWriter,
    private readonly remote: BrightDbV2BlockSource,
  ) {}

  /**
   * A block already present locally is complete: blocks are always written
   * after their children, so its descendants are present too.
   */
  private async missing(digest: Digest): Promise<boolean> {
    return !(await this.local.hasBlock(digest));
  }

  async ensureDatabase(digest: Digest): Promise<void> {
    if (!(await this.missing(digest))) return;
    const bytes = await this.remote.readBlock(digest);
    const root = decodeMetadata(bytes, digest);
    if (root.kind !== 'database') throw new V2MergeError('Not a database root');
    if (root.catalog !== null) await this.ensureTree('catalog', root.catalog);
    await this.writer.writeBlock(bytes);
  }

  async ensureTree(kind: TreeKind, digest: Digest): Promise<void> {
    if (!(await this.missing(digest))) return;
    const bytes = await this.remote.readBlock(digest);
    const page = decodeMetadata(bytes, digest);
    if (page.kind === 'branch') {
      for (const child of page.children) await this.ensureTree(kind, child.digest);
    } else if (page.kind === kind) {
      for (const record of page.records) {
        if (record.target === null) continue;
        if (kind === 'catalog') await this.ensureCollection(record.target);
        else await this.ensureDocument(record.target);
      }
    } else {
      throw new V2MergeError(`Expected a ${kind} page`);
    }
    await this.writer.writeBlock(bytes);
  }

  async ensureCollection(digest: Digest): Promise<void> {
    if (!(await this.missing(digest))) return;
    const bytes = await this.remote.readBlock(digest);
    const collection = decodeMetadata(bytes, digest);
    if (collection.kind !== 'collection') throw new V2MergeError('Not a collection root');
    if (collection.primary !== null) await this.ensureTree('primary', collection.primary);
    if (collection.indexes !== null) await this.ensureIndexes(collection.indexes);
    await this.writer.writeBlock(bytes);
  }

  private async ensureIndexes(digest: Digest): Promise<void> {
    if (!(await this.missing(digest))) return;
    const bytes = await this.remote.readBlock(digest);
    const set = decodeMetadata(bytes, digest);
    if (set.kind !== 'indexes') throw new V2MergeError('Not an index set');
    for (const definition of set.definitions) {
      if (definition.root !== null) await this.ensureIndexTree(definition.root);
    }
    await this.writer.writeBlock(bytes);
  }

  private async ensureIndexTree(digest: Digest): Promise<void> {
    if (!(await this.missing(digest))) return;
    const bytes = await this.remote.readBlock(digest);
    const page = decodeMetadata(bytes, digest);
    if (page.kind === 'index-branch') {
      for (const child of page.children) await this.ensureIndexTree(child.digest);
    } else if (page.kind !== 'index-leaf') {
      throw new V2MergeError('Expected an index page');
    }
    await this.writer.writeBlock(bytes);
  }

  async ensureDocument(digest: Digest): Promise<void> {
    if (!(await this.missing(digest))) return;
    const bytes = await this.remote.readBlock(digest);
    const document = decodeDocument(bytes, undefined, digest);
    const files = (document as Record<string, unknown>)['_files'];
    if (files && typeof files === 'object') {
      for (const entry of Object.values(files as Record<string, { digest: string }>)) {
        await this.ensureBlob(entry.digest);
      }
    }
    await this.writer.writeBlock(bytes);
  }

  private async ensureBlob(digest: Digest): Promise<void> {
    if (!(await this.missing(digest))) return;
    const bytes = await this.remote.readBlock(digest);
    const manifest = decodeMetadata(bytes, digest);
    if (manifest.kind !== 'blob') throw new V2MergeError('Not an attachment manifest');
    for (const entry of manifest.entries) {
      if (manifest.depth > 0) {
        await this.ensureBlob(entry);
      } else if (await this.missing(entry)) {
        await this.writer.writeBlock(await this.remote.readBlock(entry));
      }
    }
    await this.writer.writeBlock(bytes);
  }
}

/** Whether the remote record beats the local one: greater version, then tombstone, then greater digest. */
function remoteWins(local: V2Record, remote: V2Record): boolean {
  const order = compareVersions(remote.version, local.version);
  if (order !== 0) return order > 0;
  if (local.target === null) return false;
  if (remote.target === null) return true;
  return remote.target > local.target;
}

async function readDatabaseRoot(
  store: BrightDbV2BlockSource,
  digest: Digest,
): Promise<V2DatabaseRoot> {
  const block = decodeMetadata(await store.readBlock(digest), digest);
  if (block.kind !== 'database') throw new V2MergeError('Not a database root');
  return block;
}

async function readCollection(
  blocks: V2TreeBlockStore,
  digest: Digest,
): Promise<V2CollectionRoot> {
  const block = decodeMetadata(await blocks.get(digest), digest);
  if (block.kind !== 'collection') throw new V2MergeError('Not a collection root');
  return block;
}

async function readDefinitions(
  blocks: V2TreeBlockStore,
  collection: V2CollectionRoot,
): Promise<V2IndexDefinition[]> {
  if (collection.indexes === null) return [];
  const set = decodeMetadata(await blocks.get(collection.indexes), collection.indexes);
  if (set.kind !== 'indexes') throw new V2MergeError('Not an index set');
  return [...set.definitions];
}

/**
 * Merge the remote replica's root into the local store while holding its
 * write lock. Returns null when nothing changes. Nothing is published unless
 * every needed block was read and verified.
 */
export async function mergeReplica(
  local: BrightDbV2Storage,
  writer: BrightDbV2DiskWriter,
  remote: BrightDbV2BlockSource,
  remoteHead: Digest,
): Promise<{ root: Digest; adopted: number } | null> {
  const localHead = await local.readHead();
  if (localHead === remoteHead) return null;
  const localRoot = await readDatabaseRoot(local, localHead);
  const remoteRoot = await readDatabaseRoot(remote, remoteHead);
  if (localRoot.databaseId !== remoteRoot.databaseId) {
    throw new V2MergeError('The replicas belong to different databases');
  }

  // Trees read pages from whichever store has them and write only to the local store.
  const union: V2TreeBlockStore = {
    get: async (digest) =>
      (await local.hasBlock(digest)) ? local.readBlock(digest) : remote.readBlock(digest),
    put: async (digest, bytes) => {
      if ((await writer.writeBlock(bytes)) !== digest) {
        throw new V2MergeError('Block writer returned a different digest');
      }
    },
  };
  const catalog = new V2Tree(union, 'catalog');
  const primary = new V2Tree(union, 'primary');
  const indexTree = new V2IndexTree(union);
  const copier = new ClosureCopier(local, writer, remote);

  let adopted = 0;
  const catalogUpdates: V2Record[] = [];

  const mergeCollection = async (
    name: string,
    localRecord: V2Record,
    remoteRecord: V2Record,
  ): Promise<void> => {
    const lc = await readCollection(union, localRecord.target as Digest);
    const rc = await readCollection(union, remoteRecord.target as Digest);
    const taken: Array<{ before?: V2Record; after: V2Record }> = [];
    for await (const change of primary.diff(lc.primary, rc.primary)) {
      if (!change.after) continue;
      if (change.before && !remoteWins(change.before, change.after)) continue;
      if (change.after.target !== null) await copier.ensureDocument(change.after.target);
      taken.push({ before: change.before, after: change.after });
    }
    const mergedPrimary = await primary.setMany(
      lc.primary,
      taken.map((t) => t.after),
    );

    const definitions = new Map<string, { local?: V2IndexDefinition; remote?: V2IndexDefinition }>();
    for (const definition of await readDefinitions(union, lc)) {
      definitions.set(definition.name, { local: definition });
    }
    for (const definition of await readDefinitions(union, rc)) {
      definitions.set(definition.name, { ...definitions.get(definition.name), remote: definition });
    }
    const readDoc = async (digest: Digest | null | undefined, id: string) =>
      digest ? decodeDocument(await union.get(digest), id) : null;
    const merged: V2IndexDefinition[] = [];
    for (const name of [...definitions.keys()].sort()) {
      const { local: l, remote: r } = definitions.get(name) as {
        local?: V2IndexDefinition;
        remote?: V2IndexDefinition;
      };
      // Equal names with different fields: the greater field list wins, on both sides.
      const keepLocal = l && (!r || l.fields.join('\u0000') >= r.fields.join('\u0000'));
      if (keepLocal && l) {
        const adds: Buffer[] = [];
        const removes: Buffer[] = [];
        for (const { before, after } of taken) {
          const id = after.key;
          const oldDoc = await readDoc(before?.target, id);
          const newDoc = await readDoc(after.target, id);
          const oldKeys = oldDoc ? extractIndexKeys(oldDoc, l.fields, id) : [];
          const newKeys = newDoc ? extractIndexKeys(newDoc, l.fields, id) : [];
          const newSet = new Set(newKeys.map((k) => k.toString('hex')));
          const oldSet = new Set(oldKeys.map((k) => k.toString('hex')));
          removes.push(...oldKeys.filter((k) => !newSet.has(k.toString('hex'))));
          adds.push(...newKeys.filter((k) => !oldSet.has(k.toString('hex'))));
        }
        merged.push({ ...l, root: await indexTree.apply(l.root, adds, removes) });
      } else if (r) {
        // The index exists only here or loses a name conflict: rebuild it from the merged documents.
        const keys: Buffer[] = [];
        for await (const record of primary.entries(mergedPrimary)) {
          if (record.target === null) continue;
          keys.push(...extractIndexKeys(await readDoc(record.target, record.key), r.fields, record.key));
        }
        merged.push({ name, fields: [...r.fields], root: await indexTree.apply(null, keys, []) });
      }
    }
    const indexes =
      merged.length === 0
        ? null
        : await writer.writeBlock(encodeMetadata({ kind: 'indexes', definitions: merged }));
    const rootBytes = encodeMetadata({
      kind: 'collection',
      generation: lc.generation,
      primary: mergedPrimary,
      indexes,
    });
    const target = await writer.writeBlock(rootBytes);
    if (target !== localRecord.target) {
      catalogUpdates.push({ key: name, version: localRecord.version, target });
    }
    adopted += taken.length;
  };

  for await (const change of catalog.diff(localRoot.catalog, remoteRoot.catalog)) {
    const l = change.before;
    const r = change.after;
    if (!r) continue; // only local: keep
    if (l && compareVersions(r.version, l.version) === 0 && l.target !== null && r.target !== null) {
      await mergeCollection(change.key, l, r); // same generation: merge the contents
      continue;
    }
    if (l && !remoteWins(l, r)) continue;
    if (r.target !== null) await copier.ensureCollection(r.target);
    catalogUpdates.push(r);
    adopted++;
  }

  const clock = localRoot.clock > remoteRoot.clock ? localRoot.clock : remoteRoot.clock;
  if (catalogUpdates.length === 0 && clock === localRoot.clock) return null;
  const mergedCatalog = await catalog.setMany(localRoot.catalog, catalogUpdates);
  const head = await writer.writeBlock(
    encodeMetadata({ ...localRoot, clock, catalog: mergedCatalog }),
  );
  return head === localHead ? null : { root: head, adopted };
}

/** Copy a whole database state into an empty store. */
export async function copyDatabase(
  local: BrightDbV2Storage,
  writer: BrightDbV2DiskWriter,
  remote: BrightDbV2BlockSource,
  head: Digest,
): Promise<void> {
  await new ClosureCopier(local, writer, remote).ensureDatabase(head);
}
