/**
 * @fileoverview Persistence conformance: PooledMemoryBlockStore + PersistentHeadRegistry (disk).
 *
 * Validates that head pointers written to disk survive a simulated restart
 * (new PersistentHeadRegistry loaded from the same dataDir).
 *
 * The block data lives in the PooledMemoryBlockStore (shared across
 * "restarts" since it's the same process). The head registry is the
 * persistence boundary being tested.
 */

import {
  BlockSize,
  PooledMemoryBlockStore,
} from '@brightchain/brightchain-lib';
import { promises as fs } from 'fs';
import { tmpdir } from 'os';
import { join } from 'path';
import { PersistentHeadRegistry } from '../lib/headRegistry';
import {
  runPersistenceConformance,
  type StoreTestFactory,
} from './helpers/storeConformance';

jest.setTimeout(30_000);

const factory: StoreTestFactory = {
  label: 'PooledMemoryBlockStore + PersistentHeadRegistry (disk)',

  async createStore() {
    const dataDir = await fs.mkdtemp(join(tmpdir(), 'bc-conform-disk-'));
    (this as any)._dataDir = dataDir;
    const store = new PooledMemoryBlockStore(BlockSize.Small);
    const registry = new PersistentHeadRegistry({ dataDir });
    (this as any)._store = store;
    return { store, registry };
  },

  async createFreshRegistry() {
    const dataDir = (this as any)._dataDir as string;
    const fresh = new PersistentHeadRegistry({ dataDir });
    await fresh.load();
    return fresh;
  },

  async cleanup() {
    const dataDir = (this as any)._dataDir as string | undefined;
    if (dataDir) {
      await fs.rm(dataDir, { recursive: true, force: true });
    }
  },
};

describe(`Conformance: ${factory.label}`, () => {
  runPersistenceConformance(factory);
});
