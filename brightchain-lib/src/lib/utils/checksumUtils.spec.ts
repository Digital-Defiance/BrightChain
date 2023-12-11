/**
 * Tests for checksum utility functions
 */

import { Checksum } from '../types/checksum';
import {
  checksumToBuffer,
  checksumToUint8Array,
  hexToChecksum,
  uint8ArrayToHex,
} from './checksumUtils';

describe('checksumUtils', () => {
  describe('uint8ArrayToHex', () => {
    it('should convert Checksum to hex string', () => {
      const data = new Uint8Array(64).fill(0xab);
      const checksum = Checksum.fromUint8Array(data);
      const hex = uint8ArrayToHex(checksum);

      expect(hex).toBe('ab'.repeat(64));
    });

    it('should convert Uint8Array to hex string', () => {
      const data = new Uint8Array([0x01, 0x02, 0x03]);
      const hex = uint8ArrayToHex(data);

      expect(hex).toBe('010203');
    });
  });

  describe('hexToChecksum', () => {
    it('should convert hex string to Checksum', () => {
      const hex = 'ab'.repeat(64); // 128 hex chars = 64 bytes
      const checksum = hexToChecksum(hex);

      expect(checksum).toBeInstanceOf(Checksum);
      expect(checksum.toHex()).toBe(hex);
    });

    it('should throw error for invalid hex string', () => {
      const invalidHex = 'xyz';

      expect(() => hexToChecksum(invalidHex)).toThrow();
    });

    it('should throw error for wrong length hex string', () => {
      const shortHex = 'ab'.repeat(32); // Only 32 bytes

      expect(() => hexToChecksum(shortHex)).toThrow();
    });
  });

  describe('checksumToUint8Array', () => {
    it('should convert Checksum to Uint8Array', () => {
      const data = new Uint8Array(64).fill(0xcd);
      const checksum = Checksum.fromUint8Array(data);
      const result = checksumToUint8Array(checksum);

      expect(result).toBeInstanceOf(Uint8Array);
      expect(result.length).toBe(64);
      expect(result[0]).toBe(0xcd);
    });

    it('should return a copy, not the original', () => {
      const data = new Uint8Array(64).fill(0xef);
      const checksum = Checksum.fromUint8Array(data);
      const result = checksumToUint8Array(checksum);

      // Modify the result
      result[0] = 0x00;

      // Original checksum should be unchanged
      expect(checksum.toUint8Array()[0]).toBe(0xef);
    });
  });

  describe('checksumToBuffer', () => {
    it('should convert Checksum to Buffer', () => {
      const data = new Uint8Array(64).fill(0x12);
      const checksum = Checksum.fromUint8Array(data);
      const result = checksumToBuffer(checksum);

      expect(Buffer.isBuffer(result)).toBe(true);
      expect(result.length).toBe(64);
      expect(result[0]).toBe(0x12);
    });
  });

  describe('round-trip conversions', () => {
    it('should maintain data integrity through conversions', () => {
      const originalData = new Uint8Array(64);
      for (let i = 0; i < 64; i++) {
        originalData[i] = i;
      }

      // Create checksum
      const checksum1 = Checksum.fromUint8Array(originalData);

      // Convert to hex and back
      const hex = uint8ArrayToHex(checksum1);
      const checksum2 = hexToChecksum(hex);

      // Convert to Uint8Array
      const resultData = checksumToUint8Array(checksum2);

      // Verify data integrity
      expect(resultData).toEqual(originalData);
      expect(checksum1.equals(checksum2)).toBe(true);
    });
  });
});
