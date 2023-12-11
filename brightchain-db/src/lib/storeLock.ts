/**
 * StoreLock – cross-platform file-based lock for serializing write operations.
 *
 * Uses the same protocol as the C++ implementation:
 * - Lock file at `storePath/.brightchain-db.lock`
 * - Acquire via exclusive file creation (`wx` flag)
 * - Retry loop with configurable delay and max retries
 * - Stale lock force-removal after timeout exhaustion
 *
 * Both C++ and TypeScript processes respect this lock, enabling
 * cross-platform mutual exclusion on the same block store.
 */

import { promises as fs } from 'fs';
import { join } from 'path';

export class StoreLock {
  private readonly lockPath: string;
  private readonly maxRetries: number;
  private readonly retryDelayMs: number;
  private held = false;

  constructor(
    storePath: string,
    options?: { maxRetries?: number; retryDelayMs?: number },
  ) {
    this.lockPath = join(storePath, '.brightchain-db.lock');
    this.maxRetries = options?.maxRetries ?? 250;
    this.retryDelayMs = options?.retryDelayMs ?? 20;
  }

  /**
   * Acquire the store lock. Blocks with retry until acquired or timeout.
   * After exhausting retries, force-removes a potentially stale lock and
   * retries once more. Throws if still unable to acquire.
   */
  async acquire(): Promise<void> {
    for (let attempt = 0; attempt < this.maxRetries; attempt++) {
      try {
        const handle = await fs.open(this.lockPath, 'wx');
        await handle.close();
        this.held = true;
        return;
      } catch (err: unknown) {
        const error = err as NodeJS.ErrnoException;
        if (error.code === 'EEXIST') {
          await this.delay(this.retryDelayMs);
          continue;
        }
        throw error;
      }
    }

    // Exhausted retries — force-remove stale lock and try once more
    try {
      await fs.unlink(this.lockPath);
    } catch {
      // Ignore — lock may have been released between check and unlink
    }

    try {
      const handle = await fs.open(this.lockPath, 'wx');
      await handle.close();
      this.held = true;
    } catch (err: unknown) {
      const error = err as NodeJS.ErrnoException;
      if (error.code === 'EEXIST') {
        throw new Error(
          `StoreLock: timed out acquiring lock at ${this.lockPath} ` +
            `after ${this.maxRetries} retries (${(this.maxRetries * this.retryDelayMs) / 1000}s)`,
        );
      }
      throw error;
    }
  }

  /**
   * Release the store lock. Safe to call if not held (no-op).
   */
  async release(): Promise<void> {
    if (!this.held) return;
    try {
      await fs.unlink(this.lockPath);
    } catch {
      // Ignore — lock file may already be gone
    }
    this.held = false;
  }

  /**
   * Whether this instance currently holds the lock.
   */
  get isHeld(): boolean {
    return this.held;
  }

  /**
   * Execute a callback while holding the lock (try/finally pattern).
   */
  async withLock<T>(fn: () => Promise<T>): Promise<T> {
    await this.acquire();
    try {
      return await fn();
    } finally {
      await this.release();
    }
  }

  private delay(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }
}
