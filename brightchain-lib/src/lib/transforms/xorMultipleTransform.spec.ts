import { Readable } from 'stream';
import { XorMultipleTransformStream } from './xorMultipleTransform';

describe('XorTransformStream', () => {
  function bufferFromText(text: string): Buffer {
    return Buffer.from(text, 'utf-8');
  }

  function createMockStream(data: string): Readable {
    return Readable.from([bufferFromText(data)]);
  }

  function xorBuffers(buffers: Buffer[]): Buffer {
    const result = Buffer.alloc(buffers[0].length);
    for (let i = 0; i < buffers[0].length; i++) {
      result[i] = buffers.reduce((acc, buffer) => acc ^ buffer[i], 0);
    }
    return result;
  }

  test('XORs data from multiple streams correctly', done => {
    const input1 = createMockStream('Hello');
    const input2 = createMockStream('World');

    const xorStream = new XorMultipleTransformStream([input1, input2]);
    const chunks: Buffer[] = [];

    xorStream.on('data', chunk => chunks.push(chunk));
    xorStream.on('end', () => {
      const expectedResult = xorBuffers([bufferFromText('Hello'), bufferFromText('World')]);
      const result = Buffer.concat(chunks);
      expect(result).toEqual(expectedResult);
      done();
    });
  });

  test('Handles streams of different lengths', done => {
    const input1 = createMockStream('Short');
    const input2 = createMockStream('A bit longer');

    const xorStream = new XorMultipleTransformStream([input1, input2]);
    const chunks: Buffer[] = [];

    xorStream.on('data', chunk => chunks.push(chunk));
    xorStream.on('end', () => {
      const expectedResult = xorBuffers([bufferFromText('Short'), bufferFromText('A bit longer')]);
      const result = Buffer.concat(chunks);
      expect(result).toEqual(expectedResult);
      done();
    });
  });
});
