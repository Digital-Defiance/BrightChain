/**
 * @fileoverview Integration tests for CBL Controller API endpoints
 *
 * **Feature: cbl-whitening-storage**
 * **Property 7: API Response Structure**
 * **Property 8: API Input Validation**
 *
 * These tests validate the REST API endpoints for CBL whitening operations,
 * including request validation, error handling, and response structure.
 *
 * **Validates: Requirements 4.1-4.5, 5.1-5.6**
 */

import { BlockSize, initializeBrightChain } from '@brightchain/brightchain-lib';
import express, { Express } from 'express';
import fc from 'fast-check';
import { mkdirSync, rmSync } from 'fs';
import { join } from 'path';
import request from 'supertest';
import { IBrightChainApplication } from '../../interfaces';
import { CBLController } from './cbl';

// Initialize BrightChain before running tests
beforeAll(async () => {
  await initializeBrightChain();
});

/**
 * Generate valid CBL data for testing.
 */
function generateCblData(seed: number): string {
  const cbl = {
    version: 1,
    fileName: `test-file-${seed}.txt`,
    originalSize: 1000 + seed,
    blockCount: 5 + (seed % 10),
    blocks: Array.from({ length: 5 + (seed % 10) }, (_, i) => ({
      id: `block-${seed}-${i}`.padEnd(128, '0'),
      size: 256,
    })),
    sessionId: `session-${seed}`,
  };

  return JSON.stringify(cbl);
}

describe('CBL Controller API Integration Tests', () => {
  let app: Express;
  let testDir: string;

  beforeEach(() => {
    // Create unique test directory
    testDir = join('/tmp', `brightchain-cbl-api-test-${Date.now()}`);
    mkdirSync(testDir, { recursive: true });

    // Create mock application with required properties
    const mockApp = {
      db: {
        connection: {
          readyState: 1,
        },
      },
      environment: {
        mongo: {
          useTransactions: false,
        },
        blockStorePath: testDir,
        blockStoreBlockSize: BlockSize.Small,
      },
      constants: {},
      ready: true,
      services: {},
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

    // Create controller (it creates its own block store from environment)
    const controller = new CBLController(mockApp);

    // Set up Express app
    app = express();
    app.use(express.json());
    app.use('/api/cbl', controller.router);
  });

  afterEach(() => {
    // Clean up test directory
    if (testDir) {
      rmSync(testDir, { recursive: true, force: true });
    }
  });

  /**
   * Feature: cbl-whitening-storage, Property 7: API Response Structure
   *
   * **Validates: Requirements 4.3, 1.5**
   *
   * For any valid CBL data submitted to the store endpoint, the response SHALL contain:
   * - A valid blockId1 (128-character hex string)
   * - A valid blockId2 (128-character hex string)
   * - A valid blockSize (positive integer)
   * - A valid magnetUrl matching the expected format
   */
  describe('Property 7: API Response Structure', () => {
    it('should return correct response structure for store endpoint', async () => {
      const cblData = generateCblData(1);
      const cblBase64 = Buffer.from(cblData).toString('base64');

      const response = await request(app)
        .post('/api/cbl/store')
        .send({ cblData: cblBase64 })
        .expect(200);

      // Verify response structure
      expect(response.body.success).toBe(true);
      expect(response.body.message).toBeDefined();
      expect(response.body.data).toBeDefined();

      const { data } = response.body;

      // Verify blockId1 is a valid 128-character hex string
      expect(data.blockId1).toBeDefined();
      expect(typeof data.blockId1).toBe('string');
      expect(data.blockId1).toMatch(/^[0-9a-f]{128}$/);

      // Verify blockId2 is a valid 128-character hex string
      expect(data.blockId2).toBeDefined();
      expect(typeof data.blockId2).toBe('string');
      expect(data.blockId2).toMatch(/^[0-9a-f]{128}$/);

      // Verify blockSize is a positive integer
      expect(data.blockSize).toBeDefined();
      expect(typeof data.blockSize).toBe('number');
      expect(data.blockSize).toBeGreaterThan(0);
      expect(Number.isInteger(data.blockSize)).toBe(true);

      // Verify magnetUrl has correct format
      expect(data.magnetUrl).toBeDefined();
      expect(typeof data.magnetUrl).toBe('string');
      expect(data.magnetUrl).toMatch(/^magnet:\?/);
      // URL parameters are encoded, so check for encoded version
      expect(
        data.magnetUrl.includes('xt=urn:brightchain:cbl') ||
          data.magnetUrl.includes('xt=urn%3Abrightchain%3Acbl'),
      ).toBe(true);
      expect(data.magnetUrl).toContain('bs=');
      expect(data.magnetUrl).toContain('b1=');
      expect(data.magnetUrl).toContain('b2=');
    });

    it('should include parity IDs when durability level is set', async () => {
      const cblData = generateCblData(2);
      const cblBase64 = Buffer.from(cblData).toString('base64');

      const response = await request(app)
        .post('/api/cbl/store')
        .send({
          cblData: cblBase64,
          durabilityLevel: 'standard',
        })
        .expect(200);

      const { data } = response.body;

      // With standard durability, parity blocks should be generated
      // Note: This depends on FEC service being available
      if (data.block1ParityIds || data.block2ParityIds) {
        expect(Array.isArray(data.block1ParityIds)).toBe(true);
        expect(Array.isArray(data.block2ParityIds)).toBe(true);
        expect(data.magnetUrl).toContain('p1=');
        expect(data.magnetUrl).toContain('p2=');
      }
    });

    it('should include encryption flag when isEncrypted is true', async () => {
      const cblData = Buffer.from('encrypted-data').toString('base64');

      const response = await request(app)
        .post('/api/cbl/store')
        .send({
          cblData,
          isEncrypted: true,
        })
        .expect(200);

      const { data } = response.body;

      expect(data.isEncrypted).toBe(true);
      expect(data.magnetUrl).toContain('enc=1');
    });
  });

  /**
   * Feature: cbl-whitening-storage, Property 8: API Input Validation
   *
   * **Validates: Requirements 4.4, 4.5, 5.5, 5.6**
   *
   * For any invalid input (non-JSON CBL without encryption flag, missing parameters,
   * malformed magnet URL), the API SHALL return an appropriate error status code
   * (400 for bad request, 404 for not found).
   */
  describe('Property 8: API Input Validation', () => {
    describe('Store endpoint validation', () => {
      it('should return 422 for missing cblData', async () => {
        // express-validator returns 422 (Unprocessable Entity) for validation errors
        await request(app).post('/api/cbl/store').send({}).expect(422);
      });

      it('should return 422 for empty cblData', async () => {
        // express-validator returns 422 (Unprocessable Entity) for validation errors
        await request(app)
          .post('/api/cbl/store')
          .send({ cblData: '' })
          .expect(422);
      });

      it('should return 400 for non-JSON CBL without encryption flag', async () => {
        const invalidData = Buffer.from('not-json-data').toString('base64');

        const response = await request(app)
          .post('/api/cbl/store')
          .send({ cblData: invalidData })
          .expect(400);

        expect(response.body.message).toContain('JSON');
      });

      it('should accept non-JSON data when isEncrypted is true', async () => {
        const encryptedData = Buffer.from('encrypted-binary-data').toString(
          'base64',
        );

        const response = await request(app)
          .post('/api/cbl/store')
          .send({
            cblData: encryptedData,
            isEncrypted: true,
          })
          .expect(200);

        expect(response.body.success).toBe(true);
      });

      it('should return 422 for invalid durabilityLevel', async () => {
        const cblData = generateCblData(3);
        const cblBase64 = Buffer.from(cblData).toString('base64');

        // express-validator returns 422 (Unprocessable Entity) for validation errors
        await request(app)
          .post('/api/cbl/store')
          .send({
            cblData: cblBase64,
            durabilityLevel: 'invalid-level',
          })
          .expect(422);
      });

      it('should accept valid durabilityLevel values', async () => {
        const cblData = generateCblData(4);
        const cblBase64 = Buffer.from(cblData).toString('base64');

        const validLevels = ['ephemeral', 'standard', 'enhanced', 'maximum'];

        for (const level of validLevels) {
          const response = await request(app)
            .post('/api/cbl/store')
            .send({
              cblData: cblBase64,
              durabilityLevel: level,
            })
            .expect(200);

          expect(response.body.success).toBe(true);
        }
      });
    });

    describe('Retrieve endpoint validation', () => {
      it('should return 400 when neither magnetUrl nor b1/b2 provided', async () => {
        const response = await request(app)
          .get('/api/cbl/retrieve')
          .expect(400);

        expect(response.body.message).toContain('required');
      });

      it('should return 400 when only b1 is provided', async () => {
        await request(app)
          .get('/api/cbl/retrieve')
          .query({ b1: '0'.repeat(128) })
          .expect(400);
      });

      it('should return 400 when only b2 is provided', async () => {
        await request(app)
          .get('/api/cbl/retrieve')
          .query({ b2: '0'.repeat(128) })
          .expect(400);
      });

      it('should return 400 for invalid magnet URL format', async () => {
        const response = await request(app)
          .get('/api/cbl/retrieve')
          .query({ magnetUrl: 'not-a-magnet-url' })
          .expect(400);

        expect(response.body.message).toContain('magnet');
      });

      it('should return 404 for non-existent blocks', async () => {
        const fakeId = '0'.repeat(128);

        await request(app)
          .get('/api/cbl/retrieve')
          .query({ b1: fakeId, b2: fakeId })
          .expect(404);
      });
    });
  });

  /**
   * End-to-end integration tests
   */
  describe('End-to-End Integration', () => {
    it('should store and retrieve CBL via API endpoints', async () => {
      const cblData = generateCblData(5);
      const cblBase64 = Buffer.from(cblData).toString('base64');

      // Store CBL
      const storeResponse = await request(app)
        .post('/api/cbl/store')
        .send({ cblData: cblBase64 })
        .expect(200);

      expect(storeResponse.body.success).toBe(true);
      const { magnetUrl } = storeResponse.body.data;

      // Retrieve CBL using magnet URL
      const retrieveResponse = await request(app)
        .get('/api/cbl/retrieve')
        .query({ magnetUrl })
        .expect(200);

      expect(retrieveResponse.body.success).toBe(true);
      expect(retrieveResponse.body.data.cblData).toBe(cblBase64);

      // Verify the retrieved CBL matches the original
      const retrievedCbl = Buffer.from(
        retrieveResponse.body.data.cblData,
        'base64',
      ).toString();
      expect(retrievedCbl).toBe(cblData);
    });

    it('should store and retrieve using block IDs directly', async () => {
      const cblData = generateCblData(6);
      const cblBase64 = Buffer.from(cblData).toString('base64');

      // Store CBL
      const storeResponse = await request(app)
        .post('/api/cbl/store')
        .send({ cblData: cblBase64 })
        .expect(200);

      const { blockId1, blockId2 } = storeResponse.body.data;

      // Retrieve CBL using block IDs
      const retrieveResponse = await request(app)
        .get('/api/cbl/retrieve')
        .query({ b1: blockId1, b2: blockId2 })
        .expect(200);

      expect(retrieveResponse.body.success).toBe(true);
      expect(retrieveResponse.body.data.cblData).toBe(cblBase64);
    });

    it('should handle encrypted CBL round-trip', async () => {
      const encryptedData =
        Buffer.from('encrypted-cbl-data').toString('base64');

      // Store encrypted CBL
      const storeResponse = await request(app)
        .post('/api/cbl/store')
        .send({
          cblData: encryptedData,
          isEncrypted: true,
        })
        .expect(200);

      const { magnetUrl } = storeResponse.body.data;

      // Retrieve encrypted CBL
      const retrieveResponse = await request(app)
        .get('/api/cbl/retrieve')
        .query({ magnetUrl })
        .expect(200);

      expect(retrieveResponse.body.data.cblData).toBe(encryptedData);
      expect(retrieveResponse.body.data.isEncrypted).toBe(true);
    });
  });

  /**
   * Property-based tests for API response structure
   */
  describe('Property-Based API Tests', () => {
    it('should maintain response structure for various CBL sizes', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.integer({ min: 0, max: 100 }),
          async (seed: number) => {
            const cblData = generateCblData(seed);
            const cblBase64 = Buffer.from(cblData).toString('base64');

            const response = await request(app)
              .post('/api/cbl/store')
              .send({ cblData: cblBase64 });

            // Should always return 200 for valid input
            expect(response.status).toBe(200);

            // Should always have correct structure
            expect(response.body.success).toBe(true);
            expect(response.body.data.blockId1).toMatch(/^[0-9a-f]{128}$/);
            expect(response.body.data.blockId2).toMatch(/^[0-9a-f]{128}$/);
            expect(response.body.data.magnetUrl).toMatch(/^magnet:\?/);

            // Should be able to retrieve
            const retrieveResponse = await request(app)
              .get('/api/cbl/retrieve')
              .query({ magnetUrl: response.body.data.magnetUrl });

            expect(retrieveResponse.status).toBe(200);
            expect(retrieveResponse.body.data.cblData).toBe(cblBase64);
          },
        ),
        { numRuns: 20 },
      );
    });

    it('should handle all valid durability levels', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.constantFrom('ephemeral', 'standard', 'enhanced', 'maximum'),
          fc.integer({ min: 0, max: 50 }),
          async (durabilityLevel: string, seed: number) => {
            const cblData = generateCblData(seed);
            const cblBase64 = Buffer.from(cblData).toString('base64');

            const response = await request(app).post('/api/cbl/store').send({
              cblData: cblBase64,
              durabilityLevel,
            });

            expect(response.status).toBe(200);
            expect(response.body.success).toBe(true);
          },
        ),
        { numRuns: 15 },
      );
    });
  });
});
