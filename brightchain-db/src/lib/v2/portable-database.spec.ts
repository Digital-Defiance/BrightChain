import { mkdtemp, readFile, rm, unlink, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import {
  BrightDb,
  BrightDbV2MissingBlockError,
  DuplicateKeyError,
} from '../../index';
import { digestPayload, encodeDocument } from './codec';
import { BrightDbV2DiskStore } from './disk-store';
import { PortableBrightDb } from './portable-database';

const describePosix = process.platform === 'win32' ? describe.skip : describe;

describePosix('BrightDb.open', () => {
  let directory: string;
  let path: string;

  beforeEach(async () => {
    directory = await mkdtemp(join(tmpdir(), 'brightdb-v2-'));
    path = join(directory, 'db');
  });

  afterEach(async () => {
    jest.restoreAllMocks();
    await rm(directory, { recursive: true, force: true });
  });

  it('persists documents, queries and tombstones through the public local API', async () => {
    const db = await BrightDb.open({ path });
    const items = db.collection('Items/新');
    const { insertedId } = await items.insertOne({ value: 2 });
    expect(insertedId).toMatch(/^[0-9a-f]{32}$/u);
    await items.insertOne({ _id: 'second', value: 3 });
    expect(await items.find({ value: { $gt: 2 } }).toArray()).toEqual([
      { _id: 'second', value: 3 },
    ]);
    expect(await items.replaceById('second', { value: 4 })).toMatchObject({
      matchedCount: 1,
      modifiedCount: 1,
    });
    await expect(
      items.replaceById('second', { _id: 'different' }),
    ).rejects.toThrow('primary key');
    expect(await items.deleteById(insertedId)).toMatchObject({
      deletedCount: 1,
    });
    expect(await readFile(join(path, 'FORMAT'), 'utf8')).toBe(
      'BrightDB storage 2\n',
    );
    db.close();
    await expect(items.findById('second')).rejects.toThrow('closed');

    const reopened = await BrightDb.open({ path });
    expect(await reopened.listCollections()).toEqual(['Items/新']);
    const reopenedItems = reopened.collection('Items/新');
    expect(await reopenedItems.findById(insertedId)).toBeNull();
    expect(await reopenedItems.findOne({ _id: 'second', value: 4 })).toEqual({
      _id: 'second',
      value: 4,
    });
    await reopened.writeBatch([
      { type: 'dropCollection', collection: 'Items/新' },
      { type: 'insert', collection: 'Items/新', document: { _id: 'new' } },
    ]);
    expect(await reopenedItems.find().toArray()).toEqual([{ _id: 'new' }]);
    reopened.close();
  });

  it('commits across collections once and leaves HEAD unchanged on staging or block-write failures', async () => {
    const db = await BrightDb.open({ path });
    const batch = [
      { type: 'insert', collection: 'left', document: { _id: 'first' } },
      { type: 'insert', collection: 'right', document: { _id: 'second' } },
    ] as const;
    const readHead = () => readFile(join(path, 'HEAD'), 'utf8');
    const initialHead = await readHead();
    await expect(db.writeBatch([...batch, batch[0]])).rejects.toBeInstanceOf(
      DuplicateKeyError,
    );
    expect(await readHead()).toBe(initialHead);

    const diskWrite = BrightDbV2DiskStore.prototype.withWriteLock;
    jest
      .spyOn(BrightDbV2DiskStore.prototype, 'withWriteLock')
      .mockImplementationOnce(function (this: BrightDbV2DiskStore, callback) {
        return diskWrite.call(this, (writer) =>
          callback({
            ...writer,
            publishHead: async () => {
              throw new Error('injected publication failure');
            },
          }),
        );
      });
    await expect(db.writeBatch(batch)).rejects.toThrow(
      'injected publication failure',
    );
    expect(await readHead()).toBe(initialHead);
    expect(await db.listCollections()).toEqual([]);

    await db.writeBatch(batch);
    expect(await readHead()).not.toBe(initialHead);
    db.close();
    const reopened = await BrightDb.open({ path });
    expect(await reopened.collection('left').findById('first')).toEqual({
      _id: 'first',
    });
    expect(await reopened.collection('right').findById('second')).toEqual({
      _id: 'second',
    });
    reopened.close();
  });

  it('serializes competing writers from independent handles and refreshes the root', async () => {
    const [first, second] = await Promise.all([
      BrightDb.open({ path }),
      BrightDb.open({ path }),
    ]);
    await Promise.all([
      first.collection('items').insertOne({ _id: 'first' }),
      second.collection('items').insertOne({ _id: 'second' }),
    ]);
    expect(await first.collection('items').findById('second')).toEqual({
      _id: 'second',
    });
    expect(await second.collection('items').findById('first')).toEqual({
      _id: 'first',
    });
    first.close();
    second.close();
  });

  it('rejects legacy directories and reports missing referenced blocks', async () => {
    await writeFile(join(directory, 'head-registry.json'), '{}');
    await expect(BrightDb.open({ path: directory })).rejects.toThrow(
      'Unsupported',
    );
    expect(await readFile(join(directory, 'head-registry.json'), 'utf8')).toBe(
      '{}',
    );

    const db = await BrightDb.open({ path });
    const document = { _id: 'key', name: 'data' };
    await db.collection('items').insertOne(document);
    const digest = digestPayload(encodeDocument(document));
    await unlink(join(path, 'blocks', digest.slice(0, 2), digest));
    await expect(db.collection('items').findById('key')).rejects.toBeInstanceOf(
      BrightDbV2MissingBlockError,
    );
    db.close();
  });

  it('opens and looks up a document without scanning a paged collection', async () => {
    const db = await BrightDb.open({ path });
    const documents = Array.from({ length: 1_000 }, (_, index) => ({
      _id: `document-${index}`,
      index,
    }));
    await db.collection('items').insertMany(documents);
    db.close();

    const reads = jest.spyOn(BrightDbV2DiskStore.prototype, 'readBlock');
    const reopened = await BrightDb.open({ path });
    expect(reads.mock.calls.length).toBeLessThanOrEqual(2);
    reads.mockClear();
    expect(await reopened.collection('items').findById('document-555')).toEqual(
      documents[555],
    );
    expect(reads.mock.calls.length).toBeLessThanOrEqual(8);
    reopened.close();
  }, 30_000);
});

describe('PortableBrightDb roots, snapshots and diff', () => {
  let dir: string;
  beforeEach(async () => {
    dir = await mkdtemp(join(tmpdir(), 'brightdb-v2-diff-'));
  });
  afterEach(async () => {
    await rm(dir, { recursive: true, force: true });
  });

  async function collect<T>(iterable: AsyncIterable<T>): Promise<T[]> {
    const items: T[] = [];
    for await (const item of iterable) items.push(item);
    return items;
  }

  it('identifies each state by its root and reads past states', async () => {
    const db = await PortableBrightDb.open({ path: dir });
    const empty = await db.root();
    await db.collection('users').insertOne({ _id: 'a', n: 1 });
    const first = await db.root();
    await db.collection('users').replaceById('a', { _id: 'a', n: 2 });
    await db.collection('users').insertOne({ _id: 'b', n: 3 });
    const second = await db.root();
    expect(new Set([empty, first, second]).size).toBe(3);

    expect(await (await db.at(empty)).listCollections()).toEqual([]);
    expect(await (await db.at(first)).collection('users').findById('a')).toEqual({ _id: 'a', n: 1 });
    expect(await (await db.at(first)).collection('users').findById('b')).toBeNull();
    expect(await (await db.at(second)).collection('users').find({}).toArray()).toHaveLength(2);

    await expect(db.at('f'.repeat(128))).rejects.toThrow();
    db.close();
  });

  it('keeps a snapshot stable while later commits are published', async () => {
    const db = await PortableBrightDb.open({ path: dir });
    await db.collection('c').insertOne({ _id: 'a', v: 1 });
    const snapshot = await db.snapshot();
    await db.collection('c').deleteById('a');
    expect(await db.collection('c').findById('a')).toBeNull();
    expect(await snapshot.collection('c').findById('a')).toEqual({ _id: 'a', v: 1 });
    db.close();
  });

  it('reports added, modified and deleted documents between roots', async () => {
    const db = await PortableBrightDb.open({ path: dir });
    await db.collection('users').insertMany([
      { _id: 'a', n: 1 },
      { _id: 'b', n: 2 },
      { _id: 'c', n: 3 },
    ]);
    const before = await db.root();
    await db.writeBatch([
      { type: 'replace', collection: 'users', id: 'a', document: { _id: 'a', n: 10 } },
      { type: 'delete', collection: 'users', id: 'b' },
      { type: 'insert', collection: 'users', document: { _id: 'd', n: 4 } },
      { type: 'insert', collection: 'logs', document: { _id: 'l1', m: 'x' } },
    ]);
    const after = await db.root();

    const changes = await collect(db.diff(before, after));
    const summary = changes.map((c) => `${c.collection}/${c.id}:${c.type}`).sort();
    expect(summary).toEqual([
      'logs/l1:added',
      'users/a:modified',
      'users/b:deleted',
      'users/d:added',
    ]);
    const modified = changes.find((c) => c.id === 'a');
    expect(modified?.before).toEqual({ _id: 'a', n: 1 });
    expect(modified?.after).toEqual({ _id: 'a', n: 10 });

    expect(await collect(db.diff(after, after))).toEqual([]);
    // Reversing the direction reverses every change.
    const reversed = await collect(db.diff(after, before));
    expect(reversed.map((c) => `${c.collection}/${c.id}:${c.type}`).sort()).toEqual([
      'logs/l1:deleted',
      'users/a:modified',
      'users/b:added',
      'users/d:deleted',
    ]);
    db.close();
  });

  it('reads only the changed paths when diffing a large collection', async () => {
    jest.setTimeout(60_000);
    const db = await PortableBrightDb.open({ path: dir });
    const users = db.collection('users');
    await users.insertMany(
      Array.from({ length: 800 }, (_, i) => ({ _id: `u${i}`, n: i })),
    );
    const before = await db.root();
    await users.replaceById('u433', { _id: 'u433', n: -1 });
    const after = await db.root();

    const reads: string[] = [];
    const store = (db as unknown as { store: { readBlock: (d: string) => Promise<Uint8Array> } }).store;
    const original = store.readBlock.bind(store);
    store.readBlock = async (digest: string) => {
      reads.push(digest);
      return original(digest);
    };
    const changes = await collect(db.diff(before, after));
    expect(changes).toHaveLength(1);
    expect(changes[0]).toMatchObject({ id: 'u433', type: 'modified' });
    // Two roots, two catalogs and collection roots, two page paths, two documents.
    expect(reads.length).toBeLessThan(30);
    db.close();
  });

  it('reports a dropped and recreated collection as deletions then additions', async () => {
    const db = await PortableBrightDb.open({ path: dir });
    await db.collection('c').insertOne({ _id: 'old', v: 1 });
    const before = await db.root();
    await db.writeBatch([
      { type: 'dropCollection', collection: 'c' },
      { type: 'insert', collection: 'c', document: { _id: 'new', v: 2 } },
    ]);
    const changes = await collect(db.diff(before, await db.root()));
    expect(changes.map((c) => `${c.id}:${c.type}`).sort()).toEqual(['new:added', 'old:deleted']);
    db.close();
  });
});

describe('PortableBrightDb subscribe', () => {
  let dir: string;
  beforeEach(async () => {
    dir = await mkdtemp(join(tmpdir(), 'brightdb-v2-sub-'));
  });
  afterEach(async () => {
    await rm(dir, { recursive: true, force: true });
  });

  async function until(condition: () => boolean, ms = 5000): Promise<void> {
    const start = Date.now();
    while (!condition()) {
      if (Date.now() - start > ms) throw new Error('Timed out waiting for condition');
      await new Promise((r) => setTimeout(r, 10));
    }
  }

  it('notifies about local commits with the changed documents', async () => {
    const db = await PortableBrightDb.open({ path: dir });
    const seen: string[] = [];
    const stop = await db.subscribe(async (event) => {
      for await (const change of event.changes()) seen.push(`${change.id}:${change.type}`);
    });
    await db.collection('c').insertOne({ _id: 'a', v: 1 });
    await until(() => seen.length >= 1);
    await db.collection('c').replaceById('a', { _id: 'a', v: 2 });
    await until(() => seen.length >= 2);
    expect(seen).toEqual(['a:added', 'a:modified']);
    stop();
    await db.collection('c').deleteById('a');
    await new Promise((r) => setTimeout(r, 400));
    expect(seen).toHaveLength(2);
    db.close();
  });

  it('notifies about commits made through another handle and reports errors', async () => {
    const writer = await PortableBrightDb.open({ path: dir });
    const reader = await PortableBrightDb.open({ path: dir });
    const roots: string[] = [];
    const errors: unknown[] = [];
    await reader.subscribe(
      (event) => {
        roots.push(event.root);
        if (roots.length === 2) throw new Error('listener failed');
      },
      { intervalMs: 20, onError: (e) => errors.push(e) },
    );
    await writer.collection('c').insertOne({ _id: 'a' });
    await until(() => roots.length === 1);
    await writer.collection('c').insertOne({ _id: 'b' });
    await until(() => errors.length === 1);
    expect(roots).toEqual([...new Set(roots)]);
    expect(roots[roots.length - 1]).toBe(await writer.root());
    writer.close();
    reader.close();
  });
});
