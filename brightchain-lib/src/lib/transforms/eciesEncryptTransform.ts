import { Transform, TransformCallback } from 'stream';
import { BlockSize } from '../enumerations/blockSizes';
import { StaticHelpersECIES } from '../staticHelpers.ECIES';

/**
 * Transform stream that encrypts data using ECIES encryption
 */
export class EciesEncryptTransform extends Transform {
  private readonly blockSize: number;
  private readonly receiverPublicKey: Buffer;
  private readonly buffer: Buffer[] = [];
  private totalLength = 0;

  constructor(blockSize: BlockSize, receiverPublicKey: Buffer) {
    super();
    this.blockSize = blockSize as number;
    this.receiverPublicKey = receiverPublicKey;
  }

  public override _transform(
    chunk: Buffer,
    encoding: BufferEncoding,
    callback: TransformCallback,
  ): void {
    this.buffer.push(chunk);
    this.totalLength += chunk.length;
    callback();
  }

  public override _flush(callback: TransformCallback): void {
    if (this.totalLength === 0) {
      callback();
      return;
    }

    // Combine all chunks
    const data = Buffer.concat(this.buffer, this.totalLength);

    try {
      // Encrypt all data at once
      const encryptedData = StaticHelpersECIES.encrypt(
        this.receiverPublicKey,
        data,
      );
      this.push(encryptedData);
      callback();
    } catch (error) {
      console.error('Encryption error details:', {
        error,
        publicKeyLength: this.receiverPublicKey.length,
        publicKeyPrefix: this.receiverPublicKey[0],
        dataLength: data.length,
        blockSize: this.blockSize,
      });
      callback(error instanceof Error ? error : new Error('Encryption failed'));
    }
  }
}
