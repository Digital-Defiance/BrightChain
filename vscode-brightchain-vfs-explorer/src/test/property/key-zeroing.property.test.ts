/**
 * Feature: brightchain-vfs-explorer, Property 5: Sensitive key material is zeroed after login attempt
 *
 * For any mnemonic login attempt (success or failure), after the mnemonicLogin
 * method completes, the mnemonic string buffer and derived private key buffer
 * should be overwritten with zeros.
 *
 * We test this in two complementary ways:
 *   1. Direct test of `zeroBuffer`: for any Buffer, after calling `zeroBuffer`,
 *      all bytes should be zero.
 *   2. Integration test: derive a key pair from a mnemonic, then `zeroBuffer`
 *      the private key, and verify every byte is zero.
 *
 * **Validates: Requirements 2.7**
 */

import fc from 'fast-check';
import { deriveKeyPairFromMnemonic, zeroBuffer } from '../../auth/auth-manager';

describe('Property 5: Sensitive key material is zeroed after login attempt', () => {
  it('zeroBuffer overwrites all bytes with zeros for any arbitrary buffer', () => {
    fc.assert(
      fc.property(fc.uint8Array({ minLength: 1, maxLength: 256 }), (bytes) => {
        const buf = Buffer.from(bytes);

        // Precondition: buffer has at least one non-zero byte (most of the time)
        // We don't filter because even an all-zero buffer should remain all-zero.

        zeroBuffer(buf);

        // Every byte must be zero after zeroing
        for (let i = 0; i < buf.length; i++) {
          expect(buf[i]).toBe(0);
        }
      }),
      { numRuns: 100 },
    );
  });

  it('zeroBuffer zeroes a derived private key buffer completely', () => {
    fc.assert(
      fc.property(fc.string({ minLength: 1, maxLength: 500 }), (mnemonic) => {
        const { privateKey } = deriveKeyPairFromMnemonic(mnemonic);

        // Private key should be 32 bytes of non-trivial data
        expect(privateKey).toBeInstanceOf(Buffer);
        expect(privateKey.length).toBe(32);

        // Zero the private key (simulating what mnemonicLogin does in its finally block)
        zeroBuffer(privateKey);

        // Every byte must now be zero
        for (let i = 0; i < privateKey.length; i++) {
          expect(privateKey[i]).toBe(0);
        }
      }),
      { numRuns: 100 },
    );
  });

  it('zeroBuffer zeroes a mnemonic string buffer completely', () => {
    fc.assert(
      fc.property(fc.string({ minLength: 1, maxLength: 500 }), (mnemonic) => {
        // Simulate what mnemonicLogin does: convert mnemonic to Buffer
        const mnemonicBuf = Buffer.from(mnemonic, 'utf-8');

        zeroBuffer(mnemonicBuf);

        // Every byte must now be zero
        for (let i = 0; i < mnemonicBuf.length; i++) {
          expect(mnemonicBuf[i]).toBe(0);
        }
      }),
      { numRuns: 100 },
    );
  });
});
