/**
 * Unit Tests for MembershipProofService
 *
 * Tests cover:
 * - Valid proof generation and verification
 * - Invalid proof rejection (tampered proof, wrong keys, wrong content)
 * - Empty member set edge case
 * - Single member ring
 * - Non-member signer rejection
 *
 * @see Requirements 18
 */
import * as secp256k1 from 'secp256k1';

import { MembershipProofService } from './membershipProofService';

/**
 * Generate a valid secp256k1 key pair for testing.
 */
function generateKeyPair(): { privateKey: Uint8Array; publicKey: Uint8Array } {
  let privateKey: Uint8Array;
  do {
    privateKey = new Uint8Array(32);
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    require('crypto').randomFillSync(privateKey);
  } while (!secp256k1.privateKeyVerify(privateKey));

  const publicKey = secp256k1.publicKeyCreate(privateKey, true);
  return { privateKey, publicKey };
}

describe('MembershipProofService', () => {
  let service: MembershipProofService;
  const keyPairs = Array.from({ length: 5 }, () => generateKeyPair());
  const contentHash = new Uint8Array(32);

  beforeAll(() => {
    service = new MembershipProofService();
    // Fill content hash with deterministic test data
    for (let i = 0; i < 32; i++) {
      contentHash[i] = i;
    }
  });

  describe('generateProof and verifyProof', () => {
    it('should generate a valid proof that verifies correctly', async () => {
      const memberKeys = keyPairs.slice(0, 3).map((kp) => kp.publicKey);
      const signerPrivateKey = keyPairs[1].privateKey;

      const proof = await service.generateProof(
        signerPrivateKey,
        memberKeys,
        contentHash,
      );

      expect(proof).toBeInstanceOf(Uint8Array);
      expect(proof.length).toBeGreaterThan(0);

      const valid = await service.verifyProof(proof, memberKeys, contentHash);
      expect(valid).toBe(true);
    });

    it('should work with a single member ring', async () => {
      const memberKeys = [keyPairs[0].publicKey];
      const signerPrivateKey = keyPairs[0].privateKey;

      const proof = await service.generateProof(
        signerPrivateKey,
        memberKeys,
        contentHash,
      );

      const valid = await service.verifyProof(proof, memberKeys, contentHash);
      expect(valid).toBe(true);
    });

    it('should work with uncompressed public keys', async () => {
      // Convert to uncompressed format (65 bytes)
      const uncompressedKeys = keyPairs
        .slice(0, 3)
        .map((kp) => secp256k1.publicKeyConvert(kp.publicKey, false));
      const signerPrivateKey = keyPairs[0].privateKey;

      const proof = await service.generateProof(
        signerPrivateKey,
        uncompressedKeys,
        contentHash,
      );

      const valid = await service.verifyProof(
        proof,
        uncompressedKeys,
        contentHash,
      );
      expect(valid).toBe(true);
    });

    it('should verify with any signer position in the ring', async () => {
      const memberKeys = keyPairs.slice(0, 4).map((kp) => kp.publicKey);

      for (let i = 0; i < 4; i++) {
        const proof = await service.generateProof(
          keyPairs[i].privateKey,
          memberKeys,
          contentHash,
        );

        const valid = await service.verifyProof(proof, memberKeys, contentHash);
        expect(valid).toBe(true);
      }
    });
  });

  describe('invalid proof rejection', () => {
    it('should reject proof verified against different content hash', async () => {
      const memberKeys = keyPairs.slice(0, 3).map((kp) => kp.publicKey);
      const signerPrivateKey = keyPairs[0].privateKey;

      const proof = await service.generateProof(
        signerPrivateKey,
        memberKeys,
        contentHash,
      );

      const differentHash = new Uint8Array(32).fill(0xff);
      const valid = await service.verifyProof(proof, memberKeys, differentHash);
      expect(valid).toBe(false);
    });

    it('should reject proof verified against different member set', async () => {
      const memberKeys = keyPairs.slice(0, 3).map((kp) => kp.publicKey);
      const signerPrivateKey = keyPairs[0].privateKey;

      const proof = await service.generateProof(
        signerPrivateKey,
        memberKeys,
        contentHash,
      );

      // Use a different set of keys for verification
      const differentKeys = keyPairs.slice(2, 5).map((kp) => kp.publicKey);
      const valid = await service.verifyProof(
        proof,
        differentKeys,
        contentHash,
      );
      expect(valid).toBe(false);
    });

    it('should reject a tampered proof', async () => {
      const memberKeys = keyPairs.slice(0, 3).map((kp) => kp.publicKey);
      const signerPrivateKey = keyPairs[0].privateKey;

      const proof = await service.generateProof(
        signerPrivateKey,
        memberKeys,
        contentHash,
      );

      // Tamper with a byte in the middle of the proof
      const tampered = new Uint8Array(proof);
      tampered[40] ^= 0x01;

      const valid = await service.verifyProof(
        tampered,
        memberKeys,
        contentHash,
      );
      expect(valid).toBe(false);
    });

    it('should reject a truncated proof', async () => {
      const memberKeys = keyPairs.slice(0, 3).map((kp) => kp.publicKey);
      const signerPrivateKey = keyPairs[0].privateKey;

      const proof = await service.generateProof(
        signerPrivateKey,
        memberKeys,
        contentHash,
      );

      // Truncate the proof
      const truncated = proof.slice(0, proof.length - 10);
      const valid = await service.verifyProof(
        truncated,
        memberKeys,
        contentHash,
      );
      expect(valid).toBe(false);
    });

    it('should reject an empty proof', async () => {
      const memberKeys = keyPairs.slice(0, 3).map((kp) => kp.publicKey);
      const valid = await service.verifyProof(
        new Uint8Array(0),
        memberKeys,
        contentHash,
      );
      expect(valid).toBe(false);
    });

    it('should reject proof with wrong version byte', async () => {
      const memberKeys = keyPairs.slice(0, 3).map((kp) => kp.publicKey);
      const signerPrivateKey = keyPairs[0].privateKey;

      const proof = await service.generateProof(
        signerPrivateKey,
        memberKeys,
        contentHash,
      );

      // Change version byte
      const wrongVersion = new Uint8Array(proof);
      wrongVersion[0] = 0xff;

      const valid = await service.verifyProof(
        wrongVersion,
        memberKeys,
        contentHash,
      );
      expect(valid).toBe(false);
    });
  });

  describe('edge cases', () => {
    it('should throw when generating proof with empty member set', async () => {
      const signerPrivateKey = keyPairs[0].privateKey;

      await expect(
        service.generateProof(signerPrivateKey, [], contentHash),
      ).rejects.toThrow('Member public key set must not be empty');
    });

    it('should return false when verifying against empty member set', async () => {
      const proof = new Uint8Array(1 + 2 + 32 + 32); // minimal valid-looking proof
      const valid = await service.verifyProof(proof, [], contentHash);
      expect(valid).toBe(false);
    });

    it('should throw when signer is not in the member set', async () => {
      const memberKeys = keyPairs.slice(0, 3).map((kp) => kp.publicKey);
      // Use a key that's not in the member set
      const outsider = generateKeyPair();

      await expect(
        service.generateProof(outsider.privateKey, memberKeys, contentHash),
      ).rejects.toThrow('Signer is not a member of the provided key set');
    });
  });
});
