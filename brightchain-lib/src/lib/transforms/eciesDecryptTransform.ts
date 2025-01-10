import { Transform, TransformCallback, TransformOptions } from 'stream';
import { BlockSize } from '../enumerations/blockSizes';
import { StaticHelpersECIES } from '../staticHelpers.ECIES';

export class EciesDecryptionTransform extends Transform {
  private readonly blockSize: number;
  private readonly privateKey: Buffer;
  private readonly buffer: Buffer[] = [];
  private totalLength = 0;

  constructor(
    privateKey: Buffer,
    blockSize: BlockSize,
    options?: TransformOptions,
  ) {
    super(options);
    this.privateKey = privateKey;
    this.blockSize = blockSize as number;
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
    const encryptedData = Buffer.concat(this.buffer, this.totalLength);

    try {
      // Process entire data at once
      const decryptedData = StaticHelpersECIES.decryptWithHeader(
        this.privateKey,
        encryptedData,
      );
      this.push(decryptedData);
      callback();
    } catch (error) {
      console.error('Decryption error details:', {
        error,
        blockSize: this.blockSize,
        totalLength: encryptedData.length,
        privateKeyLength: this.privateKey.length,
      });
      callback(error instanceof Error ? error : new Error('Decryption failed'));
    }
  }
}
