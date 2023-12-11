/**
 * @fileoverview Unit tests for MessageEncryptionScheme enum
 *
 * Verifies that the GPG value exists and all existing enum values are unchanged.
 *
 * **Validates: Requirements 10.1, 10.2, 10.3**
 */

import { MessageEncryptionScheme } from './messageEncryptionScheme';

describe('MessageEncryptionScheme', () => {
  describe('Requirement 10.1: GPG value exists with string "gpg"', () => {
    it('should have a GPG member with value "gpg"', () => {
      expect(MessageEncryptionScheme.GPG).toBe('gpg');
    });

    it('should include GPG in the set of enum values', () => {
      const values = Object.values(MessageEncryptionScheme);
      expect(values).toContain('gpg');
    });
  });

  describe('Requirement 10.2: All existing values are unchanged', () => {
    it('should have NONE with value "none"', () => {
      expect(MessageEncryptionScheme.NONE).toBe('none');
    });

    it('should have SHARED_KEY with value "shared_key"', () => {
      expect(MessageEncryptionScheme.SHARED_KEY).toBe('shared_key');
    });

    it('should have RECIPIENT_KEYS with value "recipient_keys"', () => {
      expect(MessageEncryptionScheme.RECIPIENT_KEYS).toBe('recipient_keys');
    });

    it('should have S_MIME with value "s_mime"', () => {
      expect(MessageEncryptionScheme.S_MIME).toBe('s_mime');
    });
  });

  describe('Requirement 10.3: Enum completeness', () => {
    it('should contain exactly 5 members', () => {
      const values = Object.values(MessageEncryptionScheme);
      expect(values).toHaveLength(5);
    });

    it('should contain all expected values', () => {
      const values = Object.values(MessageEncryptionScheme);
      expect(values).toEqual(
        expect.arrayContaining([
          'none',
          'shared_key',
          'recipient_keys',
          's_mime',
          'gpg',
        ]),
      );
    });
  });
});
