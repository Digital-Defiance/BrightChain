/**
 * Property-Based Tests: Deterministic key derivation round-trip
 *
 * Feature: user-provided-mnemonic-brightchain, Property 6: Deterministic key derivation round-trip
 *
 * Tests that Member.newMember(eciesService, ..., forceMnemonic=mnemonic)
 * produces the same public key when called twice with the same mnemonic,
 * and the returned mnemonic equals the input.
 *
 * **Validates: Requirements 4.1**
 */

import { ServiceProvider } from '@brightchain/brightchain-lib';
import {
  EmailString,
  MemberType,
  SecureString,
} from '@digitaldefiance/ecies-lib';
import { Member } from '@digitaldefiance/node-ecies-lib';
import * as bip39 from 'bip39';
import * as fc from 'fast-check';

jest.setTimeout(120_000);

// ─── Generators ─────────────────────────────────────────────────────────────

/**
 * Generate a valid BIP39 mnemonic using the real bip39 library.
 * We pre-generate a pool of mnemonics and pick from them to avoid
 * the overhead of generating one per fast-check iteration inline.
 */
const MNEMONIC_POOL_SIZE = 120;
const mnemonicPool: string[] = [];
for (let i = 0; i < MNEMONIC_POOL_SIZE; i++) {
  mnemonicPool.push(bip39.generateMnemonic());
}

const validBip39MnemonicArb = fc
  .integer({ min: 0, max: mnemonicPool.length - 1 })
  .map((idx) => mnemonicPool[idx]);

// ─── Test Suite ─────────────────────────────────────────────────────────────

describe('Property 6: Deterministic key derivation round-trip', () => {
  const eciesService = ServiceProvider.getInstance().eciesService;

  it('produces the same public key when called twice with the same mnemonic', () => {
    fc.assert(
      fc.property(validBip39MnemonicArb, (mnemonic) => {
        const email = new EmailString('roundtrip@test.local');

        const result1 = Member.newMember(
          eciesService,
          MemberType.User,
          'roundtrip-user',
          email,
          new SecureString(mnemonic),
        );

        const result2 = Member.newMember(
          eciesService,
          MemberType.User,
          'roundtrip-user',
          email,
          new SecureString(mnemonic),
        );

        // Same mnemonic → same public key
        expect(Buffer.from(result1.member.publicKey)).toEqual(
          Buffer.from(result2.member.publicKey),
        );

        // Returned mnemonic equals the input
        expect(result1.mnemonic.value).toBe(mnemonic);
        expect(result2.mnemonic.value).toBe(mnemonic);

        // Cleanup
        result1.member.dispose();
        result2.member.dispose();
      }),
      { numRuns: 100 },
    );
  });
});
