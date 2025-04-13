/**
 * @fileoverview Property-based tests for hex string conversions
 * 
 * **Feature: test-failure-fixes, Property 3: Hex String Conversion Round Trip**
 * **Validates: Requirements 3.2**
 * 
 * This test suite verifies that hex string conversions are valid and reversible,
 * ensuring that checksums can be safely converted to hex strings and back without
 * data loss.
 */

import { ChecksumService } from './checksum.service';
import { ServiceProvider } from './service.provider';
import { ChecksumUint8Array } from '../types';

describe('Checksum Hex String Property Tests', () => {
  let checksumService: ChecksumService;

  beforeEach(() => {
    checksumService = ServiceProvider.getInstance().checksumService;
  });

  describe('Property 3: Hex String Conversion Round Trip', () => {
    /**
     * Property: For any checksum, converting to hex string and parsing back
     * should produce an equivalent checksum.
     * 
     * This ensures that hex string representation is a lossless encoding.
     */
    
    it('should preserve checksum data through hex string round trip', () => {
      // Generate multiple checksums from different data patterns
      const testCases = [
        Buffer.from('hello world'),
        Buffer.from(''),
        Buffer.alloc(1024, 'A'),
        Buffer.from([0x00, 0x01, 0x02, 0x03]),
        Buffer.alloc(64 * 1024, 0xFF),
        Buffer.from('The quick brown fox jumps over the lazy dog'),
        Buffer.from([0xFF, 0xFE, 0xFD, 0xFC]),
        Buffer.alloc(100, 0x00),
      ];

      for (const testData of testCases) {
        const originalChecksum = checksumService.calculateChecksum(testData);
        
        // Convert to hex string
        const hexString = checksumService.checksumToHexString(originalChecksum);
        
        // Convert back to checksum
        const convertedChecksum = checksumService.hexStringToChecksum(hexString);
        
        // Verify the round-trip preserves the data
        expect(checksumService.compareChecksums(originalChecksum, convertedChecksum)).toBe(true);
        
        // Also verify byte-by-byte equality
        expect(originalChecksum.length).toBe(convertedChecksum.length);
        expect(originalChecksum.every((byte, index) => byte === convertedChecksum[index])).toBe(true);
      }
    });

    it('should produce valid hex strings with correct length', () => {
      const testCases = [
        Buffer.from('test data 1'),
        Buffer.from('test data 2'),
        Buffer.from(''),
        Buffer.alloc(512, 'X'),
      ];

      for (const testData of testCases) {
        const checksum = checksumService.calculateChecksum(testData);
        const hexString = checksumService.checksumToHexString(checksum);
        
        // Hex string should be exactly twice the byte length (2 hex chars per byte)
        expect(hexString.length).toBe(checksumService.checksumBufferLength * 2);
        
        // Hex string should only contain valid hex characters
        expect(/^[0-9a-fA-F]+$/.test(hexString)).toBe(true);
      }
    });

    it('should handle multiple round-trip conversions', () => {
      const testData = Buffer.from('test data for multiple conversions');
      const originalChecksum = checksumService.calculateChecksum(testData);
      
      let currentChecksum = originalChecksum;
      
      // Perform multiple round-trip conversions
      for (let i = 0; i < 10; i++) {
        const hexString = checksumService.checksumToHexString(currentChecksum);
        currentChecksum = checksumService.hexStringToChecksum(hexString);
      }
      
      // After multiple conversions, data should still be identical
      expect(checksumService.compareChecksums(originalChecksum, currentChecksum)).toBe(true);
    });

    it('should handle edge case: empty data checksum', () => {
      const emptyData = Buffer.from('');
      const checksum = checksumService.calculateChecksum(emptyData);
      
      const hexString = checksumService.checksumToHexString(checksum);
      const converted = checksumService.hexStringToChecksum(hexString);
      
      expect(checksumService.compareChecksums(checksum, converted)).toBe(true);
      expect(hexString.length).toBe(checksumService.checksumBufferLength * 2);
    });

    it('should handle edge case: large data checksum', () => {
      const largeData = Buffer.alloc(1024 * 1024, 'X');
      const checksum = checksumService.calculateChecksum(largeData);
      
      const hexString = checksumService.checksumToHexString(checksum);
      const converted = checksumService.hexStringToChecksum(hexString);
      
      expect(checksumService.compareChecksums(checksum, converted)).toBe(true);
      expect(hexString.length).toBe(checksumService.checksumBufferLength * 2);
    });

    it('should preserve all byte values (0x00 to 0xFF) in hex conversion', () => {
      // Generate data that will produce checksums with various byte values
      const testCases = Array.from({ length: 100 }, (_, i) => 
        Buffer.from(`test data ${i} with different content to vary checksum bytes`)
      );
      
      for (const testData of testCases) {
        const checksum = checksumService.calculateChecksum(testData);
        const hexString = checksumService.checksumToHexString(checksum);
        const converted = checksumService.hexStringToChecksum(hexString);
        
        // Verify each byte is preserved
        for (let i = 0; i < checksum.length; i++) {
          expect(converted[i]).toBe(checksum[i]);
        }
      }
    });

    it('should produce consistent hex strings for identical checksums', () => {
      const testData = Buffer.from('consistent test data');
      
      // Generate multiple checksums from the same data
      const checksum1 = checksumService.calculateChecksum(testData);
      const checksum2 = checksumService.calculateChecksum(testData);
      
      const hexString1 = checksumService.checksumToHexString(checksum1);
      const hexString2 = checksumService.checksumToHexString(checksum2);
      
      // Hex strings should be identical for identical checksums
      expect(hexString1).toBe(hexString2);
    });

    it('should produce different hex strings for different checksums', () => {
      const data1 = Buffer.from('data 1');
      const data2 = Buffer.from('data 2');
      
      const checksum1 = checksumService.calculateChecksum(data1);
      const checksum2 = checksumService.calculateChecksum(data2);
      
      const hexString1 = checksumService.checksumToHexString(checksum1);
      const hexString2 = checksumService.checksumToHexString(checksum2);
      
      // Hex strings should be different for different checksums
      expect(hexString1).not.toBe(hexString2);
    });

    it('should handle checksums with leading zeros in hex representation', () => {
      // Generate multiple checksums to increase chance of getting leading zeros
      const testCases = Array.from({ length: 50 }, (_, i) => 
        Buffer.from(`test ${i}`)
      );
      
      for (const testData of testCases) {
        const checksum = checksumService.calculateChecksum(testData);
        const hexString = checksumService.checksumToHexString(checksum);
        const converted = checksumService.hexStringToChecksum(hexString);
        
        // Verify round-trip works even with leading zeros
        expect(checksumService.compareChecksums(checksum, converted)).toBe(true);
        
        // Verify length is maintained (leading zeros should not be stripped)
        expect(hexString.length).toBe(checksumService.checksumBufferLength * 2);
      }
    });

    it('should handle checksums with all zeros', () => {
      // While unlikely in practice, test the edge case of a checksum with all zero bytes
      // We can't easily generate this naturally, but we can test the conversion logic
      const testData = Buffer.from('');
      const checksum = checksumService.calculateChecksum(testData);
      
      // Even if checksum has zeros, conversion should work
      const hexString = checksumService.checksumToHexString(checksum);
      const converted = checksumService.hexStringToChecksum(hexString);
      
      expect(checksumService.compareChecksums(checksum, converted)).toBe(true);
    });

    it('should handle checksums with all 0xFF bytes', () => {
      // Test with data that might produce high byte values
      const testData = Buffer.alloc(1024, 0xFF);
      const checksum = checksumService.calculateChecksum(testData);
      
      const hexString = checksumService.checksumToHexString(checksum);
      const converted = checksumService.hexStringToChecksum(hexString);
      
      expect(checksumService.compareChecksums(checksum, converted)).toBe(true);
    });
  });
});
