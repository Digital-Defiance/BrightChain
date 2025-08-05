import {
  ecrecover,
  ecsign,
  hashPersonalMessage,
  publicToAddress,
  toBuffer,
} from 'ethereumjs-util';
import { ECIES } from '../../constants';
import { EciesErrorType } from '../../enumerations/eciesErrorType';
import { EciesError } from '../../errors/eciesError';
import { HexString, SignatureBuffer, SignatureString } from '../../types';
import { EciesCryptoCore } from './crypto-core';

/**
 * Signature-related functions for ECIES
 */
export class EciesSignature {
  private readonly cryptoCore: EciesCryptoCore;

  constructor(cryptoCore: EciesCryptoCore) {
    this.cryptoCore = cryptoCore;
  }

  /**
   * Signs a message with the given private key.
   * @param privateKey The private key to sign the message with.
   * @param data The data to sign.
   * @returns The signature.
   */
  public signMessage(privateKey: Buffer, data: Buffer): SignatureBuffer {
    const messageHash = hashPersonalMessage(data);
    const signature = ecsign(messageHash, privateKey);
    return Buffer.concat([
      toBuffer(signature.r),
      toBuffer(signature.s),
      toBuffer(signature.v - 27),
    ]) as unknown as SignatureBuffer;
  }

  /**
   * Verifies a message with the given public key.
   * @param publicKey The public key to verify the message with.
   * @param data The data to verify.
   * @param signature The signature to verify.
   * @returns True if the signature is valid, false otherwise.
   */
  public verifyMessage(
    publicKey: Buffer,
    data: Buffer,
    signature: SignatureBuffer,
  ): boolean {
    if (signature.length !== ECIES.SIGNATURE_SIZE) {
      throw new EciesError(EciesErrorType.InvalidSignature);
    }

    // Normalize and validate the public key
    try {
      publicKey = this.cryptoCore.normalizePublicKey(publicKey);
    } catch (error) {
      throw new EciesError(EciesErrorType.InvalidSenderPublicKey);
    }

    const messageHash = hashPersonalMessage(data);
    const r = signature.subarray(0, 32);
    const s = signature.subarray(32, 64);
    const v = signature[64] + 27;

    const recoveredPublicKey = ecrecover(messageHash, v, r, s);
    const derivedAddress = publicToAddress(recoveredPublicKey);

    // Extract the key without the 0x04 prefix for address comparison
    const knownAddress = publicToAddress(publicKey.subarray(1));

    return derivedAddress.equals(knownAddress);
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
