import { Transform, TransformCallback } from 'stream';

export class XorTransform extends Transform {
  private firstChunk: boolean;
  private xorChunk: Buffer;
  constructor() {
    super();
    this.firstChunk = true;
    this.xorChunk = Buffer.alloc(0);
  }

  public override _transform(
    chunk: Buffer,
    encoding: BufferEncoding,
    callback: TransformCallback,
  ) {
    if (this.firstChunk) {
      this.xorChunk = chunk;
      this.firstChunk = false;
    } else {
      for (let i = 0; i < chunk.length; i++) {
        this.xorChunk[i] ^= chunk[i];
      }
    }
    callback();
  }

  public override _flush(callback: TransformCallback) {
    this.push(this.xorChunk);
    callback();
  }
}
