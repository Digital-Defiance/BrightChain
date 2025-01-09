import { XorTransform } from './xorTransform';

describe('XorTransform', () => {
  const xorChunksManually = (chunks: Buffer[]): Buffer => {
    const xorResult = Buffer.alloc(chunks[0].length);
    chunks.forEach((chunk) => {
      for (let i = 0; i < chunk.length; i++) {
        xorResult[i] ^= chunk[i];
      }
    });
    return xorResult;
  };

  const simulateChunkProcessing = (
    xorTransform: XorTransform,
    chunks: Buffer[],
    callback: (result: Buffer) => void
  ) => {
    chunks.forEach((chunk) =>
      xorTransform._transform(chunk, 'utf8', () => {
        // do nothing
      })
    );

    xorTransform.on('data', (result) => {
      callback(result);
    });

    xorTransform._flush(() => {
      // do nothing
    });
  };

  it('should apply XOR correctly for multiple chunks', (done) => {
    const xorTransform = new XorTransform(); // Create a new instance
    const chunks = [
      Buffer.from([0x01, 0x02, 0x03]),
      Buffer.from([0x04, 0x05, 0x06]),
      Buffer.from([0x07, 0x08, 0x09]),
    ];
    const expectedXorResult = xorChunksManually(chunks);

    simulateChunkProcessing(xorTransform, chunks, (result) => {
      expect(result).toEqual(expectedXorResult);
      done();
    });
  });

  it('should handle single chunk correctly', (done) => {
    const xorTransform = new XorTransform();
    const chunk = Buffer.from([0x01, 0x02, 0x03]);
    simulateChunkProcessing(xorTransform, [chunk], (result) => {
      expect(result).toEqual(chunk);
      done();
    });
  });

  it('should handle different chunk sizes consistently', (done) => {
    const chunks = [
      Buffer.from([0x01, 0x02]),
      Buffer.from([0x04, 0x05, 0x06]),
      Buffer.from([0x07]),
    ];
    const expectedXorResult = xorChunksManually(chunks);
    const xorTransform = new XorTransform();
    simulateChunkProcessing(xorTransform, chunks, (result) => {
      expect(result.subarray(0, expectedXorResult.length)).toEqual(
        expectedXorResult
      );
      done();
    });
  });
});
