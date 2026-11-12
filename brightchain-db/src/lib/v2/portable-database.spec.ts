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
