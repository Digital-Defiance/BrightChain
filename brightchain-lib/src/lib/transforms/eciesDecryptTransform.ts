import { Transform, TransformCallback, TransformOptions } from 'stream';
import { EthereumECIES } from '../ethereumECIES';
import { BlockSize } from '../enumerations/blockSizes';

export class EciesDecryptionTransform extends Transform {
  private readonly blockSize: number;
  private readonly privateKey: Buffer;
  private buffer: Buffer;

  constructor(privateKey: Buffer, blockSize: BlockSize, options?: TransformOptions) {
    super(options);
    this.privateKey = privateKey;
    this.blockSize = blockSize as number;
    this.buffer = Buffer.alloc(0);
  }

  public override _transform(chunk: Buffer, encoding: BufferEncoding, callback: TransformCallback): void {
    this.buffer = Buffer.concat([this.buffer, chunk]);

    while (this.buffer.length >= this.blockSize) {
      const blockToDecrypt = this.buffer.subarray(0, this.blockSize);
      this.buffer = this.buffer.subarray(this.blockSize);

      try {
        const decryptedChunk = EthereumECIES.decrypt(this.privateKey, blockToDecrypt);
        this.push(decryptedChunk);
      } catch (error) {
        return callback(new Error('Decryption failed'));
      }
    }

    callback();
  }

  public override _flush(callback: TransformCallback): void {
    if (this.buffer.length > 0) {
      // Handle any remaining data
      // Note: This assumes that the remaining data is a complete and valid block.
      // If your protocol allows partial blocks or requires special handling for the last block, adjust here.
      try {
        const decryptedChunk = EthereumECIES.decrypt(this.privateKey, this.buffer);
        this.push(decryptedChunk);
      } catch (error) {
        return callback(new Error('Decryption of final block failed'));
      }
    }
    callback();
  }
}
