import { createHmac } from 'crypto';
import { PrivateKey } from 'paillier-bigint';
import { IsolatedKeyErrorType } from './enumerations/isolatedKeyErrorType';
import { IsolatedKeyError } from './errors/isolatedKeyError';
import { IsolatedPublicKey } from './isolatedPublicKey';

export class IsolatedPrivateKey extends PrivateKey {
  private readonly _originalKeyId: Buffer;
  private readonly _originalInstanceId: Buffer;
  private readonly _originalPublicKey: IsolatedPublicKey;

  constructor(lambda: bigint, mu: bigint, publicKey: IsolatedPublicKey) {
    if (!(publicKey instanceof IsolatedPublicKey)) {
      throw new IsolatedKeyError(IsolatedKeyErrorType.InvalidPublicKey);
    }
    super(lambda, mu, publicKey);
    this._originalKeyId = publicKey.getKeyId();
    this._originalInstanceId = publicKey.getInstanceId();
    this._originalPublicKey = publicKey;
  }

  override decrypt(taggedCiphertext: bigint): bigint {
    // First verify if we're using a recovered key by checking the public key instance
    if (!(this.publicKey instanceof IsolatedPublicKey)) {
      throw new IsolatedKeyError(IsolatedKeyErrorType.InvalidPublicKey);
    }

    // Compare instance IDs before any ciphertext operations
    const currentPublicKey = this.publicKey;
    const currentInstanceId = currentPublicKey.getInstanceId();

    // This check must happen before any ciphertext operations
    if (!currentInstanceId.equals(this._originalInstanceId)) {
      throw new IsolatedKeyError(IsolatedKeyErrorType.InvalidKeyId);
    }

    // Now that we've verified the instance ID, we can proceed with ciphertext operations
    try {
      const hmacLength = 64;
      const ciphertextString = taggedCiphertext.toString(16);
      const receivedHmac = ciphertextString.slice(-hmacLength);
      const ciphertextHex = ciphertextString.slice(0, -hmacLength);
      const ciphertextBigInt = BigInt(`0x${ciphertextHex}`);

      // Calculate expected HMAC using the original instance ID
      const expectedHmac = createHmac(
        'sha256',
        Buffer.concat([this._originalKeyId, this._originalInstanceId]),
      )
        .update(ciphertextBigInt.toString(16))
        .digest('hex');

      // Verify HMAC
      if (receivedHmac !== expectedHmac) {
        throw new IsolatedKeyError(IsolatedKeyErrorType.InvalidKeyFormat);
      }

      // Finally decrypt the ciphertext
      return super.decrypt(ciphertextBigInt);
    } catch (error) {
      if (error instanceof IsolatedKeyError) {
        throw error;
      }
      throw new IsolatedKeyError(IsolatedKeyErrorType.InvalidKeyFormat);
    }
  }
}
