import { createHmac } from 'crypto';
import { PrivateKey } from 'paillier-bigint';
import { IsolatedPublicKey } from './isolatedPublicKey';

export class IsolatedPrivateKey extends PrivateKey {
  private readonly _originalKeyId: Buffer;
  private readonly _originalInstanceId: Buffer;
  private readonly _originalPublicKey: IsolatedPublicKey;

  constructor(lambda: bigint, mu: bigint, publicKey: IsolatedPublicKey) {
    super(lambda, mu, publicKey);
    if (!(publicKey instanceof IsolatedPublicKey)) {
      throw new Error('Invalid public key: must be an isolated key');
    }
    this._originalKeyId = publicKey.getKeyId();
    this._originalInstanceId = publicKey.getInstanceId();
    this._originalPublicKey = publicKey;
  }

  override decrypt(taggedCiphertext: bigint): bigint {
    // Verify key instance hasn't changed
    const currentPublicKey = this.publicKey as IsolatedPublicKey;

    if (!currentPublicKey.getInstanceId().equals(this._originalInstanceId)) {
      throw new Error(
        'Key isolation violation: public key instance has changed',
      );
    }

    const hmacLength = 64;
    const ciphertextString = taggedCiphertext.toString(16);
    const receivedHmac = ciphertextString.slice(-hmacLength);
    const ciphertextHex = ciphertextString.slice(0, -hmacLength);

    let ciphertextBigInt: bigint;
    try {
      ciphertextBigInt = BigInt(`0x${ciphertextHex}`);
    } catch (error) {
      throw new Error('Key isolation violation: invalid ciphertext format');
    }

    // Calculate expected HMAC using original key ID and instance ID
    const expectedHmac = createHmac(
      'sha256',
      Buffer.concat([this._originalKeyId, this._originalInstanceId]),
    )
      .update(ciphertextBigInt.toString(16))
      .digest('hex');

    if (receivedHmac !== expectedHmac) {
      throw new Error('Key isolation violation: HMAC verification failed');
    }

    return super.decrypt(ciphertextBigInt);
  }
}
