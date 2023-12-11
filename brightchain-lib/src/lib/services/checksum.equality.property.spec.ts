/* eslint-disable @typescript-eslint/no-explicit-any */
/**
 * @fileoverview Property-based tests for checksum equality
 *
 * **Feature: test-failure-fixes, Property 2: Checksum Equality is Reflexive and Symmetric**
 * **Validates: Requirements 1.3**
 *
 * This test suite verifies that checksum equality operations satisfy
 * reflexive and symmetric properties, which are fundamental requirements
 * for any equality comparison.
 */

import { Checksum } from '../types/checksum';
import { ChecksumService } from './checksum.service';
import { ServiceProvider } from './service.provider';

describe('Checksum Equality Property Tests', () => {
  let checksumService: ChecksumService;

  beforeEach(() => {
    checksumService = ServiceProvider.getInstance().checksumService;
  });

  describe('Property 2: Checksum Equality is Reflexive and Symmetric', () => {
    /**
     * Property: For any two checksums A and B:
     * - Reflexive: A equals A (every checksum equals itself)
     * - Symmetric: If A equals B, then B equals A
     *
     * These are fundamental properties that any equality operation must satisfy.
     */

    it('should satisfy reflexive property: every checksum equals itself', () => {
      // Generate multiple checksums from different data
      const testCases = [
        Buffer.from('hello world'),
        Buffer.from(''),
        Buffer.alloc(1024, 'A'),
        Buffer.from([0x00, 0x01, 0x02, 0x03]),
        Buffer.alloc(64 * 1024, 0xff),
        Buffer.from('The quick brown fox jumps over the lazy dog'),
        Buffer.from([0xff, 0xfe, 0xfd, 0xfc]),
        Buffer.alloc(100, 0x00),
      ];

      for (const testData of testCases) {
        const checksum = checksumService.calculateChecksum(testData);

        // Reflexive property: checksum should equal itself
        expect(checksumService.compareChecksums(checksum, checksum)).toBe(true);

        // Also test with the equals method if available
        if (typeof (checksum as any).equals === 'function') {
          expect((checksum as any).equals(checksum)).toBe(true);
        }
      }
    });

    it('should satisfy symmetric property: if A equals B, then B equals A', () => {
      // Generate test cases where we create identical checksums
      const testCases = [
        Buffer.from('test data 1'),
        Buffer.from('test data 2'),
        Buffer.from(''),
        Buffer.alloc(512, 'X'),
        Buffer.from([0x12, 0x34, 0x56, 0x78]),
      ];

      for (const testData of testCases) {
        // Create two checksums from the same data
        const checksumA = checksumService.calculateChecksum(testData);
        const checksumB = checksumService.calculateChecksum(testData);

        // Symmetric property: if A equals B, then B equals A
        const aEqualsB = checksumService.compareChecksums(checksumA, checksumB);
        const bEqualsA = checksumService.compareChecksums(checksumB, checksumA);

        expect(aEqualsB).toBe(bEqualsA);
        expect(aEqualsB).toBe(true); // They should be equal since they're from the same data

        // Also test with the equals method if available
        if (typeof (checksumA as any).equals === 'function') {
          const aEqualsBMethod = (checksumA as any).equals(checksumB);
          const bEqualsAMethod = (checksumB as any).equals(checksumA);
          expect(aEqualsBMethod).toBe(bEqualsAMethod);
          expect(aEqualsBMethod).toBe(true);
        }
      }
    });

    it('should satisfy symmetric property for different checksums', () => {
      // Test symmetric property with different checksums
      const testCases = [
        { data1: Buffer.from('hello'), data2: Buffer.from('world') },
        { data1: Buffer.from(''), data2: Buffer.from('non-empty') },
        { data1: Buffer.alloc(100, 'A'), data2: Buffer.alloc(100, 'B') },
        { data1: Buffer.from([0x00]), data2: Buffer.from([0xff]) },
      ];

      for (const { data1, data2 } of testCases) {
        const checksumA = checksumService.calculateChecksum(data1);
        const checksumB = checksumService.calculateChecksum(data2);

        // Symmetric property: if A equals B, then B equals A
        // (In this case, they should not be equal, but the property still holds)
        const aEqualsB = checksumService.compareChecksums(checksumA, checksumB);
        const bEqualsA = checksumService.compareChecksums(checksumB, checksumA);

        expect(aEqualsB).toBe(bEqualsA);
        expect(aEqualsB).toBe(false); // They should not be equal since they're from different data

        // Also test with the equals method if available
        if (typeof (checksumA as any).equals === 'function') {
          const aEqualsBMethod = (checksumA as any).equals(checksumB);
          const bEqualsAMethod = (checksumB as any).equals(checksumA);
          expect(aEqualsBMethod).toBe(bEqualsAMethod);
          expect(aEqualsBMethod).toBe(false);
        }
      }
    });

    it('should handle edge case: comparing checksum with itself after conversion', () => {
      const testData = Buffer.from('edge case test');
      const checksum = checksumService.calculateChecksum(testData);

      // Convert to Buffer and back
      const asBuffer = checksum.toBuffer();
      const converted = Checksum.fromBuffer(asBuffer);

      // Reflexive property should still hold after conversion
      expect(converted.equals(converted)).toBe(true);

      // Symmetric property: original and converted should be equal
      expect(checksum.equals(converted)).toBe(converted.equals(checksum));
    });

    it('should maintain equality properties across multiple checksums', () => {
      // Generate multiple checksums and verify all equality properties
      const testData = [
        Buffer.from('data1'),
        Buffer.from('data2'),
        Buffer.from('data3'),
      ];

      const checksums = testData.map((data) =>
        checksumService.calculateChecksum(data),
      );

      // Test reflexive property for all checksums
      for (const checksum of checksums) {
        expect(checksumService.compareChecksums(checksum, checksum)).toBe(true);
      }

      // Test symmetric property for all pairs
      for (let i = 0; i < checksums.length; i++) {
        for (let j = 0; j < checksums.length; j++) {
          const aEqualsB = checksumService.compareChecksums(
            checksums[i],
            checksums[j],
          );
          const bEqualsA = checksumService.compareChecksums(
            checksums[j],
            checksums[i],
          );
          expect(aEqualsB).toBe(bEqualsA);
        }
      }
    });

    it('should handle edge case: empty data checksums', () => {
      const empty1 = checksumService.calculateChecksum(Buffer.from(''));
      const empty2 = checksumService.calculateChecksum(Buffer.from(''));

      // Reflexive
      expect(checksumService.compareChecksums(empty1, empty1)).toBe(true);
      expect(checksumService.compareChecksums(empty2, empty2)).toBe(true);

      // Symmetric
      expect(checksumService.compareChecksums(empty1, empty2)).toBe(
        checksumService.compareChecksums(empty2, empty1),
      );

      // They should be equal since they're from the same (empty) data
      expect(checksumService.compareChecksums(empty1, empty2)).toBe(true);
    });

    it('should handle edge case: large data checksums', () => {
      const large1 = checksumService.calculateChecksum(
        Buffer.alloc(1024 * 1024, 'A'),
      );
      const large2 = checksumService.calculateChecksum(
        Buffer.alloc(1024 * 1024, 'A'),
      );

      // Reflexive
      expect(checksumService.compareChecksums(large1, large1)).toBe(true);
      expect(checksumService.compareChecksums(large2, large2)).toBe(true);

      // Symmetric
      expect(checksumService.compareChecksums(large1, large2)).toBe(
        checksumService.compareChecksums(large2, large1),
      );

      // They should be equal since they're from the same data
      expect(checksumService.compareChecksums(large1, large2)).toBe(true);
    });
  });
});
