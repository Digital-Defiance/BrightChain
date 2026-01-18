/**
 * Tests for test utility functions
 */

import { Checksum } from '../types/checksum';
import { generateRandomChecksum, generateRandomString } from './testUtils';

describe('testUtils', () => {
  describe('generateRandomString', () => {
    it('should generate a string of the specified length', () => {
      const length = 10;
      const result = generateRandomString(length);

      expect(result).toHaveLength(length);
    });

    it('should generate different strings on each call', () => {
      const str1 = generateRandomString(20);
      const str2 = generateRandomString(20);

      expect(str1).not.toBe(str2);
    });
  });

  describe('generateRandomChecksum', () => {
    it('should generate a valid Checksum instance', () => {
      const checksum = generateRandomChecksum();

      expect(checksum).toBeInstanceOf(Checksum);
    });

    it('should generate a checksum of correct length (64 bytes)', () => {
      const checksum = generateRandomChecksum();

      expect(checksum.length).toBe(64);
    });

    it('should generate different checksums on each call', () => {
      const checksum1 = generateRandomChecksum();
      const checksum2 = generateRandomChecksum();

      expect(checksum1.equals(checksum2)).toBe(false);
    });

    it('should generate checksums that can be converted to hex', () => {
      const checksum = generateRandomChecksum();
      const hex = checksum.toHex();

      expect(hex).toHaveLength(128); // 64 bytes * 2 hex chars per byte
      expect(/^[0-9a-f]+$/.test(hex)).toBe(true);
    });

    it('should generate checksums that can be converted to Buffer', () => {
      const checksum = generateRandomChecksum();
      const buffer = checksum.toBuffer();

      expect(Buffer.isBuffer(buffer)).toBe(true);
      expect(buffer.length).toBe(64);
    });

    it('should generate checksums that can be converted to Uint8Array', () => {
      const checksum = generateRandomChecksum();
      const array = checksum.toUint8Array();

      expect(array).toBeInstanceOf(Uint8Array);
      expect(array.length).toBe(64);
    });
  });
});
