/**
 * @fileoverview IDatabase conformance test for InMemoryDatabase.
 *
 * Verifies that InMemoryDatabase implements all IDatabase methods and that
 * the connection lifecycle, collection management, session management,
 * transaction support, and dropDatabase work correctly.
 *
 * _Requirements: 8.2_
 */

import type { IDatabase } from '@digitaldefiance/suite-core-lib';
import { BlockSize } from '../../enumerations/blockSize';
import { MemoryBlockStore } from '../../stores/memoryBlockStore';
import { InMemoryDatabase } from '../inMemoryDatabase';

describe('IDatabase conformance: InMemoryDatabase', () => {
  let db: InMemoryDatabase;
  let store: MemoryBlockStore;

  beforeEach(async () => {
    store = new MemoryBlockStore(BlockSize.Small);
    db = new InMemoryDatabase(store, { name: 'conformance-test' });
  });

  afterEach(async () => {
    if (db.isConnected()) {
      await db.disconnect();
    }
  });

  // ── 1. Method existence ──

  describe('IDatabase method existence', () => {
    it('should have all IDatabase methods', () => {
      const requiredMethods: Array<keyof IDatabase> = [
        'connect',
        'disconnect',
        'isConnected',
        'collection',
        'startSession',
        'withTransaction',
        'listCollections',
        'dropCollection',
      ];

      for (const method of requiredMethods) {
        expect(typeof db[method]).toBe('function');
      }
    });
  });

  // ── 2. Connection lifecycle ──

  describe('connection lifecycle', () => {
    it('should start disconnected', () => {
      expect(db.isConnected()).toBe(false);
    });

    it('should be connected after connect()', async () => {
      await db.connect();
      expect(db.isConnected()).toBe(true);
    });

    it('should be disconnected after disconnect()', async () => {
      await db.connect();
      await db.disconnect();
      expect(db.isConnected()).toBe(false);
    });

    it('connect() should be idempotent', async () => {
      await db.connect();
      await db.connect();
      expect(db.isConnected()).toBe(true);
    });

    it('disconnect() should be idempotent', async () => {
      await db.connect();
      await db.disconnect();
      await db.disconnect();
      expect(db.isConnected()).toBe(false);
    });
  });

  // ── 3. Collection management ──

  describe('collection management', () => {
    beforeEach(async () => {
      await db.connect();
    });

    it('collection() should return an object with ICollection methods', () => {
      const coll = db.collection('test-coll');
      // Verify key ICollection methods exist
      expect(typeof coll.insertOne).toBe('function');
      expect(typeof coll.find).toBe('function');
      expect(typeof coll.findOne).toBe('function');
      expect(typeof coll.findById).toBe('function');
      expect(typeof coll.updateOne).toBe('function');
      expect(typeof coll.deleteOne).toBe('function');
      expect(typeof coll.drop).toBe('function');
    });

    it('collection() should return the same instance for the same name', () => {
      const coll1 = db.collection('same-name');
      const coll2 = db.collection('same-name');
      expect(coll1).toBe(coll2);
    });

    it('listCollections() should list created collections', () => {
      db.collection('alpha');
      db.collection('beta');
      const names = db.listCollections();
      expect(names).toContain('alpha');
      expect(names).toContain('beta');
    });

    it('listCollections() should return empty array when no collections exist', () => {
      expect(db.listCollections()).toEqual([]);
    });

    it('dropCollection() should remove a collection and return true', async () => {
      db.collection('to-drop');
      expect(db.listCollections()).toContain('to-drop');

      const result = await db.dropCollection('to-drop');
      expect(result).toBe(true);
      expect(db.listCollections()).not.toContain('to-drop');
    });

    it('dropCollection() should return false for non-existent collection', async () => {
      const result = await db.dropCollection('does-not-exist');
      expect(result).toBe(false);
    });
  });

  // ── 4. Session management ──

  describe('session management', () => {
    beforeEach(async () => {
      await db.connect();
    });

    it('startSession() should return a valid IClientSession', () => {
      const session = db.startSession();
      expect(typeof session.id).toBe('string');
      expect(session.id.length).toBeGreaterThan(0);
      expect(typeof session.inTransaction).toBe('boolean');
      expect(typeof session.startTransaction).toBe('function');
      expect(typeof session.commitTransaction).toBe('function');
      expect(typeof session.abortTransaction).toBe('function');
      expect(typeof session.endSession).toBe('function');
    });

    it('startSession() should return unique sessions', () => {
      const s1 = db.startSession();
      const s2 = db.startSession();
      expect(s1.id).not.toBe(s2.id);
    });
  });

  // ── 5. withTransaction ──

  describe('withTransaction', () => {
    beforeEach(async () => {
      await db.connect();
    });

    it('should execute the callback and commit', async () => {
      let callbackExecuted = false;

      const result = await db.withTransaction(async (session) => {
        callbackExecuted = true;
        expect(session.inTransaction).toBe(true);
        return 42;
      });

      expect(callbackExecuted).toBe(true);
      expect(result).toBe(42);
    });

    it('should abort on callback error and re-throw', async () => {
      const error = new Error('test-error');

      await expect(
        db.withTransaction(async () => {
          throw error;
        }),
      ).rejects.toThrow('test-error');
    });
  });

  // ── 6. dropDatabase ──

  describe('dropDatabase', () => {
    beforeEach(async () => {
      await db.connect();
    });

    it('should clear all collections', async () => {
      db.collection('coll-a');
      db.collection('coll-b');
      expect(db.listCollections().length).toBe(2);

      await db.dropDatabase();
      expect(db.listCollections()).toEqual([]);
    });
  });
});
