import { Hasher, sha3_512 } from 'js-sha3';
import { Transform, TransformCallback } from 'stream';

export class ChecksumTransform extends Transform {
  private sha3: Hasher;
  constructor() {
    super();
    this.sha3 = sha3_512.create();
  }

  public override _transform(
    chunk: Buffer,
    encoding: BufferEncoding,
    callback: TransformCallback,
  ) {
    this.sha3.update(chunk);
    callback(null, chunk);
  }

  public override _flush(callback: TransformCallback) {
    this.emit('checksum', this.sha3.digest());
    callback();
  }
}
