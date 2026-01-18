/* eslint-disable @typescript-eslint/no-explicit-any */
import { Writable, WritableOptions } from 'stream';

export class MemoryWritableStream extends Writable {
  private readonly _data: Buffer[];

  constructor(options?: WritableOptions) {
    super(options);
    this._data = [];
  }

  override _write(
    chunk: any,
    encoding: BufferEncoding,
    callback: (error?: Error | null) => void,
  ) {
    this._data.push(Buffer.from(chunk, encoding));
    callback();
  }

  get data() {
    return Buffer.concat(this._data);
  }
}
