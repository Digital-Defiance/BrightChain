/**
 * Which blocks a set of roots keeps alive: the database root, catalog and
 * collection roots, primary trees, documents, index definitions and trees, and
 * the manifests and chunks of attachments referenced through `_files`.
 */
import type { BrightDbV2BlockSource } from './block-source';
import { decodeDocument, decodeMetadata, type Digest } from './codec';

export async function collectReachable(
  source: BrightDbV2BlockSource,
  roots: readonly Digest[],
): Promise<Set<Digest>> {
  const seen = new Set<Digest>();
  const meta = async (digest: Digest) => decodeMetadata(await source.readBlock(digest), digest);

  const blob = async (digest: Digest): Promise<void> => {
    if (seen.has(digest)) return;
    seen.add(digest);
    const manifest = await meta(digest);
    if (manifest.kind !== 'blob') throw new Error('Not an attachment manifest');
    for (const entry of manifest.entries) {
      if (manifest.depth > 0) await blob(entry);
      else seen.add(entry);
    }
  };
  const document = async (digest: Digest): Promise<void> => {
    if (seen.has(digest)) return;
    seen.add(digest);
    const doc = decodeDocument(await source.readBlock(digest), undefined, digest) as Record<string, unknown>;
    const files = doc['_files'];
    if (files && typeof files === 'object') {
      for (const entry of Object.values(files as Record<string, { digest: string }>)) await blob(entry.digest);
    }
  };
  const indexTree = async (digest: Digest): Promise<void> => {
    if (seen.has(digest)) return;
    seen.add(digest);
    const page = await meta(digest);
    if (page.kind === 'index-branch') for (const child of page.children) await indexTree(child.digest);
  };
  const tree = async (kind: 'catalog' | 'primary', digest: Digest): Promise<void> => {
    if (seen.has(digest)) return;
    seen.add(digest);
    const page = await meta(digest);
    if (page.kind === 'branch') {
      for (const child of page.children) await tree(kind, child.digest);
    } else if (page.kind === kind) {
      for (const record of page.records) {
        if (record.target === null) continue;
        if (kind === 'catalog') await collection(record.target);
        else await document(record.target);
      }
    }
  };
  const collection = async (digest: Digest): Promise<void> => {
    if (seen.has(digest)) return;
    seen.add(digest);
    const root = await meta(digest);
    if (root.kind !== 'collection') throw new Error('Not a collection root');
    if (root.primary !== null) await tree('primary', root.primary);
    if (root.indexes !== null && !seen.has(root.indexes)) {
      seen.add(root.indexes);
      const set = await meta(root.indexes);
      if (set.kind === 'indexes') {
        for (const definition of set.definitions) {
          if (definition.root !== null) await indexTree(definition.root);
        }
      }
    }
  };

  for (const digest of roots) {
    if (seen.has(digest)) continue;
    seen.add(digest);
    const root = await meta(digest);
    if (root.kind !== 'database') throw new Error('Not a database root');
    if (root.catalog !== null) await tree('catalog', root.catalog);
  }
  return seen;
}
