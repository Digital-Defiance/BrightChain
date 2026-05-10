/**
 * Feature: brightchain-vfs-explorer, Property 3: Mnemonic key derivation produces valid key pair
 *
 * For any valid BIP-39 mnemonic phrase (simplified: any non-empty string),
 * deriving the ECIES key pair should produce a non-null private key (32 bytes)
 * and a corresponding public key (65 bytes, uncompressed secp256k1) such that
 * signing a random message with the private key and verifying with the public
 * key succeeds.
 *
 * **Validates: Requirements 2.2**
 */

import * as crypto from 'crypto';
import fc from 'fast-check';
import { deriveKeyPairFromMnemonic } from '../../auth/auth-manager';

/**
 * Build a proper DER-encoded EC private key for secp256k1 that Node.js
 * crypto can consume. The full SEC 1 structure includes the public key,
 * which is required for reliable signing across all key values.
 */
function buildSecp256k1PrivateKeyPem(
  privateKey: Buffer,
  publicKey: Buffer,
): string {
  // SEC 1 ECPrivateKey structure for secp256k1:
  // SEQUENCE {
  //   INTEGER 1 (version)
  //   OCTET STRING (32 bytes private key)
  //   [0] OID 1.3.132.0.10 (secp256k1)
  //   [1] BIT STRING (public key)
  // }
  const version = Buffer.from('020101', 'hex');
  const privKeyOctet = Buffer.concat([Buffer.from('0420', 'hex'), privateKey]);
  const curveOid = Buffer.from('a00706052b8104000a', 'hex');
  const pubBitString = Buffer.concat([
    Buffer.from('a14403420004', 'hex'), // [1] BIT STRING header, 66 bytes, 0 unused bits, 0x04 prefix
    publicKey.subarray(1), // strip the 0x04 prefix (already in header)
  ]);

  const innerContent = Buffer.concat([
    version,
    privKeyOctet,
    curveOid,
    pubBitString,
  ]);

  // Wrap in outer SEQUENCE
  const seqHeader = Buffer.from([0x30, innerContent.length]);
  const der = Buffer.concat([seqHeader, innerContent]);

  return (
    '-----BEGIN EC PRIVATE KEY-----\n' +
    der.toString('base64') +
    '\n-----END EC PRIVATE KEY-----'
  );
}

/**
 * Build a SPKI PEM for a secp256k1 uncompressed public key.
 */
function buildSecp256k1PublicKeyPem(publicKey: Buffer): string {
  // SubjectPublicKeyInfo for EC secp256k1
  const spkiPrefix = Buffer.from(
    '3056301006072a8648ce3d020106052b8104000a034200',
    'hex',
  );
  const spkiDer = Buffer.concat([spkiPrefix, publicKey]);
  return (
    '-----BEGIN PUBLIC KEY-----\n' +
    spkiDer.toString('base64') +
    '\n-----END PUBLIC KEY-----'
  );
}

describe('Property 3: Mnemonic key derivation produces valid key pair', () => {
  it('produces a 32-byte private key and 65-byte uncompressed public key for any non-empty mnemonic', () => {
    fc.assert(
      fc.property(fc.string({ minLength: 1, maxLength: 500 }), (mnemonic) => {
        const { privateKey, publicKey } = deriveKeyPairFromMnemonic(mnemonic);

        // Private key must be exactly 32 bytes (secp256k1 scalar)
        expect(privateKey).toBeInstanceOf(Buffer);
        expect(privateKey.length).toBe(32);

        // Public key must be exactly 65 bytes (0x04 + 32-byte X + 32-byte Y)
        expect(publicKey).toBeInstanceOf(Buffer);
        expect(publicKey.length).toBe(65);
        // Uncompressed public key starts with 0x04
        expect(publicKey[0]).toBe(0x04);
      }),
      { numRuns: 100 },
    );
  });

  it('signing with the derived private key and verifying with the public key succeeds', () => {
    fc.assert(
      fc.property(
        fc.string({ minLength: 1, maxLength: 500 }),
        fc.uint8Array({ minLength: 1, maxLength: 256 }),
        (mnemonic, messageBytes) => {
          const { privateKey, publicKey } = deriveKeyPairFromMnemonic(mnemonic);
          const message = Buffer.from(messageBytes);

          // Sign with the derived private key
          const privPem = buildSecp256k1PrivateKeyPem(privateKey, publicKey);
          const sign = crypto.createSign('SHA256');
          sign.update(message);
          sign.end();
          const signature = sign.sign(privPem);

          expect(signature).toBeInstanceOf(Buffer);
          expect(signature.length).toBeGreaterThan(0);

          // Verify with the corresponding public key
          const pubPem = buildSecp256k1PublicKeyPem(publicKey);
          const verify = crypto.createVerify('SHA256');
          verify.update(message);
          const isValid = verify.verify(pubPem, signature);

          expect(isValid).toBe(true);
        },
      ),
      { numRuns: 100 },
    );
  });
});
