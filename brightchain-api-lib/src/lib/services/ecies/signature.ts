import { EciesError, EciesErrorType } from '@brightchain/brightchain-lib';
import { secp256k1 } from '@noble/curves/secp256k1';
import { sha256 } from '@noble/hashes/sha2';
import {
  HexString,
  SignatureBuffer,
  SignatureString,
} from '../../shared-types';
import { EciesCryptoCore } from './cryptoCore';

/**
 * Signature-related functions for ECIES
 */
export class EciesSignature {
  private readonly cryptoCore: EciesCryptoCore;

  constructor(cryptoCore: EciesCryptoCore) {
    this.cryptoCore = cryptoCore;
  }

  /**
   * Signs arbitrary binary data with the given private key.
   * @param privateKey The private key to sign the message with.
   * @param data The data to sign.
   * @returns The signature (64 bytes: r + s).
   */
  public signMessage(privateKey: Buffer, data: Buffer): SignatureBuffer {
    const hash = sha256(data);
    const signature = secp256k1.sign(hash, privateKey, {
      format: 'compact',
      extraEntropy: false,
    });
    return Buffer.from(signature) as SignatureBuffer;
  }

  /**
   * Verifies arbitrary binary data with the given public key.
   * @param publicKey The public key to verify the message with.
   * @param data The data to verify.
   * @param signature The signature to verify (64 bytes: r + s).
   * @returns True if the signature is valid, false otherwise.
   */
  public verifyMessage(
    publicKey: Buffer,
    data: Buffer,
    signature: SignatureBuffer,
  ): boolean {
    if (signature.length !== 64) {
      throw new EciesError(EciesErrorType.InvalidSignature);
    }

    // Normalize and validate the public key
    try {
      publicKey = this.cryptoCore.normalizePublicKey(publicKey);
    } catch {
      throw new EciesError(EciesErrorType.InvalidSenderPublicKey);
    }

    const hash = sha256(data);
    return secp256k1.verify(signature, hash, publicKey);
  }

  /**
   * Converts a signature string to a signature buffer.
   * @param signatureString - The signature string to convert.
   * @returns The signature buffer.
   */
  public signatureStringToSignatureBuffer(
    signatureString: HexString,
  ): SignatureBuffer {
    return Buffer.from(signatureString, 'hex') as SignatureBuffer;
  }

  /**
   * Converts a signature buffer to a signature string.
   * @param signatureBuffer - The signature buffer to convert.
   * @returns The signature string.
   */
  public signatureBufferToSignatureString(
    signatureBuffer: SignatureBuffer,
  ): SignatureString {
    return signatureBuffer.toString('hex') as SignatureString;
  }
}
