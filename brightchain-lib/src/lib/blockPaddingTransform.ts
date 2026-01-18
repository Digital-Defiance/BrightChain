/* eslint-disable @typescript-eslint/no-explicit-any */
import { randomBytes } from './browserCrypto';
import { Transform, TransformCallback } from './browserStream';
import { BlockSize } from './enumerations/blockSize';

class BlockPaddingTransform extends Transform {
  private readonly blockSize: number;
  private buffer: Uint8Array;

  constructor(blockSize: BlockSize) {
    super();
    this.blockSize = blockSize as number;
    this.buffer = new Uint8Array(0);
  }

  override _transform(
    chunk: any,
    encoding: string,
    callback: TransformCallback,
  ): void {
    // Convert Buffer to Uint8Array if needed
    let data: Uint8Array;
    if (chunk instanceof Uint8Array) {
      data = chunk;
    } else if (Buffer.isBuffer(chunk)) {
      data = new Uint8Array(chunk);
    } else {
      callback(new Error('Input must be Buffer or Uint8Array'));
      return;
    }

    const newBuffer = new Uint8Array(this.buffer.length + data.length);
    newBuffer.set(this.buffer);
    newBuffer.set(data, this.buffer.length);
    this.buffer = newBuffer;

    while (this.buffer.length >= this.blockSize) {
      const block = this.buffer.subarray(0, this.blockSize);
      this.buffer = this.buffer.subarray(this.blockSize);
      this.push(new Uint8Array(block));
    }

    callback();
  }

  override _flush(callback: TransformCallback): void {
    if (this.buffer.length > 0) {
      const paddingSize =
        this.blockSize - (this.buffer.length % this.blockSize);
      const padding = randomBytes(paddingSize);
      const paddedBlock = new Uint8Array(this.buffer.length + padding.length);
      paddedBlock.set(this.buffer);
      paddedBlock.set(padding, this.buffer.length);
      this.push(new Uint8Array(paddedBlock));
    }
    callback();
  }
}

export default BlockPaddingTransform;
