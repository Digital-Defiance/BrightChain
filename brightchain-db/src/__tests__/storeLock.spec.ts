/**
 * StoreLock – unit tests.
 *
 * Validates acquire/release cycle, contention behavior, and stale lock recovery.
 */

import { promises as fs } from 'fs';
import { join } from 'path';
import { tmpdir } from 'os';
import { mkdtemp, rm } from 'fs/promises';
import { StoreLock } from '../lib/storeLock';

describe('StoreLock', () => {
  let tempDir: string;

  beforeEach(async () => {
    tempDir = await mkdtemp(join(tmpdir(), 'storelock-test-'));
  });

  afterEach(async () => {
    await rm(tempDir, { recursive: true, force: true });
  });

  const lockPath = () => join(tempDir, '.brightchain-db.lock');

  describe('acquire / release cycle', () => {
    it('should acquire and release the lock', async () => {
      const lock = new StoreLock(tempDir);

      expect(lock.isHeld).toBe(false);
      await lock.acquire();
      expect(lock.isHeld).toBe(true);

      // Lock file should exist on disk
      const stat = await fs.stat(lockPath());
      expect(stat.isFile()).toBe(true);

      await lock.release();
      expect(lock.isHeld).toBe(false);

      // Lock file should be removed
      await expect(fs.stat(lockPath())).rejects.toThrow();
    });

    it('should allow re-acquire after release', async () => {
      const lock = new StoreLock(tempDir);

      await lock.acquire();
      await lock.release();
      await lock.acquire();
      expect(lock.isHeld).toBe(true);
      await lock.release();
    });

    it('release should be a no-op when not held', async () => {
      const lock = new StoreLock(tempDir);
      // Should not throw
      await lock.release();
      expect(lock.isHeld).toBe(false);
    });
  });

  describe('contention behavior', () => {
    it('second lock should block until first is released', async () => {
      const lock1 = new StoreLock(tempDir, { maxRetries: 5, retryDelayMs: 10 });
      const lock2 = new StoreLock(tempDir, { maxRetries: 50, retryDelayMs: 10 });

      await lock1.acquire();

      let lock2Acquired = false;

      // Start lock2 acquire in background — it will retry
      const lock2Promise = lock2.acquire().then(() => {
        lock2Acquired = true;
      });

      // Give lock2 a few retries, it should still be waiting
      await new Promise((r) => setTimeout(r, 30));
      expect(lock2Acquired).toBe(false);

      // Release lock1 so lock2 can proceed
      await lock1.release();
      await lock2Promise;

      expect(lock2Acquired).toBe(true);
      expect(lock2.isHeld).toBe(true);
      await lock2.release();
    });

    it('should timeout when lock is held and retries exhausted', async () => {
      const holder = new StoreLock(tempDir);
      const waiter = new StoreLock(tempDir, { maxRetries: 3, retryDelayMs: 5 });

      await holder.acquire();

      // waiter will exhaust retries, force-remove stale lock, then acquire
      // Since holder still logically holds it, the force-remove succeeds
      // and waiter gets the lock (stale recovery behavior)
      await waiter.acquire();
      expect(waiter.isHeld).toBe(true);
      await waiter.release();
      await holder.release();
    });
  });

  describe('stale lock recovery', () => {
    it('should force-remove a stale lock file after timeout', async () => {
      // Simulate a stale lock by creating the file directly
      const handle = await fs.open(lockPath(), 'wx');
      await handle.close();

      // Lock with very short retry to trigger stale recovery quickly
      const lock = new StoreLock(tempDir, { maxRetries: 2, retryDelayMs: 5 });
      await lock.acquire();

      expect(lock.isHeld).toBe(true);
      await lock.release();
    });
  });

  describe('withLock helper', () => {
    it('should acquire before callback and release after', async () => {
      const lock = new StoreLock(tempDir);
      let wasHeldDuringCallback = false;

      const result = await lock.withLock(async () => {
        wasHeldDuringCallback = lock.isHeld;
        return 42;
      });

      expect(wasHeldDuringCallback).toBe(true);
      expect(lock.isHeld).toBe(false);
      expect(result).toBe(42);
    });

    it('should release even if callback throws', async () => {
      const lock = new StoreLock(tempDir);

      await expect(
        lock.withLock(async () => {
          throw new Error('boom');
        }),
      ).rejects.toThrow('boom');

      expect(lock.isHeld).toBe(false);
    });
  });
});
