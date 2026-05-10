// Feature: brightmail-composer-enhancements, Property 9: Missing recipient keys detection
/**
 * Property-based tests for findMissingRecipientKeys.
 *
 * For any set of recipient email addresses and any set of known public keys
 * (mapping address → key), the function that identifies recipients lacking
 * public keys SHALL return exactly the set difference: recipients whose
 * addresses are not present in the known public keys map.
 *
 * **Validates: Requirements 5.4**
 */

// Mock brightchain-lib to avoid deep initialization chain (ECIES service)
// that fails in the jsdom test environment. Only MessageEncryptionScheme
// is needed by EncryptionSelector.
import fc from 'fast-check';
import { findMissingRecipientKeys } from './EncryptionSelector';

jest.mock('@brightchain/brightchain-lib', () => ({
  MessageEncryptionScheme: {
    NONE: 'none',
    SHARED_KEY: 'shared_key',
    RECIPIENT_KEYS: 'recipient_keys',
    S_MIME: 's_mime',
    GPG: 'gpg',
  },
}));

describe('Feature: brightmail-composer-enhancements, Property 9: Missing recipient keys detection', () => {
  /**
   * Property 9a: The result is exactly the set difference —
   * recipients whose addresses are NOT in the knownKeys map.
   */
  it('returns exactly the recipients not present in the known keys map', () => {
    fc.assert(
      fc.property(
        fc.uniqueArray(fc.emailAddress()),
        fc.dictionary(fc.emailAddress(), fc.string()),
        (recipients: string[], knownKeys: Record<string, string>) => {
          const result = findMissingRecipientKeys(recipients, knownKeys);
          const expected = recipients.filter((addr) => !(addr in knownKeys));

          // Same length
          if (result.length !== expected.length) return false;

          // Same elements in same order
          return result.every((addr, i) => addr === expected[i]);
        },
      ),
      { numRuns: 100 },
    );
  });

  /**
   * Property 9b: The result length equals recipients.length minus
   * the count of recipients that ARE in knownKeys.
   */
  it('result length equals recipients.length minus count of recipients in knownKeys', () => {
    fc.assert(
      fc.property(
        fc.uniqueArray(fc.emailAddress()),
        fc.dictionary(fc.emailAddress(), fc.string()),
        (recipients: string[], knownKeys: Record<string, string>) => {
          const result = findMissingRecipientKeys(recipients, knownKeys);
          const presentCount = recipients.filter(
            (addr) => addr in knownKeys,
          ).length;

          return result.length === recipients.length - presentCount;
        },
      ),
      { numRuns: 100 },
    );
  });

  /**
   * Property 9c: Every element in the result is a member of the
   * original recipients array and is NOT a key in knownKeys.
   */
  it('every returned address is a recipient and is missing from knownKeys', () => {
    fc.assert(
      fc.property(
        fc.uniqueArray(fc.emailAddress()),
        fc.dictionary(fc.emailAddress(), fc.string()),
        (recipients: string[], knownKeys: Record<string, string>) => {
          const result = findMissingRecipientKeys(recipients, knownKeys);

          return result.every(
            (addr) => recipients.includes(addr) && !(addr in knownKeys),
          );
        },
      ),
      { numRuns: 100 },
    );
  });

  /**
   * Property 9d: No recipient that IS in knownKeys appears in the result.
   */
  it('no recipient with a known key appears in the result', () => {
    fc.assert(
      fc.property(
        fc.uniqueArray(fc.emailAddress()),
        fc.dictionary(fc.emailAddress(), fc.string()),
        (recipients: string[], knownKeys: Record<string, string>) => {
          const result = findMissingRecipientKeys(recipients, knownKeys);

          return recipients
            .filter((addr) => addr in knownKeys)
            .every((addr) => !result.includes(addr));
        },
      ),
      { numRuns: 100 },
    );
  });
});
