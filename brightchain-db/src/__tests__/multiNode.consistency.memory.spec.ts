/**
 * @fileoverview Multi-node consistency — InMemoryHeadRegistry variant.
 *
 * Uses PooledMemoryBlockStore (shared between nodes) and InMemoryHeadRegistry
 * (one isolated instance per node) to exercise the full multi-node gossip
 * convergence scenarios without any disk I/O.
 */

import {
  BlockSize,
  PooledMemoryBlockStore,
} from '@brightchain/brightchain-lib';
import type { IHeadRegistry } from '@brightchain/brightchain-lib/lib/interfaces/storage/headRegistry';
import { InMemoryHeadRegistry } from '../lib/headRegistry';
import {
  runMultiNodeConsistency,
  type MultiNodeFactory,
} from './helpers/multiNodeConsistency';

jest.setTimeout(30_000);

const factory: MultiNodeFactory = {
  label: 'PooledMemoryBlockStore + InMemoryHeadRegistry (multi-node)',

  async createSharedStore() {
    const store = new PooledMemoryBlockStore(BlockSize.Small);
    (this as any)._store = store;
    return { store };
  },

  async createNodeRegistry(): Promise<IHeadRegistry> {
    return InMemoryHeadRegistry.createIsolated();
  },

  async cleanup() {
    // Nothing to release — everything is in-memory
  },
};

describe(`Multi-node consistency: ${factory.label}`, () => {
  runMultiNodeConsistency(factory);
});
