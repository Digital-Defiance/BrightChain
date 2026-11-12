import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import {
  compareKeys,
  decodeDocument,
  decodeMetadata,
  digestPayload,
  encodeDocument,
  encodeDocumentForWrite,
  encodeKey,
  encodeMetadata,
  MAX_DOCUMENT_BYTES,
  MAX_METADATA_BYTES,
  MAX_U64,
  type V2Metadata,
  type V2Version,
} from './codec';

const writerId = '000102030405060708090a0b0c0d0e0f';
const databaseId = '101112131415161718191a1b1c1d1e1f';
const liveKey = '\u{10000}';
const deadKey = '\uE000';
const generation = version(1n);
const documentVersion = version(9_007_199_254_740_993n);

function version(counter: bigint): V2Version {
  return { counter, writerId };
}

const specification = readFileSync(
  resolve(
    __dirname,
    '../../../../docs/architecture/brightdb-storage-format-v2.md',
  ),
  'utf8',
);
const vectorText = specification
  .split('## Appendix A. Encoding vectors')[1]
  .split('```text')[1]
  .split('```')[0]
  .trim();
const vectors = new Map(
  vectorText.split(/\n\n+/u).map((entry) => {
    const [name, payload, digest] = entry.split('\n');
    return [name, { payload, digest }];
  }),
);

function expectGolden(name: string, bytes: Buffer): string {
  const vector = vectors.get(name);
  if (!vector) throw new Error(`Missing specification vector ${name}`);
  expect(bytes.toString('hex')).toBe(vector.payload);
  expect(digestPayload(bytes)).toBe(vector.digest);
  return vector.digest;
}

describe('BrightDB v2 codec', () => {
  it('matches every documented encoding and digest', () => {
    const document = encodeDocument({ n: 1, _id: liveKey });
    const documentDigest = expectGolden('document', document);
    expect(decodeDocument(document, liveKey, documentDigest)).toEqual({
      _id: liveKey,
      n: 1,
    });

    const records = [
      {
        key: deadKey,
        version: version(documentVersion.counter - 1n),
        target: null,
      },
      { key: liveKey, version: documentVersion, target: documentDigest },
    ];
    const primary: V2Metadata = { kind: 'primary', records };
    const primaryBytes = encodeMetadata({
      ...primary,
      records: [...records].reverse(),
    });
    const primaryDigest = expectGolden('primary', primaryBytes);
    expect(decodeMetadata(primaryBytes, primaryDigest)).toEqual(primary);

    const collection: V2Metadata = {
      kind: 'collection',
      generation,
      primary: primaryDigest,
      indexes: null,
    };
    const collectionBytes = encodeMetadata(collection);
    const collectionDigest = expectGolden('collection', collectionBytes);
    expect(decodeMetadata(collectionBytes, collectionDigest)).toEqual(
      collection,
    );

    const catalog: V2Metadata = {
      kind: 'catalog',
      records: [{ key: 'docs', version: generation, target: collectionDigest }],
    };
    const catalogBytes = encodeMetadata(catalog);
    const catalogDigest = expectGolden('catalog', catalogBytes);
    expect(decodeMetadata(catalogBytes, catalogDigest)).toEqual(catalog);

    const database: V2Metadata = {
      kind: 'database',
      databaseId,
      clock: documentVersion.counter,
      catalog: catalogDigest,
    };
    const databaseBytes = encodeMetadata(database);
    expect(
      decodeMetadata(databaseBytes, expectGolden('database', databaseBytes)),
    ).toEqual(database);

    const empty: V2Metadata = { ...database, clock: 0n, catalog: null };
    const emptyBytes = encodeMetadata(empty);
    expect(
      decodeMetadata(emptyBytes, expectGolden('empty', emptyBytes)),
    ).toEqual(empty);

    const children = [
      { nibble: 0, recordBytes: 4090n, digest: '11'.repeat(64) },
      { nibble: 15, recordBytes: 100n, digest: '22'.repeat(64) },
    ];
    const branchBytes = encodeMetadata({
      kind: 'branch',
      children: [...children].reverse(),
    });
    expect(
      decodeMetadata(branchBytes, expectGolden('branch', branchBytes)),
    ).toEqual({
      kind: 'branch',
      children,
    });
  });

  it('uses distinct ordering for UTF-8 tree keys and UTF-16 JSON property names', () => {
    expect(compareKeys(deadKey, liveKey)).toBeLessThan(0);
    expect(compareKeys('a', 'aa')).toBeLessThan(0);
    expect(encodeKey('\uFEFF')).toEqual(Buffer.from([0xef, 0xbb, 0xbf]));
    expect(
      encodeDocument({
        [deadKey]: 'second',
        [liveKey]: 'first',
        _id: 'document',
        2: -0,
        10: 1e-7,
        nested: [{ z: 2, a: 1 }],
      }).toString('utf8'),
    ).toBe(
      `{"10":1e-7,"2":0,"_id":"document","nested":[{"a":1,"z":2}],"${liveKey}":"first","${deadKey}":"second"}`,
    );
  });

  it('rejects malformed metadata, noncanonical leaves and branches, and invalid versions', () => {
    const leaf: V2Metadata = {
      kind: 'primary',
      records: [{ key: 'a', version: version(MAX_U64), target: null }],
    };
    const bytes = encodeMetadata(leaf);
    expect(decodeMetadata(bytes)).toEqual(leaf);
    expect(() => decodeMetadata(bytes, 'ff'.repeat(64))).toThrow(
      /digest mismatch/u,
    );
    expect(() =>
      decodeMetadata(Buffer.concat([bytes, Buffer.from([0])])),
    ).toThrow(/trailing/iu);
    expect(() => decodeMetadata(bytes.subarray(0, -1))).toThrow(/truncated/iu);

    const corrupt = Buffer.from(bytes);
    corrupt[4] = 0x7f;
    expect(() => decodeMetadata(corrupt)).toThrow(/kind/u);
    corrupt[4] = 4;
    corrupt[9] = 0xff;
    expect(() => decodeMetadata(corrupt)).toThrow(/UTF-8/u);
    corrupt[9] = 0x61;
    corrupt[corrupt.length - 1] = 2;
    expect(() => decodeMetadata(corrupt)).toThrow(/tag/u);

    expect(() =>
      encodeMetadata({ ...leaf, records: [...leaf.records, ...leaf.records] }),
    ).toThrow(/duplicate/iu);
    expect(() =>
      encodeMetadata({
        kind: 'collection',
        generation: version(0n),
        primary: null,
      indexes: null,
      }),
    ).toThrow(/positive/u);
    expect(() =>
      encodeMetadata({
        kind: 'collection',
        generation: version(MAX_U64 + 1n),
        primary: null,
      indexes: null,
      }),
    ).toThrow(/64-bit/u);
    expect(() =>
      encodeMetadata({
        kind: 'collection',
        generation: { counter: 1n, writerId: '0'.repeat(32) },
        primary: null,
      indexes: null,
      }),
    ).toThrow(/nonzero/u);
    expect(() =>
      encodeMetadata({
        kind: 'branch',
        children: [{ nibble: 0, recordBytes: 4089n, digest: '00'.repeat(64) }],
      }),
    ).toThrow(/collapse/u);
  });

  it('enforces byte limits at exactly the specified boundaries', () => {
    const leaf: V2Metadata = {
      kind: 'primary',
      records: [1024, 1024, 1024, 909].map((length, index) => ({
        key: String(index).repeat(length),
        version: generation,
        target: null,
      })),
    };
    expect(encodeMetadata(leaf)).toHaveLength(MAX_METADATA_BYTES);
    expect(() =>
      encodeMetadata({
        ...leaf,
        records: leaf.records.map((record, index) =>
          index === 0 ? { ...record, target: '00'.repeat(64) } : record,
        ),
      }),
    ).toThrow(/4096/u);
    const bodyLength =
      MAX_DOCUMENT_BYTES - Buffer.byteLength('{"_id":"a","x":""}');
    expect(
      encodeDocument({ _id: 'a', x: 'x'.repeat(bodyLength) }),
    ).toHaveLength(MAX_DOCUMENT_BYTES);
    expect(() =>
      encodeDocument({ _id: 'a', x: 'x'.repeat(bodyLength + 1) }),
    ).toThrow(/1,048,576/u);
    expect(encodeKey('é'.repeat(512))).toHaveLength(1024);
    expect(() => encodeKey('é'.repeat(513))).toThrow(/1024/u);
    expect(() => encodeKey('\uD800')).toThrow(/Unicode/u);
  });

  it.each([
    '{"_id":"a","n":9007199254740993}',
    '{"_id":"a","n":9.007199254740993e15}',
    '{"_id":"a","n":1e999}',
    '{"_id":"a","n":1.0}',
    '{"_id":"a","n":-0}',
    '{"_id":"a","n":1,"n":1}',
    '{"_id":"a","x":"\\ud800"}',
    '{"_id":"a", "n":1}',
  ])('rejects noncanonical or unsupported document JSON %s', (json) => {
    expect(() => decodeDocument(Buffer.from(json))).toThrow();
  });

  it('validates document identity, UTF-8, object data, and digest', () => {
    const document = encodeDocument({ _id: 'a', n: Number.MAX_SAFE_INTEGER });
    expect(decodeDocument(document, 'a')).toEqual({
      _id: 'a',
      n: Number.MAX_SAFE_INTEGER,
    });
    expect(() => decodeDocument(document, 'b')).toThrow(/primary key/u);
    expect(() => decodeDocument(document, 'a', '00'.repeat(64))).toThrow(
      /digest mismatch/u,
    );
    expect(() => decodeDocument(Buffer.from([0xff]))).toThrow(/UTF-8/u);
    expect(() =>
      encodeDocument({ _id: 'a', n: Number.MAX_SAFE_INTEGER + 1 }),
    ).toThrow(/range/u);
    const cyclic = { _id: 'a', child: {} };
    cyclic.child = cyclic;
    expect(() => encodeDocument(cyclic)).toThrow(/cycle/u);
  });

  it('defaults a missing or explicitly undefined own document key without mutating the input', () => {
    const defaultKey = jest.fn(() => 'generated');
    const document = { _id: undefined, item: 'notebook' };
    const generated = encodeDocumentForWrite(document, defaultKey);
    expect(generated).toEqual({
      key: 'generated',
      payload: encodeDocument({ _id: 'generated', item: 'notebook' }),
    });
    expect(document._id).toBeUndefined();
    expect(defaultKey).toHaveBeenCalledTimes(1);

    const replacement = encodeDocumentForWrite(
      { item: 'pen' },
      defaultKey,
      'known',
    );
    expect(replacement).toEqual({
      key: 'known',
      payload: encodeDocument({ _id: 'known', item: 'pen' }),
    });
    expect(() =>
      encodeDocumentForWrite({ _id: 'other' }, defaultKey, 'known'),
    ).toThrow(/primary key/u);
    expect(defaultKey).toHaveBeenCalledTimes(1);
  });

  it('validates the original document without invoking getters or generating a key on failure', () => {
    const defaultKey = jest.fn(() => 'generated');
    const getter = jest.fn(() => 'value');
    const idAccessor = Object.defineProperty({}, '_id', {
      enumerable: true,
      get: getter,
    });
    const fieldAccessor = Object.defineProperty({}, 'field', {
      enumerable: true,
      get: getter,
    });
    const hiddenId = Object.defineProperty({}, '_id', { value: undefined });
    expect(() => encodeDocumentForWrite(idAccessor, defaultKey)).toThrow(
      /data properties/u,
    );
    expect(() => encodeDocumentForWrite(fieldAccessor, defaultKey)).toThrow(
      /data properties/u,
    );
    expect(() => encodeDocumentForWrite(hiddenId, defaultKey)).toThrow(
      /data properties/u,
    );
    expect(() => encodeDocumentForWrite(new Date(), defaultKey)).toThrow(
      /JSON object/u,
    );
    expect(() =>
      encodeDocumentForWrite({ nested: { item: undefined } }, defaultKey),
    ).toThrow(/JSON values/u);
    expect(getter).not.toHaveBeenCalled();
    expect(defaultKey).not.toHaveBeenCalled();
  });
});
