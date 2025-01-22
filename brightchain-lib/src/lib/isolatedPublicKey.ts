import { createHash, createHmac, randomBytes } from 'crypto';
import { PublicKey } from 'paillier-bigint';

export class IsolatedPublicKey extends PublicKey {
  public static isIsolatedPublicKey(key: PublicKey): key is IsolatedPublicKey {
    return key instanceof IsolatedPublicKey;
  }

  public readonly keyId: Buffer;
  public readonly instanceId: Buffer;
  private readonly uniqueInstanceSalt: Buffer;

  private generateInstanceId(
    keyId: Buffer,
    n: bigint,
    uniqueInstanceSalt: Buffer,
  ): Buffer {
    return createHash('sha256')
      .update(
        Buffer.concat([
          keyId,
          Buffer.from(n.toString(16), 'hex'),
          uniqueInstanceSalt,
        ]),
      )
      .digest();
  }
  constructor(n: bigint, g: bigint, keyId: Buffer) {
    super(n, g);
    this.keyId = keyId;
    const uniqueInstanceSalt = randomBytes(32);
    this.uniqueInstanceSalt = uniqueInstanceSalt;
    this.instanceId = this.generateInstanceId(keyId, n, uniqueInstanceSalt);
  }

  public getKeyId(): Buffer {
    return Buffer.from(this.keyId);
  }

  public getInstanceId(): Buffer {
    return Buffer.from(this.instanceId);
  }

  private tagCiphertext(ciphertext: bigint): bigint {
    // Include instanceId in the HMAC calculation to ensure instance isolation
    const tag = createHmac(
      'sha256',
      Buffer.concat([this.keyId, this.instanceId]),
    )
      .update(ciphertext.toString(16))
      .digest('hex');
    const hmacLength = 64; // Fixed HMAC length

    // Improved padding: Ensure consistent length regardless of ciphertext size
    const ciphertextHex = ciphertext.toString(16).padStart(hmacLength * 2, '0');
    const taggedCiphertextString = ciphertextHex + tag;
    return BigInt(`0x${taggedCiphertextString}`);
  }

  public extractInstanceId(ciphertext: bigint): Buffer {
    const hmacLength = 64; // Length of SHA256 hex digest
    const ciphertextString = ciphertext.toString(16);
    const receivedHmac = ciphertextString.slice(-hmacLength);
    const calculatedCiphertext = BigInt(
      `0x${ciphertextString.slice(0, -hmacLength)}`,
    );

    const hmac = createHmac(
      'sha256',
      Buffer.concat([this.keyId, this.instanceId]),
    )
      .update(calculatedCiphertext.toString(16))
      .digest('hex');

    return hmac === receivedHmac ? this.instanceId : Buffer.from([0]);
  }

  override encrypt(m: bigint): bigint {
    this.verifyKeyId();
    const ciphertext = super.encrypt(m);
    const taggedCiphertext = this.tagCiphertext(ciphertext);
    return taggedCiphertext;
  }

  override addition(a: bigint, b: bigint): bigint {
    this.verifyKeyId();
    const aInstanceID = this.extractInstanceId(a);
    const bInstanceID = this.extractInstanceId(b);

    if (
      !aInstanceID.equals(this.instanceId) ||
      !bInstanceID.equals(this.instanceId)
    ) {
      throw new Error(
        'Key isolation violation: ciphertexts from different key instances',
      );
    }

    const hmacLength = 64;
    const aCiphertextString = a.toString(16);
    const bCiphertextString = b.toString(16);

    // Extract untagged ciphertexts.  Important:  Must use the same length for both
    const aCiphertext = BigInt(`0x${aCiphertextString.slice(0, -hmacLength)}`);
    const bCiphertext = BigInt(`0x${bCiphertextString.slice(0, -hmacLength)}`);

    const sum = super.addition(aCiphertext, bCiphertext);
    return this.tagCiphertext(sum); // Re-tag the sum
  }

  public verifyKeyId(): void {
    const nHex = this.n.toString(16).padStart(768, '0');
    const nBuffer = Buffer.from(nHex, 'hex');
    const computedKeyId = createHash('sha256').update(nBuffer).digest();
    if (!this.keyId.equals(computedKeyId)) {
      throw new Error('Key isolation violation: invalid key ID');
    }
  }
}
