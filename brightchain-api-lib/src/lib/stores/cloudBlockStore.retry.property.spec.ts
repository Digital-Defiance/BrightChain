/**
 * Feature: cloud-block-store-drivers, Properties 8, 9, 10, 14
 *
 * Property 8: Transient error retry behavior
 * For any cloud store operation and any transient error, the withRetry mechanism
 * should invoke the operation exactly maxRetries + 1 times (1 initial + 3 retries)
 * before propagating the error.
 *
 * Property 9: Non-transient error immediate propagation
 * For any cloud store operation and any non-transient error, the operation should
 * be invoked exactly once (no retries) and the error should propagate immediately.
 *
 * Property 10: Authentication error classification
 * For any cloud store operation that fails due to invalid or expired credentials,
 * the error should propagate without retry (auth errors are non-transient).
 * Note: The current CloudBlockStoreBase.withRetry wraps all errors as
 * CloudOperationFailed. Auth errors are non-transient so they get 1 attempt only.
 *
 * Property 14: Error structure completeness
 * For any cloud store operation that fails after all retries, the thrown StoreError
 * should contain the operation name, the block checksum, and the original cloud SDK
 * error message in its params.
 *
 * **Validates: Requirements 2.10, 2.11, 3.10, 3.11, 9.1–9.6**
 */
import {
  BlockSize,
  ICloudBlockStoreConfig,
  initializeBrightChain,
  RawDataBlock,
  ServiceLocator,
  ServiceProvider,
  StoreError,
  StoreErrorType,
} from '@brightchain/brightchain-lib';
import { beforeAll, describe, expect, it } from '@jest/globals';
import * as fc from 'fast-check';
import { MockCloudBlockStore } from './__tests__/helpers/mockCloudBlockStore';

/**
 * Fast-retry MockCloudBlockStore that eliminates the exponential backoff delay.
 * The retry logic (attempt counting, transient vs non-transient classification,
 * error wrapping) is preserved — only the sleep is removed.
 */
class FastRetryMockCloudBlockStore extends MockCloudBlockStore {
  protected override async withRetry<T>(
    operation: string,
    blockChecksum: string,
    fn: () => Promise<T>,
    maxRetries = 3,
  ): Promise<T> {
    let lastError: unknown;
    for (let attempt = 0; attempt <= maxRetries; attempt++) {
      try {
        return await fn();
      } catch (error) {
        lastError = error;
        if (!this.isTransientError(error) || attempt === maxRetries) {
          break;
        }
        // No delay — skip the exponential backoff sleep for test speed
      }
    }
    throw new StoreError(StoreErrorType.CloudOperationFailed, undefined, {
      operation,
      blockChecksum,
      originalError: String(lastError),
    });
  }
}

/**
 * Block sizes suitable for property testing — smaller sizes for speed.
 */
const testBlockSizes: BlockSize[] = [
  BlockSize.Message, // 512 bytes
  BlockSize.Tiny, // 1024 bytes
  BlockSize.Small, // 4096 bytes
];

const arbBlockSize: fc.Arbitrary<BlockSize> = fc.constantFrom(
  ...testBlockSizes,
);

const arbBlockSizeAndData: fc.Arbitrary<[BlockSize, Uint8Array]> =
  arbBlockSize.chain((blockSize) =>
    fc
      .uint8Array({ minLength: blockSize, maxLength: blockSize })
      .map((data) => [blockSize, data] as [BlockSize, Uint8Array]),
  );

function createStore(blockSize: BlockSize): FastRetryMockCloudBlockStore {
  const config: ICloudBlockStoreConfig = {
    region: 'test-region',
    containerOrBucketName: 'test-bucket',
    blockSize,
  };
  return new FastRetryMockCloudBlockStore(config);
}

// Feature: cloud-block-store-drivers, Properties 8, 9, 10, 14
describe('Properties 8, 9, 10, 14: Retry behavior and error handling', () => {
  beforeAll(() => {
    initializeBrightChain();
    ServiceLocator.setServiceProvider(ServiceProvider.getInstance());
  });

  // =========================================================================
  // Property 8: Transient error retry behavior
  // **Validates: Requirements 2.10, 3.10, 9.3, 9.4**
  // =========================================================================
  describe('Property 8: Transient error retry behavior', () => {
    it('has() retries exactly maxRetries+1 times (4 total) on persistent transient errors', async () => {
      await fc.assert(
        fc.asyncProperty(arbBlockSizeAndData, async ([blockSize, data]) => {
          const store = createStore(blockSize);
          const block = new RawDataBlock(blockSize, data);

          // Store the block first so the key exists
          await store.setData(block);

          // Reset counters after the successful store
          store.existsCount = 0;
          store.operationLog.length = 0;

          // Inject more transient errors than maxRetries+1 (4) so all attempts fail
          store.injectTransientError(10);

          // has() calls objectExists through withRetry with maxRetries=3
          // So it should attempt 1 initial + 3 retries = 4 total before failing
          let threw = false;
          try {
            await store.has(block.idChecksum);
          } catch (err) {
            threw = true;
            expect(err).toBeInstanceOf(StoreError);
          }
          expect(threw).toBe(true);

          // objectExists should have been called exactly 4 times
          expect(store.existsCount).toBe(4);
        }),
        { numRuns: 100 },
      );
    });

    it('getData() retries exactly maxRetries+1 times on persistent transient errors', async () => {
      await fc.assert(
        fc.asyncProperty(arbBlockSizeAndData, async ([blockSize, data]) => {
          const store = createStore(blockSize);
          const block = new RawDataBlock(blockSize, data);

          await store.setData(block);

          store.downloadCount = 0;
          store.operationLog.length = 0;

          store.injectTransientError(10);

          let threw = false;
          try {
            await store.getData(block.idChecksum);
          } catch (err) {
            threw = true;
            expect(err).toBeInstanceOf(StoreError);
          }
          expect(threw).toBe(true);

          // downloadObject should have been called exactly 4 times
          expect(store.downloadCount).toBe(4);
        }),
        { numRuns: 100 },
      );
    });

    it('operation succeeds if transient errors clear before maxRetries exhausted', async () => {
      await fc.assert(
        fc.asyncProperty(arbBlockSizeAndData, async ([blockSize, data]) => {
          const store = createStore(blockSize);
          const block = new RawDataBlock(blockSize, data);

          await store.setData(block);

          store.existsCount = 0;

          // Inject only 2 transient errors — 3rd attempt should succeed
          store.injectTransientError(2);

          const result = await store.has(block.idChecksum);
          expect(result).toBe(true);

          // 2 failed + 1 success = 3 total calls
          expect(store.existsCount).toBe(3);
        }),
        { numRuns: 100 },
      );
    });
  });

  // =========================================================================
  // Property 9: Non-transient error immediate propagation
  // **Validates: Requirements 2.11, 3.11**
  // =========================================================================
  describe('Property 9: Non-transient error immediate propagation', () => {
    it('has() fails immediately with no retries on non-transient error', async () => {
      await fc.assert(
        fc.asyncProperty(arbBlockSizeAndData, async ([blockSize, data]) => {
          const store = createStore(blockSize);
          const block = new RawDataBlock(blockSize, data);

          await store.setData(block);

          store.existsCount = 0;
          store.operationLog.length = 0;

          store.injectNonTransientError();

          let threw = false;
          try {
            await store.has(block.idChecksum);
          } catch (err) {
            threw = true;
            expect(err).toBeInstanceOf(StoreError);
          }
          expect(threw).toBe(true);

          // Should have been called exactly once — no retries
          expect(store.existsCount).toBe(1);
        }),
        { numRuns: 100 },
      );
    });

    it('getData() fails immediately with no retries on non-transient error', async () => {
      await fc.assert(
        fc.asyncProperty(arbBlockSizeAndData, async ([blockSize, data]) => {
          const store = createStore(blockSize);
          const block = new RawDataBlock(blockSize, data);

          await store.setData(block);

          store.downloadCount = 0;
          store.operationLog.length = 0;

          store.injectNonTransientError();

          let threw = false;
          try {
            await store.getData(block.idChecksum);
          } catch (err) {
            threw = true;
            expect(err).toBeInstanceOf(StoreError);
          }
          expect(threw).toBe(true);

          // Exactly 1 attempt, no retries
          expect(store.downloadCount).toBe(1);
        }),
        { numRuns: 100 },
      );
    });
  });

  // =========================================================================
  // Property 10: Authentication error classification
  // **Validates: Requirements 9.5, 9.6**
  //
  // Auth errors are non-transient in the mock (AuthenticationTestError is not
  // a TransientTestError), so they propagate without retry (1 attempt).
  // The current withRetry wraps all errors as CloudOperationFailed.
  // This test verifies: no retry + error is a StoreError with the auth error
  // message preserved in params.originalError.
  // =========================================================================
  describe('Property 10: Authentication error classification', () => {
    it('auth error propagates without retry (1 attempt) and is wrapped as StoreError', async () => {
      await fc.assert(
        fc.asyncProperty(arbBlockSizeAndData, async ([blockSize, data]) => {
          const store = createStore(blockSize);
          const block = new RawDataBlock(blockSize, data);

          await store.setData(block);

          store.existsCount = 0;
          store.operationLog.length = 0;

          store.injectAuthError();

          let caughtError: StoreError | undefined;
          try {
            await store.has(block.idChecksum);
          } catch (err) {
            caughtError = err as StoreError;
          }

          expect(caughtError).toBeInstanceOf(StoreError);
          // Auth errors are non-transient, so only 1 attempt
          expect(store.existsCount).toBe(1);

          // The original AuthenticationTestError message should be in params
          expect(caughtError!.params).toBeDefined();
          expect(caughtError!.params!['originalError']).toContain(
            'Authentication test error',
          );
        }),
        { numRuns: 100 },
      );
    });

    it('auth error on getData propagates without retry', async () => {
      await fc.assert(
        fc.asyncProperty(arbBlockSizeAndData, async ([blockSize, data]) => {
          const store = createStore(blockSize);
          const block = new RawDataBlock(blockSize, data);

          await store.setData(block);

          store.downloadCount = 0;

          store.injectAuthError();

          let caughtError: StoreError | undefined;
          try {
            await store.getData(block.idChecksum);
          } catch (err) {
            caughtError = err as StoreError;
          }

          expect(caughtError).toBeInstanceOf(StoreError);
          expect(store.downloadCount).toBe(1);
          expect(caughtError!.params!['originalError']).toContain(
            'Authentication test error',
          );
        }),
        { numRuns: 100 },
      );
    });
  });

  // =========================================================================
  // Property 14: Error structure completeness
  // **Validates: Requirements 9.1, 9.2**
  //
  // After transient errors exhaust all retries, the thrown StoreError should
  // contain params with: operation, blockChecksum, and originalError.
  // =========================================================================
  describe('Property 14: Error structure completeness', () => {
    it('StoreError from has() contains operation, blockChecksum, and originalError', async () => {
      await fc.assert(
        fc.asyncProperty(arbBlockSizeAndData, async ([blockSize, data]) => {
          const store = createStore(blockSize);
          const block = new RawDataBlock(blockSize, data);

          await store.setData(block);

          store.existsCount = 0;
          store.injectTransientError(10);

          let caughtError: StoreError | undefined;
          try {
            await store.has(block.idChecksum);
          } catch (err) {
            caughtError = err as StoreError;
          }

          expect(caughtError).toBeInstanceOf(StoreError);
          expect(caughtError!.type).toBe(StoreErrorType.CloudOperationFailed);

          const params = caughtError!.params!;
          // Must contain operation name
          expect(params['operation']).toBe('has');
          // Must contain the block checksum (hex string)
          expect(typeof params['blockChecksum']).toBe('string');
          expect((params['blockChecksum'] as string).length).toBeGreaterThan(0);
          // Must contain the original error message
          expect(typeof params['originalError']).toBe('string');
          expect((params['originalError'] as string).length).toBeGreaterThan(0);
          expect(params['originalError']).toContain('Transient test error');
        }),
        { numRuns: 100 },
      );
    });

    it('StoreError from getData() contains operation, blockChecksum, and originalError', async () => {
      await fc.assert(
        fc.asyncProperty(arbBlockSizeAndData, async ([blockSize, data]) => {
          const store = createStore(blockSize);
          const block = new RawDataBlock(blockSize, data);

          await store.setData(block);

          store.downloadCount = 0;
          store.injectTransientError(10);

          let caughtError: StoreError | undefined;
          try {
            await store.getData(block.idChecksum);
          } catch (err) {
            caughtError = err as StoreError;
          }

          expect(caughtError).toBeInstanceOf(StoreError);
          expect(caughtError!.type).toBe(StoreErrorType.CloudOperationFailed);

          const params = caughtError!.params!;
          expect(params['operation']).toBe('getData');
          expect(typeof params['blockChecksum']).toBe('string');
          expect((params['blockChecksum'] as string).length).toBeGreaterThan(0);
          expect(typeof params['originalError']).toBe('string');
          expect(params['originalError']).toContain('Transient test error');
        }),
        { numRuns: 100 },
      );
    });

    it('StoreError from non-transient error also has complete params', async () => {
      await fc.assert(
        fc.asyncProperty(arbBlockSizeAndData, async ([blockSize, data]) => {
          const store = createStore(blockSize);
          const block = new RawDataBlock(blockSize, data);

          await store.setData(block);

          store.injectNonTransientError();

          let caughtError: StoreError | undefined;
          try {
            await store.has(block.idChecksum);
          } catch (err) {
            caughtError = err as StoreError;
          }

          expect(caughtError).toBeInstanceOf(StoreError);
          const params = caughtError!.params!;
          expect(params['operation']).toBe('has');
          expect(typeof params['blockChecksum']).toBe('string');
          expect(params['originalError']).toContain(
            'Non-transient test error',
          );
        }),
        { numRuns: 100 },
      );
    });
  });
});
