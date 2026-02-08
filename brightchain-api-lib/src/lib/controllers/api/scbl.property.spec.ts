/**
 * Property-Based Tests for Super CBL Operations
 *
 * Feature: api-server-operations
 * Property 4: Super CBL Round-Trip with Metadata
 * Property 5: Super CBL Durability Propagation
 *
 * **Validates: Requirements 2.1, 2.2, 2.3, 2.5**
 *
 * Property 4: For any data payload exceeding CBL threshold, storing via POST /api/scbl/store
 * and retrieving via GET /api/scbl/retrieve with the returned magnetUrl SHALL return identical
 * data, and the store response SHALL include valid hierarchyDepth and subCblCount metadata.
 *
 * Property 5: For any Super CBL stored with a specified durabilityLevel, ALL sub-CBLs in the
 * hierarchy SHALL be persisted with that same durability level.
 */

import {
  BlockSize,
  DurabilityLevel,
  initializeBrightChain,
  ServiceLocator,
  ServiceProvider,
} from '@brightchain/brightchain-lib';
import express, { Express } from 'express';
import * as fc from 'fast-check';
import { existsSync, mkdirSync, rmSync } from 'fs';
import { join } from 'path';
import request from 'supertest';
import { IBrightChainApplication } from '../../interfaces';
import { DiskBlockAsyncStore } from '../../stores';
import { SCBLController } from './scbl';

// Test directory for block storage
const TEST_DIR = join(process.cwd(), 'tmp', 'scbl-property-tests');

// Create mock application for testing
const createMockApplication = (storePath: string) => {
  return {
    db: {
      connection: {
        readyState: 1,
      },
    },
    environment: {
      mongo: {
        useTransactions: false,
      },
      debug: false,
      blockStorePath: storePath,
      blockStoreBlockSize: BlockSize.Medium,
    },
    constants: {},
    ready: true,
    services: new Map(),
    plugins: {},
    getModel: () => {
      throw new Error('not implemented');
    },
    getController: () => {
      throw new Error('not implemented');
    },
    setController: () => {},
    start: async () => {},
  } as unknown as IBrightChainApplication;
};

// Helper to create Express app with SCBL controller
const createTestApp = (storePath: string): Express => {
  const mockApp = createMockApplication(storePath);
  const controller = new SCBLController(mockApp);

  const app = express();
  app.use(express.json({ limit: '50mb' }));
  app.use('/api/scbl', controller.router);

  return app;
};

// Helper to clean up test directory
const cleanupTestDir = (dir: string) => {
  if (existsSync(dir)) {
    rmSync(dir, { recursive: true, force: true });
  }
};

// Helper to ensure test directory exists
const ensureTestDir = (dir: string) => {
  if (!existsSync(dir)) {
    mkdirSync(dir, { recursive: true });
  }
};

describe('Super CBL Operations Property Tests', () => {
  beforeAll(() => {
    initializeBrightChain();
    ServiceLocator.setServiceProvider(ServiceProvider.getInstance());
  });

  beforeEach(() => {
    initializeBrightChain();
    ServiceLocator.setServiceProvider(ServiceProvider.getInstance());
  });

  afterAll(() => {
    cleanupTestDir(TEST_DIR);
  });

  describe('Property 4: Super CBL Round-Trip with Metadata', () => {
    /**
     * Property 4a: Small data round-trip (fits in single CBL)
     *
     * For any data payload that fits in a single CBL, storing via POST /api/scbl/store
     * and retrieving via GET /api/scbl/retrieve SHALL return identical data.
     */
    it('Property 4a: Small data round-trip preserves content', async () => {
      await fc.assert(
        fc.asyncProperty(
          // Generate small data that fits in a single CBL
          fc.uint8Array({ minLength: 100, maxLength: 1000 }),
          async (data) => {
            // Feature: api-server-operations, Property 4: Super CBL Round-Trip with Metadata
            const iterTestDir = join(
              TEST_DIR,
              `small-${Date.now()}-${Math.random().toString(36).slice(2)}`,
            );
            ensureTestDir(iterTestDir);

            try {
              initializeBrightChain();
              ServiceLocator.setServiceProvider(ServiceProvider.getInstance());

              const app = createTestApp(iterTestDir);
              const contentBuffer = Buffer.from(data);

              // Store the data via API
              const storeResponse = await request(app)
                .post('/api/scbl/store')
                .send({
                  data: contentBuffer.toString('base64'),
                })
                .expect(200);

              expect(storeResponse.body.success).toBe(true);
              expect(storeResponse.body.magnetUrl).toBeDefined();
              expect(storeResponse.body.metadata).toBeDefined();
              expect(storeResponse.body.metadata.totalSize).toBe(data.length);

              // For small data, hierarchyDepth should be 0 (single CBL)
              expect(storeResponse.body.metadata.hierarchyDepth).toBe(0);
              expect(storeResponse.body.metadata.subCblCount).toBe(0);

              // Retrieve the data via API
              const retrieveResponse = await request(app)
                .get('/api/scbl/retrieve')
                .query({ magnetUrl: storeResponse.body.magnetUrl })
                .expect(200);

              expect(retrieveResponse.body.success).toBe(true);

              const retrievedBuffer = Buffer.from(
                retrieveResponse.body.data,
                'base64',
              );

              // Verify content matches
              expect(retrievedBuffer.equals(contentBuffer)).toBe(true);

              return true;
            } finally {
              cleanupTestDir(iterTestDir);
            }
          },
        ),
        { numRuns: 20 },
      );
    });

    /**
     * Property 4b: Metadata contains valid hierarchyDepth and subCblCount
     *
     * The store response SHALL include valid hierarchyDepth (non-negative integer)
     * and subCblCount (non-negative integer) metadata.
     */
    it('Property 4b: Store response includes valid metadata', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.uint8Array({ minLength: 100, maxLength: 2000 }),
          async (data) => {
            // Feature: api-server-operations, Property 4: Super CBL Round-Trip with Metadata
            const iterTestDir = join(
              TEST_DIR,
              `meta-${Date.now()}-${Math.random().toString(36).slice(2)}`,
            );
            ensureTestDir(iterTestDir);

            try {
              initializeBrightChain();
              ServiceLocator.setServiceProvider(ServiceProvider.getInstance());

              const app = createTestApp(iterTestDir);

              const storeResponse = await request(app)
                .post('/api/scbl/store')
                .send({
                  data: Buffer.from(data).toString('base64'),
                })
                .expect(200);

              const metadata = storeResponse.body.metadata;

              // Verify metadata structure
              expect(typeof metadata.hierarchyDepth).toBe('number');
              expect(metadata.hierarchyDepth).toBeGreaterThanOrEqual(0);

              expect(typeof metadata.subCblCount).toBe('number');
              expect(metadata.subCblCount).toBeGreaterThanOrEqual(0);

              expect(typeof metadata.totalSize).toBe('number');
              expect(metadata.totalSize).toBe(data.length);

              expect(Array.isArray(metadata.rootBlockIds)).toBe(true);
              expect(metadata.rootBlockIds.length).toBe(2); // Two blocks for XOR whitening

              // Verify consistency: if hierarchyDepth is 0, subCblCount should be 0
              if (metadata.hierarchyDepth === 0) {
                expect(metadata.subCblCount).toBe(0);
              }

              // Verify consistency: if subCblCount > 0, hierarchyDepth should be >= 1
              if (metadata.subCblCount > 0) {
                expect(metadata.hierarchyDepth).toBeGreaterThanOrEqual(1);
              }

              return true;
            } finally {
              cleanupTestDir(iterTestDir);
            }
          },
        ),
        { numRuns: 20 },
      );
    });

    /**
     * Property 4c: Round-trip with encryption flag
     *
     * When storing with isEncrypted=true, the retrieve response SHALL
     * indicate isEncrypted=true.
     */
    it('Property 4c: Encryption flag is preserved in round-trip', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.uint8Array({ minLength: 100, maxLength: 500 }),
          fc.boolean(),
          async (data, isEncrypted) => {
            // Feature: api-server-operations, Property 4: Super CBL Round-Trip with Metadata
            const iterTestDir = join(
              TEST_DIR,
              `enc-${Date.now()}-${Math.random().toString(36).slice(2)}`,
            );
            ensureTestDir(iterTestDir);

            try {
              initializeBrightChain();
              ServiceLocator.setServiceProvider(ServiceProvider.getInstance());

              const app = createTestApp(iterTestDir);

              const storeResponse = await request(app)
                .post('/api/scbl/store')
                .send({
                  data: Buffer.from(data).toString('base64'),
                  isEncrypted,
                })
                .expect(200);

              const retrieveResponse = await request(app)
                .get('/api/scbl/retrieve')
                .query({ magnetUrl: storeResponse.body.magnetUrl })
                .expect(200);

              expect(retrieveResponse.body.isEncrypted).toBe(isEncrypted);

              return true;
            } finally {
              cleanupTestDir(iterTestDir);
            }
          },
        ),
        { numRuns: 20 },
      );
    });
  });

  describe('Property 5: Super CBL Durability Propagation', () => {
    /**
     * Property 5a: Durability level is accepted for all valid values
     *
     * For any valid durability level, the store operation SHALL succeed.
     */
    it('Property 5a: All durability levels are accepted', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.uint8Array({ minLength: 100, maxLength: 500 }),
          fc.constantFrom('ephemeral', 'standard', 'enhanced', 'maximum'),
          async (data, durabilityLevel) => {
            // Feature: api-server-operations, Property 5: Super CBL Durability Propagation
            const iterTestDir = join(
              TEST_DIR,
              `dur-${Date.now()}-${Math.random().toString(36).slice(2)}`,
            );
            ensureTestDir(iterTestDir);

            try {
              initializeBrightChain();
              ServiceLocator.setServiceProvider(ServiceProvider.getInstance());

              const app = createTestApp(iterTestDir);

              const storeResponse = await request(app)
                .post('/api/scbl/store')
                .send({
                  data: Buffer.from(data).toString('base64'),
                  durabilityLevel,
                })
                .expect(200);

              expect(storeResponse.body.success).toBe(true);

              // Verify data can be retrieved
              const retrieveResponse = await request(app)
                .get('/api/scbl/retrieve')
                .query({ magnetUrl: storeResponse.body.magnetUrl })
                .expect(200);

              expect(retrieveResponse.body.success).toBe(true);

              return true;
            } finally {
              cleanupTestDir(iterTestDir);
            }
          },
        ),
        { numRuns: 20 },
      );
    });

    /**
     * Property 5b: Durability level propagates to stored blocks
     *
     * For any Super CBL stored with a specified durabilityLevel, the blocks
     * SHALL be stored with that durability level (verified via metadata).
     */
    it('Property 5b: Durability level is applied to stored blocks', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.uint8Array({ minLength: 100, maxLength: 500 }),
          fc.constantFrom('ephemeral', 'standard', 'enhanced', 'maximum'),
          async (data, durabilityLevel) => {
            // Feature: api-server-operations, Property 5: Super CBL Durability Propagation
            const iterTestDir = join(
              TEST_DIR,
              `durprop-${Date.now()}-${Math.random().toString(36).slice(2)}`,
            );
            ensureTestDir(iterTestDir);

            try {
              initializeBrightChain();
              ServiceLocator.setServiceProvider(ServiceProvider.getInstance());

              const app = createTestApp(iterTestDir);

              const storeResponse = await request(app)
                .post('/api/scbl/store')
                .send({
                  data: Buffer.from(data).toString('base64'),
                  durabilityLevel,
                })
                .expect(200);

              // Verify blocks were stored by checking they can be retrieved
              const rootBlockIds = storeResponse.body.metadata.rootBlockIds;
              expect(rootBlockIds.length).toBe(2);

              // Create a block store to verify metadata
              const blockStore = new DiskBlockAsyncStore({
                storePath: iterTestDir,
                blockSize: BlockSize.Medium,
              });

              // Map durability level string to enum
              const durabilityMap: Record<string, DurabilityLevel> = {
                ephemeral: DurabilityLevel.Ephemeral,
                standard: DurabilityLevel.Standard,
                enhanced: DurabilityLevel.HighDurability,
                maximum: DurabilityLevel.HighDurability,
              };
              const expectedDurability = durabilityMap[durabilityLevel];

              // Check metadata for each root block
              for (const blockId of rootBlockIds) {
                const metadata = await blockStore.getMetadata(blockId);
                expect(metadata).not.toBeNull();
                if (metadata) {
                  expect(metadata.durabilityLevel).toBe(expectedDurability);
                }
              }

              return true;
            } finally {
              cleanupTestDir(iterTestDir);
            }
          },
        ),
        { numRuns: 20 },
      );
    });

    /**
     * Property 5c: Default durability level is Standard
     *
     * When no durability level is specified, the default SHALL be Standard.
     */
    it('Property 5c: Default durability level is Standard', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.uint8Array({ minLength: 100, maxLength: 500 }),
          async (data) => {
            // Feature: api-server-operations, Property 5: Super CBL Durability Propagation
            const iterTestDir = join(
              TEST_DIR,
              `default-${Date.now()}-${Math.random().toString(36).slice(2)}`,
            );
            ensureTestDir(iterTestDir);

            try {
              initializeBrightChain();
              ServiceLocator.setServiceProvider(ServiceProvider.getInstance());

              const app = createTestApp(iterTestDir);

              // Store without specifying durability level
              const storeResponse = await request(app)
                .post('/api/scbl/store')
                .send({
                  data: Buffer.from(data).toString('base64'),
                  // No durabilityLevel specified
                })
                .expect(200);

              // Verify blocks have Standard durability
              const blockStore = new DiskBlockAsyncStore({
                storePath: iterTestDir,
                blockSize: BlockSize.Medium,
              });

              const rootBlockIds = storeResponse.body.metadata.rootBlockIds;
              for (const blockId of rootBlockIds) {
                const metadata = await blockStore.getMetadata(blockId);
                expect(metadata).not.toBeNull();
                if (metadata) {
                  expect(metadata.durabilityLevel).toBe(
                    DurabilityLevel.Standard,
                  );
                }
              }

              return true;
            } finally {
              cleanupTestDir(iterTestDir);
            }
          },
        ),
        { numRuns: 10 },
      );
    });
  });
});
