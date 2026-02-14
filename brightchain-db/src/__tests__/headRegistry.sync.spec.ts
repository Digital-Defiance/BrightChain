/**
 * @fileoverview Unit tests for HeadRegistry merge and conflict resolution.
 *
 * Tests cover:
 * 1. Last-writer-wins: newer timestamp wins
 * 2. Last-writer-wins: older timestamp is rejected
 * 3. Deferred updates: update queued when block not available
 * 4. Deferred updates: applied when block becomes available
 * 5. PersistentHeadRegistry: timestamps survive load() round-trip
 *
 * Requirements: 2.2, 2.3, 2.4
 */

import { promises as fs } from 'fs';
import { tmpdir } from 'os';
import { join } from 'path';
import {
  InMemoryHeadRegistry,
  PersistentHeadRegistry,
} from '../lib/headRegistry';

async function makeTempDir(): Promise<string> {
  return fs.mkdtemp(join(tmpdir(), 'hr-sync-'));
}

async function cleanupDir(dir: string): Promise<void> {
  await fs.rm(dir, { recursive: true, force: true });
}

describe('HeadRegistry merge and conflict resolution', () => {
  // ═══════════════════════════════════════════════════════════
  // InMemoryHeadRegistry
  // ═══════════════════════════════════════════════════════════

  describe('InMemoryHeadRegistry', () => {
    describe('mergeHeadUpdate (last-writer-wins)', () => {
      it('should accept a remote update when no local head exists', async () => {
        const registry = InMemoryHeadRegistry.createIsolated();
        const ts = new Date('2025-01-15T10:00:00Z');

        const applied = await registry.mergeHeadUpdate(
          'mydb',
          'users',
          'remote-block-1',
          ts,
        );

        expect(applied).toBe(true);
        expect(registry.getHead('mydb', 'users')).toBe('remote-block-1');
        expect(registry.getHeadTimestamp('mydb', 'users')).toEqual(ts);
      });

      it('should accept a remote update with a newer timestamp', async () => {
        const registry = InMemoryHeadRegistry.createIsolated();
        const oldTs = new Date('2025-01-15T10:00:00Z');
        const newTs = new Date('2025-01-15T11:00:00Z');

        // Set local head with older timestamp
        await registry.mergeHeadUpdate('mydb', 'users', 'local-block', oldTs);

        // Remote update with newer timestamp should win
        const applied = await registry.mergeHeadUpdate(
          'mydb',
          'users',
          'remote-block',
          newTs,
        );

        expect(applied).toBe(true);
        expect(registry.getHead('mydb', 'users')).toBe('remote-block');
        expect(registry.getHeadTimestamp('mydb', 'users')).toEqual(newTs);
      });

      it('should reject a remote update with an older timestamp', async () => {
        const registry = InMemoryHeadRegistry.createIsolated();
        const newTs = new Date('2025-01-15T11:00:00Z');
        const oldTs = new Date('2025-01-15T10:00:00Z');

        // Set local head with newer timestamp
        await registry.mergeHeadUpdate('mydb', 'users', 'local-block', newTs);

        // Remote update with older timestamp should be rejected
        const applied = await registry.mergeHeadUpdate(
          'mydb',
          'users',
          'remote-block',
          oldTs,
        );

        expect(applied).toBe(false);
        expect(registry.getHead('mydb', 'users')).toBe('local-block');
        expect(registry.getHeadTimestamp('mydb', 'users')).toEqual(newTs);
      });

      it('should reject a remote update with the same timestamp (tie goes to local)', async () => {
        const registry = InMemoryHeadRegistry.createIsolated();
        const ts = new Date('2025-01-15T10:00:00Z');

        await registry.mergeHeadUpdate('mydb', 'users', 'local-block', ts);

        const applied = await registry.mergeHeadUpdate(
          'mydb',
          'users',
          'remote-block',
          ts,
        );

        expect(applied).toBe(false);
        expect(registry.getHead('mydb', 'users')).toBe('local-block');
      });

      it('should track timestamps set via setHead()', async () => {
        const registry = InMemoryHeadRegistry.createIsolated();

        await registry.setHead('mydb', 'users', 'block-1');

        const ts = registry.getHeadTimestamp('mydb', 'users');
        expect(ts).toBeInstanceOf(Date);
        // Timestamp should be recent (within last second)
        expect(Date.now() - ts!.getTime()).toBeLessThan(1000);
      });

      it('should handle merges across different collections independently', async () => {
        const registry = InMemoryHeadRegistry.createIsolated();
        const ts1 = new Date('2025-01-15T10:00:00Z');
        const ts2 = new Date('2025-01-15T11:00:00Z');

        await registry.mergeHeadUpdate('mydb', 'users', 'users-block', ts1);
        await registry.mergeHeadUpdate('mydb', 'orders', 'orders-block', ts2);

        expect(registry.getHead('mydb', 'users')).toBe('users-block');
        expect(registry.getHead('mydb', 'orders')).toBe('orders-block');
        expect(registry.getHeadTimestamp('mydb', 'users')).toEqual(ts1);
        expect(registry.getHeadTimestamp('mydb', 'orders')).toEqual(ts2);
      });
    });

    describe('deferred updates', () => {
      it('should queue a deferred update', async () => {
        const registry = InMemoryHeadRegistry.createIsolated();
        const ts = new Date('2025-01-15T10:00:00Z');

        await registry.deferHeadUpdate('mydb', 'users', 'missing-block', ts);

        const deferred = registry.getDeferredUpdates();
        expect(deferred).toHaveLength(1);
        expect(deferred[0]).toEqual({
          dbName: 'mydb',
          collectionName: 'users',
          blockId: 'missing-block',
          timestamp: ts,
        });
      });

      it('should apply deferred updates when block becomes available', async () => {
        const registry = InMemoryHeadRegistry.createIsolated();
        const ts = new Date('2025-01-15T10:00:00Z');

        // Defer an update for a block not yet available
        await registry.deferHeadUpdate('mydb', 'users', 'missing-block', ts);

        // Head should not be set yet
        expect(registry.getHead('mydb', 'users')).toBeUndefined();

        // Block becomes available — apply deferred updates
        const applied = await registry.applyDeferredUpdates('missing-block');

        expect(applied).toBe(1);
        expect(registry.getHead('mydb', 'users')).toBe('missing-block');
        expect(registry.getHeadTimestamp('mydb', 'users')).toEqual(ts);
        expect(registry.getDeferredUpdates()).toHaveLength(0);
      });

      it('should not apply deferred updates for a different block', async () => {
        const registry = InMemoryHeadRegistry.createIsolated();
        const ts = new Date('2025-01-15T10:00:00Z');

        await registry.deferHeadUpdate('mydb', 'users', 'block-A', ts);

        const applied = await registry.applyDeferredUpdates('block-B');

        expect(applied).toBe(0);
        expect(registry.getHead('mydb', 'users')).toBeUndefined();
        expect(registry.getDeferredUpdates()).toHaveLength(1);
      });

      it('should apply multiple deferred updates for the same block', async () => {
        const registry = InMemoryHeadRegistry.createIsolated();
        const ts1 = new Date('2025-01-15T10:00:00Z');
        const ts2 = new Date('2025-01-15T11:00:00Z');

        // Two collections waiting for the same block
        await registry.deferHeadUpdate('mydb', 'users', 'shared-block', ts1);
        await registry.deferHeadUpdate('mydb', 'orders', 'shared-block', ts2);

        const applied = await registry.applyDeferredUpdates('shared-block');

        expect(applied).toBe(2);
        expect(registry.getHead('mydb', 'users')).toBe('shared-block');
        expect(registry.getHead('mydb', 'orders')).toBe('shared-block');
        expect(registry.getDeferredUpdates()).toHaveLength(0);
      });

      it('should use last-writer-wins when applying deferred updates against existing heads', async () => {
        const registry = InMemoryHeadRegistry.createIsolated();
        const localTs = new Date('2025-01-15T12:00:00Z');
        const deferredTs = new Date('2025-01-15T10:00:00Z');

        // Set a local head with a newer timestamp
        await registry.mergeHeadUpdate('mydb', 'users', 'local-block', localTs);

        // Defer an update with an older timestamp
        await registry.deferHeadUpdate(
          'mydb',
          'users',
          'deferred-block',
          deferredTs,
        );

        // Apply — the deferred update should be rejected (local is newer)
        const applied = await registry.applyDeferredUpdates('deferred-block');

        expect(applied).toBe(1); // It was processed (removed from queue)
        expect(registry.getHead('mydb', 'users')).toBe('local-block'); // But local wins
      });

      it('should clear deferred updates on clear()', async () => {
        const registry = InMemoryHeadRegistry.createIsolated();
        const ts = new Date('2025-01-15T10:00:00Z');

        await registry.deferHeadUpdate('mydb', 'users', 'block-1', ts);
        expect(registry.getDeferredUpdates()).toHaveLength(1);

        await registry.clear();

        expect(registry.getDeferredUpdates()).toHaveLength(0);
      });
    });

    describe('getHeadTimestamp', () => {
      it('should return undefined for non-existent heads', () => {
        const registry = InMemoryHeadRegistry.createIsolated();
        expect(
          registry.getHeadTimestamp('mydb', 'nonexistent'),
        ).toBeUndefined();
      });

      it('should clear timestamps on removeHead()', async () => {
        const registry = InMemoryHeadRegistry.createIsolated();
        await registry.setHead('mydb', 'users', 'block-1');
        expect(registry.getHeadTimestamp('mydb', 'users')).toBeDefined();

        await registry.removeHead('mydb', 'users');
        expect(registry.getHeadTimestamp('mydb', 'users')).toBeUndefined();
      });
    });
  });

  // ═══════════════════════════════════════════════════════════
  // PersistentHeadRegistry
  // ═══════════════════════════════════════════════════════════

  describe('PersistentHeadRegistry', () => {
    let dataDir: string;

    beforeEach(async () => {
      dataDir = await makeTempDir();
    });

    afterEach(async () => {
      await cleanupDir(dataDir);
    });

    describe('mergeHeadUpdate (last-writer-wins)', () => {
      it('should accept a remote update when no local head exists', async () => {
        const registry = PersistentHeadRegistry.create({ dataDir });
        const ts = new Date('2025-01-15T10:00:00Z');

        const applied = await registry.mergeHeadUpdate(
          'mydb',
          'users',
          'remote-block-1',
          ts,
        );

        expect(applied).toBe(true);
        expect(registry.getHead('mydb', 'users')).toBe('remote-block-1');
      });

      it('should accept a newer timestamp and reject an older one', async () => {
        const registry = PersistentHeadRegistry.create({ dataDir });
        const oldTs = new Date('2025-01-15T10:00:00Z');
        const newTs = new Date('2025-01-15T11:00:00Z');

        await registry.mergeHeadUpdate('mydb', 'users', 'old-block', oldTs);
        const applied = await registry.mergeHeadUpdate(
          'mydb',
          'users',
          'new-block',
          newTs,
        );
        expect(applied).toBe(true);
        expect(registry.getHead('mydb', 'users')).toBe('new-block');

        const rejected = await registry.mergeHeadUpdate(
          'mydb',
          'users',
          'even-older-block',
          oldTs,
        );
        expect(rejected).toBe(false);
        expect(registry.getHead('mydb', 'users')).toBe('new-block');
      });

      it('should persist merged updates to disk', async () => {
        const reg1 = PersistentHeadRegistry.create({ dataDir });
        const ts = new Date('2025-01-15T10:00:00Z');

        await reg1.mergeHeadUpdate('mydb', 'users', 'merged-block', ts);

        // Load a fresh instance
        const reg2 = PersistentHeadRegistry.create({ dataDir });
        await reg2.load();

        expect(reg2.getHead('mydb', 'users')).toBe('merged-block');
        expect(reg2.getHeadTimestamp('mydb', 'users')).toEqual(ts);
      });
    });

    describe('timestamp persistence round-trip', () => {
      it('should persist and reload timestamps', async () => {
        const reg1 = PersistentHeadRegistry.create({ dataDir });
        await reg1.setHead('mydb', 'users', 'block-1');
        const originalTs = reg1.getHeadTimestamp('mydb', 'users');
        expect(originalTs).toBeDefined();

        const reg2 = PersistentHeadRegistry.create({ dataDir });
        await reg2.load();

        expect(reg2.getHead('mydb', 'users')).toBe('block-1');
        const loadedTs = reg2.getHeadTimestamp('mydb', 'users');
        expect(loadedTs).toBeDefined();
        expect(loadedTs!.getTime()).toBe(originalTs!.getTime());
      });

      it('should handle legacy format (plain string values) gracefully', async () => {
        // Write a legacy-format file directly
        const filePath = join(dataDir, 'head-registry.json');
        await fs.writeFile(
          filePath,
          JSON.stringify({ 'mydb:users': 'legacy-block' }),
          'utf-8',
        );

        const registry = PersistentHeadRegistry.create({ dataDir });
        await registry.load();

        expect(registry.getHead('mydb', 'users')).toBe('legacy-block');
        // No timestamp for legacy entries
        expect(registry.getHeadTimestamp('mydb', 'users')).toBeUndefined();
      });
    });

    describe('deferred updates', () => {
      it('should queue and apply deferred updates', async () => {
        const registry = PersistentHeadRegistry.create({ dataDir });
        const ts = new Date('2025-01-15T10:00:00Z');

        await registry.deferHeadUpdate('mydb', 'users', 'missing-block', ts);
        expect(registry.getDeferredUpdates()).toHaveLength(1);

        const applied = await registry.applyDeferredUpdates('missing-block');

        expect(applied).toBe(1);
        expect(registry.getHead('mydb', 'users')).toBe('missing-block');

        // Should be persisted to disk
        const reg2 = PersistentHeadRegistry.create({ dataDir });
        await reg2.load();
        expect(reg2.getHead('mydb', 'users')).toBe('missing-block');
      });
    });
  });
});
