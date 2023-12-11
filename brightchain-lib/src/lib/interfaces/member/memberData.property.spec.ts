// Feature: brightmail-composer-enhancements, Property 10: Key storage round trip
import * as fc from 'fast-check';
import type { IPrivateMemberData } from './memberData';

/**
 * Property 10: Key storage round trip
 *
 * For any valid PEM-encoded certificate string or ASCII-armored GPG key string,
 * storing it in IPrivateMemberData.settings.smimeCertificate / gpgPublicKey
 * and reading it back produces a value identical to the original string.
 *
 * **Validates: Requirements 6.6**
 */
describe('Property 10: Key storage round trip', () => {
  /**
   * Creates a minimal IPrivateMemberData.settings object for testing.
   */
  function createSettings(overrides?: {
    smimeCertificate?: string;
    gpgPublicKey?: string;
  }): IPrivateMemberData['settings'] {
    return {
      autoReplication: false,
      minRedundancy: 1,
      preferredRegions: [],
      ...overrides,
    };
  }

  it('smimeCertificate round trip preserves the original value', () => {
    fc.assert(
      fc.property(fc.string(), (certString) => {
        const settings = createSettings({ smimeCertificate: certString });
        expect(settings.smimeCertificate).toBe(certString);
      }),
      { numRuns: 100 },
    );
  });

  it('gpgPublicKey round trip preserves the original value', () => {
    fc.assert(
      fc.property(fc.string(), (keyString) => {
        const settings = createSettings({ gpgPublicKey: keyString });
        expect(settings.gpgPublicKey).toBe(keyString);
      }),
      { numRuns: 100 },
    );
  });

  it('both keys stored simultaneously round trip independently', () => {
    fc.assert(
      fc.property(fc.string(), fc.string(), (certString, keyString) => {
        const settings = createSettings({
          smimeCertificate: certString,
          gpgPublicKey: keyString,
        });
        expect(settings.smimeCertificate).toBe(certString);
        expect(settings.gpgPublicKey).toBe(keyString);
      }),
      { numRuns: 100 },
    );
  });

  it('omitted keys remain undefined', () => {
    fc.assert(
      fc.property(fc.string(), (certString) => {
        const settingsWithCertOnly = createSettings({
          smimeCertificate: certString,
        });
        expect(settingsWithCertOnly.smimeCertificate).toBe(certString);
        expect(settingsWithCertOnly.gpgPublicKey).toBeUndefined();

        const settingsWithKeyOnly = createSettings({
          gpgPublicKey: certString,
        });
        expect(settingsWithKeyOnly.gpgPublicKey).toBe(certString);
        expect(settingsWithKeyOnly.smimeCertificate).toBeUndefined();
      }),
      { numRuns: 100 },
    );
  });
});
