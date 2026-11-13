/**
 * @fileoverview Regression tests for Collection.loadFromStore error handling.
 *
 * Previously, any failure while loading the head block was logged and
 * swallowed, leaving the collection empty in memory. The next write then
 * persisted a head containing only the new document, silently dropping
 * every existing document. A load failure must now surface to the caller,
 * and only a head block that is genuinely missing from the store may be
 * treated as a new, empty collection.
 */

/* eslint-disable @typescript-eslint/no-explicit-any */

import {
  InMemoryHeadRegistry,
  StoreError,
  StoreErrorType,
} from '@brightchain/brightchain-lib';
import { MockBlockStore } from '../../__tests__/helpers/mockBlockStore';
import { Collection, ICollectionHeadRegistry } from '../collection';

const DB = 'testdb';
const COL = 'items';

function makeCollection(
  store: MockBlockStore,
  registry: InMemoryHeadRegistry,
): Collection {
  return new Collection(
    COL,
    store as any,
    DB,
    registry as any as ICollectionHeadRegistry,
  );
}

async function seed(): Promise<{
  store: MockBlockStore;
  registry: InMemoryHeadRegistry;
  headId: string;
}> {
  const store = new MockBlockStore();
  const registry = new InMemoryHeadRegistry();
  const writer = makeCollection(store, registry);
  await writer.insertOne({ _id: 'a', v: 1 });
  await writer.insertOne({ _id: 'b', v: 2 });
  const headId = registry.getHead(DB, COL);
  expect(headId).toBeDefined();
  return { store, registry, headId: headId as string };
}

describe('Collection – head load failures', () => {
  let warnSpy: jest.SpyInstance;
  beforeEach(() => {
    warnSpy = jest.spyOn(console, 'warn').mockImplementation(() => undefined);
  });
  afterEach(() => warnSpy.mockRestore());

  it('does not overwrite existing documents when the head block read fails', async () => {
    const { store, registry, headId } = await seed();

    const realGetData = store.getData.bind(store);
    let failHead = true;
    store.getData = async (key: any) => {
      if (failHead && String(key) === headId) {
        throw new Error('simulated transient I/O failure');
      }
      return realGetData(key);
    };

    const reader = makeCollection(store, registry);
    await expect(reader.insertOne({ _id: 'c', v: 3 })).rejects.toThrow(
      'simulated transient I/O failure',
    );
    // The head was not replaced by one that only knows about 'c'.
    expect(registry.getHead(DB, COL)).toBe(headId);

    // Once the store recovers, the same instance loads the real state.
    failHead = false;
    await reader.insertOne({ _id: 'c', v: 3 });
    const ids = (await reader.find({}).toArray()).map((d: any) => d._id);
    expect(ids.sort()).toEqual(['a', 'b', 'c']);
  });

  it('surfaces corrupt head metadata instead of starting empty', async () => {
    const { store, registry, headId } = await seed();
    store.blocks.set(headId, new TextEncoder().encode('{not json'));

    const reader = makeCollection(store, registry);
    await expect(reader.insertOne({ _id: 'c', v: 3 })).rejects.toThrow();
    expect(registry.getHead(DB, COL)).toBe(headId);
  });

  it('treats a head block missing from the store as a new empty collection', async () => {
    const { store, registry, headId } = await seed();
    store.getData = async () => {
      throw new StoreError(StoreErrorType.KeyNotFound);
    };

    const reader = makeCollection(store, registry);
    expect(await reader.find({}).toArray()).toEqual([]);
    expect(headId).toBeDefined();
  });
});
