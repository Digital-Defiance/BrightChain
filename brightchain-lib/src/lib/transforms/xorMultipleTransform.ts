import { Readable, Transform, TransformCallback } from 'stream';

export class XorMultipleTransformStream extends Transform {
  private sources: Readable[];
  private buffers: Buffer[];
  private streamEnded: boolean[];

  constructor(sources: Readable[]) {
    super();
    this.sources = sources;
    this.buffers = new Array(sources.length).fill(null);
    this.streamEnded = new Array(sources.length).fill(false);

    this.sources.forEach((source, index) => {
      source.on('data', (chunk: Buffer) => {
        this.buffers[index] = chunk;
        this.processData();
      });

      source.on('end', () => {
        this.streamEnded[index] = true;
        this.checkEndCondition();
      });
    });
  }

  processData(): void {
    if (this.buffers.every((buffer, index) => buffer !== null || this.streamEnded[index])) {
      const minLength = Math.min(...this.buffers.map((buffer, index) =>
        this.streamEnded[index] ? 0 : buffer.length));

      if (minLength === 0) {
        this.end();
        return;
      }

      const xorResult = Buffer.alloc(minLength);

      for (let i = 0; i < minLength; i++) {
        xorResult[i] = this.buffers.reduce((acc, buffer, index) =>
          this.streamEnded[index] ? acc : acc ^ buffer[i], 0);
      }

      this.push(xorResult);

      // Update buffers
      this.buffers = this.buffers.map((buffer, index) =>
        this.streamEnded[index] ? buffer : buffer.slice(minLength));
    }
  }

  checkEndCondition(): void {
    if (this.streamEnded.every(ended => ended)) {
      this.end();
    }
  }

  override _transform(chunk: Buffer, encoding: string, callback: TransformCallback): void {
    // This transform does not use the incoming chunk directly
    callback();
  }

  override _flush(callback: TransformCallback): void {
    callback();
  }
}

export default XorMultipleTransformStream;
