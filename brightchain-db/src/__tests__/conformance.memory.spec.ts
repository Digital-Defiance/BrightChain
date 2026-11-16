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
import type { ICollectionHeadRegistry } from '../lib/collection';
import { InMemoryHeadRegistry } from '../lib/headRegistry';
import {
  runPersistenceConformance,
  type StoreTestFactory,
} from './helpers/storeConformance';

jest.setTimeout(30_000);

let sharedRegistry: ICollectionHeadRegistry | undefined;

const factory: StoreTestFactory = {
  label: 'PooledMemoryBlockStore + InMemoryHeadRegistry',

  async createStore() {
    const store = new PooledMemoryBlockStore(BlockSize.Small);
    const registry = InMemoryHeadRegistry.createIsolated();
    // Stash for createFreshRegistry
    sharedRegistry = registry;
    return { store, registry };
  },

  async createFreshRegistry() {
    // In-memory: same instance (heads are still in memory).
    // This tests the BrightDb collection reload path, not persistence.
    if (!sharedRegistry) {
      throw new Error('createStore must run before createFreshRegistry');
    }
    return sharedRegistry;
  },

  async cleanup() {
    // Nothing to clean up
  },
};

describe(`Conformance: ${factory.label}`, () => {
  runPersistenceConformance(factory);
});
