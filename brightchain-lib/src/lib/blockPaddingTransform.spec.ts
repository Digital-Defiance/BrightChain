import { Readable } from './browserStream';
import BlockPaddingTransform from './blockPaddingTransform';
import { BlockSize } from './enumerations/blockSize';

describe('BlockPaddingTransform', () => {
  it('should transform data into blocks of specified size', (done) => {
    const transform = new BlockPaddingTransform(BlockSize.Message);
    const input = Buffer.from('HelloWorld'); // 10 bytes
    const blocks: Buffer[] = [];

    transform.on('data', (block: Buffer) => {
      blocks.push(block);
    });

    transform.on('end', () => {
      expect(blocks.length).toBe(1);
      expect(blocks[0].length).toBe(BlockSize.Message);
      // First 10 bytes should be our input
      expect(blocks[0].subarray(0, 10).toString()).toBe('HelloWorld');
      // Rest should be random padding
      expect(blocks[0].length - 10).toBe(BlockSize.Message - 10);
      done();
    });

    transform.write(input);
    transform.end();
  });

  it('should handle data larger than block size', (done) => {
    const transform = new BlockPaddingTransform(BlockSize.Message);
    const input = Buffer.alloc(BlockSize.Message + 10, 'x'); // One full block plus 10 bytes
    const blocks: Buffer[] = [];

    transform.on('data', (block: Buffer) => {
      blocks.push(block);
    });

    transform.on('end', () => {
      expect(blocks.length).toBe(2);
      // First block should be exactly block size
      expect(blocks[0].length).toBe(BlockSize.Message);
      expect(blocks[0].toString()).toBe('x'.repeat(BlockSize.Message));
      // Second block should be padded to block size
      expect(blocks[1].length).toBe(BlockSize.Message);
      expect(blocks[1].subarray(0, 10).toString()).toBe('x'.repeat(10));
      done();
    });

    transform.write(input);
    transform.end();
  });

  it('should handle empty input', (done) => {
    const transform = new BlockPaddingTransform(BlockSize.Message);
    const blocks: Buffer[] = [];

    transform.on('data', (block: Buffer) => {
      blocks.push(block);
    });

    transform.on('end', () => {
      expect(blocks.length).toBe(0);
      done();
    });

    transform.end();
  });

  it('should handle chunked input', (done) => {
    const transform = new BlockPaddingTransform(BlockSize.Message);
    const blocks: Buffer[] = [];

    transform.on('data', (block: Buffer) => {
      blocks.push(block);
    });

    transform.on('end', () => {
      expect(blocks.length).toBe(1);
      expect(blocks[0].length).toBe(BlockSize.Message);
      expect(blocks[0].subarray(0, 15).toString()).toBe('Hello,World!123');
      done();
    });

    // Write data in chunks
    transform.write(Buffer.from('Hello,'));
    transform.write(Buffer.from('World!'));
    transform.write(Buffer.from('123'));
    transform.end();
  });

  it('should work with readable streams', (done) => {
    const transform = new BlockPaddingTransform(BlockSize.Message);
    const input = Buffer.from('StreamingData');
    const readable = Readable.from(input);
    const blocks: Buffer[] = [];

    transform.on('data', (block: Buffer) => {
      blocks.push(block);
    });

    transform.on('end', () => {
      expect(blocks.length).toBe(1);
      expect(blocks[0].length).toBe(BlockSize.Message);
      expect(blocks[0].subarray(0, input.length).toString()).toBe(
        'StreamingData',
      );
      done();
    });

    readable.pipe(transform);
  });

  it('should handle multiple block sizes', () => {
    const sizes = [
      BlockSize.Message,
      BlockSize.Tiny,
      BlockSize.Small,
      BlockSize.Medium,
      BlockSize.Large,
      BlockSize.Huge,
    ];

    sizes.forEach((size) => {
      const transform = new BlockPaddingTransform(size);
      expect(transform).toBeDefined();
      const testData = new Uint8Array(size - 1);
      testData.fill(65); // 'A' character code
      expect(() => transform.write(Buffer.from(testData))).not.toThrow();
    });
  });
});
