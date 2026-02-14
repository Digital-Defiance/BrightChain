/**
 * @fileoverview Unit tests for BrightChainDb IDatabase conformance.
 *
 * Verifies that:
 * - BrightChainDb connection lifecycle works correctly
 * - BrightChainDb exposes all IDatabase methods
 * - Collection exposes all ICollection methods
 *
 * _Requirements: 4.10, 5.1, 5.5_
 */

import type { ICollection, IDatabase } from '@brightchain/brightchain-lib';
import { MockBlockStore } from '../../__tests__/helpers/mockBlockStore';
import { Collection } from '../collection';
import { BrightChainDb } from '../database';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function createDb(): BrightChainDb {
  const store = new MockBlockStore();
  return new BrightChainDb(
    store as ConstructorParameters<typeof BrightChainDb>[0],
    {
      name: 'conformance-test',
    },
  );
}

// ---------------------------------------------------------------------------
// Connection lifecycle tests
// ---------------------------------------------------------------------------

describe('BrightChainDb connection lifecycle', () => {
  it('isConnected returns false initially', () => {
    const db = createDb();
    expect(db.isConnected()).toBe(false);
  });

  it('isConnected returns true after connect', async () => {
    const db = createDb();
    await db.connect();
    expect(db.isConnected()).toBe(true);
  });

  it('isConnected returns false after disconnect', async () => {
    const db = createDb();
    await db.connect();
    await db.disconnect();
    expect(db.isConnected()).toBe(false);
  });

  it('connect is idempotent (repeated calls do not throw)', async () => {
    const db = createDb();
    await db.connect();
    await db.connect();
    expect(db.isConnected()).toBe(true);
  });

  it('disconnect is idempotent (repeated calls do not throw)', async () => {
    const db = createDb();
    await db.disconnect();
    await db.disconnect();
    expect(db.isConnected()).toBe(false);
  });

  it('connect accepts and ignores a URI string', async () => {
    const db = createDb();
    await db.connect('mongodb://localhost:27017');
    expect(db.isConnected()).toBe(true);
  });
});

// ---------------------------------------------------------------------------
// BrightChainDb IDatabase method conformance
// ---------------------------------------------------------------------------

describe('BrightChainDb has all IDatabase methods', () => {
  const db = createDb();

  const idatabaseMethods: Array<keyof IDatabase> = [
    'collection',
    'startSession',
    'withTransaction',
    'listCollections',
    'dropCollection',
    'connect',
    'disconnect',
    'isConnected',
  ];

  it.each(idatabaseMethods)('%s is a function', (method) => {
    expect(typeof db[method]).toBe('function');
  });

  it('is assignable to IDatabase', () => {
    const asIDatabase: IDatabase = db;
    expect(asIDatabase).toBeDefined();
  });
});

// ---------------------------------------------------------------------------
// Collection ICollection method conformance
// ---------------------------------------------------------------------------

describe('Collection has all ICollection methods', () => {
  const db = createDb();
  const coll = db.collection('conformance-coll');

  const icollectionMethods: Array<keyof ICollection> = [
    // CRUD
    'insertOne',
    'insertMany',
    'findOne',
    'find',
    'findById',
    'updateOne',
    'updateMany',
    'deleteOne',
    'deleteMany',
    'replaceOne',
    // Query
    'countDocuments',
    'estimatedDocumentCount',
    'distinct',
    'aggregate',
    // Indexes
    'createIndex',
    'dropIndex',
    'listIndexes',
    // Bulk
    'bulkWrite',
    // Change streams
    'watch',
    // Schema validation
    'setSchema',
    'getSchema',
    'removeSchema',
    'validateDoc',
    // Write concern / Read preference
    'getWriteConcern',
    'setWriteConcern',
    'getReadPreference',
    'setReadPreference',
    // Text index
    'createTextIndex',
    'dropTextIndex',
    'hasTextIndex',
    // Lifecycle
    'drop',
  ];

  it.each(icollectionMethods)('%s is a function', (method) => {
    expect(typeof coll[method]).toBe('function');
  });

  it('is assignable to ICollection', () => {
    const asICollection: ICollection = coll;
    expect(asICollection).toBeDefined();
  });

  it('Collection instance is an instanceof Collection class', () => {
    expect(coll).toBeInstanceOf(Collection);
  });
});
