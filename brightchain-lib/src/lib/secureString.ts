import { SecureStorageErrorType } from './enumerations/secureStorageErrorType';
import { DisposedError } from './errors/disposed';
import { SecureStorageError } from './errors/secureStorage';
import { GuidV4 } from './guid';
import { XorService } from './services/xor';
import { FullHexGuid, RawGuidUint8Array } from './types';
import { uint8ArrayToHex } from './utils';

/**
 * A secure string buffer is a buffer whose intent is to prevent the raw password from being stored in memory.
 */
export class SecureString {
  private static readonly hashAlgorithm: string = 'sha256' as const;
  private static readonly encoding = 'utf8' as const;
  private static readonly checksumEncoding = 'hex' as const;
  private static readonly checksumBufferEncoding = 'hex' as const;
  private _disposed: boolean = false;
  private readonly _isNull: boolean;
  private readonly _id: GuidV4;
  private readonly _length: number;
  private readonly _obfuscatedValue: Uint8Array;
  private readonly _key: Uint8Array;
  private readonly _obfuscatedChecksum: Uint8Array;
  private _disposedAt?: string;
  constructor(data?: string | Uint8Array | null) {
    this._id = GuidV4.new();
    // only treat null/undefined as null, empty strings/arrays are valid empty data
    if (data === null || data === undefined) {
      this._isNull = true;
      this._length = 0;
      this._obfuscatedValue = new Uint8Array(0);
      this._key = new Uint8Array(0);
      this._obfuscatedChecksum = new Uint8Array(0);
      return;
    }
    this._isNull = false;
    this._key = this.idBuffer;
    const dataAsUint8Array =
      typeof data === 'string'
        ? new TextEncoder().encode(data)
        : (data as Uint8Array);
    // Store the byte length, not the character length
    this._length = dataAsUint8Array.length;
    this._obfuscatedValue = this.obfuscateData(dataAsUint8Array);
    this._obfuscatedChecksum =
      this.createSimpleObfuscatedChecksum(dataAsUint8Array);
  }
  private assertNotDisposed(): void {
    if (!this._disposed) return;
    const e = new DisposedError();
    try {
      (e as any).disposedAt = this._disposedAt;
    } catch {
      // ignore if Error object is sealed/frozen
    }
    throw e;
  }
  public dispose(): void {
    const err = new DisposedError();
    if (typeof (Error as any).captureStackTrace === 'function') {
      (Error as any).captureStackTrace(err, this.dispose);
    }
    this._disposedAt = err.stack ?? 'stack unavailable';
    this._obfuscatedValue.fill(0);
    this._key.fill(0);
    this._obfuscatedChecksum.fill(0);
    this._disposed = true;
  }
  public get disposedAtStack(): string | undefined {
    return this._disposedAt;
  }
  public get id(): FullHexGuid {
    this.assertNotDisposed();
    return this._id.asFullHexGuid;
  }
  public get idBuffer(): RawGuidUint8Array {
    this.assertNotDisposed();
    return this._id.asRawGuidArray;
  }
  public get originalLength(): number {
    this.assertNotDisposed();
    return this._length;
  }
  public get valueAsBuffer(): Uint8Array {
    this.assertNotDisposed();
    if (this._isNull) {
      return new Uint8Array(0);
    }
    try {
      const deobfuscatedResult = this.deobfuscateData(this._obfuscatedValue);
      if (deobfuscatedResult.length !== this._length) {
        throw new SecureStorageError(
          SecureStorageErrorType.DecryptedValueLengthMismatch,
        );
      }

      // Validate checksum
      const expectedChecksum = this.createSimpleChecksum(deobfuscatedResult);
      const storedChecksum = new TextDecoder().decode(
        this.deobfuscateData(this._obfuscatedChecksum),
      );

      if (expectedChecksum !== storedChecksum) {
        throw new SecureStorageError(
          SecureStorageErrorType.DecryptedValueChecksumMismatch,
        );
      }

      return deobfuscatedResult;
    } catch (error) {
      // If it's already a SecureStorageError, re-throw it
      if (error instanceof SecureStorageError) {
        throw error;
      }
      // Convert any other error to SecureStorageError
      throw new SecureStorageError(
        SecureStorageErrorType.DecryptedValueChecksumMismatch,
      );
    }
  }
  public get value(): string | null {
    this.assertNotDisposed();
    if (this._isNull) {
      return null;
    }
    return new TextDecoder().decode(this.valueAsBuffer);
  }
  public get notNullValue(): string {
    this.assertNotDisposed();
    if (this._isNull) {
      throw new SecureStorageError(SecureStorageErrorType.ValueIsNull);
    }
    return new TextDecoder().decode(this.valueAsBuffer);
  }
  public get valueAsHexString(): string {
    this.assertNotDisposed();
    return uint8ArrayToHex(this.valueAsBuffer);
  }
  public get valueAsBase64String(): string {
    this.assertNotDisposed();
    return btoa(String.fromCharCode(...this.valueAsBuffer));
  }
  public get hasValue(): boolean {
    this.assertNotDisposed();
    return !this._isNull && this._length > 0;
  }
  public get checksum(): string {
    this.assertNotDisposed();
    const deobfuscatedChecksum = new TextDecoder().decode(
      this.deobfuscateData(this._obfuscatedChecksum),
    );
    return deobfuscatedChecksum;
  }
  public get length(): number {
    this.assertNotDisposed();
    return this._length;
  }
  private async generateChecksum(data: string | Uint8Array): Promise<string> {
    const dataBytes =
      typeof data === 'string' ? new TextEncoder().encode(data) : data;
    const hashBuffer = await crypto.subtle.digest(
      'SHA-256',
      new Uint8Array(dataBytes),
    );
    return uint8ArrayToHex(new Uint8Array(hashBuffer));
  }
  private createSimpleChecksum(data: Uint8Array): string {
    let hash = 0;
    for (let i = 0; i < data.length; i++) {
      hash = ((hash << 5) - hash + data[i]) & 0xffffffff;
    }
    return hash.toString(16);
  }

  private createSimpleObfuscatedChecksum(
    data: string | Uint8Array,
  ): Uint8Array {
    const dataBytes =
      typeof data === 'string' ? new TextEncoder().encode(data) : data;
    const checksum = this.createSimpleChecksum(dataBytes);
    return this.obfuscateData(new TextEncoder().encode(checksum));
  }

  private async createObfuscatedChecksum(
    data: string | Uint8Array,
  ): Promise<Uint8Array> {
    const checksum = await this.generateChecksum(data);
    const result = this.obfuscateData(new TextEncoder().encode(checksum));
    return result;
  }
  private async validateChecksum(
    data: string | Uint8Array,
    checksum: string,
  ): Promise<boolean> {
    const generatedChecksum = await this.generateChecksum(data);
    return generatedChecksum === checksum;
  }

  private timingSafeEqual(a: Uint8Array, b: Uint8Array): boolean {
    if (a.length !== b.length) {
      return false;
    }
    let result = 0;
    for (let i = 0; i < a.length; i++) {
      result |= a[i] ^ b[i];
    }
    return result === 0;
  }
  private async validateObfuscatedChecksum(
    data: string | Uint8Array,
  ): Promise<boolean> {
    const deobfuscatedChecksum = new TextDecoder().decode(
      this.deobfuscateData(this._obfuscatedChecksum),
    );
    return this.validateChecksum(data, deobfuscatedChecksum);
  }
  private obfuscateData(data: Uint8Array): Uint8Array {
    return XorService.xor(data, this._key);
  }
  private deobfuscateData(data: Uint8Array): Uint8Array {
    return XorService.xor(data, this._key);
  }
}
