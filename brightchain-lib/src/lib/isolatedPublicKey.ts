import { createHash, createHmac, randomBytes } from 'crypto';
import { PublicKey } from 'paillier-bigint';
import { VOTING } from './constants';
import { IsolatedKeyErrorType } from './enumerations/isolatedKeyErrorType';
import { IsolatedKeyError } from './errors/isolatedKeyError';

export class IsolatedPublicKey extends PublicKey {
  public static isIsolatedPublicKey(key: PublicKey): key is IsolatedPublicKey {
    return key instanceof IsolatedPublicKey;
  }

  public readonly keyId: Buffer;
  private readonly _originalInstanceId: Buffer;
  private _currentInstanceId: Buffer;
  private readonly uniqueInstanceSalt: Buffer;

  public updateInstanceId(): void {
    // Generate a new instance ID
    this._currentInstanceId = this.generateInstanceId(
      this.keyId,
      this.n,
      randomBytes(32),
    );
  }

  private generateInstanceId(
    keyId: Buffer,
    n: bigint,
    uniqueInstanceSalt: Buffer,
  ): Buffer {
    return createHash(VOTING.HASH_ALGORITHM)
      .update(
        Buffer.concat([
          keyId,
          Buffer.from(n.toString(VOTING.KEY_RADIX), VOTING.KEY_FORMAT),
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
    this._originalInstanceId = this.generateInstanceId(
      keyId,
      n,
      uniqueInstanceSalt,
    );
    this._currentInstanceId = Buffer.from(this._originalInstanceId);
  }

  public getKeyId(): Buffer {
    return Buffer.from(this.keyId);
  }

  public getInstanceId(): Buffer {
    return Buffer.from(this._currentInstanceId);
  }

  private tagCiphertext(ciphertext: bigint): bigint {
    // Include instanceId in the HMAC calculation to ensure instance isolation
    const tag = createHmac(
      VOTING.HASH_ALGORITHM,
      Buffer.concat([this.keyId, this._currentInstanceId]),
    )
      .update(ciphertext.toString(VOTING.KEY_RADIX))
      .digest(VOTING.DIGEST_FORMAT);
    const hmacLength = 64;
    const ciphertextHex = ciphertext
      .toString(VOTING.KEY_RADIX)
      .padStart(hmacLength * 2, '0');
    const taggedCiphertextString = ciphertextHex + tag;
    return BigInt(`0x${taggedCiphertextString}`);
  }

  public extractInstanceId(ciphertext: bigint): Buffer {
    try {
      const hmacLength = 64;
      const ciphertextString = ciphertext.toString(16);
      const receivedHmac = ciphertextString.slice(-hmacLength);
      const calculatedCiphertext = BigInt(
        `0x${ciphertextString.slice(0, -hmacLength)}`,
      );

      // Calculate HMAC using the current instance ID
      const expectedHmac = createHmac(
        VOTING.HASH_ALGORITHM,
        Buffer.concat([this.keyId, this._currentInstanceId]),
      )
        .update(calculatedCiphertext.toString(VOTING.KEY_RADIX))
        .digest(VOTING.DIGEST_FORMAT);

      // If HMAC matches, this ciphertext was encrypted with our current instance ID
      return receivedHmac === expectedHmac
        ? this._currentInstanceId
        : Buffer.from([0]);
    } catch (error) {
      // If any error occurs during extraction, return invalid instance ID
      return Buffer.from([0]);
    }
  }

  override encrypt(m: bigint): bigint {
    this.verifyKeyId();
    const ciphertext = super.encrypt(m);
    return this.tagCiphertext(ciphertext);
  }

  override multiply(ciphertext: bigint, constant: bigint): bigint {
    this.verifyKeyId();
    const instanceId = this.extractInstanceId(ciphertext);

    if (!instanceId.equals(this._currentInstanceId)) {
      throw new IsolatedKeyError(IsolatedKeyErrorType.KeyIsolationViolation);
    }

    const hmacLength = 64;
    const ciphertextString = ciphertext.toString(VOTING.KEY_RADIX);
    const actualCiphertext = BigInt(
      `0x${ciphertextString.slice(0, -hmacLength)}`,
    );

    const product = super.multiply(actualCiphertext, constant);
    return this.tagCiphertext(product);
  }

  override addition(a: bigint, b: bigint): bigint {
    this.verifyKeyId();
    const aInstanceID = this.extractInstanceId(a);
    const bInstanceID = this.extractInstanceId(b);

    if (
      !aInstanceID.equals(this._currentInstanceId) ||
      !bInstanceID.equals(this._currentInstanceId)
    ) {
      throw new IsolatedKeyError(IsolatedKeyErrorType.KeyIsolationViolation);
    }

    const hmacLength = 64;
    const aCiphertextString = a.toString(VOTING.KEY_RADIX);
    const bCiphertextString = b.toString(VOTING.KEY_RADIX);

    const aCiphertext = BigInt(`0x${aCiphertextString.slice(0, -hmacLength)}`);
    const bCiphertext = BigInt(`0x${bCiphertextString.slice(0, -hmacLength)}`);

    const sum = super.addition(aCiphertext, bCiphertext);
    return this.tagCiphertext(sum);
  }

  public verifyKeyId(): void {
    const nHex = this.n
      .toString(VOTING.KEY_RADIX)
      .padStart(VOTING.PUB_KEY_OFFSET, '0');
    const nBuffer = Buffer.from(nHex, VOTING.KEY_FORMAT);
    const computedKeyId = createHash(VOTING.HASH_ALGORITHM)
      .update(nBuffer)
      .digest();
    if (!this.keyId.equals(computedKeyId)) {
      throw new IsolatedKeyError(IsolatedKeyErrorType.KeyIsolationViolation);
    }
  }
}
