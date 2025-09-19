import { SecureStorageErrorType } from './enumerations/secureStorageErrorType';
import { DisposedError } from './errors/disposed';
import { SecureStorageError } from './errors/secureStorage';
import { GuidV4 } from './guid';
import { XorService } from './services/xor';
import { FullHexGuid, RawGuidUint8Array } from './types';
import { uint8ArrayToHex } from './utils';

/**
 * A secure string buffer is a buffer whose intent is to prevent the raw password from being stored in memory.
 * The buffer is encrypted with a key derived from a GUID.
 * The GUID is stored in the clear, but the buffer is encrypted with a key derived from the GUID.
 * This allows the buffer to be decrypted, but only if the GUID and salt are known.
 */
export class SecureBuffer {
  private static readonly hashAlgorithm: string = 'sha256' as const;
  private static readonly stringEncoding = 'utf8' as const;
  private static readonly checksumEncoding = 'hex' as const;
  private static readonly checksumBufferEncoding = 'hex' as const;
  private _disposed: boolean = false;
  private readonly _id: GuidV4;
  private readonly _length: number;
  private readonly _obfuscatedValue: Uint8Array;
  private readonly _key: Uint8Array;
  private readonly _obfuscatedChecksum: Uint8Array;
  private _disposedAt?: string;
  constructor(data?: Uint8Array) {
    this._id = GuidV4.new();
    // don't bother encrypting an empty buffer
    if (data === undefined || data.length === 0) {
      this._length = 0;
      this._obfuscatedValue = new Uint8Array(0);
      this._key = new Uint8Array(0);
      this._obfuscatedChecksum = new Uint8Array(0);
      return;
    }
    this._length = data.length;
    this._key = this.idBuffer;
    this._obfuscatedValue = this.obfuscateData(data);
    // Create a simple checksum without crypto for synchronous operation
    this._obfuscatedChecksum = this.createSimpleObfuscatedChecksum(data);
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
  public static fromString(data: string): SecureBuffer {
    return new SecureBuffer(new TextEncoder().encode(data));
  }
  public static fromBuffer(data: Uint8Array): SecureBuffer {
    return new SecureBuffer(data);
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
  public get value(): Uint8Array {
    this.assertNotDisposed();
    if (this._length === 0) {
      return new Uint8Array(0);
    }
    try {
      const deobfuscatedResult = this.deobfuscateData(this._obfuscatedValue);
      if (deobfuscatedResult.length !== this._length) {
        throw new SecureStorageError(
          SecureStorageErrorType.DecryptedValueLengthMismatch,
        );
      }
      if (!this.validateObfuscatedChecksum(deobfuscatedResult)) {
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
      // Convert any other error (including AES-GCM authentication errors) to SecureStorageError
      throw new SecureStorageError(
        SecureStorageErrorType.DecryptedValueChecksumMismatch,
      );
    }
  }
  public get valueAsString(): string {
    this.assertNotDisposed();
    return new TextDecoder().decode(this.value);
  }
  public get valueAsHexString(): string {
    this.assertNotDisposed();
    return uint8ArrayToHex(this.value);
  }
  public get valueAsBase64String(): string {
    this.assertNotDisposed();
    return btoa(String.fromCharCode(...this.value));
  }
  public get checksum(): string {
    this.assertNotDisposed();
    const deobfuscatedChecksum = new TextDecoder().decode(
      this.deobfuscateData(this._obfuscatedChecksum),
    );
    return deobfuscatedChecksum;
  }
  private generateSimpleChecksum(data: string | Uint8Array): string {
    const dataBytes =
      typeof data === 'string' ? new TextEncoder().encode(data) : data;
    let hash = 0;
    for (let i = 0; i < dataBytes.length; i++) {
      hash = ((hash << 5) - hash + dataBytes[i]) & 0xffffffff;
    }
    return hash.toString(16);
  }
  private createSimpleObfuscatedChecksum(
    data: string | Uint8Array,
  ): Uint8Array {
    const checksum = this.generateSimpleChecksum(data);
    const result = this.obfuscateData(new TextEncoder().encode(checksum));
    return result;
  }
  private validateSimpleChecksum(
    data: string | Uint8Array,
    checksum: string,
  ): boolean {
    const generatedChecksum = this.generateSimpleChecksum(data);
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
  private validateObfuscatedChecksum(data: string | Uint8Array): boolean {
    const deobfuscatedChecksum = new TextDecoder().decode(
      this.deobfuscateData(this._obfuscatedChecksum),
    );
    return this.validateSimpleChecksum(data, deobfuscatedChecksum);
  }
  private obfuscateData(data: Uint8Array): Uint8Array {
    return XorService.xor(data, this._key);
  }
  private deobfuscateData(data: Uint8Array): Uint8Array {
    return XorService.xor(data, this._key);
  }
  public get length(): number {
    this.assertNotDisposed();
    return this._length;
  }
}
