import { BinaryToTextEncoding, createHash, timingSafeEqual } from 'crypto';
import { SecureStorageErrorType } from './enumerations/secureStorageErrorType';
import { SecureStorageError } from './errors/secureStorageError';
import { GuidV4 } from './guid';
import { Pbkdf2Service } from './services/pbkdf2.service';
import { SymmetricService } from './services/symmetric.service';
import { FullHexGuid, RawGuidBuffer } from './types';

/**
 * A secure string buffer is a buffer whose intent is to prevent the raw password from being stored in memory.
 * The buffer is encrypted with a key derived from a GUID.
 * The GUID is stored in the clear, but the buffer is encrypted with a key derived from the GUID.
 * This allows the buffer to be decrypted, but only if the GUID and salt are known.
 */
export class SecureBuffer {
  private static readonly hashAlgorithm: string = 'sha256' as const;
  private static readonly stringEncoding: BufferEncoding = 'utf8' as const;
  private static readonly checksumEncoding: BinaryToTextEncoding =
    'hex' as const;
  private static readonly checksumBufferEncoding: BufferEncoding =
    'hex' as const;
  private readonly _id: GuidV4;
  private readonly _length: number;
  private readonly _encryptedValue: Buffer;
  private readonly _salt: Buffer;
  private readonly _encryptedChecksum: Buffer;
  constructor(data?: Buffer) {
    this._id = GuidV4.new();
    // don't bother encrypting an empty buffer
    if (data === undefined || data.length === 0) {
      this._length = 0;
      this._encryptedValue = Buffer.alloc(0);
      this._salt = Buffer.alloc(0);
      this._encryptedChecksum = Buffer.alloc(0);
      return;
    }
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
  public static fromString(
    data: string,
    encoding: BufferEncoding = SecureBuffer.stringEncoding,
  ): SecureBuffer {
    return new SecureBuffer(Buffer.from(data, encoding));
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
  public get value(): Buffer {
    if (this._length === 0) {
      return Buffer.alloc(0);
    }
    const idKey = Pbkdf2Service.deriveKeyFromPassword(
      this.idBuffer,
      this._salt,
    );
    const decryptionResult = SymmetricService.decryptBuffer(
      this._encryptedValue,
      idKey.hash,
    );
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
  public get valueAsString(): string {
    return this.value.toString(SecureBuffer.stringEncoding);
  }
  public get valueAsHexString(): string {
    return this.value.toString('hex');
  }
  public get valueAsBase64String(): string {
    return this.value.toString('base64');
  }
  public get checksum(): string {
    const decryptedChecksum = this.decryptData(
      this._encryptedChecksum,
    ).toString(SecureBuffer.stringEncoding);
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
    return createHash(SecureBuffer.hashAlgorithm)
      .update(data)
      .digest(SecureBuffer.checksumEncoding);
  }
  private createEncryptedChecksum(data: string | Buffer, salt: Buffer): Buffer {
    const checksum = this.generateChecksum(data);
    const result = this.encryptData(checksum, salt);
    return result.encryptedData;
  }
  private validateChecksum(data: string | Buffer, checksum: string): boolean {
    return timingSafeEqual(
      Buffer.from(
        this.generateChecksum(data),
        SecureBuffer.checksumBufferEncoding,
      ),
      Buffer.from(checksum, SecureBuffer.checksumBufferEncoding),
    );
  }
  private validateEncryptedChecksum(data: string | Buffer): boolean {
    const decryptedChecksum = this.decryptData(
      this._encryptedChecksum,
    ).toString(SecureBuffer.stringEncoding);
    return this.validateChecksum(data, decryptedChecksum);
  }
  private encryptData(
    data: string | Buffer,
    salt?: Buffer,
  ): { encryptedData: Buffer; salt: Buffer } {
    const idKey = Pbkdf2Service.deriveKeyFromPassword(this.idBuffer, salt);
    const encryptionResult = SymmetricService.encryptBuffer(
      Buffer.isBuffer(data)
        ? data
        : Buffer.from(data, SecureBuffer.stringEncoding),
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
