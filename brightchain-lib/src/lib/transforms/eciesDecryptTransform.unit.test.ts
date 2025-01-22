import { randomBytes } from 'crypto';
import { BlockSize } from '../enumerations/blockSizes';
import { StaticHelpersECIES } from '../staticHelpers.ECIES';
import { EciesDecryptionTransform } from './eciesDecryptTransform';

describe('EciesDecryptionTransform Unit Tests', () => {
  beforeAll(() => {
    console.error = jest.fn();
  });
  const blockSize = BlockSize.Small;
  const mnemonic = StaticHelpersECIES.generateNewMnemonic();
  const keypair = StaticHelpersECIES.mnemonicToSimpleKeyPairBuffer(mnemonic);

  it('should be instantiated with correct parameters', () => {
    const transform = new EciesDecryptionTransform(
      keypair.privateKey,
      blockSize,
    );
    expect(transform).toBeDefined();
  });

  it('should handle empty input', (done) => {
    const transform = new EciesDecryptionTransform(
      keypair.privateKey,
      blockSize,
    );
    const chunks: Buffer[] = [];

    transform.on('data', (chunk: Buffer) => {
      chunks.push(chunk);
    });

    transform.on('end', () => {
      expect(chunks.length).toBe(0);
      done();
    });

    transform.end();
  });

  it('should decrypt input data', (done) => {
    const transform = new EciesDecryptionTransform(
      keypair.privateKey,
      blockSize,
    );
    const inputData = randomBytes(100);
    const encryptedData = StaticHelpersECIES.encrypt(
      keypair.publicKey,
      inputData,
    );
    const chunks: Buffer[] = [];

    transform.on('data', (chunk: Buffer) => {
      chunks.push(chunk);
    });

    transform.on('end', () => {
      expect(chunks.length).toBe(1);
      const decryptedData = Buffer.concat(chunks);
      expect(decryptedData).toEqual(inputData);
      done();
    });

    transform.write(encryptedData);
    transform.end();
  });

  it('should handle streaming input', (done) => {
    const transform = new EciesDecryptionTransform(
      keypair.privateKey,
      blockSize,
    );
    const inputData = randomBytes(1000);
    const encryptedData = StaticHelpersECIES.encrypt(
      keypair.publicKey,
      inputData,
    );
    const chunks: Buffer[] = [];

    // Split encrypted data into multiple chunks
    const inputChunks = [
      encryptedData.subarray(0, 300),
      encryptedData.subarray(300, 700),
      encryptedData.subarray(700),
    ];

    transform.on('data', (chunk: Buffer) => {
      chunks.push(chunk);
    });

    transform.on('end', () => {
      const decryptedData = Buffer.concat(chunks);
      expect(decryptedData).toEqual(inputData);
      done();
    });

    // Write chunks with some delay to simulate streaming
    inputChunks.forEach((chunk, index) => {
      setTimeout(() => {
        transform.write(chunk);
        if (index === inputChunks.length - 1) {
          transform.end();
        }
      }, index * 10);
    });
  });

  it('should throw error with invalid private key', (done) => {
    jest.setTimeout(10000); // Increase timeout to 10 seconds
    const invalidPrivateKey = randomBytes(32); // Wrong format for private key
    const transform = new EciesDecryptionTransform(
      invalidPrivateKey,
      blockSize,
    );
    const inputData = randomBytes(100);
    const encryptedData = StaticHelpersECIES.encrypt(
      keypair.publicKey,
      inputData,
    );

    transform.on('error', (error) => {
      expect(error).toBeDefined();
      expect(error.message).toContain('Decryption failed');
      expect(console.error).toHaveBeenCalled();
      done();
    });

    transform.write(encryptedData);
    transform.end();
  });

  it('should throw error with corrupted encrypted data', (done) => {
    const transform = new EciesDecryptionTransform(
      keypair.privateKey,
      blockSize,
    );
    const corruptedData = randomBytes(200); // Random data that's not properly encrypted

    transform.on('error', (error) => {
      expect(error).toBeDefined();
      expect(error.message).toContain('Decryption failed');
      done();
    });

    transform.write(corruptedData);
    transform.end();
  });
});
