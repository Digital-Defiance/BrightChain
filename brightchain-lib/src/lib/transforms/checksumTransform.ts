import { ChecksumUint8Array } from '../types';
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
    const checksum = this.sha3.digest();
    this.emit(
      'checksum',
      Buffer.from(checksum) as unknown as ChecksumUint8Array,
    );
    callback();
  }
}
