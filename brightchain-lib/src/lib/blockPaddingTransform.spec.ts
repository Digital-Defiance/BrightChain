import BlockPaddingTransform from './blockPaddingTransform';
import { Readable } from './browserStream';
import { uint8ArrayToString } from './bufferUtils';
import { BlockSize } from './enumerations/blockSize';

/** Collect all chunks emitted by a transform and resolve on 'end'. */
function collectBlocks(
  transform: BlockPaddingTransform,
): Promise<Uint8Array[]> {
  const blocks: Uint8Array[] = [];
  return new Promise<Uint8Array[]>((resolve, reject) => {
    transform.on('data', (block: Uint8Array) => blocks.push(block));
    transform.on('end', () => resolve(blocks));
    transform.on('error', reject);
  });
}

describe('BlockPaddingTransform', () => {
  it('should transform data into blocks of specified size', async () => {
    const transform = new BlockPaddingTransform(BlockSize.Message);
    const input = new TextEncoder().encode('HelloWorld'); // 10 bytes

    const promise = collectBlocks(transform);
    transform.write(input);
    transform.end();
    const blocks = await promise;

    expect(blocks.length).toBe(1);
    expect(blocks[0].length).toBe(BlockSize.Message);
    expect(uint8ArrayToString(blocks[0].subarray(0, 10))).toBe('HelloWorld');
    expect(blocks[0].length - 10).toBe(BlockSize.Message - 10);
  });

  it('should handle data larger than block size', async () => {
    const transform = new BlockPaddingTransform(BlockSize.Message);
    const input = new Uint8Array(BlockSize.Message + 10).fill(120);

    const promise = collectBlocks(transform);
    transform.write(input);
    transform.end();
    const blocks = await promise;

    expect(blocks.length).toBe(2);
    expect(blocks[0].length).toBe(BlockSize.Message);
    expect(uint8ArrayToString(blocks[0])).toBe('x'.repeat(BlockSize.Message));
    expect(blocks[1].length).toBe(BlockSize.Message);
    expect(uint8ArrayToString(blocks[1].subarray(0, 10))).toBe('x'.repeat(10));
  });

  it('should handle empty input', async () => {
    const transform = new BlockPaddingTransform(BlockSize.Message);

    const promise = collectBlocks(transform);
    transform.end();
    const blocks = await promise;

    expect(blocks.length).toBe(0);
  });

  it('should handle chunked input', async () => {
    const transform = new BlockPaddingTransform(BlockSize.Message);

    const promise = collectBlocks(transform);
    transform.write(new TextEncoder().encode('Hello,'));
    transform.write(new TextEncoder().encode('World!'));
    transform.write(new TextEncoder().encode('123'));
    transform.end();
    const blocks = await promise;

    expect(blocks.length).toBe(1);
    expect(blocks[0].length).toBe(BlockSize.Message);
    expect(uint8ArrayToString(blocks[0].subarray(0, 15))).toBe(
      'Hello,World!123',
    );
  });

  it('should work with readable streams', async () => {
    const transform = new BlockPaddingTransform(BlockSize.Message);
    const input = new TextEncoder().encode('StreamingData');
    const readable = Readable.from(input);

    const promise = collectBlocks(transform);
    readable.pipe(transform);
    const blocks = await promise;

    expect(blocks.length).toBe(1);
    expect(blocks[0].length).toBe(BlockSize.Message);
    expect(uint8ArrayToString(blocks[0].subarray(0, input.length))).toBe(
      'StreamingData',
    );
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
      expect(() => transform.write(testData)).not.toThrow();
    });
  });
});
