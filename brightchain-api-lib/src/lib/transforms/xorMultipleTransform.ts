import { Readable, Transform, TransformCallback } from 'stream';
import { constantTimeXorMultiple } from '@brightchain/brightchain-lib';

export class XorMultipleTransformStream extends Transform {
  private sources: Readable[];
  private buffers: Buffer[];
  private readonly streamEnded: boolean[];

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
    if (
      this.buffers.every(
        (buffer, index) => buffer !== null || this.streamEnded[index],
      )
    ) {
      const minLength = Math.min(
        ...this.buffers.map((buffer, index) =>
          this.streamEnded[index] ? 0 : buffer.length,
        ),
      );

      if (minLength === 0) {
        this.end();
        return;
      }

      // Extract active buffers (not ended streams) and slice to minLength
      const activeBuffers = this.buffers
        .map((buffer, index) =>
          this.streamEnded[index] ? null : buffer.subarray(0, minLength),
        )
        .filter((buffer): buffer is Buffer => buffer !== null);

      // Convert Buffers to Uint8Arrays for constant-time XOR
      const uint8Arrays = activeBuffers.map((buffer) => new Uint8Array(buffer));

      // Use constant-time XOR operation to prevent timing attacks
      const xorResult = constantTimeXorMultiple(uint8Arrays);

      // Convert result back to Buffer for streaming
      this.push(Buffer.from(xorResult));

      // Update buffers
      this.buffers = this.buffers.map((buffer, index) =>
        this.streamEnded[index] ? buffer : buffer.subarray(minLength),
      );
    }
  }

  checkEndCondition(): void {
    if (this.streamEnded.every((ended) => ended)) {
      this.end();
    }
  }

  override _transform(
    chunk: Buffer,
    encoding: string,
    callback: TransformCallback,
  ): void {
    // This transform does not use the incoming chunk directly
    callback();
  }

  override _flush(callback: TransformCallback): void {
    callback();
  }
}
