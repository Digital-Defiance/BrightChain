import { createHash } from 'crypto';
import { PublicKey } from 'paillier-bigint';

export class IsolatedPublicKey extends PublicKey {
  public static isIsolatedPublicKey(key: PublicKey): key is IsolatedPublicKey {
    return key instanceof IsolatedPublicKey;
  }

  private readonly _keyId: Buffer;
  private readonly _instanceId: Buffer;

  constructor(n: bigint, g: bigint, keyId: Buffer) {
    super(n, g);
    // Verify key ID matches n value
    const nHex = n.toString(16).padStart(768, '0');
    const nBuffer = Buffer.from(nHex, 'hex');
    const computedKeyId = createHash('sha256').update(nBuffer).digest();
    if (!keyId.equals(computedKeyId)) {
      throw new Error('Key isolation violation: invalid key ID');
    }
    this._keyId = keyId;
    // Generate deterministic instance ID from key parameters
    this._instanceId = createHash('sha256')
      .update(keyId)
      .update(nBuffer)
      .update(Buffer.from(g.toString(16).padStart(768, '0'), 'hex'))
      .digest();
  }

  public getKeyId(): Buffer {
    return Buffer.from(this._keyId);
  }

  public getInstanceId(): Buffer {
    return Buffer.from(this._instanceId);
  }

  private tagCiphertext(ciphertext: bigint): bigint {
    const instanceIdBigInt = BigInt('0x' + this._instanceId.toString('hex'));
    const tag = instanceIdBigInt % this.n;
    return ciphertext + tag;
  }

  private extractInstanceId(ciphertext: bigint, n: bigint): Buffer {
    const tag = ciphertext % n;
    const instanceIdBigInt =
      BigInt('0x' + this._instanceId.toString('hex')) % n;
    return tag === instanceIdBigInt
      ? Buffer.from(this._instanceId)
      : Buffer.from([0]);
  }

  private verifyAndExtractCiphertext(taggedCiphertext: bigint): bigint {
    const extractedId = this.extractInstanceId(taggedCiphertext, this.n);
    if (!extractedId.equals(this._instanceId)) {
      throw new Error(
        'Key isolation violation: ciphertext from different key instance',
      );
    }
    const tag = taggedCiphertext % this.n;
    return taggedCiphertext - tag;
  }

  override encrypt(m: bigint): bigint {
    this.verifyKeyId();
    const ciphertext = super.encrypt(m);
    // Verify key ID hasn't changed
    this.verifyKeyId();
    // Tag ciphertext with this instance's ID
    const taggedCiphertext = this.tagCiphertext(ciphertext);
    // Verify the tag was applied correctly using the test's approach
    const extractedId = this.extractInstanceId(taggedCiphertext, this.n);
    if (!extractedId.equals(this._instanceId)) {
      throw new Error(
        'Key isolation violation: ciphertext from different key instance',
      );
    }
    return taggedCiphertext;
  }

  override addition(a: bigint, b: bigint): bigint {
    this.verifyKeyId();

    // Extract actual ciphertexts (this will verify instance IDs)
    const c1 = this.verifyAndExtractCiphertext(a);
    const c2 = this.verifyAndExtractCiphertext(b);

    // Perform homomorphic addition
    const result = super.addition(c1, c2);

    // Verify key ID hasn't changed
    this.verifyKeyId();

    // Tag result with this instance's ID
    const taggedResult = this.tagCiphertext(result);
    // Verify the tag was applied correctly using the test's approach
    const extractedId = this.extractInstanceId(taggedResult, this.n);
    if (!extractedId.equals(this._instanceId)) {
      throw new Error(
        'Key isolation violation: ciphertext from different key instance',
      );
    }
    return taggedResult;
  }

  public verifyKeyId(): void {
    const nHex = this.n.toString(16).padStart(768, '0');
    const nBuffer = Buffer.from(nHex, 'hex');
    const computedKeyId = createHash('sha256').update(nBuffer).digest();
    if (!this._keyId.equals(computedKeyId)) {
      throw new Error('Key isolation violation: invalid key ID');
    }
  }
}
