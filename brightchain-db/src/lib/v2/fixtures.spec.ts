/**
 * Golden conformance fixtures for BrightDB storage format v2.
 *
 * The fixtures under `brightchain-db/fixtures/storage-v2` are the
 * language-neutral contract that other implementations, such as the C++ port,
 * consume. This test rebuilds every fixture with the reference TypeScript
 * implementation and fails if the checked-in bytes differ.
 *
 * Regenerate after an intentional format change:
 *   BRIGHTDB_V2_UPDATE_FIXTURES=1 yarn jest -c brightchain-db/jest.config.ts \
 *     brightchain-db/src/lib/v2/fixtures.spec.ts
 */
import {
  mkdir,
  mkdtemp,
  readdir,
  readFile,
  rm,
  writeFile,
} from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join, relative, resolve } from 'node:path';
import {
  decodeMetadata,
  digestPayload,
  encodeDocument,
  encodeKey,
  encodeMetadata,
  type Digest,
  type V2Metadata,
  type V2Record,
  type V2Version,
} from './codec';
import { BrightDbV2DiskStore } from './disk-store';
import { PortableBrightDb } from './portable-database';
import { V2Tree, type V2TreeBlockStore } from './tree';

const FIXTURE_ROOT = resolve(__dirname, '../../../fixtures/storage-v2');
const SPEC_PATH = resolve(
  __dirname,
  '../../../../docs/architecture/brightdb-storage-format-v2.md',
);
const UPDATE = process.env['BRIGHTDB_V2_UPDATE_FIXTURES'] === '1';

const WRITER_ID = '000102030405060708090a0b0c0d0e0f';
const DATABASE_ID = '101112131415161718191a1b1c1d1e1f';

type Json =
  | null
  | boolean
  | number
  | string
  | Json[]
  | { [key: string]: Json };

function version(counter: bigint, writerId = WRITER_ID): V2Version {
  return { counter, writerId };
}

function jsonVersion(value: V2Version): Json {
  return { counter: value.counter.toString(), writerId: value.writerId };
}

function jsonRecord(record: V2Record): Json {
  return {
    key: record.key,
    keyUtf8: encodeKey(record.key).subarray(2).toString('hex'),
    version: jsonVersion(record.version),
    target: record.target,
  };
}

function jsonMetadata(block: V2Metadata): Json {
  switch (block.kind) {
    case 'database':
      return {
        kind: block.kind,
        databaseId: block.databaseId,
        clock: block.clock.toString(),
        catalog: block.catalog,
      };
    case 'collection':
      return {
        kind: block.kind,
        generation: jsonVersion(block.generation),
        primary: block.primary,
      };
    case 'branch':
      return {
        kind: block.kind,
        children: block.children.map((child) => ({
          nibble: child.nibble,
          recordBytes: child.recordBytes.toString(),
          digest: child.digest,
        })),
      };
    default:
      return { kind: block.kind, records: block.records.map(jsonRecord) };
  }
}

class MemoryBlocks implements V2TreeBlockStore {
  readonly blocks = new Map<Digest, Uint8Array>();

  async get(digest: Digest): Promise<Uint8Array> {
    const bytes = this.blocks.get(digest);
    if (!bytes) throw new Error(`Missing block ${digest}`);
    return bytes;
  }

  async put(digest: Digest, bytes: Uint8Array): Promise<void> {
    if (digestPayload(bytes) !== digest) throw new Error('Digest mismatch');
    this.blocks.set(digest, bytes);
  }
}

/** Deterministic Fisher-Yates shuffle with a fixed LCG seed. */
function shuffled<T>(items: readonly T[], seed: number): T[] {
  const result = [...items];
  let state = seed >>> 0;
  for (let index = result.length - 1; index > 0; index--) {
    state = (Math.imul(state, 1664525) + 1013904223) >>> 0;
    const swap = state % (index + 1);
    [result[index], result[swap]] = [result[swap], result[index]];
  }
  return result;
}

/** Every page reachable from a tree root, parents before children. */
async function reachablePages(
  blocks: MemoryBlocks,
  root: Digest,
): Promise<Json[]> {
  const pages: Json[] = [];
  const queue = [root];
  while (queue.length > 0) {
    const digest = queue.shift() as Digest;
    const bytes = await blocks.get(digest);
    const block = decodeMetadata(bytes, digest);
    pages.push({
      digest,
      payload: Buffer.from(bytes).toString('hex'),
      decoded: jsonMetadata(block),
    });
    if (block.kind === 'branch') {
      queue.push(...block.children.map((child) => child.digest));
    }
  }
  return pages;
}

async function treeVector(
  name: string,
  description: string,
  kind: 'primary' | 'catalog',
  records: V2Record[],
): Promise<Json> {
  const blocks = new MemoryBlocks();
  const tree = new V2Tree(blocks, kind);
  const root = await tree.setMany(null, shuffled(records, 0x5eed));
  if (root === null) throw new Error('Expected a nonempty fixture tree');

  // Building the same records in another order must give the same root.
  const other = new V2Tree(new MemoryBlocks(), kind);
  let incremental: Digest | null = null;
  for (const record of shuffled(records, 0xbeef)) {
    incremental = await other.set(incremental, record);
  }
  expect(incremental).toBe(root);

  const sorted = [...records].sort((left, right) =>
    Buffer.compare(encodeKey(left.key), encodeKey(right.key)),
  );
  return {
    name,
    description,
    kind,
    records: sorted.map(jsonRecord),
    root,
    pages: await reachablePages(blocks, root),
  };
}

function appendixVectors(): Map<string, { payload: string; digest: string }> {
  const text = require('node:fs').readFileSync(SPEC_PATH, 'utf8') as string;
  const block = text
    .split('## Appendix A. Encoding vectors')[1]
    .split('```text')[1]
    .split('```')[0]
    .trim();
  return new Map(
    block.split(/\n\n+/u).map((entry) => {
      const [name, payload, digest] = entry.split('\n');
      return [name, { payload, digest }];
    }),
  );
}

async function buildVectors(): Promise<Json> {
  const liveKey = '\u{10000}';
  const deadKey = '';
  const generation = version(1n);
  const documentVersion = version(9_007_199_254_740_993n);
  const appendix = appendixVectors();

  const blocks: Json[] = [];
  function addBlock(
    name: string,
    input: Json,
    bytes: Buffer,
    decoded?: Json,
  ): Digest {
    const digest = digestPayload(bytes);
    const expected = appendix.get(name);
    if (expected) {
      expect(bytes.toString('hex')).toBe(expected.payload);
      expect(digest).toBe(expected.digest);
    }
    blocks.push({
      name,
      input,
      ...(decoded === undefined ? {} : { decoded }),
      payload: bytes.toString('hex'),
      digest,
    });
    return digest;
  }

  const documentInput = { n: 1, _id: liveKey };
  const documentDigest = addBlock(
    'document',
    documentInput,
    encodeDocument(documentInput),
  );

  const primary: V2Metadata = {
    kind: 'primary',
    records: [
      { key: deadKey, version: version(documentVersion.counter - 1n), target: null },
      { key: liveKey, version: documentVersion, target: documentDigest },
    ],
  };
  const primaryDigest = addBlock(
    'primary',
    jsonMetadata(primary),
    encodeMetadata(primary),
  );
  const collection: V2Metadata = {
    kind: 'collection',
    generation,
    primary: primaryDigest,
  };
  const collectionDigest = addBlock(
    'collection',
    jsonMetadata(collection),
    encodeMetadata(collection),
  );
  const catalog: V2Metadata = {
    kind: 'catalog',
    records: [{ key: 'docs', version: generation, target: collectionDigest }],
  };
  const catalogDigest = addBlock(
    'catalog',
    jsonMetadata(catalog),
    encodeMetadata(catalog),
  );
  const database: V2Metadata = {
    kind: 'database',
    databaseId: DATABASE_ID,
    clock: documentVersion.counter,
    catalog: catalogDigest,
  };
  addBlock('database', jsonMetadata(database), encodeMetadata(database));
  const empty: V2Metadata = { ...database, clock: 0n, catalog: null };
  addBlock('empty', jsonMetadata(empty), encodeMetadata(empty));
  const branch: V2Metadata = {
    kind: 'branch',
    children: [
      { nibble: 0, recordBytes: 4090n, digest: '11'.repeat(64) },
      { nibble: 15, recordBytes: 100n, digest: '22'.repeat(64) },
    ],
  };
  addBlock('branch', jsonMetadata(branch), encodeMetadata(branch));

  // Canonical JSON cases beyond the appendix. Inputs are given as the JSON
  // text an application would supply; `payload` is the RFC 8785 output.
  const canonicalCases: Array<[string, string]> = [
    ['json-key-order', '{"z":1,"_id":"k","a":2,"\\u00e9":3,"\\ud83d\\ude00":4,"\\ue000":5}'],
    ['json-numbers', '{"_id":"n","a":4.5e-7,"b":1e-7,"c":-0,"d":0.1,"e":9007199254740991,"f":-9007199254740991,"g":123.456,"h":5e-324}'],
    ['json-strings', '{"_id":"s","t":"tab\\tline\\nquote\\"slash\\\\ctl\\u0001 del\\u007f"}'],
    ['json-nested', '{"_id":"x","list":[true,false,null,{"b":[],"a":{}}],"obj":{"y":"2","x":"1"}}'],
  ];
  for (const [name, text] of canonicalCases) {
    const input = JSON.parse(text) as { [key: string]: Json };
    addBlock(name, { json: text }, encodeDocument(input));
  }

  // Inputs every conforming encoder must reject before writing anything.
  const rejected: Json[] = [];
  const rejectedCases: Array<[string, string]> = [
    ['integer-above-safe-range', '{"_id":"r","a":9007199254740992}'],
    ['integral-exponent-above-safe-range', '{"_id":"r","a":1e21}'],
    ['numeric-id', '{"_id":1}'],
    ['empty-id', '{"_id":""}'],
    ['unpaired-surrogate-id', '{"_id":"\\ud800"}'],
    ['top-level-array', '[{"_id":"a"}]'],
  ];
  for (const [name, text] of rejectedCases) {
    expect(() => encodeDocument(JSON.parse(text))).toThrow();
    rejected.push({ name, json: text });
  }

  const trees: Json[] = [];
  const primaryRecords: V2Record[] = [];
  for (let index = 0; index < 400; index++) {
    const key = `doc-${index.toString().padStart(4, '0')}`;
    const target =
      index % 7 === 3
        ? null
        : digestPayload(encodeDocument({ _id: key, n: index }));
    primaryRecords.push({
      key,
      version: version(BigInt(index + 2), index % 2 ? WRITER_ID : DATABASE_ID),
      target,
    });
  }
  trees.push(
    await treeVector(
      'primary-400',
      'Primary tree with 400 records, every seventh (index % 7 == 3) a tombstone; ' +
        'targets are digests of {"_id":key,"n":index}; odd indexes use writer ' +
        WRITER_ID +
        ', even indexes writer ' +
        DATABASE_ID +
        '. Built from a shuffled insertion order.',
      'primary',
      primaryRecords,
    ),
  );

  const catalogRecords: V2Record[] = [];
  for (let index = 0; index < 60; index++) {
    // Long multi-byte names force several catalog pages.
    const key = `collection-${'é'.repeat(40)}-${index}`;
    catalogRecords.push({
      key,
      version: version(BigInt(index + 1)),
      target:
        index % 5 === 0
          ? null
          : digestPayload(
              encodeMetadata({
                kind: 'collection',
                generation: version(BigInt(index + 1)),
                primary: null,
              }),
            ),
    });
  }
  trees.push(
    await treeVector(
      'catalog-60',
      'Catalog tree with 60 long UTF-8 names; every fifth is a tombstone and the ' +
        'others reference an empty collection root at the same generation.',
      'catalog',
      catalogRecords,
    ),
  );

  return {
    format: 'BrightDB storage 2',
    note: 'Generated by brightchain-db/src/lib/v2/fixtures.spec.ts. Digests are SHA3-512 of the payload bytes. u64 values are decimal strings.',
    blocks,
    rejectedDocuments: rejected,
    trees,
  };
}

/** Writes the `basic` portable store with production APIs and fixed IDs. */
async function buildBasicStore(path: string): Promise<Json> {
  await BrightDbV2DiskStore.create(
    path,
    encodeMetadata({
      kind: 'database',
      databaseId: DATABASE_ID,
      clock: 0n,
      catalog: null,
    }),
    Buffer.from(WRITER_ID, 'hex'),
  );
  const db = await PortableBrightDb.open({ path });
  const heads: string[] = [];
  const store = await BrightDbV2DiskStore.open(path);
  const mark = async () => heads.push(await store.readHead());

  await mark();
  await db.writeBatch([
    { type: 'insert', collection: 'users', document: { _id: 'alice', age: 31 } },
    { type: 'insert', collection: 'users', document: { _id: 'bob', age: 27 } },
    { type: 'insert', collection: 'notes', document: { _id: 'n1', text: 'first' } },
  ]);
  await mark();
  await db.collection('users').replaceById('bob', { _id: 'bob', age: 28 });
  await mark();
  await db.collection('users').deleteById('alice');
  await mark();
  const items = Array.from({ length: 200 }, (_, index) => ({
    _id: `item-${index.toString().padStart(4, '0')}`,
    index,
    label: `Item ${index} é\u{1F600}`,
  }));
  await db.collection('items').insertMany(items);
  await mark();
  await db.writeBatch([
    { type: 'dropCollection', collection: 'notes' },
  ]);
  await mark();
  await db.writeBatch([
    { type: 'insert', collection: 'notes', document: { _id: 'n2', text: 'second generation' } },
    { type: 'delete', collection: 'items', id: 'item-0007' },
    { type: 'insert', collection: 'unicode', document: { _id: '\u{1F600}', v: [1, 2.5, 'x'] } },
  ]);
  await mark();

  const collections: Record<string, Json> = {};
  for (const name of (await db.listCollections()).sort()) {
    const documents = await db.collection(name).find({}).toArray();
    collections[name] = documents.sort((left, right) =>
      Buffer.compare(
        encodeKey(String(left['_id'])),
        encodeKey(String(right['_id'])),
      ),
    ) as Json;
  }
  db.close();

  return {
    description:
      'Written by the TypeScript production API with fixed database and writer IDs. ' +
      'Commits in order: empty init; users alice+bob and notes n1 in one batch; replace bob; ' +
      'delete alice; insertMany 200 items; drop notes; recreate notes with n2, delete item-0007 ' +
      'and insert unicode in one batch.',
    databaseId: DATABASE_ID,
    writerId: WRITER_ID,
    heads,
    head: heads[heads.length - 1],
    absent: {
      users: ['alice'],
      notes: ['n1'],
      items: ['item-0007'],
    },
    collections,
  };
}

async function listFiles(root: string): Promise<string[]> {
  const files: string[] = [];
  async function walk(directory: string): Promise<void> {
    for (const entry of await readdir(directory, { withFileTypes: true })) {
      const path = join(directory, entry.name);
      if (entry.isDirectory()) await walk(path);
      else files.push(relative(root, path));
    }
  }
  await walk(root);
  return files.sort();
}

function stringify(value: Json): string {
  return `${JSON.stringify(value, null, 2)}\n`;
}

async function checkOrWrite(path: string, contents: string): Promise<void> {
  if (UPDATE) {
    await mkdir(resolve(path, '..'), { recursive: true });
    await writeFile(path, contents);
    return;
  }
  expect(await readFile(path, 'utf8')).toBe(contents);
}

describe('BrightDB v2 golden fixtures', () => {
  jest.setTimeout(120_000);

  it('match the encoding and tree vectors produced by the reference codec', async () => {
    const vectors = stringify(await buildVectors());
    await checkOrWrite(join(FIXTURE_ROOT, 'vectors.json'), vectors);
  });

  it('match the basic portable store written by the production API', async () => {
    const scratch = await mkdtemp(join(tmpdir(), 'brightdb-v2-fixture-'));
    try {
      const built = join(scratch, 'basic');
      const expected = stringify(await buildBasicStore(built));
      const target = join(FIXTURE_ROOT, 'stores', 'basic');
      const builtFiles = await listFiles(built);

      if (UPDATE) {
        await rm(target, { recursive: true, force: true });
        for (const file of builtFiles) {
          await mkdir(resolve(target, file, '..'), { recursive: true });
          await writeFile(join(target, file), await readFile(join(built, file)));
        }
      } else {
        expect(await listFiles(target)).toEqual(builtFiles);
        for (const file of builtFiles) {
          expect(
            (await readFile(join(target, file))).equals(
              await readFile(join(built, file)),
            ),
          ).toBe(true);
        }
      }
      await checkOrWrite(join(FIXTURE_ROOT, 'stores', 'basic.json'), expected);
    } finally {
      await rm(scratch, { recursive: true, force: true });
    }
  });

  it('opens the checked-in store read-only and finds every expected document', async () => {
    const manifest = JSON.parse(
      await readFile(join(FIXTURE_ROOT, 'stores', 'basic.json'), 'utf8'),
    ) as {
      head: string;
      absent: Record<string, string[]>;
      collections: Record<string, Array<{ _id: string }>>;
    };
    const path = join(FIXTURE_ROOT, 'stores', 'basic');
    expect((await readFile(join(path, 'HEAD'), 'utf8')).trim()).toBe(
      manifest.head,
    );
    const db = await PortableBrightDb.open({ path });
    expect((await db.listCollections()).sort()).toEqual(
      Object.keys(manifest.collections).sort(),
    );
    for (const [name, documents] of Object.entries(manifest.collections)) {
      for (const document of documents) {
        expect(await db.collection(name).findById(document._id)).toEqual(
          document,
        );
      }
    }
    for (const [name, ids] of Object.entries(manifest.absent)) {
      for (const id of ids) {
        expect(await db.collection(name).findById(id)).toBeNull();
      }
    }
    db.close();
  });
});
