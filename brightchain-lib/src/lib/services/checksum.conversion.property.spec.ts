/**
 * @fileoverview Property-based tests for checksum conversions
 * 
 * **Feature: test-failure-fixes, Property 1: Checksum Conversion Round Trip**
 * **Validates: Requirements 1.2, 7.1**
 * 
 * This test suite verifies that checksum conversions between ChecksumUint8Array
 * and Buffer preserve data integrity through round-trip conversions.
 */

import { ChecksumService } from './checksum.service';
import { ServiceProvider } from './service.provider';
import { ChecksumUint8Array } from '../types';

describe('Checksum Conversion Property Tests', () => {
  let checksumService: ChecksumService;

  beforeEach(() => {
    checksumService = ServiceProvider.getInstance().checksumService;
  });

  describe('Property 1: Checksum Conversion Round Trip', () => {
    /**
     * Property: For any valid checksum value, converting from ChecksumUint8Array
     * to Buffer and back should produce an equivalent value.
     * 
     * This property ensures that the conversion utilities preserve data integrity.
     */
    it('should preserve checksum data when converting ChecksumUint8Array to Buffer and back', () => {
      // Generate multiple test cases with different data patterns
      const testCases = [
        Buffer.from('hello world'),
        Buffer.from(''),
        Buffer.alloc(1024, 'A'),
        Buffer.from([0x00, 0x01, 0x02, 0x03]),
        Buffer.alloc(64 * 1024, 0xFF), // Large buffer
        Buffer.from('The quick brown fox jumps over the lazy dog'),
        Buffer.from([0xFF, 0xFE, 0xFD, 0xFC]),
        Buffer.alloc(100, 0x00), // All zeros
      ];

      for (const testData of testCases) {
        // Calculate checksum (returns ChecksumUint8Array)
        const originalChecksum: ChecksumUint8Array = checksumService.calculateChecksum(testData);
        
        // Convert to Buffer
        const checksumAsBuffer = Buffer.from(originalChecksum);
        
        // Convert back to ChecksumUint8Array
        const convertedChecksum = new Uint8Array(checksumAsBuffer) as ChecksumUint8Array;
        
        // Verify the round-trip preserves the data
        expect(originalChecksum.length).toBe(convertedChecksum.length);
        expect(originalChecksum.every((byte, index) => byte === convertedChecksum[index])).toBe(true);
        
        // Also verify using the service's comparison method
        expect(checksumService.compareChecksums(originalChecksum, convertedChecksum)).toBe(true);
      }
    });

    it('should preserve checksum data through multiple round-trip conversions', () => {
      const testData = Buffer.from('test data for multiple conversions');
      const originalChecksum = checksumService.calculateChecksum(testData);
      
      let currentChecksum = originalChecksum;
      
      // Perform multiple round-trip conversions
      for (let i = 0; i < 10; i++) {
        const asBuffer = Buffer.from(currentChecksum);
        currentChecksum = new Uint8Array(asBuffer) as ChecksumUint8Array;
      }
      
      // After multiple conversions, data should still be identical
      expect(checksumService.compareChecksums(originalChecksum, currentChecksum)).toBe(true);
    });

    it('should handle edge case: minimum size data', () => {
      const emptyData = Buffer.from('');
      const checksum = checksumService.calculateChecksum(emptyData);
      
      const asBuffer = Buffer.from(checksum);
      const backToUint8Array = new Uint8Array(asBuffer) as ChecksumUint8Array;
      
      expect(checksumService.compareChecksums(checksum, backToUint8Array)).toBe(true);
    });

    it('should handle edge case: maximum practical size data', () => {
      // Test with a large buffer (1MB)
      const largeData = Buffer.alloc(1024 * 1024, 'X');
      const checksum = checksumService.calculateChecksum(largeData);
      
      const asBuffer = Buffer.from(checksum);
      const backToUint8Array = new Uint8Array(asBuffer) as ChecksumUint8Array;
      
      expect(checksumService.compareChecksums(checksum, backToUint8Array)).toBe(true);
    });

    it('should preserve all byte values (0x00 to 0xFF) in checksums', () => {
      // Generate data that will produce checksums with various byte values
      const testCases = Array.from({ length: 100 }, (_, i) => 
        Buffer.from(`test data ${i} with different content to vary checksum bytes`)
      );
      
      for (const testData of testCases) {
        const checksum = checksumService.calculateChecksum(testData);
        const asBuffer = Buffer.from(checksum);
        const backToUint8Array = new Uint8Array(asBuffer) as ChecksumUint8Array;
        
        // Verify each byte is preserved
        for (let i = 0; i < checksum.length; i++) {
          expect(backToUint8Array[i]).toBe(checksum[i]);
        }
      }
    });
  });
});
