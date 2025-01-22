import { randomBytes } from 'crypto';
import { BlockSize } from '../enumerations/blockSizes';
import { StaticHelpersECIES } from '../staticHelpers.ECIES';
import { EciesEncryptTransform } from './eciesEncryptTransform';

describe('EciesEncryptTransform Unit Tests', () => {
  beforeAll(() => {
    console.error = jest.fn();
  });
  const blockSize = BlockSize.Small;
  const mnemonic = StaticHelpersECIES.generateNewMnemonic();
  const keypair = StaticHelpersECIES.mnemonicToSimpleKeyPairBuffer(mnemonic);

  it('should be instantiated with correct parameters', () => {
    const transform = new EciesEncryptTransform(blockSize, keypair.publicKey);
    expect(transform).toBeDefined();
  });

  it('should handle empty input', (done) => {
    const transform = new EciesEncryptTransform(blockSize, keypair.publicKey);
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

  it('should encrypt input data', (done) => {
    const transform = new EciesEncryptTransform(blockSize, keypair.publicKey);
    const inputData = randomBytes(100);
    const chunks: Buffer[] = [];

    transform.on('data', (chunk: Buffer) => {
      chunks.push(chunk);
    });

    transform.on('end', () => {
      expect(chunks.length).toBe(1);
      const encryptedData = Buffer.concat(chunks);

      // Verify the encrypted data can be decrypted
      const decryptedData = StaticHelpersECIES.decrypt(
        keypair.privateKey,
        encryptedData,
      );
      expect(decryptedData).toEqual(inputData);
      done();
    });

    transform.write(inputData);
    transform.end();
  });

  it('should handle streaming input', (done) => {
    const transform = new EciesEncryptTransform(blockSize, keypair.publicKey);
    const inputData = randomBytes(1000);
    const chunks: Buffer[] = [];

    // Split input into multiple chunks
    const inputChunks = [
      inputData.subarray(0, 300),
      inputData.subarray(300, 700),
      inputData.subarray(700),
    ];

    transform.on('data', (chunk: Buffer) => {
      chunks.push(chunk);
    });

    transform.on('end', () => {
      const encryptedData = Buffer.concat(chunks);

      // Verify the encrypted data can be decrypted
      const decryptedData = StaticHelpersECIES.decrypt(
        keypair.privateKey,
        encryptedData,
      );
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

  it('should throw error with invalid public key', (done) => {
    jest.setTimeout(10000); // Increase timeout to 10 seconds
    const invalidPublicKey = randomBytes(32); // Wrong size for public key
    const transform = new EciesEncryptTransform(blockSize, invalidPublicKey);
    const inputData = randomBytes(100);

    transform.on('error', (error) => {
      expect(error).toBeDefined();
      expect(error.message).toContain('Encryption failed');
      expect(console.error).toHaveBeenCalled();
      done();
    });

    transform.write(inputData);
    transform.end();
  });
});
