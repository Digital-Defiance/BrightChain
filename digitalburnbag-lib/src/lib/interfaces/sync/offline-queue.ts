import { PlatformID } from '@digitaldefiance/ecies-lib';
import { IOfflineOperation } from './offline-operation';

/**
 * Queue for operations performed while offline.
 * Operations are replayed in order when the network becomes available.
 */
export interface IOfflineQueue<TID extends PlatformID> {
  /** Enqueue an operation for later replay */
  enqueue(operation: IOfflineOperation<TID>): Promise<void>;

  /** Dequeue the next operation (FIFO) */
  dequeue(): Promise<IOfflineOperation<TID> | undefined>;

  /** Peek at the next operation without removing it */
  peek(): Promise<IOfflineOperation<TID> | undefined>;

  /** Get all queued operations */
  getAll(): Promise<IOfflineOperation<TID>[]>;

  /** Remove a specific operation by ID */
  remove(operationId: TID): Promise<void>;

  /** Clear all queued operations */
  clear(): Promise<void>;

  /** Get the number of queued operations */
  size(): Promise<number>;

  /** Replay all queued operations against the server */
  replayAll(): Promise<{ succeeded: number; failed: number }>;
}
