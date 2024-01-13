import { Transform, TransformCallback, TransformOptions } from 'stream';
import { TupleSize, RandomBlocksPerTuple } from './constants';
import { EphemeralBlock } from './blocks/ephemeral';
import { RandomBlock } from './blocks/random';
import { WhitenedBlock } from './blocks/whitened';
import { BlockSize } from './enumerations/blockSizes';
import { InMemoryBlockTuple } from './blocks/memoryTuple';
import { BlockDataType } from './enumerations/blockDataType';

/**
 * Given a stream of data blocks, produce a stream of prime tuples by breaking the data into blocks and producing tuples from the blocks
 */
export class PrimeTupleGeneratorStream extends Transform {
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

  public override _transform(chunk: Buffer, encoding: BufferEncoding, callback: TransformCallback): void {
    this.buffer = Buffer.concat([this.buffer, chunk]);

    while (this.buffer.length >= this.blockSize) {
      this.makeTuple();
    }

    callback();
  }

  private makeTuple(): void {
    if (this.buffer.length < this.blockSize) {
      return;
    }
    const blockData = this.buffer.subarray(0, this.blockSize);
    this.buffer = this.buffer.subarray(this.blockSize);
    const sourceBlock: EphemeralBlock = new EphemeralBlock(this.blockSize, blockData, BlockDataType.EphemeralStructuredData, blockData.length);
    const randomBlocks: RandomBlock[] = [];
    for (let i = 0; i < RandomBlocksPerTuple; i++) {
      const b = this.randomBlockSource();
      randomBlocks.push(b);
    }
    const whiteners: WhitenedBlock[] = [];
    for (let i = RandomBlocksPerTuple; i < TupleSize - 1; i++) {
      const b = this.whitenedBlockSource() ?? this.randomBlockSource();
      whiteners.push(b);
    }
    const tuple = InMemoryBlockTuple.makeTupleFromSourceXor(sourceBlock, whiteners, randomBlocks);
    this.push(tuple);
  }

  public override _flush(callback: TransformCallback): void {
    while (this.buffer.length >= this.blockSize) {
      this.makeTuple();
    }
    callback();
  }
}
