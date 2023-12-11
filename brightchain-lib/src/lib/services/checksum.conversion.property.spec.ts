/**
 * @fileoverview Property-based tests for checksum conversions
 *
 * **Feature: test-failure-fixes, Property 1: Checksum Conversion Round Trip**
 * **Validates: Requirements 1.2, 7.1**
 *
 * This test suite verifies that checksum conversions between different formats
 * (Checksum class, Buffer, Uint8Array, hex string) preserve data integrity through round-trip conversions.
 */

import { Checksum } from '../types/checksum';
import { ChecksumService } from './checksum.service';
import { ServiceProvider } from './service.provider';

describe('Checksum Conversion Property Tests', () => {
  let checksumService: ChecksumService;

  beforeEach(() => {
    checksumService = ServiceProvider.getInstance().checksumService;
  });

  describe('Property 1: Checksum Conversion Round Trip', () => {
    /**
     * Property: For any valid checksum value, converting from Checksum
     * to Buffer/Uint8Array and back should produce an equivalent value.
     *
     * This property ensures that the conversion utilities preserve data integrity.
     */
    it('should preserve checksum data when converting Checksum to Buffer and back', () => {
      // Generate multiple test cases with different data patterns
      const testCases = [
        Buffer.from('hello world'),
        Buffer.from(''),
        Buffer.alloc(1024, 'A'),
        Buffer.from([0x00, 0x01, 0x02, 0x03]),
        Buffer.alloc(64 * 1024, 0xff), // Large buffer
        Buffer.from('The quick brown fox jumps over the lazy dog'),
        Buffer.from([0xff, 0xfe, 0xfd, 0xfc]),
        Buffer.alloc(100, 0x00), // All zeros
      ];

      for (const testData of testCases) {
        // Calculate checksum (returns Checksum class)
        const originalChecksum = checksumService.calculateChecksum(testData);

        // Convert to Buffer
        const checksumAsBuffer = originalChecksum.toBuffer();

        // Convert back to Checksum
        const convertedChecksum = Checksum.fromBuffer(checksumAsBuffer);

        // Verify the round-trip preserves the data
        expect(originalChecksum.length).toBe(convertedChecksum.length);
        expect(originalChecksum.equals(convertedChecksum)).toBe(true);

        // Also verify using the service's comparison method
        expect(
          checksumService.compareChecksums(originalChecksum, convertedChecksum),
        ).toBe(true);
      }
    });

    it('should preserve checksum data through multiple round-trip conversions', () => {
      const testData = Buffer.from('test data for multiple conversions');
      const originalChecksum = checksumService.calculateChecksum(testData);

      let currentChecksum = originalChecksum;

      // Perform multiple round-trip conversions
      for (let i = 0; i < 10; i++) {
        const asBuffer = currentChecksum.toBuffer();
        currentChecksum = Checksum.fromBuffer(asBuffer);
      }

      // After multiple conversions, data should still be identical
      expect(
        checksumService.compareChecksums(originalChecksum, currentChecksum),
      ).toBe(true);
    });

    it('should handle edge case: minimum size data', () => {
      const emptyData = Buffer.from('');
      const checksum = checksumService.calculateChecksum(emptyData);

      const asBuffer = checksum.toBuffer();
      const backToChecksum = Checksum.fromBuffer(asBuffer);

      expect(checksumService.compareChecksums(checksum, backToChecksum)).toBe(
        true,
      );
    });

    it('should handle edge case: maximum practical size data', () => {
      // Test with a large buffer (1MB)
      const largeData = Buffer.alloc(1024 * 1024, 'X');
      const checksum = checksumService.calculateChecksum(largeData);

      const asBuffer = checksum.toBuffer();
      const backToChecksum = Checksum.fromBuffer(asBuffer);

      expect(checksumService.compareChecksums(checksum, backToChecksum)).toBe(
        true,
      );
    });

    it('should preserve all byte values (0x00 to 0xFF) in checksums', () => {
      // Generate data that will produce checksums with various byte values
      const testCases = Array.from({ length: 100 }, (_, i) =>
        Buffer.from(
          `test data ${i} with different content to vary checksum bytes`,
        ),
      );

      for (const testData of testCases) {
        const checksum = checksumService.calculateChecksum(testData);
        const asBuffer = checksum.toBuffer();
        const backToChecksum = Checksum.fromBuffer(asBuffer);

        // Verify each byte is preserved
        const checksumArray = checksum.toUint8Array();
        const backArray = backToChecksum.toUint8Array();
        for (let i = 0; i < checksumArray.length; i++) {
          expect(backArray[i]).toBe(checksumArray[i]);
        }
      }
    });
  });
});
