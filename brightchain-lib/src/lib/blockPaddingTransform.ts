import { randomBytes } from 'crypto';
import { Transform, TransformCallback } from 'stream';
import { BlockSize } from './enumerations/blockSizes';

class BlockPaddingTransform extends Transform {
  private blockSize: number;
  private buffer: Buffer;

  constructor(blockSize: BlockSize) {
    super();
    this.blockSize = blockSize as number;
    this.buffer = Buffer.alloc(0);
  }

  override _transform(chunk: Buffer, encoding: string, callback: TransformCallback): void {
    this.buffer = Buffer.concat([this.buffer, chunk]);

    while (this.buffer.length >= this.blockSize) {
      const block = this.buffer.subarray(0, this.blockSize);
      this.buffer = this.buffer.subarray(this.blockSize);
      this.push(block);
    }

    callback();
  }

  override _flush(callback: TransformCallback): void {
    if (this.buffer.length > 0) {
      const paddingSize = this.blockSize - this.buffer.length % this.blockSize;
      const padding = randomBytes(paddingSize);
      const paddedBlock = Buffer.concat([this.buffer, padding]);
      this.push(paddedBlock);
    }
    callback();
  }
}

export default BlockPaddingTransform;
