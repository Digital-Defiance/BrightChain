/**
 * @fileoverview Multi-node consistency — PersistentHeadRegistry (disk) variant.
 *
 * Uses PooledMemoryBlockStore (shared between nodes) and PersistentHeadRegistry
 * (one isolated dataDir per node) to exercise multi-node gossip convergence
 * with real disk-backed head persistence.
 *
 * Each node gets its own temporary directory so registries are truly independent.
 * All directories are removed in cleanup.
 */

import {
  BlockSize,
  PooledMemoryBlockStore,
} from '@brightchain/brightchain-lib';
import type { IHeadRegistry } from '@brightchain/brightchain-lib/lib/interfaces/storage/headRegistry';
import { promises as fs } from 'fs';
import { tmpdir } from 'os';
import { join } from 'path';
import { PersistentHeadRegistry } from '../lib/headRegistry';
import {
  runMultiNodeConsistency,
  type MultiNodeFactory,
} from './helpers/multiNodeConsistency';

jest.setTimeout(30_000);

const factory: MultiNodeFactory = {
  label: 'PooledMemoryBlockStore + PersistentHeadRegistry (multi-node disk)',

  async createSharedStore() {
    // Create a suite-level base temp dir; node dirs are created beneath it
    const baseDir = await fs.mkdtemp(join(tmpdir(), 'bc-mn-disk-'));
    (this as any)._baseDir = baseDir;
    (this as any)._nodeIndex = 0;
    const store = new PooledMemoryBlockStore(BlockSize.Small);
    return { store };
  },

  async createNodeRegistry(): Promise<IHeadRegistry> {
    const baseDir = (this as any)._baseDir as string;
    const idx = ((this as any)._nodeIndex as number)++;
    const dataDir = join(baseDir, `node-${idx}`);
    await fs.mkdir(dataDir, { recursive: true });
    const reg = new PersistentHeadRegistry({ dataDir });
    await reg.load();
    return reg;
  },

  async cleanup() {
    const baseDir = (this as any)._baseDir as string | undefined;
    if (baseDir) {
      await fs.rm(baseDir, { recursive: true, force: true });
    }
  },
};

describe(`Multi-node consistency: ${factory.label}`, () => {
  runMultiNodeConsistency(factory);
});
