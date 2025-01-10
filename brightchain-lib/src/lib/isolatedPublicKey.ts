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
    // Tag ciphertext with instance ID by appending it as the least significant 256 bits
    const instanceIdBigInt = BigInt('0x' + this._instanceId.toString('hex'));
    return (ciphertext << 256n) | instanceIdBigInt;
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

  override encrypt(m: bigint): bigint {
    this.verifyKeyId();
    const ciphertext = super.encrypt(m);
    // Verify key ID hasn't changed
    this.verifyKeyId();
    // Tag ciphertext with this instance's ID
    return this.tagCiphertext(ciphertext);
  }

  override addition(a: bigint, b: bigint): bigint {
    this.verifyKeyId();

    // Extract instance IDs and verify they match this instance
    const instanceIdA = this.extractInstanceId(a);
    const instanceIdB = this.extractInstanceId(b);

    if (
      !this._instanceId.equals(instanceIdA) ||
      !this._instanceId.equals(instanceIdB)
    ) {
      throw new Error(
        'Key isolation violation: ciphertext from different key instance',
      );
    }

    // Extract actual ciphertexts
    const ciphertextA = this.extractCiphertext(a);
    const ciphertextB = this.extractCiphertext(b);

    // Perform homomorphic addition
    const result = super.addition(ciphertextA, ciphertextB);

    // Verify key ID hasn't changed
    this.verifyKeyId();

    // Tag result with this instance's ID
    return this.tagCiphertext(result);
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
