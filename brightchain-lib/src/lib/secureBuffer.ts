import { createHash } from 'crypto';
import { GuidV4 } from './guid';
import { StaticHelpersKeyPair } from './staticHelpers.keypair';
import { StaticHelpersPbkdf2 } from './staticHelpers.pbkdf2';
import { FullHexGuid, FullHexGuidBuffer } from './types';

/**
 * A secure string buffer is a buffer whose intent is to prevent the raw password from being stored in memory.
 * The buffer is encrypted with a key derived from a GUID.
 * The GUID is stored in the clear, but the buffer is encrypted with a key derived from the GUID.
 * This allows the buffer to be decrypted, but only if the GUID and salt are known.
 */
export class SecureBuffer {
    private static readonly hashAlgorithm: string = 'sha256';
    private static readonly stringEncoding: BufferEncoding = 'utf8';
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
        this._encryptedChecksum = this.createEncryptedChecksum(data, encryptionResult.salt);
    }
    public static fromString(data: string, encoding: BufferEncoding = SecureBuffer.stringEncoding): SecureBuffer {
        return new SecureBuffer(Buffer.from(data, encoding));
    }
    public get id(): FullHexGuid {
        return this._id.asFullHexGuid;
    }
    public get idBuffer(): FullHexGuidBuffer {
        return this._id.asFullHexGuidBuffer;
    }
    public get originalLength(): number {
        return this._length;
    }
    public get value(): Buffer {
        if (this._length === 0) {
            return Buffer.alloc(0);
        }
        const idKey = StaticHelpersPbkdf2.deriveKeyFromPassword(this.idBuffer, this._salt);
        const decryptionResult = StaticHelpersKeyPair.symmetricDecryptBuffer(this._encryptedValue, idKey.hash);
        if (decryptionResult.length !== this._length) {
            throw new Error('Decrypted value length does not match expected length');
        }
        if (!this.validateEncryptedChecksum(decryptionResult)) {
            throw new Error('Decrypted value checksum does not match');
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
    /**
   * Provided for test/debug purposes only
   */
    public dropEncryptedValue(): void {
        this._encryptedValue.fill(0);
        this._salt.fill(0);
        this._encryptedChecksum.fill(0);
    }
    private generateChecksum(data: string | Buffer): string {
        return createHash(SecureBuffer.hashAlgorithm).update(data).digest('hex');
    }
    private createEncryptedChecksum(data: string | Buffer, salt: Buffer): Buffer {
        const checksum = this.generateChecksum(data);
        const result = this.encryptData(checksum, salt);
        return result.encryptedData;
    }
    private validateChecksum(data: string | Buffer, checksum: string): boolean {
        return this.generateChecksum(data) === checksum;
    }
    private validateEncryptedChecksum(data: string | Buffer): boolean {
        const decryptedChecksum = this.decryptData(this._encryptedChecksum).toString(SecureBuffer.stringEncoding);
        return this.validateChecksum(data, decryptedChecksum);
    }
    private encryptData(data: string | Buffer, salt?: Buffer): { encryptedData: Buffer, salt: Buffer } {
        const idKey = StaticHelpersPbkdf2.deriveKeyFromPassword(this.idBuffer, salt);
        const encryptionResult = StaticHelpersKeyPair.symmetricEncryptBuffer(Buffer.isBuffer(data) ? data : Buffer.from(data, SecureBuffer.stringEncoding), idKey.hash);
        return { encryptedData: encryptionResult.encryptedData, salt: idKey.salt };
    }
    private decryptData(data: Buffer): Buffer {
        const idKey = StaticHelpersPbkdf2.deriveKeyFromPassword(this.idBuffer, this._salt);
        const decryptionResult = StaticHelpersKeyPair.symmetricDecryptBuffer(data, idKey.hash);
        return decryptionResult;
    }
}