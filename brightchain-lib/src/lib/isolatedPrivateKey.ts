import { createHmac } from 'crypto';
import { PrivateKey, PublicKey } from 'paillier-bigint';
import { VOTING } from './constants';
import { IsolatedKeyErrorType } from './enumerations/isolatedKeyErrorType';
import { IsolatedKeyError } from './errors/isolatedKeyError';
import { IsolatedPublicKey } from './isolatedPublicKey';

export class IsolatedPrivateKey extends PrivateKey {
  private readonly _originalKeyId: Buffer;
  private readonly _originalInstanceId: Buffer;
  private readonly _originalPublicKey: IsolatedPublicKey;

  constructor(lambda: bigint, mu: bigint, publicKey: IsolatedPublicKey) {
    if (!IsolatedPublicKey.isIsolatedPublicKey(publicKey)) {
      throw new IsolatedKeyError(IsolatedKeyErrorType.InvalidPublicKey);
    }

    // Create a base PublicKey instance for the parent constructor
    const basePublicKey = new PublicKey(publicKey.n, publicKey.g);
    super(lambda, mu, basePublicKey);

    // Store the isolated public key for our own use
    this._originalKeyId = publicKey.getKeyId();
    this._originalInstanceId = publicKey.getInstanceId();
    this._originalPublicKey = publicKey;
  }

  override decrypt(taggedCiphertext: bigint): bigint {
    // First verify if we're using a recovered key by checking the public key instance
    if (!IsolatedPublicKey.isIsolatedPublicKey(this._originalPublicKey)) {
      throw new IsolatedKeyError(IsolatedKeyErrorType.InvalidPublicKey);
    }

    // Compare instance IDs before any ciphertext operations
    const currentInstanceId = this._originalPublicKey.getInstanceId();

    // This check must happen before any ciphertext operations
    if (!currentInstanceId.equals(this._originalInstanceId)) {
      throw new IsolatedKeyError(IsolatedKeyErrorType.InvalidKeyId);
    }

    // Now that we've verified the instance ID, we can proceed with ciphertext operations
    try {
      const hmacLength = 64;
      const ciphertextString = taggedCiphertext.toString(VOTING.KEY_RADIX);
      const receivedHmac = ciphertextString.slice(-hmacLength);
      const ciphertextHex = ciphertextString.slice(0, -hmacLength);
      const ciphertextBigInt = BigInt(`0x${ciphertextHex}`);

      // Calculate expected HMAC using the original instance ID
      const expectedHmac = createHmac(
        VOTING.HASH_ALGORITHM,
        Buffer.concat([this._originalKeyId, this._originalInstanceId]),
      )
        .update(ciphertextBigInt.toString(VOTING.KEY_RADIX))
        .digest(VOTING.DIGEST_FORMAT);

      // Verify HMAC
      if (receivedHmac !== expectedHmac) {
        throw new IsolatedKeyError(IsolatedKeyErrorType.InvalidKeyFormat);
      }

      // Finally decrypt the ciphertext using the parent class implementation
      return super.decrypt(ciphertextBigInt);
    } catch (error) {
      if (error instanceof IsolatedKeyError) {
        throw error;
      }
      throw new IsolatedKeyError(IsolatedKeyErrorType.InvalidKeyFormat);
    }
  }
}
