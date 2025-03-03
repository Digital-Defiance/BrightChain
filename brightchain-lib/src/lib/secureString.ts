import { createHash, timingSafeEqual } from 'crypto';
import { SecureStorageErrorType } from './enumerations/secureStorageErrorType';
import { SecureStorageError } from './errors/secureStorageError';
import { GuidV4 } from './guid';
import { StaticHelpersPbkdf2 } from './staticHelpers.pbkdf2';
import { StaticHelpersSymmetric } from './staticHelpers.symmetric';
import { FullHexGuid, RawGuidBuffer } from './types';

/**
 * A secure string buffer is a buffer whose intent is to prevent the raw password from being stored in memory.
 */
export class SecureString {
  private static readonly hashAlgorithm: string = 'sha256';
  private static readonly encoding: BufferEncoding = 'utf8';
  private readonly _isNull: boolean;
  private readonly _id: GuidV4;
  private readonly _length: number;
  private readonly _encryptedValue: Buffer;
  private readonly _salt: Buffer;
  private readonly _encryptedChecksum: Buffer;
  constructor(data?: string | null) {
    this._id = GuidV4.new();
    // don't bother encrypting null/undefined
    if (data === null || data === undefined) {
      this._isNull = true;
      this._length = 0;
      this._encryptedValue = Buffer.alloc(0);
      this._salt = Buffer.alloc(0);
      this._encryptedChecksum = Buffer.alloc(0);
      return;
    }
    this._isNull = false;
    this._length = data.length;
    const encryptionResult = this.encryptData(data);
    this._encryptedValue = encryptionResult.encryptedData;
    this._salt = encryptionResult.salt;
    this._encryptedChecksum = this.createEncryptedChecksum(
      data,
      encryptionResult.salt,
    );
  }
  public dispose(): void {
    this._encryptedValue.fill(0);
    this._salt.fill(0);
    this._encryptedChecksum.fill(0);
  }
  public get id(): FullHexGuid {
    return this._id.asFullHexGuid;
  }
  public get idBuffer(): RawGuidBuffer {
    return this._id.asRawGuidBuffer;
  }
  public get originalLength(): number {
    return this._length;
  }
  public get valueAsBuffer(): Buffer {
    if (this._isNull) {
      return Buffer.alloc(0);
    }
    const decryptionResult = this.decryptData(this._encryptedValue);
    if (decryptionResult.length !== this._length) {
      throw new SecureStorageError(
        SecureStorageErrorType.DecryptedValueLengthMismatch,
      );
    }
    if (!this.validateEncryptedChecksum(decryptionResult)) {
      throw new SecureStorageError(
        SecureStorageErrorType.DecryptedValueChecksumMismatch,
      );
    }
    return decryptionResult;
  }
  public get value(): string | null {
    if (this._isNull) {
      return null;
    }
    return this.valueAsBuffer.toString(SecureString.encoding);
  }
  public get valueAsHexString(): string {
    return this.valueAsBuffer.toString('hex');
  }
  public get valueAsBase64String(): string {
    return this.valueAsBuffer.toString('base64');
  }
  /**
   * Provided for test/debug purposes only
   */
  public dropEncryptedValue(): void {
    this._encryptedValue.fill(0);
    this._salt.fill(0);
    this._encryptedChecksum.fill(0);
  }
  private generateChecksum(data: string | Buffer): string {
    return createHash(SecureString.hashAlgorithm).update(data).digest('hex');
  }
  private createEncryptedChecksum(data: string | Buffer, salt: Buffer): Buffer {
    const checksum = this.generateChecksum(data);
    const result = this.encryptData(checksum, salt);
    return result.encryptedData;
  }
  private validateChecksum(data: string | Buffer, checksum: string): boolean {
    return timingSafeEqual(
      Buffer.from(this.generateChecksum(data), 'hex'),
      Buffer.from(checksum, 'hex'),
    );
  }
  private validateEncryptedChecksum(data: string | Buffer): boolean {
    const decryptedChecksum = this.decryptData(
      this._encryptedChecksum,
    ).toString(SecureString.encoding);
    return this.validateChecksum(data, decryptedChecksum);
  }
  private encryptData(
    data: string | Buffer,
    salt?: Buffer,
  ): { encryptedData: Buffer; salt: Buffer } {
    const idKey = StaticHelpersPbkdf2.deriveKeyFromPassword(
      this.idBuffer,
      salt,
    );
    const encryptionResult = StaticHelpersSymmetric.symmetricEncryptBuffer(
      Buffer.isBuffer(data) ? data : Buffer.from(data, SecureString.encoding),
      idKey.hash,
    );
    return { encryptedData: encryptionResult.encryptedData, salt: idKey.salt };
  }
  private decryptData(data: Buffer): Buffer {
    const idKey = StaticHelpersPbkdf2.deriveKeyFromPassword(
      this.idBuffer,
      this._salt,
    );
    return StaticHelpersSymmetric.symmetricDecryptBuffer(data, idKey.hash);
  }
}
