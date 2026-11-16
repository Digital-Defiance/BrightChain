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

// Shared between the factory callbacks (a restart reuses the same dataDir).
let dataDirState: string | undefined;

const factory: StoreTestFactory = {
  label: 'PooledMemoryBlockStore + PersistentHeadRegistry (disk)',

  async createStore() {
    const dataDir = await fs.mkdtemp(join(tmpdir(), 'bc-conform-disk-'));
    dataDirState = dataDir;
    const store = new PooledMemoryBlockStore(BlockSize.Small);
    const registry = new PersistentHeadRegistry({ dataDir });
    return { store, registry };
  },

  async createFreshRegistry() {
    if (dataDirState === undefined) {
      throw new Error('createStore must run before createFreshRegistry');
    }
    const fresh = new PersistentHeadRegistry({
      dataDir: dataDirState,
    });
    await fresh.load();
    return fresh;
  },

  async cleanup() {
    const dataDir = dataDirState;
    if (dataDir) {
      await fs.rm(dataDir, { recursive: true, force: true });
    }
  },
};

describe(`Conformance: ${factory.label}`, () => {
  runPersistenceConformance(factory);
});
