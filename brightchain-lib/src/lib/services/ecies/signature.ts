import { secp256k1 } from '@noble/curves/secp256k1';
import { sha256 } from '@noble/hashes/sha2';
import { SignatureArray, SignatureString } from '../../shared-types';
import { uint8ArrayToHex } from '../../utils';
import { EciesCryptoCore } from './cryptoCore';

/**
 * Browser-compatible ECDSA signature operations
 */
export class EciesSignature {
  private readonly cryptoCore: EciesCryptoCore;

  constructor(cryptoCore: EciesCryptoCore) {
    this.cryptoCore = cryptoCore;
  }

  /**
   * Sign arbitrary binary data with a secp256k1 private key.
   * Returns 64 bytes: [r(32) | s(32)]
   */
  public signMessage(privateKey: Uint8Array, data: Uint8Array): SignatureArray {
    const hash = sha256(data);
    // Use deterministic signatures (RFC 6979) for consistency
    const signature = secp256k1.sign(hash, privateKey, {
      format: 'compact',
      extraEntropy: false,
    });
    return signature as SignatureArray;
  }

  /**
   * Verify signature (64 bytes: [r|s]) over arbitrary binary data against a public key.
   */
  public verifyMessage(
    publicKey: Uint8Array,
    data: Uint8Array,
    signature: SignatureArray,
  ): boolean {
    try {
      if (!signature || signature.length !== 64) return false;
      const hash = sha256(data);
      const normalizedPublicKey = this.cryptoCore.normalizePublicKey(publicKey);

      // Convert signature to Uint8Array if it's a Buffer
      const sigBytes =
        signature instanceof Buffer ? new Uint8Array(signature) : signature;

      // Try direct verification first
      try {
        const directResult = secp256k1.verify(
          sigBytes,
          hash,
          normalizedPublicKey,
        );
        if (directResult) return true;
      } catch {
        // Continue to alternative verification methods
      }

      // If direct verification fails, the signature might be from a different library
      // that uses different nonce generation. Since we can't make @noble/curves
      // verify signatures from ethereumjs-util directly, we'll return false here.
      // The calling code should handle cross-platform verification at a higher level.

      return false;
    } catch (err) {
      console.error('Signature verification failed:', err);
      return false;
    }
  }

  /**
   * Convert signature string to signature buffer
   */
  public signatureStringToSignatureBuffer(
    signatureString: SignatureString,
  ): SignatureArray {
    const cleanHex = signatureString.replace(/^0x/, '');
    const result = new Uint8Array(cleanHex.length / 2);
    for (let i = 0; i < cleanHex.length; i += 2) {
      result[i / 2] = parseInt(cleanHex.substring(i, i + 2), 16);
    }
    return result as SignatureArray;
  }

  /**
   * Convert signature buffer to signature string
   */
  public signatureBufferToSignatureString(
    signatureBuffer: SignatureArray,
  ): SignatureString {
    return uint8ArrayToHex(signatureBuffer) as SignatureString;
  }
}
