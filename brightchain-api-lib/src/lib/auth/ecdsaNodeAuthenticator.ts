/**
 * ECDSA Node Authenticator - Node.js implementation of INodeAuthenticator.
 *
 * Uses Node.js `crypto` module for all cryptographic operations:
 * - Challenge: 32 random bytes via crypto.randomBytes
 * - Sign/verify: ECDSA with secp256k1 curve (via JWK key import)
 * - Node ID derivation: SHA-256 hash of public key (hex string)
 *
 * @see Requirements 9.1, 9.2, 9.3, 9.5
 */

import type { INodeAuthenticator } from '@brightchain/brightchain-lib';
import * as crypto from 'crypto';

/**
 * Optional logger for authentication failures.
 * Requirement 9.3: Failed authentication attempts SHALL be logged
 * with the requesting node ID and operation type.
 */
export interface AuthFailureLogger {
  logAuthFailure(nodeId: string, operationType: string): void;
}

export class ECDSANodeAuthenticator implements INodeAuthenticator {
  private readonly logger?: AuthFailureLogger;

  constructor(logger?: AuthFailureLogger) {
    this.logger = logger;
  }

  /** Generate a 32-byte random challenge nonce. */
  createChallenge(): Uint8Array {
    return new Uint8Array(crypto.randomBytes(32));
  }

  /**
   * Sign a challenge with the node's ECDSA private key (secp256k1).
   * The private key must be a raw 32-byte secp256k1 private key.
   * Returns a DER-encoded ECDSA signature.
   */
  async signChallenge(
    challenge: Uint8Array,
    privateKey: Uint8Array,
  ): Promise<Uint8Array> {
    const ecdh = crypto.createECDH('secp256k1');
    ecdh.setPrivateKey(Buffer.from(privateKey));
    const uncompressedPub = ecdh.getPublicKey();

    const keyObject = crypto.createPrivateKey({
      key: this.buildPrivateJWK(privateKey, uncompressedPub),
      format: 'jwk',
    });

    const signature = crypto.sign(null, Buffer.from(challenge), keyObject);
    return new Uint8Array(signature);
  }

  /**
   * Verify an ECDSA signature against a public key (secp256k1).
   * Accepts uncompressed (65 bytes) or compressed (33 bytes) keys.
   * Logs authentication failures when a logger is provided (Requirement 9.3).
   */
  async verifySignature(
    challenge: Uint8Array,
    signature: Uint8Array,
    publicKey: Uint8Array,
  ): Promise<boolean> {
    try {
      const uncompressed = this.ensureUncompressed(publicKey);
      const keyObject = crypto.createPublicKey({
        key: this.buildPublicJWK(uncompressed),
        format: 'jwk',
      });
      const result = crypto.verify(
        null,
        Buffer.from(challenge),
        keyObject,
        Buffer.from(signature),
      );
      if (!result && this.logger) {
        const nodeId = this.deriveNodeId(publicKey);
        this.logger.logAuthFailure(nodeId, 'signature_verification');
      }
      return result;
    } catch {
      if (this.logger) {
        const nodeId = this.deriveNodeId(publicKey);
        this.logger.logAuthFailure(nodeId, 'signature_verification');
      }
      return false;
    }
  }

  /** Derive a node ID from a public key via SHA-256 hash (hex). */
  deriveNodeId(publicKey: Uint8Array): string {
    return crypto
      .createHash('sha256')
      .update(Buffer.from(publicKey))
      .digest('hex');
  }

  /** Convert compressed (33-byte) public key to uncompressed (65-byte). */
  private ensureUncompressed(publicKey: Uint8Array): Buffer {
    if (publicKey.length === 65 && publicKey[0] === 0x04) {
      return Buffer.from(publicKey);
    }
    if (
      publicKey.length === 33 &&
      (publicKey[0] === 0x02 || publicKey[0] === 0x03)
    ) {
      return crypto.ECDH.convertKey(
        Buffer.from(publicKey),
        'secp256k1',
        undefined,
        undefined,
        'uncompressed',
      ) as Buffer;
    }
    throw new Error(
      `Invalid secp256k1 public key: expected 33 or 65 bytes, got ${publicKey.length}`,
    );
  }

  /** Build a JWK for a secp256k1 private key. */
  private buildPrivateJWK(
    rawPrivateKey: Uint8Array,
    uncompressedPublicKey: Buffer,
  ): crypto.JsonWebKey {
    const x = uncompressedPublicKey.subarray(1, 33);
    const y = uncompressedPublicKey.subarray(33, 65);
    return {
      kty: 'EC',
      crv: 'secp256k1',
      x: x.toString('base64url'),
      y: y.toString('base64url'),
      d: Buffer.from(rawPrivateKey).toString('base64url'),
    };
  }

  /** Build a JWK for a secp256k1 public key (uncompressed 65-byte input). */
  private buildPublicJWK(uncompressedPublicKey: Buffer): crypto.JsonWebKey {
    const x = uncompressedPublicKey.subarray(1, 33);
    const y = uncompressedPublicKey.subarray(33, 65);
    return {
      kty: 'EC',
      crv: 'secp256k1',
      x: x.toString('base64url'),
      y: y.toString('base64url'),
    };
  }
}
