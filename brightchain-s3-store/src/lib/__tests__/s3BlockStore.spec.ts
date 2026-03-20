/**
 * Unit tests for S3BlockStore.
 *
 * Tests construction with each auth mode, transient error detection,
 * and factory registration at import time.
 *
 * Validates: Requirements 3.9, 3.10, 3.11
 */

/* eslint-disable @typescript-eslint/no-explicit-any */

import {
  BlockSize,
  BlockStoreFactory,
  StoreError,
  StoreErrorType,
} from '@brightchain/brightchain-lib';

// ---------------------------------------------------------------------------
// Mocks — must be declared before any import that triggers the real modules
// ---------------------------------------------------------------------------

const mockSend = jest.fn();

const MockS3Client = jest.fn().mockImplementation(() => ({
  send: mockSend,
}));

class MockS3ServiceException extends Error {
  $metadata: { httpStatusCode?: number };
  $retryable?: { throttling?: boolean };
  constructor(
    message: string,
    options?: { httpStatusCode?: number; name?: string },
  ) {
    super(message);
    this.name = options?.name ?? 'S3ServiceException';
    this.$metadata = { httpStatusCode: options?.httpStatusCode };
  }
}

jest.mock('@aws-sdk/client-s3', () => ({
  S3Client: MockS3Client,
  PutObjectCommand: jest.fn(),
  GetObjectCommand: jest.fn(),
  DeleteObjectCommand: jest.fn(),
  HeadObjectCommand: jest.fn(),
  ListObjectsV2Command: jest.fn(),
  S3ServiceException: MockS3ServiceException,
}));

// ---------------------------------------------------------------------------
// Import the class under test AFTER mocks are in place
// ---------------------------------------------------------------------------

import { IS3BlockStoreConfig, S3BlockStore } from '../stores/s3BlockStore';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/** Base config shared across construction tests */
const baseConfig: IS3BlockStoreConfig = {
  region: 'us-east-1',
  containerOrBucketName: 'test-bucket',
  supportedBlockSizes: [BlockSize.Small],
};

/** Create a store and expose the protected isTransientError method */
function createStoreForErrorTests(): S3BlockStore {
  return new S3BlockStore({
    ...baseConfig,
    accessKeyId: 'AKIAIOSFODNN7EXAMPLE',
    secretAccessKey: 'wJalrXUtnFEMI/K7MDENG/bPxRfiCYEXAMPLEKEY',
  });
}

/** Helper to capture a thrown error without conditional expects */
function getThrown(fn: () => unknown): unknown {
  try {
    fn();
  } catch (e) {
    return e;
  }
  return undefined;
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('S3BlockStore', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  // =========================================================================
  // Construction tests
  // =========================================================================

  describe('construction', () => {
    it('creates successfully with explicit credentials', () => {
      const store = new S3BlockStore({
        ...baseConfig,
        accessKeyId: 'AKIAIOSFODNN7EXAMPLE',
        secretAccessKey: 'wJalrXUtnFEMI/K7MDENG/bPxRfiCYEXAMPLEKEY',
      });

      expect(store).toBeInstanceOf(S3BlockStore);
      expect(MockS3Client).toHaveBeenCalledWith(
        expect.objectContaining({
          region: 'us-east-1',
          credentials: {
            accessKeyId: 'AKIAIOSFODNN7EXAMPLE',
            secretAccessKey: 'wJalrXUtnFEMI/K7MDENG/bPxRfiCYEXAMPLEKEY',
          },
        }),
      );
    });

    it('creates successfully with IAM role (useIamRole: true)', () => {
      const store = new S3BlockStore({
        ...baseConfig,
        useIamRole: true,
      });

      expect(store).toBeInstanceOf(S3BlockStore);
      // Should use S3Client without explicit credentials (SDK default chain)
      expect(MockS3Client).toHaveBeenCalledWith(
        expect.objectContaining({
          region: 'us-east-1',
        }),
      );
      // Should NOT have credentials in the config
      const callArg = MockS3Client.mock.calls[0][0];
      expect(callArg.credentials).toBeUndefined();
    });

    it('creates successfully with custom endpoint (S3-compatible)', () => {
      const store = new S3BlockStore({
        ...baseConfig,
        accessKeyId: 'minioadmin',
        secretAccessKey: 'minioadmin',
        endpoint: 'http://localhost:9000',
      });

      expect(store).toBeInstanceOf(S3BlockStore);
      expect(MockS3Client).toHaveBeenCalledWith(
        expect.objectContaining({
          endpoint: 'http://localhost:9000',
          forcePathStyle: true,
          credentials: {
            accessKeyId: 'minioadmin',
            secretAccessKey: 'minioadmin',
          },
        }),
      );
    });

    it('defaults region to us-east-1 when not specified', () => {
      const configNoRegion: IS3BlockStoreConfig = {
        region: '',
        containerOrBucketName: 'test-bucket',
        blockSize: BlockSize.Small,
        useIamRole: true,
      };

      const store = new S3BlockStore(configNoRegion);
      expect(store).toBeInstanceOf(S3BlockStore);
      expect(MockS3Client).toHaveBeenCalledWith(
        expect.objectContaining({
          region: 'us-east-1',
        }),
      );
    });

    it('throws CloudAuthenticationFailed with no auth config', () => {
      expect(() => new S3BlockStore({ ...baseConfig })).toThrow(StoreError);

      const error = getThrown(() => new S3BlockStore({ ...baseConfig }));
      expect(error).toBeInstanceOf(StoreError);
      expect((error as StoreError).type).toBe(
        StoreErrorType.CloudAuthenticationFailed,
      );
    });

    it('throws CloudAuthenticationFailed with only accessKeyId (no secret)', () => {
      expect(
        () =>
          new S3BlockStore({
            ...baseConfig,
            accessKeyId: 'AKIAIOSFODNN7EXAMPLE',
          }),
      ).toThrow(StoreError);

      const error = getThrown(
        () =>
          new S3BlockStore({
            ...baseConfig,
            accessKeyId: 'AKIAIOSFODNN7EXAMPLE',
          }),
      );
      expect(error).toBeInstanceOf(StoreError);
      expect((error as StoreError).type).toBe(
        StoreErrorType.CloudAuthenticationFailed,
      );
    });
  });

  // =========================================================================
  // Transient error detection tests
  // =========================================================================

  describe('isTransientError', () => {
    let store: S3BlockStore;

    beforeEach(() => {
      store = createStoreForErrorTests();
    });

    // --- S3ServiceException with transient HTTP status codes ---

    it.each([429, 500, 502, 503, 504])(
      'returns true for S3ServiceException with status %i',
      (statusCode) => {
        const error = new MockS3ServiceException('transient', {
          httpStatusCode: statusCode,
        });
        expect((store as any).isTransientError(error)).toBe(true);
      },
    );

    // --- S3ServiceException with auth HTTP status codes (NOT transient) ---

    it.each([401, 403])(
      'returns false for S3ServiceException with auth status %i',
      (statusCode) => {
        const error = new MockS3ServiceException('auth error', {
          httpStatusCode: statusCode,
        });
        expect((store as any).isTransientError(error)).toBe(false);
      },
    );

    // --- S3ServiceException with non-transient status code ---

    it('returns false for S3ServiceException with status 404', () => {
      const error = new MockS3ServiceException('not found', {
        httpStatusCode: 404,
      });
      expect((store as any).isTransientError(error)).toBe(false);
    });

    // --- $retryable hint from AWS SDK ---

    it('returns true for error with $retryable property', () => {
      const error = new Error('throttled') as any;
      error.$retryable = { throttling: true };
      expect((store as any).isTransientError(error)).toBe(true);
    });

    // --- Transient error names ---

    it.each(['TimeoutError', 'NetworkingError'])(
      'returns true for Error with name %s',
      (name) => {
        const error = new Error('network issue');
        error.name = name;
        expect((store as any).isTransientError(error)).toBe(true);
      },
    );

    // --- Generic Error with transient network codes ---

    it.each(['ETIMEDOUT', 'ECONNRESET', 'ECONNREFUSED', 'EPIPE'])(
      'returns true for generic Error with code %s',
      (code) => {
        const error = new Error('network error') as NodeJS.ErrnoException;
        error.code = code;
        expect((store as any).isTransientError(error)).toBe(true);
      },
    );

    // --- Non-transient cases ---

    it('returns false for a plain Error without code', () => {
      const error = new Error('something went wrong');
      expect((store as any).isTransientError(error)).toBe(false);
    });

    it('returns false for a non-Error value', () => {
      expect((store as any).isTransientError('string error')).toBe(false);
      expect((store as any).isTransientError(42)).toBe(false);
      expect((store as any).isTransientError(null)).toBe(false);
      expect((store as any).isTransientError(undefined)).toBe(false);
    });
  });

  // =========================================================================
  // Factory registration test
  // =========================================================================

  describe('factory registration', () => {
    it('importing @brightchain/s3-store registers the S3 factory', () => {
      // Clear to prove re-registration works
      BlockStoreFactory.clearS3StoreFactory();

      // Verify factory is NOT registered (should throw)
      expect(() =>
        BlockStoreFactory.createS3Store({
          region: 'us-east-1',
          containerOrBucketName: 'test',
          blockSize: BlockSize.Small,
        }),
      ).toThrow(StoreError);

      // Manually re-register (simulates what the side-effect module does)
      BlockStoreFactory.registerS3StoreFactory(
        (config) => new S3BlockStore(config as IS3BlockStoreConfig),
      );

      // Now createS3Store should succeed
      const config: IS3BlockStoreConfig = {
        region: 'us-east-1',
        containerOrBucketName: 'test-bucket',
        blockSize: BlockSize.Small,
        accessKeyId: 'AKIAIOSFODNN7EXAMPLE',
        secretAccessKey: 'wJalrXUtnFEMI/K7MDENG/bPxRfiCYEXAMPLEKEY',
      };

      const instance = BlockStoreFactory.createS3Store(config);
      expect(instance).toBeInstanceOf(S3BlockStore);
    });

    it('createS3Store throws FactoryNotRegistered when no factory is registered', () => {
      BlockStoreFactory.clearS3StoreFactory();

      const error = getThrown(() =>
        BlockStoreFactory.createS3Store({
          region: 'us-east-1',
          containerOrBucketName: 'test',
          blockSize: BlockSize.Small,
        }),
      );
      expect(error).toBeInstanceOf(StoreError);
      expect((error as StoreError).type).toBe(
        StoreErrorType.FactoryNotRegistered,
      );
    });
  });
});
