import { BinaryToTextEncoding, createHash, timingSafeEqual } from 'crypto';
import { SecureStorageErrorType } from './enumerations/secureStorageErrorType';
import { SecureStorageError } from './errors/secureStorageError';
import { GuidV4 } from './guid';
import { Pbkdf2Service } from './services/pbkdf2.service';
import { SymmetricService } from './services/symmetric.service';
import { FullHexGuid, RawGuidBuffer } from './types';

/**
 * A secure string buffer is a buffer whose intent is to prevent the raw password from being stored in memory.
 */
export class SecureString {
  private static readonly hashAlgorithm: string = 'sha256' as const;
  private static readonly encoding: BufferEncoding = 'utf8' as const;
  private static readonly checksumEncoding: BinaryToTextEncoding =
    'hex' as const;
  private static readonly checksumBufferEncoding: BufferEncoding =
    'hex' as const;
  private readonly _isNull: boolean;
  private readonly _id: GuidV4;
  private readonly _length: number;
  private readonly _encryptedValue: Buffer;
  private readonly _salt: Buffer;
  private readonly _encryptedChecksum: Buffer;
  constructor(data?: string | Buffer | null) {
    this._id = GuidV4.new();
    // don't bother encrypting null/undefined
    if (
      data === null ||
      data === undefined ||
      (Buffer.isBuffer(data) && data.length === 0)
    ) {
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
    try {
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
    } catch (error) {
      if (error instanceof SecureStorageError) {
        throw error;
      }
      // Convert AES-GCM authentication errors to SecureStorageError
      throw new SecureStorageError(
        SecureStorageErrorType.DecryptedValueChecksumMismatch,
      );
    }
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
  public get checksum(): string {
    const decryptedChecksum = this.decryptData(
      this._encryptedChecksum,
    ).toString(SecureString.encoding);
    return decryptedChecksum;
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
    return createHash(SecureString.hashAlgorithm)
      .update(data)
      .digest(SecureString.checksumEncoding);
  }
  private createEncryptedChecksum(data: string | Buffer, salt: Buffer): Buffer {
    const checksum = this.generateChecksum(data);
    const result = this.encryptData(checksum, salt);
    return result.encryptedData;
  }
  private validateChecksum(data: string | Buffer, checksum: string): boolean {
    const generatedChecksum = this.generateChecksum(data);
    const generatedBuffer = Buffer.from(
      generatedChecksum,
      SecureString.checksumBufferEncoding,
    );
    const checksumBuffer = Buffer.from(
      checksum,
      SecureString.checksumBufferEncoding,
    );

    // CRITICAL: Check buffer lengths before timingSafeEqual
    if (generatedBuffer.length !== checksumBuffer.length) {
      return false;
    }

    return timingSafeEqual(generatedBuffer, checksumBuffer);
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
    const idKey = Pbkdf2Service.deriveKeyFromPassword(this.idBuffer, salt);
    const encryptionResult = SymmetricService.encryptBuffer(
      Buffer.isBuffer(data) ? data : Buffer.from(data, SecureString.encoding),
      idKey.hash,
    );
    return {
      encryptedData: encryptionResult.encryptedData,
      salt: idKey.salt,
    };
  }
  private decryptData(data: Buffer): Buffer {
    const idKey = Pbkdf2Service.deriveKeyFromPassword(
      this.idBuffer,
      this._salt,
    );
    return SymmetricService.decryptBuffer(data, idKey.hash);
  }
}
