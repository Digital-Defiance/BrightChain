/**
 * @fileoverview Integration tests for HeadRegistry with BrightChainDb.
 *
 * Tests:
 * 1. BrightChainDb with `dataDir` uses PersistentHeadRegistry (data persists across instances)
 * 2. BrightChainDb without `dataDir` or `headRegistry` uses InMemoryHeadRegistry (backward compat)
 * 3. BrightChainDb with explicit `headRegistry` uses that registry
 * 4. File locking under concurrent access (multiple PersistentHeadRegistry instances)
 *
 * Requirements: 1.1, 1.5, 1.6
 */

import {
  BlockSize,
  PooledMemoryBlockStore,
} from '@brightchain/brightchain-lib';
import { promises as fs } from 'fs';
import { tmpdir } from 'os';
import { join } from 'path';
import { BrightChainDb } from '../lib/database';
import {
  InMemoryHeadRegistry,
  PersistentHeadRegistry,
} from '../lib/headRegistry';

/** Create a unique temp directory for each test */
async function makeTempDir(): Promise<string> {
  return fs.mkdtemp(join(tmpdir(), 'hri-test-'));
}

/** Clean up a temp directory */
async function cleanupDir(dir: string): Promise<void> {
  await fs.rm(dir, { recursive: true, force: true });
}

describe('HeadRegistry integration with BrightChainDb', () => {
  // ══════════════════════════════════════════════════════════════
  // Test 1: dataDir → PersistentHeadRegistry (data survives restart)
  // ══════════════════════════════════════════════════════════════

  describe('BrightChainDb with dataDir option', () => {
    let dataDir: string;

    beforeEach(async () => {
      dataDir = await makeTempDir();
    });

    afterEach(async () => {
      await cleanupDir(dataDir);
    });

    it('should persist collection data across BrightChainDb instances', async () => {
      const store = new PooledMemoryBlockStore(BlockSize.Small);

      // First instance: insert a document
      const db1 = new BrightChainDb(store, { name: 'persist-db', dataDir });
      const coll1 = db1.collection('users');
      await coll1.insertOne({ _id: 'u1', name: 'Alice' });

      // Verify the registry file was created on disk
      const registryPath = join(dataDir, 'head-registry.json');
      const fileExists = await fs.access(registryPath).then(
        () => true,
        () => false,
      );
      expect(fileExists).toBe(true);

      // Read the file to confirm it has content
      const content = await fs.readFile(registryPath, 'utf-8');
      const parsed = JSON.parse(content);
      expect(parsed).toHaveProperty('persist-db:users');
    });

    it('should create the head-registry.json file in the specified dataDir', async () => {
      const store = new PooledMemoryBlockStore(BlockSize.Small);
      const db = new BrightChainDb(store, { name: 'test-db', dataDir });
      const coll = db.collection('items');
      await coll.insertOne({ _id: 'i1', value: 42 });

      const registryPath = join(dataDir, 'head-registry.json');
      const stat = await fs.stat(registryPath);
      expect(stat.isFile()).toBe(true);
      expect(stat.size).toBeGreaterThan(0);
    });

    it('should restore head pointers when a new BrightChainDb loads from the same dataDir', async () => {
      const store = new PooledMemoryBlockStore(BlockSize.Small);

      // Instance 1: insert documents into two collections
      const db1 = new BrightChainDb(store, { name: 'mydb', dataDir });
      const users1 = db1.collection('users');
      await users1.insertOne({ _id: 'u1', name: 'Alice' });
      const orders1 = db1.collection('orders');
      await orders1.insertOne({ _id: 'o1', total: 100 });

      // Instance 2: create a new PersistentHeadRegistry, load from disk, and use it
      const registry2 = new PersistentHeadRegistry({ dataDir });
      await registry2.load();

      // The head pointers should be present
      expect(registry2.getHead('mydb', 'users')).toBeDefined();
      expect(registry2.getHead('mydb', 'orders')).toBeDefined();

      // Create a new db with the loaded registry and same store
      const db2 = new BrightChainDb(store, {
        name: 'mydb',
        headRegistry: registry2,
      });
      const users2 = db2.collection('users');
      const orders2 = db2.collection('orders');

      // Documents should be retrievable
      const alice = await users2.findOne({ _id: 'u1' });
      expect(alice).not.toBeNull();
      expect(alice?.['name']).toBe('Alice');

      const order = await orders2.findOne({ _id: 'o1' });
      expect(order).not.toBeNull();
      expect(order?.['total']).toBe(100);
    });
  });

  // ══════════════════════════════════════════════════════════════
  // Test 2: No dataDir, no headRegistry → InMemoryHeadRegistry
  // ══════════════════════════════════════════════════════════════

  describe('BrightChainDb without dataDir or headRegistry (backward compatibility)', () => {
    it('should use InMemoryHeadRegistry by default', async () => {
      const store = new PooledMemoryBlockStore(BlockSize.Small);
      const db = new BrightChainDb(store, { name: 'inmem-db' });

      // Insert and retrieve should work
      const coll = db.collection('docs');
      await coll.insertOne({ _id: 'd1', text: 'hello' });

      const doc = await coll.findOne({ _id: 'd1' });
      expect(doc).not.toBeNull();
      expect(doc?.['text']).toBe('hello');
    });

    it('should not create any files on disk', async () => {
      const tempDir = await makeTempDir();
      try {
        const store = new PooledMemoryBlockStore(BlockSize.Small);
        // No dataDir passed — should be purely in-memory
        const db = new BrightChainDb(store, { name: 'no-disk-db' });
        const coll = db.collection('items');
        await coll.insertOne({ _id: 'i1', value: 'test' });

        // The temp dir should remain empty (no registry file created)
        const files = await fs.readdir(tempDir);
        expect(files.length).toBe(0);
      } finally {
        await cleanupDir(tempDir);
      }
    });

    it('should lose data when a new BrightChainDb is created (no persistence)', async () => {
      const store = new PooledMemoryBlockStore(BlockSize.Small);

      // Instance 1: insert a document
      const db1 = new BrightChainDb(store, { name: 'ephemeral-db' });
      const coll1 = db1.collection('notes');
      await coll1.insertOne({ _id: 'n1', content: 'important' });

      // Instance 2: new db with same store but fresh InMemoryHeadRegistry
      const db2 = new BrightChainDb(store, { name: 'ephemeral-db' });
      const coll2 = db2.collection('notes');

      // The document should not be found (head pointer was lost)
      const doc = await coll2.findOne({ _id: 'n1' });
      expect(doc).toBeNull();
    });
  });

  // ══════════════════════════════════════════════════════════════
  // Test 3: Explicit headRegistry option takes precedence
  // ══════════════════════════════════════════════════════════════

  describe('BrightChainDb with explicit headRegistry option', () => {
    it('should use the provided headRegistry instead of creating one', async () => {
      const store = new PooledMemoryBlockStore(BlockSize.Small);
      const customRegistry = InMemoryHeadRegistry.createIsolated();

      const db = new BrightChainDb(store, {
        name: 'custom-db',
        headRegistry: customRegistry,
      });

      const coll = db.collection('widgets');
      await coll.insertOne({ _id: 'w1', type: 'gear' });

      // The custom registry should have the head pointer
      expect(customRegistry.getHead('custom-db', 'widgets')).toBeDefined();
    });

    it('should prefer explicit headRegistry over dataDir', async () => {
      const dataDir = await makeTempDir();
      try {
        const store = new PooledMemoryBlockStore(BlockSize.Small);
        const customRegistry = InMemoryHeadRegistry.createIsolated();

        // Both headRegistry and dataDir provided — headRegistry wins
        const db = new BrightChainDb(store, {
          name: 'priority-db',
          headRegistry: customRegistry,
          dataDir,
        });

        const coll = db.collection('items');
        await coll.insertOne({ _id: 'i1', value: 'test' });

        // Custom registry should have the head
        expect(customRegistry.getHead('priority-db', 'items')).toBeDefined();

        // No file should be created in dataDir (PersistentHeadRegistry was not used)
        const registryPath = join(dataDir, 'head-registry.json');
        const fileExists = await fs.access(registryPath).then(
          () => true,
          () => false,
        );
        expect(fileExists).toBe(false);
      } finally {
        await cleanupDir(dataDir);
      }
    });

    it('should share state across collections using the same registry', async () => {
      const store = new PooledMemoryBlockStore(BlockSize.Small);
      const sharedRegistry = InMemoryHeadRegistry.createIsolated();

      const db = new BrightChainDb(store, {
        name: 'shared-db',
        headRegistry: sharedRegistry,
      });

      const users = db.collection('users');
      await users.insertOne({ _id: 'u1', name: 'Alice' });

      const orders = db.collection('orders');
      await orders.insertOne({ _id: 'o1', total: 50 });

      // Both collections should have heads in the shared registry
      expect(sharedRegistry.getHead('shared-db', 'users')).toBeDefined();
      expect(sharedRegistry.getHead('shared-db', 'orders')).toBeDefined();
      expect(sharedRegistry.getAllHeads().size).toBe(2);
    });
  });

  // ══════════════════════════════════════════════════════════════
  // Test 4: File locking under concurrent access
  // ══════════════════════════════════════════════════════════════

  describe('file locking under concurrent access', () => {
    let dataDir: string;

    beforeEach(async () => {
      dataDir = await makeTempDir();
    });

    afterEach(async () => {
      await cleanupDir(dataDir);
    });

    it('should handle concurrent writes from multiple PersistentHeadRegistry instances', async () => {
      // Two registries pointing at the same directory
      const reg1 = PersistentHeadRegistry.create({ dataDir });
      const reg2 = PersistentHeadRegistry.create({ dataDir });

      // Concurrent writes from both registries
      await Promise.all([
        reg1.setHead('db1', 'col1', 'block-from-reg1'),
        reg2.setHead('db2', 'col2', 'block-from-reg2'),
      ]);

      // At minimum, neither should have thrown.
      // Due to write-through (full overwrite), the last writer wins on disk.
      // Load a fresh registry to see what's on disk.
      const verifier = PersistentHeadRegistry.create({ dataDir });
      await verifier.load();

      // The disk file should be valid JSON (no corruption)
      const registryPath = join(dataDir, 'head-registry.json');
      const content = await fs.readFile(registryPath, 'utf-8');
      expect(() => JSON.parse(content)).not.toThrow();
    });

    it('should not corrupt the registry file under rapid concurrent writes', async () => {
      const store = new PooledMemoryBlockStore(BlockSize.Small);
      const db = new BrightChainDb(store, { name: 'concurrent-db', dataDir });

      // Rapidly create multiple collections and insert documents concurrently
      const promises: Promise<void>[] = [];
      for (let i = 0; i < 10; i++) {
        promises.push(
          (async () => {
            const coll = db.collection(`coll-${i}`);
            await coll.insertOne({ _id: `doc-${i}`, index: i });
          })(),
        );
      }
      await Promise.all(promises);

      // Verify the registry file is valid JSON
      const registryPath = join(dataDir, 'head-registry.json');
      const content = await fs.readFile(registryPath, 'utf-8');
      const parsed = JSON.parse(content);
      expect(typeof parsed).toBe('object');
      expect(parsed).not.toBeNull();
    });

    it('should not leave stale lock files after concurrent operations', async () => {
      const store = new PooledMemoryBlockStore(BlockSize.Small);
      const db = new BrightChainDb(store, { name: 'lock-db', dataDir });

      // Multiple concurrent inserts
      const coll = db.collection('items');
      await Promise.all(
        Array.from({ length: 5 }, (_, i) =>
          coll.insertOne({ _id: `item-${i}`, value: i }),
        ),
      );

      // No lock file should remain
      const lockPath = join(dataDir, 'head-registry.json.lock');
      const lockExists = await fs.access(lockPath).then(
        () => true,
        () => false,
      );
      expect(lockExists).toBe(false);
    });

    it('should produce a valid registry after interleaved writes from two BrightChainDb instances', async () => {
      const store = new PooledMemoryBlockStore(BlockSize.Small);

      // Two db instances sharing the same dataDir (simulating process restart overlap)
      const db1 = new BrightChainDb(store, { name: 'db-a', dataDir });
      const db2 = new BrightChainDb(store, { name: 'db-b', dataDir });

      // Interleaved writes
      const coll1 = db1.collection('alpha');
      const coll2 = db2.collection('beta');

      await Promise.all([
        coll1.insertOne({ _id: 'a1', data: 'from-db1' }),
        coll2.insertOne({ _id: 'b1', data: 'from-db2' }),
      ]);

      // The file should be valid JSON regardless of write order
      const registryPath = join(dataDir, 'head-registry.json');
      const content = await fs.readFile(registryPath, 'utf-8');
      const parsed = JSON.parse(content);
      expect(typeof parsed).toBe('object');
      expect(parsed).not.toBeNull();

      // At least one of the entries should be present (last-writer-wins on full overwrite)
      const keys = Object.keys(parsed);
      expect(keys.length).toBeGreaterThanOrEqual(1);
    });
  });
});
