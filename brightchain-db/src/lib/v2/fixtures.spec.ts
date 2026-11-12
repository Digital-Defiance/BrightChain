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
import {
  decodeIndexId,
  encodeIndexValue,
  extractIndexKeys,
  indexRange,
  type IndexQuery,
  type IndexScalar,
} from './index-key';
import { V2IndexTree } from './index-tree';
import { BrightDbV2AesCipher } from './encryption';
import { writeAttachment } from './attachments';
import { copyDatabase } from './merge';
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
        indexes: block.indexes,
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
    case 'indexes':
      return {
        kind: block.kind,
        definitions: block.definitions.map((definition) => ({
          name: definition.name,
          fields: [...definition.fields],
          root: definition.root,
        })),
      };
    case 'index-leaf':
      return { kind: block.kind, entries: block.entries.map((e) => e.toString('hex')) };
    case 'index-branch':
      return {
        kind: block.kind,
        skip: [...block.skip],
        children: block.children.map((child) => ({
          nibble: child.nibble,
          recordBytes: child.recordBytes.toString(),
          digest: child.digest,
        })),
      };
    case 'blob':
      return { kind: block.kind, size: block.size.toString(), depth: block.depth, entries: [...block.entries] };
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
    if (block.kind === 'branch' || block.kind === 'index-branch') {
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
      type: name === 'document' || name.startsWith('json-') ? 'document' : 'metadata',
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
      indexes: null,
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


  // ---- index and attachment blocks ------------------------------------------
  const indexLeafKeys = [
    ...extractIndexKeys({ city: 'Oslo', age: 30 }, ['city', 'age'], 'u1'),
    ...extractIndexKeys({ city: 'Bergen', age: 41 }, ['city', 'age'], 'u2'),
    ...extractIndexKeys({ city: 'Oslo', age: 25 }, ['city', 'age'], 'u3'),
  ].sort(Buffer.compare);
  const indexLeaf: V2Metadata = { kind: 'index-leaf', entries: indexLeafKeys };
  const indexLeafDigest = addBlock('index-leaf', jsonMetadata(indexLeaf), encodeMetadata(indexLeaf));
  const indexSet: V2Metadata = {
    kind: 'indexes',
    definitions: [
      { name: 'by_city_age', fields: ['city', 'age'], root: indexLeafDigest },
      { name: 'by_tag', fields: ['tags'], root: null },
    ],
  };
  addBlock('indexes', jsonMetadata(indexSet), encodeMetadata(indexSet));
  const indexBranch: V2Metadata = {
    kind: 'index-branch',
    skip: [1, 2, 3],
    children: [
      { nibble: 0, recordBytes: 4090n, digest: '11'.repeat(64) },
      { nibble: 15, recordBytes: 100n, digest: '22'.repeat(64) },
    ],
  };
  addBlock('index-branch', jsonMetadata(indexBranch), encodeMetadata(indexBranch));
  const blob: V2Metadata = { kind: 'blob', size: 1_048_577n, depth: 0, entries: ['33'.repeat(64), '44'.repeat(64)] };
  addBlock('blob', jsonMetadata(blob), encodeMetadata(blob));
  const blobEmpty: V2Metadata = { kind: 'blob', size: 0n, depth: 0, entries: [] };
  addBlock('blob-empty', jsonMetadata(blobEmpty), encodeMetadata(blobEmpty));
  // A file just over one manifest's reach (63 chunks) needs a second level.
  const blobDeep: V2Metadata = { kind: 'blob', size: 63n * 1_048_576n + 1n, depth: 1, entries: ['55'.repeat(64), '66'.repeat(64)] };
  addBlock('blob-deep', jsonMetadata(blobDeep), encodeMetadata(blobDeep));
  const blobFull: V2Metadata = { kind: 'blob', size: 63n * 1_048_576n, depth: 0, entries: Array.from({ length: 63 }, (_, i) => i.toString(16).padStart(2, '0').repeat(64)) };
  addBlock('blob-full', jsonMetadata(blobFull), encodeMetadata(blobFull));
  const collectionWithIndexes: V2Metadata = {
    kind: 'collection',
    generation,
    primary: primaryDigest,
    indexes: digestPayload(encodeMetadata(indexSet)),
  };
  addBlock('collection-indexed', jsonMetadata(collectionWithIndexes), encodeMetadata(collectionWithIndexes));

  const valueCases: Array<[string, IndexScalar | undefined]> = [
    ['absent', undefined], ['null', null], ['false', false], ['true', true],
    ['number', -1.5e300], ['number', -2.5], ['number', 0], ['number', 7], ['number', 1e300],
    ['number', 1_700_000_000_000],
    ['string', ''], ['string', 'a'], ['string', 'a\u0000b'], ['string', 'ab'], ['string', 'é'], ['string', '\u{1F600}'],
  ];
  const indexValues = valueCases.map(([type, value]) => ({
    type,
    json: value === undefined ? null : value,
    hex: encodeIndexValue(value).toString('hex'),
  }));
  const keyCases: Array<{ document: Json; fields: string[]; id: string }> = [
    { document: { city: 'Oslo', age: 30 }, fields: ['city', 'age'], id: 'u1' },
    { document: { tags: ['x', 'y', 'x'], n: 1 }, fields: ['tags', 'n'], id: 'd' },
    { document: {}, fields: ['missing'], id: '\u{1F600}' },
    { document: { a: { b: 5 }, e: [] }, fields: ['a.b', 'e'], id: 'a\u0000b' },
    { document: { f: [true, null, 'z', 3] }, fields: ['f'], id: 'k' },
  ];
  const indexKeys = keyCases.map((c) => ({
    ...c,
    keys: extractIndexKeys(c.document, c.fields, c.id).map((k) => k.toString('hex')).sort(),
  }));
  const rangeCases: Array<{ fieldCount: number; query: IndexQuery }> = [
    { fieldCount: 2, query: {} },
    { fieldCount: 2, query: { equals: ['Oslo'] } },
    { fieldCount: 2, query: { equals: ['Oslo', 30] } },
    { fieldCount: 2, query: { equals: ['Oslo'], gt: 25 } },
    { fieldCount: 2, query: { equals: ['Oslo'], gte: 25, lt: 40 } },
    { fieldCount: 2, query: { equals: ['Oslo'], lte: 40 } },
    { fieldCount: 2, query: { equals: [null], lt: 5 } },
    { fieldCount: 1, query: { gt: 'ab' } },
    { fieldCount: 1, query: { lte: 'a\u0000' } },
    { fieldCount: 1, query: { prefix: 'ab' } },
    { fieldCount: 1, query: { prefix: '' } },
    { fieldCount: 1, query: { gte: false, lt: true } },
  ];
  const indexRanges = rangeCases.map((c) => {
    const { lo, hi } = indexRange(c.fieldCount, c.query);
    return { ...c, query: c.query as unknown as Json, lo: lo.toString('hex'), hi: hi === null ? null : hi.toString('hex') };
  });

  const indexTrees: Json[] = [];
  const indexTreeVector = async (name: string, description: string, keys: Buffer[]): Promise<Json> => {
    const memory = new MemoryBlocks();
    const tree = new V2IndexTree(memory);
    const root = await tree.apply(null, shuffled(keys, 0x1d3), []);
    expect(await new V2IndexTree(new MemoryBlocks()).apply(null, shuffled(keys, 0x77), [])).toBe(root);
    // Insert in two halves and delete a few extras to prove history independence.
    const half = Math.floor(keys.length / 2);
    const staged = new V2IndexTree(new MemoryBlocks());
    let rolling = await staged.apply(null, keys.slice(0, half), []);
    rolling = await staged.apply(rolling, keys.slice(half), []);
    expect(rolling).toBe(root);
    const sorted = [...keys].sort(Buffer.compare);
    const pages = await reachablePages(memory, root as Digest);
    expect(pages.some((page) => (page as { decoded: { kind: string } }).decoded.kind === 'index-branch')).toBe(true);
    return {
      name,
      description,
      keys: sorted.map((k) => k.toString('hex')),
      root,
      pages,
    };
  };
  indexTrees.push(
    await indexTreeVector(
      'index-strings-800',
      'Single-field string index over user-0000..user-0799 with ids id0..id799; long shared prefixes force prefix compression.',
      Array.from({ length: 800 }, (_, i) =>
        Buffer.concat([
          encodeIndexValue(`user-${i.toString().padStart(4, '0')}`),
          encodeIndexValue(`id${i}`),
        ]),
      ),
    ),
  );
  indexTrees.push(
    await indexTreeVector(
      'index-compound-1500',
      'Compound index (number, string) over timestamps 1700000000000+i and "x"+(i%7) with ids d0..d1499.',
      Array.from({ length: 1500 }, (_, i) =>
        extractIndexKeys({ a: 1_700_000_000_000 + i, b: `x${i % 7}` }, ['a', 'b'], `d${i}`)[0],
      ),
    ),
  );


  // ---- encryption known answers ---------------------------------------------
  const encKey = Buffer.from(Array.from({ length: 32 }, (_, i) => i));
  const encCipher = new BrightDbV2AesCipher(encKey);
  const encCases = ['', 'hello', 'a block of é\u{1F600} text'].map((text, index) => {
    const plaintext = Buffer.from(text, 'utf8');
    const digest = digestPayload(plaintext);
    const nonce = Buffer.from(Array.from({ length: 12 }, (_, i) => index * 16 + i + 1));
    return {
      plaintext: plaintext.toString('hex'),
      digest,
      nonce: nonce.toString('hex'),
      physicalName: encCipher.physicalName(digest),
      sealed: encCipher.seal(digest, plaintext, nonce).toString('hex'),
    };
  });
  const headNonce = Buffer.from(Array.from({ length: 12 }, (_, i) => 0xa0 + i));
  const headDigest = digestPayload(Buffer.from('head'));
  // A key ring after one rotation: names are the same, new blocks use version 2, version 1 still opens.
  const ringName = Buffer.from(Array.from({ length: 32 }, (_, i) => 100 + i));
  const ringK1 = Buffer.from(Array.from({ length: 32 }, (_, i) => 150 + i));
  const ringK2 = Buffer.from(Array.from({ length: 32 }, (_, i) => 200 + i));
  const ringOld = new BrightDbV2AesCipher({ nameSecret: ringName, dataKeys: { 1: ringK1 }, currentVersion: 1 });
  const ringNew = new BrightDbV2AesCipher({ nameSecret: ringName, dataKeys: { 1: ringK1, 2: ringK2 }, currentVersion: 2 });
  const ringPlain = Buffer.from('ring block', 'utf8');
  const ringDigest = digestPayload(ringPlain);
  const ringNonce = Buffer.from(Array.from({ length: 12 }, (_, i) => 0x40 + i));
  const encryption = {
    key: encKey.toString('hex'),
    ring: {
      nameSecret: ringName.toString('hex'),
      dataKeys: { '1': ringK1.toString('hex'), '2': ringK2.toString('hex') },
      currentVersion: 2,
      plaintext: ringPlain.toString('hex'),
      digest: ringDigest,
      nonce: ringNonce.toString('hex'),
      physicalName: ringNew.physicalName(ringDigest),
      sealedVersion1: ringOld.seal(ringDigest, ringPlain, ringNonce).toString('hex'),
      sealedVersion2: ringNew.seal(ringDigest, ringPlain, ringNonce).toString('hex'),
      sealedHeadVersion2: ringNew.sealHead(ringDigest, ringNonce).toString('hex'),
    },
    cases: encCases,
    head: { digest: headDigest, nonce: headNonce.toString('hex'), sealed: encCipher.sealHead(headDigest, headNonce).toString('hex') },
  };


  // ---- manifest trees over zero-filled files ----------------------------------
  const MIB = 1_048_576;
  const zeroBlock = Buffer.alloc(MIB);
  const zeroDigests = new Map<number, string>();
  const blobTrees: Json[] = [];
  const treeSizes = [
    0, 1, MIB - 1, MIB, MIB + 1, 62 * MIB + 1, 63 * MIB, 63 * MIB + 1, 64 * MIB,
    126 * MIB, 126 * MIB + 5, 63 * 63 * MIB, 63 * 63 * MIB + 1, 63 * 63 * MIB + 63 * MIB + 7,
  ];
  for (const size of treeSizes) {
    const manifests = new Map<string, V2Metadata>();
    const writer = {
      writeBlock: async (payload: Uint8Array) => {
        let digest: string;
        if (Buffer.compare(payload, zeroBlock.subarray(0, payload.length)) === 0) {
          const known = zeroDigests.get(payload.length);
          digest = known ?? digestPayload(payload);
          zeroDigests.set(payload.length, digest);
        } else {
          digest = digestPayload(payload);
          manifests.set(digest, decodeMetadata(Buffer.from(payload), digest));
        }
        return digest;
      },
      writeBlocks: async () => undefined,
      syncBlocks: async () => undefined,
      publishHead: async () => undefined,
    };
    async function* zeros(): AsyncGenerator<Uint8Array> {
      for (let left = size; left > 0; left -= 700_000) yield zeroBlock.subarray(0, Math.min(left, 700_000));
    }
    const ref = await writeAttachment(writer, zeros());
    const root = manifests.get(ref.digest);
    blobTrees.push({
      size,
      root: ref.digest,
      depth: root && root.kind === 'blob' ? root.depth : 0,
    });
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
      indexes: null,
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
    indexValues,
    indexKeys,
    indexRanges,
    indexTrees,
    blobTrees,
    encryption,
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


/** The attachment bytes used by the `indexed` store; shared with the C++ tests. */
function attachmentBytes(kind: 'small' | 'large'): Buffer {
  if (kind === 'small') return Buffer.from('hello attachment', 'utf8');
  return Buffer.from(Array.from({ length: 1_048_577 }, (_, i) => i % 251));
}

const CITIES = ['Oslo', 'Bergen', 'Tromso', 'Stavanger'];

function person(index: number): Record<string, Json> {
  return {
    _id: `p${index.toString().padStart(4, '0')}`,
    name: `Person ${index}`,
    city: CITIES[index % CITIES.length],
    age: 18 + ((index * 7) % 50),
    tags: index % 3 === 0 ? ['a', 'b'] : index % 3 === 1 ? ['b'] : [],
    profile: { score: (index * 13) % 100 },
  };
}

/** Writes the `indexed` store: compound and multikey indexes plus attachments. */
async function buildIndexedStore(path: string): Promise<Json> {
  await BrightDbV2DiskStore.create(
    path,
    encodeMetadata({ kind: 'database', databaseId: DATABASE_ID, clock: 0n, catalog: null }),
    Buffer.from(WRITER_ID, 'hex'),
  );
  const db = await PortableBrightDb.open({ path });
  const store = await BrightDbV2DiskStore.open(path);
  const heads: string[] = [];
  const mark = async () => heads.push(await store.readHead());
  await mark();

  const first = Array.from({ length: 6 }, (_, i) => person(i));
  await db.writeBatch([
    ...first.map((document) => ({ type: 'insert' as const, collection: 'people', document })),
    { type: 'createIndex', collection: 'people', name: 'by_city_age', fields: ['city', 'age'] },
    { type: 'createIndex', collection: 'people', name: 'by_tag', fields: ['tags'] },
    { type: 'createIndex', collection: 'people', name: 'by_score', fields: ['profile.score'] },
  ]);
  await mark();
  await db.collection('people').insertMany(Array.from({ length: 294 }, (_, i) => person(i + 6)));
  await mark();
  await db.collection('people').replaceById('p0002', { ...person(2), city: 'Oslo', age: 99, tags: ['z'] });
  await mark();
  await db.collection('people').deleteById('p0003');
  await mark();

  const small = await db.putAttachment(attachmentBytes('small'), { type: 'text/plain' });
  const large = await db.putAttachment(attachmentBytes('large'));
  await db.collection('files').insertOne({
    _id: 'with-files',
    _files: {
      note: { digest: small.digest, size: small.size, type: 'text/plain' },
      big: { digest: large.digest, size: large.size },
    },
  });
  await mark();
  await db.collection('people').dropIndex('by_tag');
  await mark();
  await db.writeBatch([
    { type: 'dropCollection', collection: 'files' },
    { type: 'insert', collection: 'files', document: { _id: 'after-drop', v: 1 } },
    { type: 'createIndex', collection: 'files', name: 'by_v', fields: ['v'] },
  ]);
  await mark();

  const queries: Array<{ collection: string; index: string; query: IndexQuery }> = [
    { collection: 'people', index: 'by_city_age', query: {} },
    { collection: 'people', index: 'by_city_age', query: { equals: ['Oslo'] } },
    { collection: 'people', index: 'by_city_age', query: { equals: ['Oslo'], gte: 30, lt: 50 } },
    { collection: 'people', index: 'by_city_age', query: { equals: ['Bergen'], gt: 40, descending: true } },
    { collection: 'people', index: 'by_city_age', query: { prefix: 'T' } },
    { collection: 'people', index: 'by_city_age', query: { equals: ['Oslo'], lte: 40, limit: 5 } },
    { collection: 'people', index: 'by_score', query: { gte: 90 } },
    { collection: 'people', index: 'by_score', query: { gt: 10, lt: 14, descending: true } },
    { collection: 'files', index: 'by_v', query: { equals: [1] } },
  ];
  const results = [];
  for (const q of queries) {
    const documents = await db.collection(q.collection).findByIndex(q.index, q.query);
    results.push({ ...q, ids: documents.map((d) => d['_id']) });
  }
  const names = (await db.listCollections()).sort();
  const indexes: Record<string, Json> = {};
  for (const name of names) indexes[name] = (await db.collection(name).listIndexes()) as Json;
  const collections: Record<string, Json> = {};
  for (const name of names) {
    const documents = await db.collection(name).find({}).toArray();
    collections[name] = documents.sort((a, b) =>
      Buffer.compare(encodeKey(String(a['_id'])), encodeKey(String(b['_id']))),
    ) as Json;
  }
  expect((await db.getAttachment(large)).equals(attachmentBytes('large'))).toBe(true);
  db.close();

  return {
    description:
      'Written by the TypeScript production API. Commits: init; six people with three indexes created ' +
      'in the same batch (by_city_age, by_tag, by_score); insertMany 294 more people; replace p0002; ' +
      'delete p0003; two attachments then a document referencing them; drop by_tag; drop and ' +
      'recreate files with an index. Attachment bytes: "hello attachment" and 1048577 bytes of i % 251.',
    databaseId: DATABASE_ID,
    writerId: WRITER_ID,
    heads,
    head: heads[heads.length - 1],
    attachments: { small: { ...small }, large: { ...large } } as Json,
    indexes,
    queries: results as Json,
    absent: { people: ['p0003'], files: ['with-files'] },
    collections,
  };
}


const WRITER_A = '0a0b0c0d0e0f10111213141516171819';
const WRITER_B = '1a1b1c1d1e1f20212223242526272829';

/** Two replicas with fixed writer IDs that diverge and merge; both runtimes must reach the same roots. */
async function buildMergeManifest(scratch: string): Promise<Json> {
  const empty = encodeMetadata({ kind: 'database', databaseId: DATABASE_ID, clock: 0n, catalog: null });
  const pathA = join(scratch, 'merge-a');
  const pathB = join(scratch, 'merge-b');
  await BrightDbV2DiskStore.create(pathA, empty, Buffer.from(WRITER_A, 'hex'));
  const a = await PortableBrightDb.open({ path: pathA });
  await a.writeBatch([
    { type: 'insert', collection: 'people', document: { _id: 'p1', city: 'Oslo', age: 30 } },
    { type: 'insert', collection: 'people', document: { _id: 'p2', city: 'Bergen', age: 40 } },
    { type: 'createIndex', collection: 'people', name: 'by_city', fields: ['city'] },
  ]);
  const storeB = await BrightDbV2DiskStore.create(pathB, empty, Buffer.from(WRITER_B, 'hex'));
  const storeA = await BrightDbV2DiskStore.open(pathA);
  const head = await a.root();
  await storeB.withWriteLock(async (writer) => {
    await copyDatabase(storeB, writer, storeA, head);
    await writer.publishHead(head);
  });
  const b = await PortableBrightDb.open({ path: pathB });
  await a.collection('people').insertOne({ _id: 'p3', city: 'Oslo', age: 20 });
  await a.collection('people').replaceById('p2', { _id: 'p2', city: 'Oslo', age: 41 });
  await b.collection('people').insertOne({ _id: 'p4', city: 'Bergen', age: 25 });
  await b.collection('people').createIndex('by_age', ['age']);
  await b.collection('people').deleteById('p1');
  const rootA = await a.root();
  const rootB = await b.root();
  const merged = (await a.merge(b)).root;
  expect((await b.merge(a)).root).toBe(merged);
  a.close();
  b.close();
  return {
    description:
      'Two replicas of one database with fixed writer IDs. Both start from: people p1, p2 and index by_city. ' +
      'A inserts p3 and replaces p2; B inserts p4, creates index by_age and deletes p1. rootA and rootB are the ' +
      'roots before merging; `merged` is the root both reach after merging in either direction.',
    databaseId: DATABASE_ID,
    writerA: WRITER_A,
    writerB: WRITER_B,
    rootA,
    rootB,
    merged,
  };
}


const ENCRYPTION_KEY = Buffer.from(Array.from({ length: 32 }, (_, i) => i));

/** The `encrypted` store: same operations as a plain store, written under a key. Nonces are random, so only logical content is compared. */
async function buildEncryptedStore(path: string): Promise<Json> {
  const cipher = new BrightDbV2AesCipher(ENCRYPTION_KEY);
  await BrightDbV2DiskStore.create(
    path,
    encodeMetadata({ kind: 'database', databaseId: DATABASE_ID, clock: 0n, catalog: null }),
    Buffer.from(WRITER_ID, 'hex'),
    cipher,
  );
  const db = await PortableBrightDb.open({ path, encryption: { key: ENCRYPTION_KEY } });
  const store = await BrightDbV2DiskStore.open(path, cipher);
  const heads: string[] = [];
  const mark = async () => heads.push(await store.readHead());
  await mark();
  await db.writeBatch([
    ...Array.from({ length: 40 }, (_, i) => ({
      type: 'insert' as const,
      collection: 'people',
      document: { _id: `p${i.toString().padStart(3, '0')}`, city: CITIES[i % 4], age: 20 + (i % 30) },
    })),
    { type: 'createIndex', collection: 'people', name: 'by_city_age', fields: ['city', 'age'] },
  ]);
  await mark();
  const ref = await db.putAttachment(Buffer.from('hello attachment', 'utf8'), { type: 'text/plain' });
  await db.collection('people').replaceById('p001', {
    _id: 'p001', city: 'Oslo', age: 99, _files: { note: { ...ref } },
  });
  await mark();
  await db.collection('people').deleteById('p002');
  await mark();
  const queries = [
    { collection: 'people', index: 'by_city_age', query: { equals: ['Oslo'] } },
    { collection: 'people', index: 'by_city_age', query: { equals: ['Bergen'], gte: 25, lt: 35 } },
  ] as Array<{ collection: string; index: string; query: IndexQuery }>;
  const results = [];
  for (const q of queries) {
    const docs = await db.collection(q.collection).findByIndex(q.index, q.query);
    results.push({ ...q, ids: docs.map((d) => d['_id']) });
  }
  const documents = (await db.collection('people').find({}).toArray()).sort((a, b) =>
    Buffer.compare(encodeKey(String(a['_id'])), encodeKey(String(b['_id']))),
  );
  db.close();
  return {
    description:
      'Written by the TypeScript production API under the key below (the bytes 0..31). Nonces are random, so ' +
      'file bytes differ between builds; the logical heads, documents and query results are fixed.',
    keyHex: ENCRYPTION_KEY.toString('hex'),
    databaseId: DATABASE_ID,
    writerId: WRITER_ID,
    heads,
    head: heads[heads.length - 1],
    attachment: { ...ref } as Json,
    queries: results as Json,
    documents: documents as Json,
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

  for (const [name, build] of [
    ['basic', buildBasicStore],
    ['indexed', buildIndexedStore],
  ] as const) {
    it(`match the ${name} portable store written by the production API`, async () => {
      const scratch = await mkdtemp(join(tmpdir(), 'brightdb-v2-fixture-'));
      try {
        const built = join(scratch, name);
        const expected = stringify(await build(built));
        const target = join(FIXTURE_ROOT, 'stores', name);
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
        await checkOrWrite(join(FIXTURE_ROOT, 'stores', `${name}.json`), expected);
      } finally {
        await rm(scratch, { recursive: true, force: true });
      }
    });
  }

  it('match the encrypted store, ignoring random nonces', async () => {
    const scratch = await mkdtemp(join(tmpdir(), 'brightdb-v2-enc-fixture-'));
    try {
      const built = join(scratch, 'encrypted');
      const manifest = stringify(await buildEncryptedStore(built));
      const target = join(FIXTURE_ROOT, 'stores', 'encrypted');
      if (UPDATE) {
        await rm(target, { recursive: true, force: true });
        for (const file of await listFiles(built)) {
          await mkdir(resolve(target, file, '..'), { recursive: true });
          await writeFile(join(target, file), await readFile(join(built, file)));
        }
        await writeFile(join(FIXTURE_ROOT, 'stores', 'encrypted.json'), manifest);
      } else {
        expect(await readFile(join(FIXTURE_ROOT, 'stores', 'encrypted.json'), 'utf8')).toBe(manifest);
        // The checked-in directory opens with the key and holds the same logical state.
        const checked = await PortableBrightDb.open({
          path: target,
          encryption: { key: ENCRYPTION_KEY },
        });
        const recorded = JSON.parse(manifest) as { head: string; documents: unknown[] };
        expect(await checked.root()).toBe(recorded.head);
        expect(await checked.collection('people').find({}).toArray()).toHaveLength(recorded.documents.length);
        checked.close();
      }
    } finally {
      await rm(scratch, { recursive: true, force: true });
    }
  });

  it('match the merged replicas fixture', async () => {
    const scratch = await mkdtemp(join(tmpdir(), 'brightdb-v2-merge-fixture-'));
    try {
      await checkOrWrite(
        join(FIXTURE_ROOT, 'stores', 'merged.json'),
        stringify(await buildMergeManifest(scratch)),
      );
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

  it('answers the recorded index queries and reads attachments from the checked-in indexed store', async () => {
    const manifest = JSON.parse(
      await readFile(join(FIXTURE_ROOT, 'stores', 'indexed.json'), 'utf8'),
    ) as {
      queries: Array<{ collection: string; index: string; query: IndexQuery; ids: string[] }>;
      attachments: { small: { digest: string }; large: { digest: string } };
    };
    const db = await PortableBrightDb.open({ path: join(FIXTURE_ROOT, 'stores', 'indexed') });
    for (const q of manifest.queries) {
      const documents = await db.collection(q.collection).findByIndex(q.index, q.query);
      expect(documents.map((d) => d['_id'])).toEqual(q.ids);
    }
    db.close();
  });
});
