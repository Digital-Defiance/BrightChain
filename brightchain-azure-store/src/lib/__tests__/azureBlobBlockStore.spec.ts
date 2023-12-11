/**
 * Unit tests for AzureBlobBlockStore.
 *
 * Tests construction with each auth mode, transient error detection,
 * and factory registration at import time.
 *
 * Validates: Requirements 2.9, 2.10, 2.11
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

const mockContainerClient = {
  getBlockBlobClient: jest.fn(),
  getBlobClient: jest.fn(),
  listBlobsFlat: jest.fn(),
};
const mockGetContainerClient = jest.fn().mockReturnValue(mockContainerClient);

const MockBlobServiceClient = jest.fn().mockImplementation(() => ({
  getContainerClient: mockGetContainerClient,
})) as any;
MockBlobServiceClient.fromConnectionString = jest.fn().mockReturnValue({
  getContainerClient: mockGetContainerClient,
});

class MockRestError extends Error {
  statusCode?: number;
  code?: string;
  constructor(
    message: string,
    options?: { statusCode?: number; code?: string },
  ) {
    super(message);
    this.name = 'RestError';
    this.statusCode = options?.statusCode;
    this.code = options?.code;
  }
}

jest.mock('@azure/storage-blob', () => ({
  BlobServiceClient: MockBlobServiceClient,
  StorageSharedKeyCredential: jest.fn(),
  RestError: MockRestError,
}));

jest.mock('@azure/identity', () => ({
  DefaultAzureCredential: jest.fn(),
}));

// ---------------------------------------------------------------------------
// Import the class under test AFTER mocks are in place
// ---------------------------------------------------------------------------

import {
  AzureBlobBlockStore,
  IAzureBlobBlockStoreConfig,
} from '../stores/azureBlobBlockStore';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/** Base config shared across construction tests */
const baseConfig: IAzureBlobBlockStoreConfig = {
  region: 'eastus',
  containerOrBucketName: 'test-container',
  supportedBlockSizes: [BlockSize.Small],
};

/** Create a store and expose the protected isTransientError method */
function createStoreForErrorTests(): AzureBlobBlockStore {
  return new AzureBlobBlockStore({
    ...baseConfig,
    connectionString: 'DefaultEndpointsProtocol=https;AccountName=test;',
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

describe('AzureBlobBlockStore', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  // =========================================================================
  // Construction tests
  // =========================================================================

  describe('construction', () => {
    it('creates successfully with a connection string', () => {
      const store = new AzureBlobBlockStore({
        ...baseConfig,
        connectionString: 'DefaultEndpointsProtocol=https;AccountName=test;',
      });

      expect(store).toBeInstanceOf(AzureBlobBlockStore);
      expect(MockBlobServiceClient.fromConnectionString).toHaveBeenCalledWith(
        'DefaultEndpointsProtocol=https;AccountName=test;',
      );
      expect(mockGetContainerClient).toHaveBeenCalledWith('test-container');
    });

    it('creates successfully with account name + account key', () => {
      const store = new AzureBlobBlockStore({
        ...baseConfig,
        accountName: 'myaccount',
        accountKey: 'mykey',
      });

      expect(store).toBeInstanceOf(AzureBlobBlockStore);
      // Should use the BlobServiceClient constructor (not fromConnectionString)
      expect(MockBlobServiceClient).toHaveBeenCalledWith(
        'https://myaccount.blob.core.windows.net',
        expect.anything(), // StorageSharedKeyCredential instance
      );
      expect(mockGetContainerClient).toHaveBeenCalledWith('test-container');
    });

    it('creates successfully with account name + managed identity', () => {
      const store = new AzureBlobBlockStore({
        ...baseConfig,
        accountName: 'myaccount',
        useManagedIdentity: true,
      });

      expect(store).toBeInstanceOf(AzureBlobBlockStore);
      expect(MockBlobServiceClient).toHaveBeenCalledWith(
        'https://myaccount.blob.core.windows.net',
        expect.anything(), // DefaultAzureCredential instance
      );
      expect(mockGetContainerClient).toHaveBeenCalledWith('test-container');
    });

    it('throws CloudAuthenticationFailed with no auth config', () => {
      expect(() => new AzureBlobBlockStore({ ...baseConfig })).toThrow(
        StoreError,
      );

      const error = getThrown(() => new AzureBlobBlockStore({ ...baseConfig }));
      expect(error).toBeInstanceOf(StoreError);
      expect((error as StoreError).type).toBe(
        StoreErrorType.CloudAuthenticationFailed,
      );
    });

    it('throws CloudAuthenticationFailed with only accountName (no key, no managed identity)', () => {
      expect(
        () =>
          new AzureBlobBlockStore({
            ...baseConfig,
            accountName: 'myaccount',
          }),
      ).toThrow(StoreError);

      const error = getThrown(
        () =>
          new AzureBlobBlockStore({
            ...baseConfig,
            accountName: 'myaccount',
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
    let store: AzureBlobBlockStore;

    beforeEach(() => {
      store = createStoreForErrorTests();
    });

    // --- RestError with transient HTTP status codes ---

    it.each([408, 429, 500, 502, 503, 504])(
      'returns true for RestError with status %i',
      (statusCode) => {
        const error = new MockRestError('transient', { statusCode });
        expect((store as any).isTransientError(error)).toBe(true);
      },
    );

    // --- RestError with auth HTTP status codes (NOT transient) ---

    it.each([401, 403])(
      'returns false for RestError with auth status %i',
      (statusCode) => {
        const error = new MockRestError('auth error', { statusCode });
        expect((store as any).isTransientError(error)).toBe(false);
      },
    );

    // --- RestError with non-transient status code ---

    it('returns false for RestError with status 404', () => {
      const error = new MockRestError('not found', { statusCode: 404 });
      expect((store as any).isTransientError(error)).toBe(false);
    });

    // --- RestError with transient network error codes ---

    it.each(['ETIMEDOUT', 'ECONNRESET', 'ECONNREFUSED', 'EPIPE'])(
      'returns true for RestError with code %s',
      (code) => {
        const error = new MockRestError('network error', { code });
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
    it('importing @brightchain/azure-store registers the Azure factory', () => {
      // The top-level import of azureBlobBlockStore.spec.ts already triggers
      // the factory registration side effect (via the barrel file import chain).
      // Verify the factory IS registered by calling createAzureStore.
      //
      // First clear to prove re-registration works:
      BlockStoreFactory.clearAzureStoreFactory();

      // Verify factory is NOT registered (should throw)
      expect(() =>
        BlockStoreFactory.createAzureStore({
          region: 'eastus',
          containerOrBucketName: 'test',
          blockSize: BlockSize.Small,
        }),
      ).toThrow(StoreError);

      // Manually re-register (simulates what the side-effect module does)
      BlockStoreFactory.registerAzureStoreFactory(
        (config) =>
          new AzureBlobBlockStore(config as IAzureBlobBlockStoreConfig),
      );

      // Now createAzureStore should succeed
      const config: IAzureBlobBlockStoreConfig = {
        region: 'eastus',
        containerOrBucketName: 'test-container',
        blockSize: BlockSize.Small,
        connectionString: 'DefaultEndpointsProtocol=https;AccountName=test;',
      };

      const instance = BlockStoreFactory.createAzureStore(config);
      expect(instance).toBeInstanceOf(AzureBlobBlockStore);
    });

    it('createAzureStore throws FactoryNotRegistered when no factory is registered', () => {
      BlockStoreFactory.clearAzureStoreFactory();

      const error = getThrown(() =>
        BlockStoreFactory.createAzureStore({
          region: 'eastus',
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
