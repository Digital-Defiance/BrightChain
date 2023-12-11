/**
 * @fileoverview Unit tests for Pool ID edge cases
 *
 * Tests specific edge cases for pool ID validation, case sensitivity,
 * boundary conditions, and the DEFAULT_POOL constant.
 *
 * Validates: Requirements 1.2, 1.3, 1.4, 1.5
 */

import {
  DEFAULT_POOL,
  isValidPoolId,
  validatePoolId,
} from './pooledBlockStore';

describe('Pool ID Edge Cases', () => {
  describe('Empty string rejection (Requirement 1.2)', () => {
    it('isValidPoolId rejects empty string', () => {
      expect(isValidPoolId('')).toBe(false);
    });

    it('validatePoolId throws for empty string with descriptive error', () => {
      expect(() => validatePoolId('')).toThrow(/Invalid pool ID/);
    });
  });

  describe('64-character boundary (Requirement 1.2)', () => {
    const exactly64 = 'a'.repeat(64);
    const exactly65 = 'a'.repeat(65);

    it('accepts a 64-character pool ID (at boundary)', () => {
      expect(isValidPoolId(exactly64)).toBe(true);
      expect(() => validatePoolId(exactly64)).not.toThrow();
    });

    it('rejects a 65-character pool ID (one over boundary)', () => {
      expect(isValidPoolId(exactly65)).toBe(false);
      expect(() => validatePoolId(exactly65)).toThrow(/Invalid pool ID/);
    });
  });

  describe('Special characters rejection (Requirement 1.3)', () => {
    const specialChars = [
      ' ',
      ':',
      '.',
      '/',
      '\\',
      '@',
      '#',
      '$',
      '%',
      '!',
      '?',
      '+',
      '=',
      '~',
      '`',
    ];

    it.each(specialChars)('rejects pool ID containing "%s"', (char) => {
      const poolId = `test${char}pool`;
      expect(isValidPoolId(poolId)).toBe(false);
      expect(() => validatePoolId(poolId)).toThrow(/Invalid pool ID/);
    });

    it('rejects pool ID that is only whitespace', () => {
      expect(isValidPoolId('   ')).toBe(false);
    });

    it('rejects pool ID with tab character', () => {
      expect(isValidPoolId('test\tpool')).toBe(false);
    });

    it('rejects pool ID with newline', () => {
      expect(isValidPoolId('test\npool')).toBe(false);
    });
  });

  describe('Case sensitivity (Requirement 1.4)', () => {
    it('"Users" and "users" are both valid', () => {
      expect(isValidPoolId('Users')).toBe(true);
      expect(isValidPoolId('users')).toBe(true);
    });

    it('"Users" and "users" are distinct strings (case-sensitive)', () => {
      expect('Users').not.toBe('users');
    });

    it('validatePoolId accepts both "Users" and "users"', () => {
      expect(() => validatePoolId('Users')).not.toThrow();
      expect(() => validatePoolId('users')).not.toThrow();
    });
  });

  describe('DEFAULT_POOL reservation (Requirement 1.5)', () => {
    it('DEFAULT_POOL equals "default"', () => {
      expect(DEFAULT_POOL).toBe('default');
    });

    it('"default" is a valid pool ID', () => {
      expect(isValidPoolId('default')).toBe(true);
      expect(() => validatePoolId('default')).not.toThrow();
    });

    it('DEFAULT_POOL passes validation', () => {
      expect(isValidPoolId(DEFAULT_POOL)).toBe(true);
      expect(() => validatePoolId(DEFAULT_POOL)).not.toThrow();
    });
  });

  describe('Valid characters acceptance', () => {
    it('accepts pool ID with underscores', () => {
      expect(isValidPoolId('my_pool')).toBe(true);
    });

    it('accepts pool ID with hyphens', () => {
      expect(isValidPoolId('my-pool')).toBe(true);
    });

    it('accepts pool ID with digits', () => {
      expect(isValidPoolId('pool123')).toBe(true);
    });

    it('accepts single character pool ID', () => {
      expect(isValidPoolId('a')).toBe(true);
    });

    it('accepts pool ID with mixed valid characters', () => {
      expect(isValidPoolId('My_Pool-123')).toBe(true);
    });
  });
});
