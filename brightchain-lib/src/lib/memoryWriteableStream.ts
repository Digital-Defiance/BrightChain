import { Writable, WritableOptions } from 'stream';

class MemoryWritableStream extends Writable {
  private readonly _data: Buffer[];

  constructor(options?: WritableOptions) {
    super(options);
    this._data = [];
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
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

export default MemoryWritableStream;
