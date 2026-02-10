/**
 * Unit tests for PasswordGenerator
 *
 * @see Requirements 1.1, 1.4, 1.5, 1.6
 */

import {
  PasswordGenerator,
  PasswordGeneratorOptions,
} from './passwordGenerator';

describe('PasswordGenerator', () => {
  describe('validate', () => {
    it('should accept valid options', () => {
      expect(() =>
        PasswordGenerator.validate({
          length: 16,
          uppercase: true,
          lowercase: true,
        }),
      ).not.toThrow();
    });

    it('should reject length less than 8', () => {
      expect(() =>
        PasswordGenerator.validate({ length: 7, uppercase: true }),
      ).toThrow('Password length must be between 8 and 128');
    });

    it('should reject length greater than 128', () => {
      expect(() =>
        PasswordGenerator.validate({ length: 129, uppercase: true }),
      ).toThrow('Password length must be between 8 and 128');
    });

    it('should reject when no character set is enabled', () => {
      expect(() => PasswordGenerator.validate({ length: 10 })).toThrow(
        'At least one character set must be enabled',
      );
    });

    it('should reject when minimum counts exceed length', () => {
      expect(() =>
        PasswordGenerator.validate({
          length: 10,
          uppercase: true,
          lowercase: true,
          minUppercase: 6,
          minLowercase: 6,
        }),
      ).toThrow('Sum of minimum counts exceeds password length');
    });
  });

  describe('generate', () => {
    it('should generate password of correct length', () => {
      const password = PasswordGenerator.generate({
        length: 16,
        uppercase: true,
        lowercase: true,
      });
      expect(password.length).toBe(16);
    });

    it('should include uppercase when enabled', () => {
      const password = PasswordGenerator.generate({
        length: 20,
        uppercase: true,
        minUppercase: 5,
      });
      expect(/[A-Z]/.test(password)).toBe(true);
      expect((password.match(/[A-Z]/g) || []).length).toBeGreaterThanOrEqual(5);
    });

    it('should include lowercase when enabled', () => {
      const password = PasswordGenerator.generate({
        length: 20,
        lowercase: true,
        minLowercase: 5,
      });
      expect(/[a-z]/.test(password)).toBe(true);
      expect((password.match(/[a-z]/g) || []).length).toBeGreaterThanOrEqual(5);
    });

    it('should include numbers when enabled', () => {
      const password = PasswordGenerator.generate({
        length: 20,
        numbers: true,
        minNumbers: 5,
      });
      expect(/[0-9]/.test(password)).toBe(true);
      expect((password.match(/[0-9]/g) || []).length).toBeGreaterThanOrEqual(5);
    });

    it('should include symbols when enabled', () => {
      const password = PasswordGenerator.generate({
        length: 20,
        symbols: true,
        minSymbols: 5,
      });
      expect(/[!@#$%^&*()_+\-=[\]{}|;:,.<>?]/.test(password)).toBe(true);
      expect(
        (password.match(/[!@#$%^&*()_+\-=[\]{}|;:,.<>?]/g) || []).length,
      ).toBeGreaterThanOrEqual(5);
    });

    it('should only include characters from enabled sets', () => {
      const password = PasswordGenerator.generate({
        length: 50,
        uppercase: true,
        numbers: true,
      });
      // Should only contain uppercase and numbers
      expect(/^[A-Z0-9]+$/.test(password)).toBe(true);
    });

    it('should meet all minimum requirements', () => {
      const options: PasswordGeneratorOptions = {
        length: 20,
        uppercase: true,
        lowercase: true,
        numbers: true,
        symbols: true,
        minUppercase: 3,
        minLowercase: 3,
        minNumbers: 3,
        minSymbols: 3,
      };
      const password = PasswordGenerator.generate(options);

      expect(password.length).toBe(20);
      expect((password.match(/[A-Z]/g) || []).length).toBeGreaterThanOrEqual(3);
      expect((password.match(/[a-z]/g) || []).length).toBeGreaterThanOrEqual(3);
      expect((password.match(/[0-9]/g) || []).length).toBeGreaterThanOrEqual(3);
      expect(
        (password.match(/[!@#$%^&*()_+\-=[\]{}|;:,.<>?]/g) || []).length,
      ).toBeGreaterThanOrEqual(3);
    });

    it('should generate different passwords on each call', () => {
      const options: PasswordGeneratorOptions = {
        length: 32,
        uppercase: true,
        lowercase: true,
        numbers: true,
        symbols: true,
      };

      const passwords = new Set<string>();
      for (let i = 0; i < 10; i++) {
        passwords.add(PasswordGenerator.generate(options));
      }

      // All 10 passwords should be unique (extremely high probability)
      expect(passwords.size).toBe(10);
    });

    it('should handle edge case of length 8 (minimum)', () => {
      const password = PasswordGenerator.generate({
        length: 8,
        uppercase: true,
      });
      expect(password.length).toBe(8);
    });

    it('should handle edge case of length 128 (maximum)', () => {
      const password = PasswordGenerator.generate({
        length: 128,
        lowercase: true,
      });
      expect(password.length).toBe(128);
    });
  });
});
