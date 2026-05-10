import type {
  IOfflineOperation,
  ISyncApiClient,
} from '@brightchain/digitalburnbag-lib';
import { OfflineOperationType } from '@brightchain/digitalburnbag-lib';
import * as fs from 'fs';
import * as os from 'os';
import * as path from 'path';
import { SqliteOfflineQueue } from '../storage/sqlite-offline-queue';

function makeOp(
  overrides?: Partial<IOfflineOperation<string>>,
): IOfflineOperation<string> {
  return {
    operationId: `op-${Math.random().toString(36).slice(2)}`,
    operationType: OfflineOperationType.Upload,
    targetId: 'file-1',
    localPath: '/mnt/burnbag/test.txt',
    payload: JSON.stringify({ test: true }),
    queuedAt: new Date().toISOString(),
    retryCount: 0,
    ...overrides,
  };
}

describe('SqliteOfflineQueue', () => {
  let queue: SqliteOfflineQueue;
  let tmpDir: string;
  let dbPath: string;

  beforeEach(async () => {
    tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'burnbag-queue-'));
    dbPath = path.join(tmpDir, 'queue.db');
    queue = new SqliteOfflineQueue(dbPath);
    await queue.initialize();
  });

  afterEach(() => {
    queue.close();
    fs.rmSync(tmpDir, { recursive: true, force: true });
  });

  it('should throw if not initialized', async () => {
    const uninit = new SqliteOfflineQueue('/tmp/nonexistent.db');
    await expect(uninit.enqueue(makeOp())).rejects.toThrow('not initialized');
  });

  it('should enqueue and dequeue operations FIFO', async () => {
    const op1 = makeOp({
      operationId: 'first',
      queuedAt: '2024-01-01T00:00:00Z',
    });
    const op2 = makeOp({
      operationId: 'second',
      queuedAt: '2024-01-01T00:00:01Z',
    });

    await queue.enqueue(op1);
    await queue.enqueue(op2);

    const dequeued = await queue.dequeue();
    expect(dequeued?.operationId).toBe('first');

    const dequeued2 = await queue.dequeue();
    expect(dequeued2?.operationId).toBe('second');

    const empty = await queue.dequeue();
    expect(empty).toBeUndefined();
  });

  it('should peek without removing', async () => {
    const op = makeOp();
    await queue.enqueue(op);

    const peeked = await queue.peek();
    expect(peeked?.operationId).toBe(op.operationId);

    // Still there
    const size = await queue.size();
    expect(size).toBe(1);
  });

  it('should getAll operations', async () => {
    await queue.enqueue(
      makeOp({ operationId: 'a', queuedAt: '2024-01-01T00:00:00Z' }),
    );
    await queue.enqueue(
      makeOp({ operationId: 'b', queuedAt: '2024-01-01T00:00:01Z' }),
    );
    await queue.enqueue(
      makeOp({ operationId: 'c', queuedAt: '2024-01-01T00:00:02Z' }),
    );

    const all = await queue.getAll();
    expect(all.length).toBe(3);
    expect(all.map((o) => o.operationId)).toEqual(['a', 'b', 'c']);
  });

  it('should remove by operationId', async () => {
    const op = makeOp();
    await queue.enqueue(op);
    await queue.remove(op.operationId);

    const size = await queue.size();
    expect(size).toBe(0);
  });

  it('should clear all operations', async () => {
    await queue.enqueue(makeOp());
    await queue.enqueue(makeOp());
    await queue.clear();

    const size = await queue.size();
    expect(size).toBe(0);
  });

  it('should report correct size', async () => {
    expect(await queue.size()).toBe(0);
    await queue.enqueue(makeOp());
    expect(await queue.size()).toBe(1);
    await queue.enqueue(makeOp());
    expect(await queue.size()).toBe(2);
  });

  it('should persist across close/reopen', async () => {
    const op = makeOp({ operationId: 'persistent' });
    await queue.enqueue(op);
    queue.close();

    // Reopen
    const queue2 = new SqliteOfflineQueue(dbPath);
    await queue2.initialize();

    const peeked = await queue2.peek();
    expect(peeked?.operationId).toBe('persistent');
    queue2.close();
  });

  describe('replayAll', () => {
    it('should return zeros when no API client', async () => {
      await queue.enqueue(makeOp());
      const result = await queue.replayAll();
      expect(result).toEqual({ succeeded: 0, failed: 0 });
    });

    it('should replay operations via API client', async () => {
      const mockApiClient: jest.Mocked<ISyncApiClient<string>> = {
        getRemoteChanges: jest.fn(),
        downloadFile: jest.fn(),
        uploadFile: jest.fn(),
        propagateLocalChange: jest.fn().mockResolvedValue(undefined),
      };

      queue.close();
      queue = new SqliteOfflineQueue(dbPath, mockApiClient);
      await queue.initialize();

      await queue.enqueue(
        makeOp({ operationId: 'r1', queuedAt: '2024-01-01T00:00:00Z' }),
      );
      await queue.enqueue(
        makeOp({ operationId: 'r2', queuedAt: '2024-01-01T00:00:01Z' }),
      );

      const result = await queue.replayAll();
      expect(result.succeeded).toBe(2);
      expect(result.failed).toBe(0);
      expect(mockApiClient.propagateLocalChange).toHaveBeenCalledTimes(2);

      // Queue should be empty after replay
      expect(await queue.size()).toBe(0);
    });

    it('should stop on first failure and preserve order', async () => {
      const mockApiClient: jest.Mocked<ISyncApiClient<string>> = {
        getRemoteChanges: jest.fn(),
        downloadFile: jest.fn(),
        uploadFile: jest.fn(),
        propagateLocalChange: jest
          .fn()
          .mockRejectedValue(new Error('network error')),
      };

      queue.close();
      queue = new SqliteOfflineQueue(dbPath, mockApiClient);
      await queue.initialize();

      await queue.enqueue(
        makeOp({ operationId: 'f1', queuedAt: '2024-01-01T00:00:00Z' }),
      );
      await queue.enqueue(
        makeOp({ operationId: 'f2', queuedAt: '2024-01-01T00:00:01Z' }),
      );

      const result = await queue.replayAll();
      expect(result.failed).toBe(1);
      expect(result.succeeded).toBe(0);

      // Both should still be in queue (first failed, second not attempted)
      expect(await queue.size()).toBe(2);

      // Retry count should have incremented
      const first = await queue.peek();
      expect(first?.retryCount).toBe(1);
      expect(first?.lastError).toBe('network error');
    });
  });
});
