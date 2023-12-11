/**
 * @fileoverview Unit tests for computeWorkUnit().
 *
 * Validates: Requirements 7.2, 7.3, 7.4, 7.5
 *
 * Tests cover:
 * - LeafHash operation with known input/output
 * - InteriorHash operation with known child hashes
 * - Progress callback invocation
 * - Result fields are correctly populated
 * - No progress callback (no errors)
 */

import { DifficultyTier } from '../../enumerations/difficultyTier';
import { IWorkUnit, WorkUnitOperation } from '../../interfaces/pouw/workUnit';
import { ChecksumService } from '../../services/checksum.service';
import { computeWorkUnit } from '../computeWorkUnit';

describe('computeWorkUnit()', () => {
  const checksumService = new ChecksumService();

  /**
   * Helper to build a minimal IWorkUnit for testing.
   */
  function makeWorkUnit(overrides: Partial<IWorkUnit> = {}): IWorkUnit {
    return {
      id: 'unit-001',
      treeId: 'tree-001',
      treeLevel: 0,
      treeIndex: 0,
      operation: WorkUnitOperation.LeafHash,
      inputData: '',
      childCount: 0,
      difficulty: DifficultyTier.Low,
      challengeToken: 'challenge-token-abc',
      createdAt: new Date().toISOString(),
      expiresAt: new Date(Date.now() + 60_000).toISOString(),
      ...overrides,
    };
  }

  describe('LeafHash with known input', () => {
    it('should produce a SHA3-512 hash matching ChecksumService for "Hello BrightChain!"', async () => {
      // Encode "Hello BrightChain!" as base64
      const inputString = 'Hello BrightChain!';
      const inputBytes = new TextEncoder().encode(inputString);
      const base64Input = Buffer.from(inputBytes).toString('base64');

      const workUnit = makeWorkUnit({
        operation: WorkUnitOperation.LeafHash,
        inputData: base64Input,
      });

      const result = await computeWorkUnit(workUnit);

      // Compute expected hash using ChecksumService
      const expectedChecksum = checksumService.calculateChecksum(inputBytes);
      const expectedHex = expectedChecksum.toHex();

      expect(result.resultHash).toBe(expectedHex);
      expect(result.resultHash).toHaveLength(128);
      expect(result.resultHash).toMatch(/^[0-9a-f]{128}$/);
    });
  });

  describe('InteriorHash with known child hashes', () => {
    it('should produce a SHA3-512 hash of the concatenated child hashes', async () => {
      // Create two known 64-byte "child hashes" (filled with distinct byte values)
      const childHash1 = new Uint8Array(64).fill(0xaa);
      const childHash2 = new Uint8Array(64).fill(0xbb);

      // Concatenate the two child hashes
      const concatenated = new Uint8Array(128);
      concatenated.set(childHash1, 0);
      concatenated.set(childHash2, 64);

      // Base64-encode the concatenation for the work unit
      const base64Input = Buffer.from(concatenated).toString('base64');

      const workUnit = makeWorkUnit({
        operation: WorkUnitOperation.InteriorHash,
        inputData: base64Input,
        childCount: 2,
      });

      const result = await computeWorkUnit(workUnit);

      // Compute expected hash: SHA3-512 of the concatenated child hashes
      const expectedChecksum = checksumService.calculateChecksum(concatenated);
      const expectedHex = expectedChecksum.toHex();

      expect(result.resultHash).toBe(expectedHex);
      expect(result.resultHash).toHaveLength(128);
      expect(result.resultHash).toMatch(/^[0-9a-f]{128}$/);
    });
  });

  describe('Progress callback invocation', () => {
    it('should call the progress callback exactly twice: (0, 1) then (1, 1)', async () => {
      const base64Input = Buffer.from('test data').toString('base64');
      const workUnit = makeWorkUnit({ inputData: base64Input });

      const onProgress = jest.fn();

      await computeWorkUnit(workUnit, onProgress);

      expect(onProgress).toHaveBeenCalledTimes(2);
      expect(onProgress).toHaveBeenNthCalledWith(1, 0, 1);
      expect(onProgress).toHaveBeenNthCalledWith(2, 1, 1);
    });
  });

  describe('Result fields populated correctly', () => {
    it('should return an IWorkResult with all fields correctly set', async () => {
      const base64Input = Buffer.from('field check').toString('base64');
      const workUnit = makeWorkUnit({
        id: 'unit-field-check',
        challengeToken: 'token-field-check',
        inputData: base64Input,
      });

      const beforeMs = Date.now();
      const result = await computeWorkUnit(workUnit);
      const afterMs = Date.now();

      // workUnitId matches the input work unit's id
      expect(result.workUnitId).toBe('unit-field-check');

      // resultHash is a 128-char lowercase hex string
      expect(result.resultHash).toHaveLength(128);
      expect(result.resultHash).toMatch(/^[0-9a-f]{128}$/);

      // challengeToken matches the input work unit's challengeToken
      expect(result.challengeToken).toBe('token-field-check');

      // computeTimeMs is a non-negative number
      expect(typeof result.computeTimeMs).toBe('number');
      expect(result.computeTimeMs).toBeGreaterThanOrEqual(0);

      // completedAt is a valid ISO 8601 date string
      const completedDate = new Date(result.completedAt);
      expect(completedDate.toISOString()).toBe(result.completedAt);
      // The completedAt timestamp should be within the test execution window
      expect(completedDate.getTime()).toBeGreaterThanOrEqual(beforeMs);
      expect(completedDate.getTime()).toBeLessThanOrEqual(afterMs + 1000);
    });
  });

  describe('No progress callback', () => {
    it('should complete without errors when no callback is provided', async () => {
      const base64Input = Buffer.from('no callback').toString('base64');
      const workUnit = makeWorkUnit({ inputData: base64Input });

      // Should not throw
      const result = await computeWorkUnit(workUnit);

      // Basic sanity: result should still be valid
      expect(result.resultHash).toHaveLength(128);
      expect(result.workUnitId).toBe('unit-001');
    });
  });
});
