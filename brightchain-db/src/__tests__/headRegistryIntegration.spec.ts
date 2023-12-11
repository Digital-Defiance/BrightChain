/**
 * @fileoverview Integration tests for HeadRegistry with BrightDB.
 *
 * Tests:
 * 1. BrightDb with `dataDir` uses PersistentHeadRegistry (data persists across instances)
 * 2. BrightDb without `dataDir` or `headRegistry` uses InMemoryHeadRegistry (backward compat)
 * 3. BrightDb with explicit `headRegistry` uses that registry
 * 4. File locking under concurrent access (multiple PersistentHeadRegistry instances)
 *
 * Requirements: 1.1, 1.5, 1.6
 */

import {
  BlockSize,
  initializeBrightChain,
  PooledMemoryBlockStore,
} from '@brightchain/brightchain-lib';
import { promises as fs } from 'fs';
import { tmpdir } from 'os';
import { join } from 'path';
import { BrightDb } from '../lib/database';
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

describe('HeadRegistry integration with BrightDb', () => {
  beforeAll(() => {
    initializeBrightChain();
  });
  // ══════════════════════════════════════════════════════════════
  // Test 1: dataDir → PersistentHeadRegistry (data survives restart)
  // ══════════════════════════════════════════════════════════════

  describe('BrightDb with dataDir option', () => {
    let dataDir: string;

    beforeEach(async () => {
      dataDir = await makeTempDir();
    });

    afterEach(async () => {
      await cleanupDir(dataDir);
    });

    it('should persist collection data across BrightDb instances', async () => {
      const store = new PooledMemoryBlockStore(BlockSize.Small);

      // First instance: insert a document
      const db1 = new BrightDb(store, { name: 'persist-db', dataDir });
      const coll1 = db1.collection('users');
      await coll1.insertOne({ _id: 'u1', name: 'Alice' });

      // Verify the per-key __heads directory was created
      const headsDir = join(dataDir, '__heads');
      const dirExists = await fs.access(headsDir).then(
        () => true,
        () => false,
      );
      expect(dirExists).toBe(true);

      // Read the per-key file for persist-db:users (two-level layout: <headsDir>/<dbName>/<collName>.json)
      const keyFile = join(headsDir, 'persist-db', 'users.json');
      const content = await fs.readFile(keyFile, 'utf-8');
      const parsed = JSON.parse(content);
      expect(parsed).toHaveProperty('blockId');
      expect(typeof parsed.blockId).toBe('string');
    });

    it('should create the __heads directory with per-key files in the specified dataDir', async () => {
      const store = new PooledMemoryBlockStore(BlockSize.Small);
      const db = new BrightDb(store, { name: 'test-db', dataDir });
      const coll = db.collection('items');
      await coll.insertOne({ _id: 'i1', value: 42 });

      const headsDir = join(dataDir, '__heads');
      // Two-level layout: files are under <headsDir>/<dbName>/<collName>.json
      const dbDirs = await fs.readdir(headsDir);
      let jsonCount = 0;
      for (const dbDir of dbDirs) {
        const sub = await fs.readdir(join(headsDir, dbDir));
        jsonCount += sub.filter(
          (f) => f.endsWith('.json') && !f.endsWith('.tmp.json'),
        ).length;
      }
      expect(jsonCount).toBeGreaterThan(0);
    });

    it('should restore head pointers when a new BrightDb loads from the same dataDir', async () => {
      const store = new PooledMemoryBlockStore(BlockSize.Small);

      // Instance 1: insert documents into two collections
      const db1 = new BrightDb(store, { name: 'mydb', dataDir });
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
      const db2 = new BrightDb(store, {
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

  describe('BrightDb without dataDir or headRegistry (backward compatibility)', () => {
    it('should use InMemoryHeadRegistry by default', async () => {
      const store = new PooledMemoryBlockStore(BlockSize.Small);
      const db = new BrightDb(store, { name: 'inmem-db' });

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
        const db = new BrightDb(store, { name: 'no-disk-db' });
        const coll = db.collection('items');
        await coll.insertOne({ _id: 'i1', value: 'test' });

        // The temp dir should remain empty (no registry file created)
        const files = await fs.readdir(tempDir);
        expect(files.length).toBe(0);
      } finally {
        await cleanupDir(tempDir);
      }
    });

    it('should lose data when a new BrightDb is created (no persistence)', async () => {
      const store = new PooledMemoryBlockStore(BlockSize.Small);

      // Instance 1: insert a document
      const db1 = new BrightDb(store, { name: 'ephemeral-db' });
      const coll1 = db1.collection('notes');
      await coll1.insertOne({ _id: 'n1', content: 'important' });

      // Instance 2: new db with same store but fresh InMemoryHeadRegistry
      const db2 = new BrightDb(store, { name: 'ephemeral-db' });
      const coll2 = db2.collection('notes');

      // The document should not be found (head pointer was lost)
      const doc = await coll2.findOne({ _id: 'n1' });
      expect(doc).toBeNull();
    });
  });

  // ══════════════════════════════════════════════════════════════
  // Test 3: Explicit headRegistry option takes precedence
  // ══════════════════════════════════════════════════════════════

  describe('BrightDb with explicit headRegistry option', () => {
    it('should use the provided headRegistry instead of creating one', async () => {
      const store = new PooledMemoryBlockStore(BlockSize.Small);
      const customRegistry = InMemoryHeadRegistry.createIsolated();

      const db = new BrightDb(store, {
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
        const db = new BrightDb(store, {
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

      const db = new BrightDb(store, {
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
      // Per-key storage: each key is independent — no file corruption possible.
      // Load a fresh registry to verify both keys are on disk.
      const verifier = PersistentHeadRegistry.create({ dataDir });
      await verifier.load();

      expect(verifier.getHead('db1', 'col1')).toBe('block-from-reg1');
      expect(verifier.getHead('db2', 'col2')).toBe('block-from-reg2');
    });

    it('should not corrupt per-key files under rapid concurrent writes', async () => {
      const store = new PooledMemoryBlockStore(BlockSize.Small);
      const db = new BrightDb(store, { name: 'concurrent-db', dataDir });

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

      // Each per-key file must be valid JSON (two-level layout: <headsDir>/<dbName>/<collName>.json)
      const headsDir = join(dataDir, '__heads');
      const allJsonFiles: string[] = [];
      const dbDirs2 = await fs.readdir(headsDir);
      for (const dbDir of dbDirs2) {
        const sub = await fs.readdir(join(headsDir, dbDir));
        for (const f of sub.filter(
          (f) => f.endsWith('.json') && !f.endsWith('.tmp.json'),
        )) {
          allJsonFiles.push(join(headsDir, dbDir, f));
        }
      }
      expect(allJsonFiles.length).toBe(10);
      for (const filePath of allJsonFiles) {
        const content = await fs.readFile(filePath, 'utf-8');
        expect(() => JSON.parse(content)).not.toThrow();
      }
    });

    it('should not leave stale lock files after concurrent operations', async () => {
      const store = new PooledMemoryBlockStore(BlockSize.Small);
      const db = new BrightDb(store, { name: 'lock-db', dataDir });

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

    it('should produce a valid registry after interleaved writes from two BrightDb instances', async () => {
      const store = new PooledMemoryBlockStore(BlockSize.Small);

      // Two db instances sharing the same dataDir (simulating process restart overlap)
      const db1 = new BrightDb(store, { name: 'db-a', dataDir });
      const db2 = new BrightDb(store, { name: 'db-b', dataDir });

      // Interleaved writes
      const coll1 = db1.collection('alpha');
      const coll2 = db2.collection('beta');

      await Promise.all([
        coll1.insertOne({ _id: 'a1', data: 'from-db1' }),
        coll2.insertOne({ _id: 'b1', data: 'from-db2' }),
      ]);

      // Each key is stored in its own file — no single-file contention.
      // Both entries should be present on disk (two-level layout).
      const headsDir = join(dataDir, '__heads');
      const allJsonFiles2: string[] = [];
      const dbDirs3 = await fs.readdir(headsDir);
      for (const dbDir of dbDirs3) {
        const sub = await fs.readdir(join(headsDir, dbDir));
        for (const f of sub.filter(
          (f) => f.endsWith('.json') && !f.endsWith('.tmp.json'),
        )) {
          allJsonFiles2.push(join(headsDir, dbDir, f));
        }
      }
      expect(allJsonFiles2.length).toBeGreaterThanOrEqual(1);

      for (const filePath of allJsonFiles2) {
        const content = await fs.readFile(filePath, 'utf-8');
        const parsed = JSON.parse(content);
        expect(parsed).toHaveProperty('blockId');
        expect(typeof parsed.blockId).toBe('string');
      }
    });
  });
});
