/**
 * @fileoverview Persistence conformance: PooledMemoryBlockStore + InMemoryHeadRegistry.
 *
 * This is the baseline. Since InMemoryHeadRegistry doesn't persist, the
 * "restart" just reuses the same registry instance (heads survive in memory).
 * This validates the conformance harness itself and the BrightDb collection
 * round-trip logic.
 */

import {
  BlockSize,
  PooledMemoryBlockStore,
} from '@brightchain/brightchain-lib';
import { InMemoryHeadRegistry } from '../lib/headRegistry';
import {
  runPersistenceConformance,
  type StoreTestFactory,
} from './helpers/storeConformance';

jest.setTimeout(30_000);

const factory: StoreTestFactory = {
  label: 'PooledMemoryBlockStore + InMemoryHeadRegistry',

  async createStore() {
    const store = new PooledMemoryBlockStore(BlockSize.Small);
    const registry = InMemoryHeadRegistry.createIsolated();
    // Stash for createFreshRegistry
    (this as any)._registry = registry;
    return { store, registry };
  },

  async createFreshRegistry() {
    // In-memory: same instance (heads are still in memory).
    // This tests the BrightDb collection reload path, not persistence.
    return (this as any)._registry;
  },

  async cleanup() {
    // Nothing to clean up
  },
};

describe(`Conformance: ${factory.label}`, () => {
  runPersistenceConformance(factory);
});
