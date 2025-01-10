import { createHash } from 'crypto';
import { PrivateKey } from 'paillier-bigint';
import { IsolatedPublicKey } from './isolatedPublicKey';

export class IsolatedPrivateKey extends PrivateKey {
  private readonly _originalKeyId: Buffer;
  private readonly _originalInstanceId: Buffer;

  constructor(lambda: bigint, mu: bigint, publicKey: IsolatedPublicKey) {
    super(lambda, mu, publicKey);
    if (!(publicKey instanceof IsolatedPublicKey)) {
      throw new Error('Invalid public key: must be an isolated key');
    }
    this._originalKeyId = publicKey.getKeyId();
    this._originalInstanceId = publicKey.getInstanceId();
  }

  private extractInstanceId(taggedCiphertext: bigint): Buffer {
    // Extract instance ID from least significant 256 bits
    const instanceIdBigInt = taggedCiphertext & ((1n << 256n) - 1n);
    return Buffer.from(instanceIdBigInt.toString(16).padStart(64, '0'), 'hex');
  }

  private extractCiphertext(taggedCiphertext: bigint): bigint {
    // Remove instance ID tag by shifting right 256 bits
    return taggedCiphertext >> 256n;
  }

  override decrypt(taggedCiphertext: bigint): bigint {
    if (!(this.publicKey instanceof IsolatedPublicKey)) {
      throw new Error('Key isolation violation: invalid public key type');
    }

    // Extract and verify instance ID from ciphertext
    const ciphertextInstanceId = this.extractInstanceId(taggedCiphertext);
    const actualCiphertext = this.extractCiphertext(taggedCiphertext);

    // Verify key instance hasn't changed
    const currentInstanceId = (
      this.publicKey as IsolatedPublicKey
    ).getInstanceId();
    if (!this._originalInstanceId.equals(currentInstanceId)) {
      throw new Error('Key isolation violation: key instance mismatch');
    }

    // Verify ciphertext was encrypted with this key instance
    if (!currentInstanceId.equals(ciphertextInstanceId)) {
      throw new Error(
        'Key isolation violation: ciphertext from different key instance',
      );
    }

    // Verify key ID is valid
    const nHex = this.publicKey.n.toString(16).padStart(768, '0');
    const nBuffer = Buffer.from(nHex, 'hex');
    const computedKeyId = createHash('sha256').update(nBuffer).digest();
    if (!this._originalKeyId.equals(computedKeyId)) {
      throw new Error('Key isolation violation: invalid key ID');
    }

    const result = super.decrypt(actualCiphertext);

    // Verify key hasn't been tampered with during operation
    if (
      !this._originalKeyId.equals(
        (this.publicKey as IsolatedPublicKey).getKeyId(),
      )
    ) {
      throw new Error('Key isolation violation: key modified during operation');
    }

    return result;
  }
}
