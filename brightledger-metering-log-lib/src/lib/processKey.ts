import { ed25519 } from '@noble/curves/ed25519';
import { blake3 } from '@noble/hashes/blake3';

/**
 * An Ed25519 signing key used to authenticate metering-log checkpoints.
 *
 * The fingerprint (BLAKE3 of the public key) identifies the key in sidecar
 * entries and genesis records without requiring the public key to be stored
 * inline in every record.
 */
export interface IProcessKey {
  /** Ed25519 32-byte private scalar. */
  readonly privateKey: Uint8Array;

  /** Ed25519 32-byte compressed public key. */
  readonly publicKey: Uint8Array;

  /** 32-byte BLAKE3 hash of the public key (Req 4.2). */
  readonly fingerprint: Uint8Array;
}

/**
 * Generate a fresh Ed25519 process key with a pre-computed fingerprint.
 */
export function generateProcessKey(): IProcessKey {
  const privateKey = ed25519.utils.randomPrivateKey();
  const publicKey = ed25519.getPublicKey(privateKey);
  const fingerprint = blake3(publicKey);
  return { privateKey, publicKey, fingerprint };
}

/**
 * Derive the fingerprint (BLAKE3 of the public key) from a raw public key
 * bytes.
 */
export function deriveFingerprint(publicKey: Uint8Array): Uint8Array {
  return blake3(publicKey);
}

/**
 * Sign a message (typically the 32-byte output of `computeSignMessage`) with
 * the given process key.  Returns a 64-byte Ed25519 signature.
 */
export function signMessage(key: IProcessKey, message: Uint8Array): Uint8Array {
  return ed25519.sign(message, key.privateKey);
}

/**
 * Verify an Ed25519 signature against a known public key.
 * Returns `false` for any verification failure instead of throwing.
 */
export function verifySignature(
  publicKey: Uint8Array,
  message: Uint8Array,
  sig: Uint8Array,
): boolean {
  try {
    return ed25519.verify(sig, message, publicKey);
  } catch {
    return false;
  }
}
