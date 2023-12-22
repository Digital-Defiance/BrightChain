import { Transform, TransformCallback, TransformOptions } from 'stream';
import { TupleSize, RandomBlocksPerTuple } from './constants';
import { EphemeralBlock } from './blocks/ephemeral';
import { RandomBlock } from './blocks/random';
import { WhitenedBlock } from './blocks/whitened';
import { BlockSize } from './enumerations/blockSizes';
import { InMemoryBlockTuple } from './blocks/memoryTuple';

export class TupleGeneratorStream extends Transform {
  private blockSize: number;
  private buffer: Buffer;
  private randomBlockSource: () => RandomBlock;
  private whitenedBlockSource: () => WhitenedBlock | undefined;

  constructor(blockSize: BlockSize, whitenedBlockSource: () => WhitenedBlock | undefined, randomBlockSource: () => RandomBlock, options?: TransformOptions) {
    super({ ...options, objectMode: true }); // Ensure objectMode is true
    this.blockSize = blockSize as number;
    this.buffer = Buffer.alloc(0);
    this.randomBlockSource = randomBlockSource;
    this.whitenedBlockSource = whitenedBlockSource;
  }

  public _transform(chunk: Buffer, encoding: BufferEncoding, callback: TransformCallback): void {
    this.buffer = Buffer.concat([this.buffer, chunk]);

    while (this.buffer.length >= this.blockSize) {
      this.makeTuple();
    }

    callback();
  }

  private makeTuple(): void {
    const blockData = this.buffer.subarray(0, this.blockSize);
    this.buffer = this.buffer.subarray(this.blockSize);
    const block: EphemeralBlock = new EphemeralBlock(blockData);
    // build a tuple using 
    const blocks = [block];
    for (let i = 0; i < RandomBlocksPerTuple; i++) {
      blocks.push(this.randomBlockSource());
    }
    for (let i = RandomBlocksPerTuple; i < TupleSize - 1; i++) {
      blocks.push(this.whitenedBlockSource() ?? this.randomBlockSource());
    }
    const tuple = new InMemoryBlockTuple(blocks);
    const resultBlock = tuple.xor;
    // make a final tuple replacing the first block with the result block
    const finalTuple = new InMemoryBlockTuple([resultBlock, ...blocks.slice(1)]);
    this.push(finalTuple);
  }

  public _flush(callback: TransformCallback): void {
    while (this.buffer.length >= this.blockSize) {
      this.makeTuple();
    }
    callback();
  }
}
