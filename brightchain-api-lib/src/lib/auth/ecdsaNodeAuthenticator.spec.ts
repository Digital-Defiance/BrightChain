import { beforeEach, describe, expect, it } from '@jest/globals';
import * as crypto from 'crypto';

import {
  type AuthFailureLogger,
  ECDSANodeAuthenticator,
} from './ecdsaNodeAuthenticator';

/**
 * Helper: generate a secp256k1 key pair as raw bytes.
 * Returns { privateKey: 32 bytes, publicKey: 65 bytes (uncompressed) }
 */
function generateKeyPair(): {
  privateKey: Uint8Array;
  publicKey: Uint8Array;
  compressedPublicKey: Uint8Array;
} {
  const ecdh = crypto.createECDH('secp256k1');
  ecdh.generateKeys();
  return {
    privateKey: new Uint8Array(ecdh.getPrivateKey()),
    publicKey: new Uint8Array(ecdh.getPublicKey()),
    compressedPublicKey: new Uint8Array(
      ecdh.getPublicKey(undefined, 'compressed'),
    ),
  };
}

describe('ECDSANodeAuthenticator', () => {
  const auth = new ECDSANodeAuthenticator();

  describe('createChallenge', () => {
    it('should return 32 bytes', () => {
      const challenge = auth.createChallenge();
      expect(challenge).toBeInstanceOf(Uint8Array);
      expect(challenge.length).toBe(32);
    });

    it('should return different values on each call', () => {
      const c1 = auth.createChallenge();
      const c2 = auth.createChallenge();
      expect(Buffer.from(c1).equals(Buffer.from(c2))).toBe(false);
    });
  });

  describe('signChallenge + verifySignature round-trip', () => {
    it('should sign and verify with the correct key pair', async () => {
      const { privateKey, publicKey } = generateKeyPair();
      const challenge = auth.createChallenge();

      const signature = await auth.signChallenge(challenge, privateKey);
      expect(signature).toBeInstanceOf(Uint8Array);
      expect(signature.length).toBeGreaterThan(0);

      const valid = await auth.verifySignature(challenge, signature, publicKey);
      expect(valid).toBe(true);
    });

    it('should verify with compressed public key', async () => {
      const { privateKey, compressedPublicKey } = generateKeyPair();
      const challenge = auth.createChallenge();

      const signature = await auth.signChallenge(challenge, privateKey);
      const valid = await auth.verifySignature(
        challenge,
        signature,
        compressedPublicKey,
      );
      expect(valid).toBe(true);
    });

    it('should reject signature with wrong public key', async () => {
      const keyPair1 = generateKeyPair();
      const keyPair2 = generateKeyPair();
      const challenge = auth.createChallenge();

      const signature = await auth.signChallenge(
        challenge,
        keyPair1.privateKey,
      );
      const valid = await auth.verifySignature(
        challenge,
        signature,
        keyPair2.publicKey,
      );
      expect(valid).toBe(false);
    });

    it('should reject signature for different challenge', async () => {
      const { privateKey, publicKey } = generateKeyPair();
      const challenge1 = auth.createChallenge();
      const challenge2 = auth.createChallenge();

      const signature = await auth.signChallenge(challenge1, privateKey);
      const valid = await auth.verifySignature(
        challenge2,
        signature,
        publicKey,
      );
      expect(valid).toBe(false);
    });
  });

  describe('verifySignature error handling', () => {
    it('should return false for invalid signature bytes', async () => {
      const { publicKey } = generateKeyPair();
      const challenge = auth.createChallenge();
      const garbage = new Uint8Array(64).fill(0xff);

      const valid = await auth.verifySignature(challenge, garbage, publicKey);
      expect(valid).toBe(false);
    });

    it('should return false for invalid public key', async () => {
      const { privateKey } = generateKeyPair();
      const challenge = auth.createChallenge();
      const signature = await auth.signChallenge(challenge, privateKey);
      const badKey = new Uint8Array(65).fill(0x00);

      const valid = await auth.verifySignature(challenge, signature, badKey);
      expect(valid).toBe(false);
    });

    it('should return false for empty inputs', async () => {
      const valid = await auth.verifySignature(
        new Uint8Array(0),
        new Uint8Array(0),
        new Uint8Array(0),
      );
      expect(valid).toBe(false);
    });
  });

  describe('deriveNodeId', () => {
    it('should return a 64-char hex string (SHA-256)', () => {
      const { publicKey } = generateKeyPair();
      const nodeId = auth.deriveNodeId(publicKey);
      expect(nodeId).toMatch(/^[0-9a-f]{64}$/);
    });

    it('should be deterministic for the same public key', () => {
      const { publicKey } = generateKeyPair();
      const id1 = auth.deriveNodeId(publicKey);
      const id2 = auth.deriveNodeId(publicKey);
      expect(id1).toBe(id2);
    });

    it('should produce different IDs for different keys', () => {
      const kp1 = generateKeyPair();
      const kp2 = generateKeyPair();
      const id1 = auth.deriveNodeId(kp1.publicKey);
      const id2 = auth.deriveNodeId(kp2.publicKey);
      expect(id1).not.toBe(id2);
    });

    it('should produce different IDs for compressed vs uncompressed forms', () => {
      const { publicKey, compressedPublicKey } = generateKeyPair();
      const id1 = auth.deriveNodeId(publicKey);
      const id2 = auth.deriveNodeId(compressedPublicKey);
      // Different byte representations produce different hashes
      expect(id1).not.toBe(id2);
    });
  });

  /**
   * Requirement 9.3: Failed authentication attempts SHALL be logged
   * with the requesting node ID and operation type.
   */
  describe('authentication failure logging (Requirement 9.3)', () => {
    interface LoggedFailure {
      nodeId: string;
      operationType: string;
    }

    let failures: LoggedFailure[];
    let authWithLogger: ECDSANodeAuthenticator;

    beforeEach(() => {
      failures = [];
      const logger: AuthFailureLogger = {
        logAuthFailure(nodeId: string, operationType: string) {
          failures.push({ nodeId, operationType });
        },
      };
      authWithLogger = new ECDSANodeAuthenticator(logger);
    });

    it('should log when signature verification fails with wrong key pair', async () => {
      const keyPair1 = generateKeyPair();
      const keyPair2 = generateKeyPair();
      const challenge = authWithLogger.createChallenge();

      const signature = await authWithLogger.signChallenge(
        challenge,
        keyPair1.privateKey,
      );
      await authWithLogger.verifySignature(
        challenge,
        signature,
        keyPair2.publicKey,
      );

      expect(failures.length).toBe(1);
      const expectedNodeId = authWithLogger.deriveNodeId(keyPair2.publicKey);
      expect(failures[0].nodeId).toBe(expectedNodeId);
      expect(failures[0].operationType).toBe('signature_verification');
    });

    it('should include operation type in the logged failure', async () => {
      const keyPair1 = generateKeyPair();
      const keyPair2 = generateKeyPair();
      const challenge = authWithLogger.createChallenge();

      const signature = await authWithLogger.signChallenge(
        challenge,
        keyPair1.privateKey,
      );
      await authWithLogger.verifySignature(
        challenge,
        signature,
        keyPair2.publicKey,
      );

      expect(failures.length).toBe(1);
      expect(failures[0].operationType).toBe('signature_verification');
    });

    it('should log when invalid signature bytes cause rejection', async () => {
      const { publicKey } = generateKeyPair();
      const challenge = authWithLogger.createChallenge();
      const garbage = new Uint8Array(64).fill(0xff);

      await authWithLogger.verifySignature(challenge, garbage, publicKey);

      expect(failures.length).toBe(1);
      const expectedNodeId = authWithLogger.deriveNodeId(publicKey);
      expect(failures[0].nodeId).toBe(expectedNodeId);
    });

    it('should log with node ID for invalid public key', async () => {
      const { privateKey } = generateKeyPair();
      const challenge = authWithLogger.createChallenge();
      const signature = await authWithLogger.signChallenge(
        challenge,
        privateKey,
      );
      const badKey = new Uint8Array(10).fill(0x00);

      await authWithLogger.verifySignature(challenge, signature, badKey);

      expect(failures.length).toBe(1);
      expect(failures[0].operationType).toBe('signature_verification');
    });

    it('should NOT log when signature verification succeeds', async () => {
      const { privateKey, publicKey } = generateKeyPair();
      const challenge = authWithLogger.createChallenge();

      const signature = await authWithLogger.signChallenge(
        challenge,
        privateKey,
      );
      const valid = await authWithLogger.verifySignature(
        challenge,
        signature,
        publicKey,
      );

      expect(valid).toBe(true);
      expect(failures.length).toBe(0);
    });
  });
});
