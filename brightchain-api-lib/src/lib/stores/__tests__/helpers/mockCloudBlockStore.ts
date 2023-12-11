/**
 * MockCloudBlockStore - In-memory test helper for CloudBlockStoreBase.
 *
 * Extends CloudBlockStoreBase with a Map<string, Uint8Array> backing store,
 * implementing all 6 abstract primitives. Supports error injection for
 * transient, non-transient, and authentication error testing, plus
 * operation counting for retry verification.
 */
import {
  ICloudBlockStoreConfig,
  StoreError,
  StoreErrorType,
} from '@brightchain/brightchain-lib';
import { CloudBlockStoreBase } from '../../cloudBlockStoreBase';

// =========================================================================
// Test error classes
// =========================================================================

/** Simulates a transient cloud error (network timeout, throttling, 5xx). */
export class TransientTestError extends Error {
  constructor(message = 'Transient test error') {
    super(message);
    this.name = 'TransientTestError';
  }
}

/** Simulates a non-transient cloud error (400, 404, validation). */
export class NonTransientTestError extends Error {
  constructor(message = 'Non-transient test error') {
    super(message);
    this.name = 'NonTransientTestError';
  }
}

/** Simulates an authentication/authorization error (401/403). */
export class AuthenticationTestError extends Error {
  constructor(message = 'Authentication test error') {
    super(message);
    this.name = 'AuthenticationTestError';
  }
}

// =========================================================================
// Operation tracking
// =========================================================================

export interface OperationRecord {
  operation: string;
  key: string;
  timestamp: number;
}

// =========================================================================
// MockCloudBlockStore
// =========================================================================

export class MockCloudBlockStore extends CloudBlockStoreBase {
  /** In-memory backing store — exposed for test assertions. */
  public readonly objects = new Map<string, Uint8Array>();

  // --- Error injection state ---
  private transientErrorsRemaining = 0;
  private nonTransientErrorPending = false;
  private authErrorPending = false;

  // --- Operation tracking ---
  public readonly operationLog: OperationRecord[] = [];
  public uploadCount = 0;
  public downloadCount = 0;
  public deleteCount = 0;
  public existsCount = 0;
  public listCount = 0;

  constructor(
    config: ICloudBlockStoreConfig,
    indexTtlMs?: number,
    listPageSize?: number,
  ) {
    super(config, indexTtlMs, listPageSize);
  }

  // =========================================================================
  // Error injection API
  // =========================================================================

  /**
   * Make the next `count` operations fail with a TransientTestError.
   * Each primitive call consumes one from the counter.
   */
  public injectTransientError(count: number): void {
    this.transientErrorsRemaining = count;
  }

  /** Make the next operation fail with a NonTransientTestError. */
  public injectNonTransientError(): void {
    this.nonTransientErrorPending = true;
  }

  /** Make the next operation fail with an AuthenticationTestError. */
  public injectAuthError(): void {
    this.authErrorPending = true;
  }

  /** Throw any pending injected error, consuming it from the queue. */
  private maybeThrowInjectedError(): void {
    if (this.authErrorPending) {
      this.authErrorPending = false;
      throw new AuthenticationTestError();
    }
    if (this.nonTransientErrorPending) {
      this.nonTransientErrorPending = false;
      throw new NonTransientTestError();
    }
    if (this.transientErrorsRemaining > 0) {
      this.transientErrorsRemaining--;
      throw new TransientTestError();
    }
  }

  /** Record an operation in the log. */
  private recordOp(operation: string, key: string): void {
    this.operationLog.push({ operation, key, timestamp: Date.now() });
  }

  // =========================================================================
  // Reset helpers
  // =========================================================================

  /** Clear all stored objects, error injection state, and operation counters. */
  public reset(): void {
    this.objects.clear();
    this.transientErrorsRemaining = 0;
    this.nonTransientErrorPending = false;
    this.authErrorPending = false;
    this.operationLog.length = 0;
    this.uploadCount = 0;
    this.downloadCount = 0;
    this.deleteCount = 0;
    this.existsCount = 0;
    this.listCount = 0;
    this.localIndex.clear();
    this.indexStale = true;
  }

  // =========================================================================
  // Abstract primitive implementations
  // =========================================================================

  protected async uploadObject(key: string, data: Uint8Array): Promise<void> {
    this.recordOp('upload', key);
    this.uploadCount++;
    this.maybeThrowInjectedError();
    this.objects.set(key, new Uint8Array(data));
  }

  protected async downloadObject(key: string): Promise<Uint8Array> {
    this.recordOp('download', key);
    this.downloadCount++;
    this.maybeThrowInjectedError();
    const data = this.objects.get(key);
    if (!data) {
      throw new StoreError(StoreErrorType.KeyNotFound, undefined, {
        key,
      });
    }
    return new Uint8Array(data);
  }

  protected async deleteObject(key: string): Promise<void> {
    this.recordOp('delete', key);
    this.deleteCount++;
    this.maybeThrowInjectedError();
    this.objects.delete(key);
  }

  protected async objectExists(key: string): Promise<boolean> {
    this.recordOp('exists', key);
    this.existsCount++;
    this.maybeThrowInjectedError();
    return this.objects.has(key);
  }

  protected async listObjects(
    prefix: string,
    _maxResults?: number,
  ): Promise<string[]> {
    this.recordOp('list', prefix);
    this.listCount++;
    this.maybeThrowInjectedError();
    return [...this.objects.keys()].filter((k) => k.startsWith(prefix));
  }

  protected isTransientError(error: unknown): boolean {
    return error instanceof TransientTestError;
  }
}
