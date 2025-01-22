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

  private extractInstanceId(ciphertext: bigint, n: bigint): Buffer {
    const tag = ciphertext % n;
    const instanceIdBigInt =
      BigInt('0x' + this._originalInstanceId.toString('hex')) % n;
    return tag === instanceIdBigInt
      ? Buffer.from(this._originalInstanceId)
      : Buffer.from([0]);
  }

  private verifyAndExtractCiphertext(taggedCiphertext: bigint): bigint {
    const extractedId = this.extractInstanceId(
      taggedCiphertext,
      this.publicKey.n,
    );
    if (!extractedId.equals(this._originalInstanceId)) {
      throw new Error(
        'Key isolation violation: ciphertext from different key instance',
      );
    }
    const tag = taggedCiphertext % this.publicKey.n;
    return taggedCiphertext - tag;
  }

  override decrypt(taggedCiphertext: bigint): bigint {
    if (!(this.publicKey instanceof IsolatedPublicKey)) {
      throw new Error('Key isolation violation: invalid public key type');
    }

    // Verify key instance hasn't changed
    const currentInstanceId = (
      this.publicKey as IsolatedPublicKey
    ).getInstanceId();
    if (!this._originalInstanceId.equals(currentInstanceId)) {
      throw new Error('Key isolation violation: key instance mismatch');
    }

    // Extract actual ciphertext (this will verify instance ID)
    const actualCiphertext = this.verifyAndExtractCiphertext(taggedCiphertext);

    // Verify key ID is valid
    const nHex = this.publicKey.n.toString(16).padStart(768, '0');
    const nBuffer = Buffer.from(nHex, 'hex');
    const computedKeyId = createHash('sha256').update(nBuffer).digest();
    if (!this._originalKeyId.equals(computedKeyId)) {
      throw new Error('Key isolation violation: invalid key ID');
    }

    // Decrypt the ciphertext
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
